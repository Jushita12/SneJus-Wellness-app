BEGIN;

-- Create cycle_settings table for onboarding data
CREATE TABLE IF NOT EXISTS public.cycle_settings (
    user_name TEXT PRIMARY KEY REFERENCES public.user_profiles(user_name) ON DELETE CASCADE,
    last_period_start DATE,
    period_duration INTEGER DEFAULT 5,
    cycle_length INTEGER DEFAULT 28,
    is_regular TEXT DEFAULT 'somewhat',
    tracking_goal TEXT DEFAULT 'periods and symptoms',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add flow_level to daily_logs
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS flow_level TEXT; -- light, medium, heavy, spotting

-- Enable RLS
ALTER TABLE public.cycle_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read cycle_settings" ON public.cycle_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert cycle_settings" ON public.cycle_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update cycle_settings" ON public.cycle_settings FOR UPDATE USING (true);

COMMIT;
