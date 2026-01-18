BEGIN;

-- Add calorie-related columns to daily_logs
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS calorie_target INTEGER DEFAULT 1500;
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS calories_consumed INTEGER DEFAULT 0;

-- Add calories to meals table
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS calories INTEGER DEFAULT 0;

COMMIT;
