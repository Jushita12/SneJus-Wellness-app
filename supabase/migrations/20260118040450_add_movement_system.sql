BEGIN;

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES public.daily_logs(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- Gym, Home, Yoga, Walk, Cardio
    duration INTEGER, -- in minutes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Allow public insert activities" ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update activities" ON public.activities FOR UPDATE USING (true);
CREATE POLICY "Allow public delete activities" ON public.activities FOR DELETE USING (true);

-- Add movement streak to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS movement_streak INTEGER DEFAULT 0;

COMMIT;