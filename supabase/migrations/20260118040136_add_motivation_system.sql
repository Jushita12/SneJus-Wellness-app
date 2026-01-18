BEGIN;

-- Add streak and badge columns to daily_logs or a new user_profiles table
-- Since we don't have a formal user table yet, we'll create one to track persistent stats
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_name TEXT PRIMARY KEY,
    streak_count INTEGER DEFAULT 0,
    last_active_date DATE,
    unlocked_badges TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial profiles for the sisters
INSERT INTO public.user_profiles (user_name) VALUES ('Jushita'), ('Sneha') ON CONFLICT DO NOTHING;

-- Create a table for shared achievements
CREATE TABLE IF NOT EXISTS public.shared_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_key TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read user_profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public update user_profiles" ON public.user_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public read shared_achievements" ON public.shared_achievements FOR SELECT USING (true);

COMMIT;