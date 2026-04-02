# Déploiement — notify-inactive-users

## 1. Créer un compte Resend (gratuit)
1. Va sur https://resend.com → Sign up
2. Add Domain → `koiny.app` → suis les instructions DNS (3 records TXT/MX)
3. API Keys → Create API Key → copie la clé `re_xxx`

## 2. Installer Supabase CLI (si pas déjà fait)
```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref xmicutzneisrrtqgstro
```

## 3. Ajouter les secrets
```bash
supabase secrets set RESEND_API_KEY=re_ton_vrai_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=ton_service_role_key
```
(Service role key = Supabase Dashboard → Settings → API → service_role)

## 4. Déployer la fonction
```bash
supabase functions deploy notify-inactive-users
```

## 5. Créer la table email_logs dans Supabase
Supabase Dashboard → SQL Editor → colle le contenu de `migrations/20260402_email_logs.sql`

## 6. Activer pg_cron
Supabase Dashboard → Database → Extensions → cherche `pg_cron` → Enable

## 7. Tester manuellement
```bash
curl -X POST https://xmicutzneisrrtqgstro.supabase.co/functions/v1/notify-inactive-users \
  -H "Authorization: Bearer TON_ANON_KEY"
```

## Séquence d'emails
| Inactivité | Email |
|---|---|
| 7 jours | "Tu nous manques" |
| 30 jours | "Tes enfants ont des missions en attente" |
| 90 jours | "⚠️ Compte désactivé dans 30 jours" |

Les emails sont envoyés en FR/NL/EN selon la langue du profil.
La table `email_logs` garantit qu'un email n'est jamais envoyé deux fois.
