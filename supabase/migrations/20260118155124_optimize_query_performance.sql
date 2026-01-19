BEGIN;

-- Add indexes for foreign keys to speed up joins
CREATE INDEX IF NOT EXISTS idx_meals_log_id ON public.meals(log_id);
CREATE INDEX IF NOT EXISTS idx_activities_log_id ON public.activities(log_id);

-- Add index for user_name and date lookups if not already covered by unique constraint
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_name, date);

COMMIT;
