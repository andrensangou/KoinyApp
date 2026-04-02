// Koiny — Edge Function: notify-inactive-users
// Runs daily via pg_cron. Sends re-engagement emails at 7, 30 and 90 days of inactivity.
// Deploy: supabase functions deploy notify-inactive-users
// Secrets: supabase secrets set RESEND_API_KEY=re_xxx SUPABASE_SERVICE_ROLE_KEY=xxx

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Koiny <hello@koiny.app>';
const APP_URL = 'https://koiny.app';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Days of inactivity → email config
const SEQUENCES = [
  { days: 7,  type: 'day7'  },
  { days: 30, type: 'day30' },
  { days: 90, type: 'day90' },
];

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend error for ${to}:`, err);
  }
}

function getEmailContent(type: string, language: string, firstName: string): { subject: string; html: string } {
  const name = firstName || (language === 'fr' ? 'là' : language === 'nl' ? 'daar' : 'there');

  const templates: Record<string, Record<string, { subject: string; html: string }>> = {
    day7: {
      fr: {
        subject: `${firstName ? firstName + ', t' : 'T'}u nous manques sur Koiny 👋`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <img src="${APP_URL}/icon.png" width="48" height="48" style="border-radius:12px;margin-bottom:16px" />
          <h2 style="color:#312e81">Ça fait une semaine !</h2>
          <p style="color:#475569">Bonjour ${name},</p>
          <p style="color:#475569">Tes enfants t'attendent sur Koiny. Vérifie leurs missions et cagnottes en quelques secondes.</p>
          <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Ouvrir Koiny</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Tu reçois cet email car tu as un compte Koiny. <a href="${APP_URL}/unsubscribe" style="color:#94a3b8">Se désabonner</a></p>
        </div>`,
      },
      nl: {
        subject: `${firstName ? firstName + ', w' : 'W'}e missen je op Koiny 👋`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <img src="${APP_URL}/icon.png" width="48" height="48" style="border-radius:12px;margin-bottom:16px" />
          <h2 style="color:#312e81">Het is een week geleden!</h2>
          <p style="color:#475569">Hallo ${name},</p>
          <p style="color:#475569">Je kinderen wachten op je in Koiny. Bekijk hun missies en spaarpotjes in enkele seconden.</p>
          <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Koiny openen</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Je ontvangt deze e-mail omdat je een Koiny-account hebt. <a href="${APP_URL}/unsubscribe" style="color:#94a3b8">Uitschrijven</a></p>
        </div>`,
      },
      en: {
        subject: `${firstName ? firstName + ', w' : 'W'}e miss you on Koiny 👋`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <img src="${APP_URL}/icon.png" width="48" height="48" style="border-radius:12px;margin-bottom:16px" />
          <h2 style="color:#312e81">It's been a week!</h2>
          <p style="color:#475569">Hi ${name},</p>
          <p style="color:#475569">Your kids are waiting for you on Koiny. Check their missions and savings in just a few seconds.</p>
          <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Open Koiny</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">You received this because you have a Koiny account. <a href="${APP_URL}/unsubscribe" style="color:#94a3b8">Unsubscribe</a></p>
        </div>`,
      },
    },
    day30: {
      fr: {
        subject: `Un mois sans Koiny — tes enfants ont des missions en attente 🎯`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <img src="${APP_URL}/icon.png" width="48" height="48" style="border-radius:12px;margin-bottom:16px" />
          <h2 style="color:#312e81">Ça fait déjà un mois !</h2>
          <p style="color:#475569">Bonjour ${name},</p>
          <p style="color:#475569">Tes enfants ont peut-être des missions terminées qui attendent ta validation. Prends une minute pour jeter un œil.</p>
          <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Voir les missions</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Tu reçois cet email car tu as un compte Koiny. <a href="${APP_URL}/unsubscribe" style="color:#94a3b8">Se désabonner</a></p>
        </div>`,
      },
      nl: {
        subject: `Een maand zonder Koiny — je kinderen hebben missies in behandeling 🎯`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <img src="${APP_URL}/icon.png" width="48" height="48" style="border-radius:12px;margin-bottom:16px" />
          <h2 style="color:#312e81">Het is al een maand geleden!</h2>
          <p style="color:#475569">Hallo ${name},</p>
          <p style="color:#475569">Je kinderen hebben mogelijk voltooide missies die op jouw goedkeuring wachten. Neem even de tijd om te kijken.</p>
          <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Missies bekijken</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Je ontvangt deze e-mail omdat je een Koiny-account hebt. <a href="${APP_URL}/unsubscribe" style="color:#94a3b8">Uitschrijven</a></p>
        </div>`,
      },
      en: {
        subject: `A month without Koiny — your kids have pending missions 🎯`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <img src="${APP_URL}/icon.png" width="48" height="48" style="border-radius:12px;margin-bottom:16px" />
          <h2 style="color:#312e81">It's been a whole month!</h2>
          <p style="color:#475569">Hi ${name},</p>
          <p style="color:#475569">Your kids may have completed missions waiting for your approval. Take a minute to check in.</p>
          <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">View missions</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">You received this because you have a Koiny account. <a href="${APP_URL}/unsubscribe" style="color:#94a3b8">Unsubscribe</a></p>
        </div>`,
      },
    },
    day90: {
      fr: {
        subject: `⚠️ Ton compte Koiny sera désactivé dans 30 jours`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <img src="${APP_URL}/icon.png" width="48" height="48" style="border-radius:12px;margin-bottom:16px" />
          <h2 style="color:#dc2626">Compte bientôt désactivé</h2>
          <p style="color:#475569">Bonjour ${name},</p>
          <p style="color:#475569">Ton compte Koiny est inactif depuis 90 jours. Sans connexion dans les 30 prochains jours, il sera <strong>désactivé</strong> (tes données seront conservées).</p>
          <p style="color:#475569">Pour le garder actif, connecte-toi une seule fois.</p>
          <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#dc2626;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Réactiver mon compte</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Tu reçois cet email car tu as un compte Koiny. <a href="${APP_URL}/unsubscribe" style="color:#94a3b8">Se désabonner</a></p>
        </div>`,
      },
      nl: {
        subject: `⚠️ Je Koiny-account wordt over 30 dagen gedeactiveerd`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <img src="${APP_URL}/icon.png" width="48" height="48" style="border-radius:12px;margin-bottom:16px" />
          <h2 style="color:#dc2626">Account binnenkort gedeactiveerd</h2>
          <p style="color:#475569">Hallo ${name},</p>
          <p style="color:#475569">Je Koiny-account is al 90 dagen inactief. Als je je de komende 30 dagen niet aanmeldt, wordt het <strong>gedeactiveerd</strong> (je gegevens blijven bewaard).</p>
          <p style="color:#475569">Log één keer in om je account actief te houden.</p>
          <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#dc2626;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Account heractiveren</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Je ontvangt deze e-mail omdat je een Koiny-account hebt. <a href="${APP_URL}/unsubscribe" style="color:#94a3b8">Uitschrijven</a></p>
        </div>`,
      },
      en: {
        subject: `⚠️ Your Koiny account will be deactivated in 30 days`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <img src="${APP_URL}/icon.png" width="48" height="48" style="border-radius:12px;margin-bottom:16px" />
          <h2 style="color:#dc2626">Account deactivation notice</h2>
          <p style="color:#475569">Hi ${name},</p>
          <p style="color:#475569">Your Koiny account has been inactive for 90 days. Without a login in the next 30 days, it will be <strong>deactivated</strong> (your data will be kept safe).</p>
          <p style="color:#475569">Simply log in once to keep your account active.</p>
          <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#dc2626;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Reactivate my account</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">You received this because you have a Koiny account. <a href="${APP_URL}/unsubscribe" style="color:#94a3b8">Unsubscribe</a></p>
        </div>`,
      },
    },
  };

  const lang = language in templates[type] ? language : 'en';
  return templates[type][lang];
}

