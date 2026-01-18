BEGIN;

-- Add specific streak columns to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS meal_streak INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS water_streak INTEGER DEFAULT 0;

COMMIT;
