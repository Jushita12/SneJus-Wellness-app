BEGIN;

-- Create daily_logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    date DATE NOT NULL,
    water FLOAT DEFAULT 0,
    steps INTEGER DEFAULT 0,
    mood TEXT DEFAULT 'Good',
    symptoms TEXT[] DEFAULT '{}',
    sugar_cravings TEXT DEFAULT 'None',
    waist FLOAT,
    weight FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_name, date)
);

-- Create meals table
CREATE TABLE IF NOT EXISTS public.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES public.daily_logs(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- Breakfast, Lunch, Dinner, Snack
    description TEXT NOT NULL,
    has_rice BOOLEAN DEFAULT FALSE,
    is_non_veg BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Simple policies for now (public access for the sisters)
CREATE POLICY "Allow public read daily_logs" ON public.daily_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert daily_logs" ON public.daily_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update daily_logs" ON public.daily_logs FOR UPDATE USING (true);

CREATE POLICY "Allow public read meals" ON public.meals FOR SELECT USING (true);
CREATE POLICY "Allow public insert meals" ON public.meals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update meals" ON public.meals FOR UPDATE USING (true);
CREATE POLICY "Allow public delete meals" ON public.meals FOR DELETE USING (true);

COMMIT;