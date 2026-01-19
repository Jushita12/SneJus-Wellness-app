BEGIN;

-- Add period tracking to daily_logs
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS is_period BOOLEAN DEFAULT FALSE;
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS cycle_day INTEGER;

COMMIT;
