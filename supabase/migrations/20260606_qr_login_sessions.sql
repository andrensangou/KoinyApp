-- ════════════════════════════════════════════════════════════════════════
-- QR Login — connexion d'un appareil par scan de QR code (façon WhatsApp Web)
--
-- Flux :
--   1. Tablette non connectée → génère un `code` secret, affiche le QR
--   2. Téléphone parent (connecté) → scanne le QR, approuve via edge function
--   3. Edge function → génère un OTP magic-link, le stocke ici
--   4. Tablette → récupère l'OTP, ouvre une vraie session Supabase
--
-- SÉCURITÉ : la table est totalement verrouillée (service role uniquement).
-- Tout accès passe par l'edge function `qr-auth`. Le jeton `auth_token` est
-- sensible et à durée de vie très courte (≤ 5 min, consommé une seule fois).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.qr_login_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,              -- secret haute entropie, contenu du QR
  status       TEXT NOT NULL DEFAULT 'pending'    -- 'pending' | 'claimed' | 'consumed'
                 CHECK (status IN ('pending', 'claimed', 'consumed')),
  auth_email   TEXT,                              -- rempli après approbation parent
  auth_token   TEXT,                              -- OTP magic-link (sensible, éphémère)
  approved_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- audit : quel parent
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL               -- now() + 5 min côté edge function
);

-- Recherche rapide par code (lookup à chaque poll)
CREATE INDEX IF NOT EXISTS idx_qr_login_code ON public.qr_login_sessions (code);

-- Recherche des sessions expirées pour le nettoyage
CREATE INDEX IF NOT EXISTS idx_qr_login_expires ON public.qr_login_sessions (expires_at);

-- ── RLS : aucun accès client. Seul le service role (edge function) touche la table ──
ALTER TABLE public.qr_login_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.qr_login_sessions
  USING (false)
  WITH CHECK (false);

-- ── Nettoyage automatique des sessions expirées (toutes les heures) ──
-- Requiert pg_cron (déjà activé pour notify-inactive-users)
SELECT cron.schedule(
  'qr-login-cleanup-hourly',
  '0 * * * *',  -- toutes les heures
  $$
    DELETE FROM public.qr_login_sessions
    WHERE expires_at < now() - INTERVAL '1 hour';
  $$
);