Deno.serve(async (req) => {
  // Allow manual trigger via POST (for testing)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const results: { email: string; type: string; sent: boolean }[] = [];
  const now = new Date();

  for (const seq of SEQUENCES) {
    const cutoffEnd = new Date(now);
    cutoffEnd.setDate(cutoffEnd.getDate() - seq.days);
    const cutoffStart = new Date(cutoffEnd);
    cutoffStart.setDate(cutoffStart.getDate() - 1); // 1-day window to avoid duplicates

    // Find profiles last updated in the target window
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, language, updated_at')
      .lt('updated_at', cutoffEnd.toISOString())
      .gte('updated_at', cutoffStart.toISOString())
      .eq('inactive_email_sent', seq.type)
      .is('inactive_email_sent', null); // not yet sent this type

    if (error) {
      console.error(`Error fetching profiles for ${seq.type}:`, error);
      continue;
    }

    // Actually: query users whose updated_at is exactly in the window AND haven't received this email
    const { data: targetProfiles, error: err2 } = await supabase
      .from('profiles')
      .select('id, language, updated_at')
      .lt('updated_at', cutoffEnd.toISOString())
      .gte('updated_at', cutoffStart.toISOString());

    if (err2 || !targetProfiles) continue;

    for (const profile of targetProfiles) {
      // Check not already sent via email_logs table
      const { data: existing } = await supabase
        .from('email_logs')
        .select('id')
        .eq('user_id', profile.id)
        .eq('email_type', seq.type)
        .maybeSingle();

      if (existing) continue; // already sent

      // Get auth user email
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      if (!authUser?.user?.email) continue;

      const email = authUser.user.email;
      const firstName = email.split('@')[0]; // fallback name
      const lang = profile.language || 'en';

      const { subject, html } = getEmailContent(seq.type, lang, '');

      await sendEmail(email, subject, html);

      // Log the sent email to avoid duplicates
      await supabase.from('email_logs').insert({
        user_id: profile.id,
        email_type: seq.type,
        sent_at: now.toISOString(),
      });

      results.push({ email, type: seq.type, sent: true });
    }
  }

  console.log(`notify-inactive-users: processed ${results.length} emails`);
  return new Response(JSON.stringify({ ok: true, sent: results.length, details: results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
