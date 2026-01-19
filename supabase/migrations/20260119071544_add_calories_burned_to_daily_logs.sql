BEGIN;

-- Add calories_burned to daily_logs for easier tracking and synchronization
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS calories_burned INTEGER DEFAULT 0;

COMMIT;
