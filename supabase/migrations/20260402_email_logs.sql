-- Table to track sent re-engagement emails and avoid duplicates
CREATE TABLE IF NOT EXISTS public.email_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type  TEXT NOT NULL,  -- 'day7' | 'day30' | 'day90'
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_type)  -- one email per type per user
);

-- RLS: only service role can read/write
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.email_logs
  USING (false)
  WITH CHECK (false);

-- Schedule the edge function to run daily at 08:00 UTC via pg_cron
-- Requires pg_cron extension enabled in Supabase dashboard
SELECT cron.schedule(
  'notify-inactive-users-daily',
  '0 8 * * *',  -- every day at 08:00 UTC
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notify-inactive-users',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
