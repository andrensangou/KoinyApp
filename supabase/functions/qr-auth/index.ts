/**
 * qr-auth — Supabase Edge Function
 * Connexion d'un appareil par scan de QR code (façon WhatsApp Web).
 *
 * 3 actions (champ `action` du body JSON) :
 *
 *   create  — [tablette, anon] crée une session, renvoie un `code` secret.
 *             → réponse: { code, expiresAt }
 *
 *   approve — [téléphone parent, authentifié] approuve une session via son
 *             token. Génère un OTP magic-link pour le compte du parent et le
 *             stocke dans la session.
 *             → body: { action:'approve', code }
 *             → réponse: { ok: true }
 *
 *   poll    — [tablette, anon] interroge l'état d'une session. Renvoie l'OTP
 *             uniquement quand le parent a approuvé.
 *             → body: { action:'poll', code }
 *             → réponse: { status, email?, token? }
 *
 * SÉCURITÉ :
 *   - La table qr_login_sessions est verrouillée (service role uniquement).
 *   - Le `code` est un secret haute entropie généré côté serveur.
 *   - L'OTP est à usage unique (GoTrue) et la session expire en 5 min.
 *   - `approve` exige un vrai token utilisateur (pas la clé anon).
 *
 * Secrets requis : SERVICE_ROLE_KEY (SUPABASE_URL et ANON_KEY sont injectés).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Client service-role : seul autorisé à toucher la table verrouillée
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: { action?: string; code?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const action = payload.action;

  // ── CREATE ─────────────────────────────────────────────────────────────
  // La tablette (anon) demande une nouvelle session de connexion.
  if (action === 'create') {
    const code = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    const { error } = await admin.from('qr_login_sessions').insert({
      code,
      status: 'pending',
      expires_at: expiresAt,
    });

    if (error) return json({ error: 'create_failed' }, 500);
    return json({ code, expiresAt });
  }

  // ── APPROVE ────────────────────────────────────────────────────────────
  // Le téléphone parent (authentifié) approuve la session scannée.
  if (action === 'approve') {
    const { code } = payload;
    if (!code) return json({ error: 'missing_code' }, 400);

    // Vérifier le token du parent (rejette la clé anon)
    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user || !user.email) {
      return json({ error: 'not_authenticated' }, 401);
    }

    // Récupérer la session correspondante, vérifier qu'elle est valide
    const { data: session, error: selErr } = await admin
      .from('qr_login_sessions')
      .select('id, status, expires_at')
      .eq('code', code)
      .maybeSingle();

    if (selErr || !session) return json({ error: 'session_not_found' }, 404);
    if (session.status !== 'pending') return json({ error: 'already_used' }, 409);
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return json({ error: 'expired' }, 410);
    }

    // Générer un OTP magic-link pour le compte du parent
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    });
    if (linkErr || !linkData?.properties?.email_otp) {
      return json({ error: 'otp_generation_failed' }, 500);
    }

    // Stocker l'OTP dans la session (sera récupéré par la tablette au prochain poll)
    const { error: updErr } = await admin
      .from('qr_login_sessions')
      .update({
        status: 'claimed',
        auth_email: user.email,
        auth_token: linkData.properties.email_otp,
        approved_by: user.id,
      })
      .eq('id', session.id)
      .eq('status', 'pending'); // garde-fou anti double-approbation

    if (updErr) return json({ error: 'approve_failed' }, 500);
    return json({ ok: true });
  }

  // ── POLL ───────────────────────────────────────────────────────────────
  // La tablette (anon) interroge l'état. Renvoie l'OTP une fois approuvé.
  if (action === 'poll') {
    const { code } = payload;
    if (!code) return json({ error: 'missing_code' }, 400);

    const { data: session, error } = await admin
      .from('qr_login_sessions')
      .select('status, auth_email, auth_token, expires_at')
      .eq('code', code)
      .maybeSingle();

    if (error || !session) return json({ status: 'not_found' });
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return json({ status: 'expired' });
    }

    if (session.status === 'claimed') {
      // Marquer consommé pour usage unique, mais renvoyer l'OTP cette fois
      await admin
        .from('qr_login_sessions')
        .update({ status: 'consumed' })
        .eq('code', code);
      return json({
        status: 'claimed',
        email: session.auth_email,
        token: session.auth_token,
      });
    }

    return json({ status: session.status }); // 'pending' | 'consumed'
  }

  return json({ error: 'unknown_action' }, 400);
});
