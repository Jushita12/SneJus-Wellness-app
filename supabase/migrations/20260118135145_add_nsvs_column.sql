BEGIN;

-- Add nsvs column to daily_logs
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS nsvs TEXT[] DEFAULT '{}';

COMMIT;
