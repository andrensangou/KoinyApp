// Koiny — Edge Function: notify-trial-ending
// Sends a trial-ending reminder email to users whose trial expires soon.
// Can be triggered manually or via pg_cron.
// Deploy: supabase functions deploy notify-trial-ending
// Secrets: RESEND_API_KEY, SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Koiny <hello@koiny.app>';
const APP_URL = 'https://koiny.app';
const APP_STORE_URL = 'https://apps.apple.com/app/id6760566260';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
    return false;
  }
  return true;
}

function getTrialEmail(language: string, daysLeft: number, firstName: string): { subject: string; html: string } {
  const name = firstName && firstName !== 'Parent' ? firstName : null;

  const templates: Record<string, { subject: string; html: string }> = {
    fr: {
      subject: `Votre essai Koiny Premium se termine dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} ⏳`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff">
        <img src="${APP_URL}/logo.png" width="48" height="48" style="border-radius:12px;margin-bottom:20px" />
        <h2 style="color:#312e81;margin:0 0 8px">Votre essai gratuit se termine bientôt</h2>
        ${name ? `<p style="color:#475569;margin:0 0 16px">Bonjour ${name},</p>` : ''}
        <p style="color:#475569;margin:0 0 16px">
          Votre accès <strong>Koiny Premium</strong> expire dans <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.
          Après cela, vous reviendrez au plan gratuit (1 enfant, 2 missions, 1 objectif).
        </p>
        <p style="color:#475569;margin:0 0 24px">
          Pour continuer à profiter de missions illimitées, d'enfants illimités et de l'historique complet, activez votre abonnement directement dans l'app.
        </p>
        <div style="background:#f5f7ff;border-radius:12px;padding:16px;margin:0 0 24px">
          <p style="color:#312e81;font-weight:bold;margin:0 0 8px">✅ Ce que vous gardez avec Premium :</p>
          <ul style="color:#475569;margin:0;padding-left:20px;line-height:1.8">
            <li>Enfants illimités</li>
            <li>Missions &amp; objectifs illimités</li>
            <li>Historique complet</li>
            <li>Statistiques &amp; graphiques</li>
          </ul>
        </div>
        <a href="${APP_STORE_URL}" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px">
          Continuer avec Premium →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;line-height:1.6">
          Seulement 1,99€/mois ou 16,99€/an. Annulable à tout moment.<br>
          <a href="${APP_URL}" style="color:#94a3b8">koiny.app</a>
        </p>
      </div>`,
    },
    en: {
      subject: `Your Koiny Premium trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''} ⏳`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff">
        <img src="${APP_URL}/logo.png" width="48" height="48" style="border-radius:12px;margin-bottom:20px" />
        <h2 style="color:#312e81;margin:0 0 8px">Your free trial is ending soon</h2>
        ${name ? `<p style="color:#475569;margin:0 0 16px">Hi ${name},</p>` : ''}
        <p style="color:#475569;margin:0 0 16px">
          Your <strong>Koiny Premium</strong> access expires in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.
          After that, you'll return to the free plan (1 child, 2 missions, 1 goal).
        </p>
        <p style="color:#475569;margin:0 0 24px">
          To keep unlimited missions, unlimited children, and full history, activate your subscription directly in the app.
        </p>
        <div style="background:#f5f7ff;border-radius:12px;padding:16px;margin:0 0 24px">
          <p style="color:#312e81;font-weight:bold;margin:0 0 8px">✅ What you keep with Premium:</p>
          <ul style="color:#475569;margin:0;padding-left:20px;line-height:1.8">
            <li>Unlimited children</li>
            <li>Unlimited missions &amp; goals</li>
            <li>Full history</li>
            <li>Statistics &amp; charts</li>
          </ul>
        </div>
        <a href="${APP_STORE_URL}" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px">
          Continue with Premium →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;line-height:1.6">
          Only €1.99/month or €16.99/year. Cancel anytime.<br>
          <a href="${APP_URL}" style="color:#94a3b8">koiny.app</a>
        </p>
      </div>`,
    },
    nl: {
      subject: `Uw Koiny Premium proefperiode eindigt over ${daysLeft} dag${daysLeft > 1 ? 'en' : ''} ⏳`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff">
        <img src="${APP_URL}/logo.png" width="48" height="48" style="border-radius:12px;margin-bottom:20px" />
        <h2 style="color:#312e81;margin:0 0 8px">Uw gratis proefperiode eindigt binnenkort</h2>
        ${name ? `<p style="color:#475569;margin:0 0 16px">Hallo ${name},</p>` : ''}
        <p style="color:#475569;margin:0 0 16px">
          Uw <strong>Koiny Premium</strong> toegang verloopt over <strong>${daysLeft} dag${daysLeft > 1 ? 'en' : ''}</strong>.
          Daarna gaat u terug naar het gratis plan (1 kind, 2 missies, 1 doel).
        </p>
        <p style="color:#475569;margin:0 0 24px">
          Om te blijven genieten van onbeperkte missies, onbeperkte kinderen en volledige geschiedenis, activeer uw abonnement in de app.
        </p>
        <a href="${APP_STORE_URL}" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px">
          Doorgaan met Premium →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;line-height:1.6">
          Slechts €1,99/maand of €16,99/jaar. Altijd opzegbaar.<br>
          <a href="${APP_URL}" style="color:#94a3b8">koiny.app</a>
        </p>
      </div>`,
    },
  };

  return templates[language] || templates['en'];
}

Deno.serve(async (req) => {
  try {
    // Accept optional JSON body with specific user_ids or emails to target
    let targets: { email: string; language: string; full_name: string; days_left: number }[] = [];

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    if (body.targets) {
      // Manual targets passed directly
      targets = body.targets;
    } else {
      // Auto-detect: query profiles with real emails created 11-13 days ago (trial ends in 1-3 days)
      const now = new Date();
      const from = new Date(now.getTime() - 13 * 86400000).toISOString();
      const to = new Date(now.getTime() - 11 * 86400000).toISOString();

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, language, created_at')
        .gte('created_at', from)
        .lte('created_at', to)
        .eq('marketing_consent', true)
        .not('email', 'is', null);

      if (error) throw error;

      for (const p of profiles || []) {
        const created = new Date(p.created_at);
        const expiry = new Date(created.getTime() + 14 * 86400000);
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
        targets.push({
          email: p.email,
          language: p.language || 'fr',
          full_name: p.full_name || '',
          days_left: daysLeft,
        });
      }
    }

    const results = [];
    for (const t of targets) {
      const { subject, html } = getTrialEmail(t.language, t.days_left, t.full_name);
      const ok = await sendEmail(t.email, subject, html);

      // Log in email_logs to avoid duplicates
      await supabase.from('email_logs').insert({
        email: t.email,
        email_type: `trial_ending_${t.days_left}d`,
        sent_at: new Date().toISOString(),
      }).select();

      results.push({ email: t.email, sent: ok, days_left: t.days_left });
      console.log(`Trial ending email → ${t.email} (${t.days_left}d left): ${ok ? 'OK' : 'FAIL'}`);
    }

    return new Response(JSON.stringify({ success: true, sent: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
