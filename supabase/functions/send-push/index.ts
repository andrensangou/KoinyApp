/**
 * send-push — Supabase Edge Function
 * Sends a cross-device push notification via Firebase Cloud Messaging (FCM v1 API).
 *
 * Required Supabase secrets:
 *   FIREBASE_PROJECT_ID   — ex: "koiny-12345"
 *   FIREBASE_CLIENT_EMAIL — service account email
 *   FIREBASE_PRIVATE_KEY  — service account private key (PEM, with \n)
 *   SERVICE_ROLE_KEY      — Supabase service role key
 *
 * POST body:
 *   userId        — Supabase user UUID (owner of device_tokens)
 *   targetMode    — 'parent' | 'child'
 *   targetChildId — required if targetMode = 'child'
 *   title         — notification title
 *   body          — notification body
 *   data          — optional key/value pairs
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const FIREBASE_PROJECT_ID   = Deno.env.get('FIREBASE_PROJECT_ID')!;
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL')!;
const FIREBASE_PRIVATE_KEY  = Deno.env.get('FIREBASE_PRIVATE_KEY')!.replace(/\\n/g, '\n');

// ── FCM v1 auth: sign a JWT and exchange for OAuth2 access token ─────────────

async function getFCMAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss:   FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import RSA private key
  const pemBody = FIREBASE_PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signingInput}.${sigB64}`;

  // Exchange JWT for access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`OAuth2 error: ${JSON.stringify(json)}`);
  return json.access_token;
}

// ── Send one FCM message ──────────────────────────────────────────────────────

// Renvoie { ok } si livré, { ok:false, dead:true } si le token est invalide
// (app désinstallée / token périmé) → à supprimer de device_tokens.
async function sendFCM(opts: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  accessToken: string;
}): Promise<{ ok: boolean; dead: boolean }> {
  const url = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;

  const message = {
    message: {
      token: opts.token,
      notification: { title: opts.title, body: opts.body },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channel_id: 'koiny_default',
          icon: 'ic_stat_koiny',
        },
      },
      // iOS/APNs : badge + son (sinon les push iOS arrivent sans personnalisation)
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
      data: opts.data ?? {},
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (res.ok) return { ok: true, dead: false };

  const errText = await res.text();
  console.error('[send-push] FCM error:', errText);
  // Token mort : 404 UNREGISTERED ou 400 INVALID_ARGUMENT sur le token
  const dead = res.status === 404 ||
    errText.includes('UNREGISTERED') ||
    errText.includes('registration-token-not-registered');
  return { ok: false, dead };
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    // Verify caller is authenticated
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, authHeader.replace('Bearer ', ''), {
      auth: { persistSession: false },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response('Unauthorized', { status: 401 });

    const { userId, targetMode, targetChildId, title, body, data } = await req.json();

    // Security: caller can only send push for their own account
    if (user.id !== userId) return new Response('Forbidden', { status: 403 });

    // Fetch target device tokens
    let query = supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', userId)
      .eq('mode', targetMode);

    if (targetMode === 'child' && targetChildId) {
      query = query.eq('child_id', targetChildId);
    }

    const { data: tokens, error: tokenErr } = await query;
    if (tokenErr) throw tokenErr;

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No tokens found for target' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Token OAuth FCM récupéré une seule fois pour tous les envois
    const accessToken = await getFCMAccessToken();

    // Send to all matching devices
    const results = await Promise.allSettled(
      tokens.map(row =>
        sendFCM({ token: row.token, title, body, data, accessToken })
          .then(r => ({ ...r, token: row.token })),
      ),
    );

    // Collecter les tokens morts (app désinstallée) pour les supprimer
    const deadTokens: string[] = [];
    let sent = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.ok) sent++;
        else if (r.value.dead) deadTokens.push(r.value.token);
      }
    }
    const failed = results.length - sent;

    if (deadTokens.length > 0) {
      await supabase.from('device_tokens').delete().in('token', deadTokens);
      console.log(`[send-push] cleaned ${deadTokens.length} dead token(s)`);
    }

    console.log(`[send-push] sent=${sent} failed=${failed}`);

    return new Response(
      JSON.stringify({ sent, failed, cleaned: deadTokens.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[send-push] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
