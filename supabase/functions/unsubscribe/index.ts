/**
 * unsubscribe — Supabase Edge Function (RGPD)
 *
 * Désinscription des emails de relance. Lien cliqué depuis un email :
 *   {SUPABASE_URL}/functions/v1/unsubscribe?uid=<profileId>&sig=<hmac>
 *
 * Le `sig` est un HMAC-SHA256 de `uid` (clé = SERVICE_ROLE_KEY), généré par
 * notify-inactive-users. On vérifie la signature pour empêcher quiconque de
 * désabonner un autre utilisateur, puis on passe `marketing_consent = false`.
 *
 * ⚠️ Déployer SANS vérification JWT (lien public depuis un email) :
 *   supabase functions deploy unsubscribe --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// HMAC-SHA256(uid) en hex, clé = SERVICE_ROLE_KEY (partagée avec l'envoi)
async function sign(uid: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SERVICE_ROLE_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(uid));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Comparaison à temps constant (évite les attaques de timing)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function page(lang: string, ok: boolean): string {
  const t = {
    fr: {
      okT: 'Désinscription confirmée', okB: 'Tu ne recevras plus d\'emails de Koiny. Tu peux toujours réactiver cela depuis l\'app à tout moment.',
      koT: 'Lien invalide', koB: 'Ce lien de désinscription n\'est plus valide. Contacte-nous à hello@koiny.app si besoin.',
    },
    nl: {
      okT: 'Uitschrijving bevestigd', okB: 'Je ontvangt geen e-mails meer van Koiny. Je kunt dit altijd opnieuw inschakelen in de app.',
      koT: 'Ongeldige link', koB: 'Deze uitschrijflink is niet meer geldig. Mail ons op hello@koiny.app indien nodig.',
    },
    en: {
      okT: 'Unsubscribed', okB: 'You will no longer receive emails from Koiny. You can re-enable this anytime in the app.',
      koT: 'Invalid link', koB: 'This unsubscribe link is no longer valid. Contact us at hello@koiny.app if needed.',
    },
  };
  const L = (t as any)[lang] || t.en;
  const title = ok ? L.okT : L.koT;
  const bodyTxt = ok ? L.okB : L.koB;
  const icon = ok ? '✓' : '✕';
  const color = ok ? '#10b981' : '#ef4444';
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;font-family:-apple-system,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="background:#fff;border-radius:20px;padding:40px 32px;max-width:380px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.06)">
    <div style="width:64px;height:64px;border-radius:50%;background:${color}1a;color:${color};font-size:30px;line-height:64px;margin:0 auto 20px">${icon}</div>
    <h1 style="color:#1e293b;font-size:20px;margin:0 0 10px">${title}</h1>
    <p style="color:#64748b;font-size:14px;line-height:1.5;margin:0">${bodyTxt}</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const uid = url.searchParams.get('uid') || '';
  const sig = url.searchParams.get('sig') || '';

  const html = (body: string) => new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

  if (!uid || !sig) return html(page('en', false));

  // Vérifier la signature
  const expected = await sign(uid);
  if (!safeEqual(sig, expected)) return html(page('en', false));

  // Récupérer la langue pour localiser la confirmation
  const { data: profile } = await supabase
    .from('profiles')
    .select('language')
    .eq('id', uid)
    .maybeSingle();

  const lang = profile?.language || 'en';

  // Désactiver le consentement marketing
  const { error } = await supabase
    .from('profiles')
    .update({ marketing_consent: false })
    .eq('id', uid);

  if (error) return html(page(lang, false));
  return html(page(lang, true));
});
