BEGIN;

-- Add calories_burned column to activities table
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS calories_burned INTEGER;

COMMIT;
