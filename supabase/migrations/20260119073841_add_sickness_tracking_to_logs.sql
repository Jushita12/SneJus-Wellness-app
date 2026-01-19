BEGIN;

-- Add sickness tracking to daily_logs
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS is_sick BOOLEAN DEFAULT FALSE;
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS sick_notes TEXT;

COMMIT;
