-- Create recipes table (legacy parenting app table)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    feeding_types TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    dietary_tags TEXT[] DEFAULT '{}'::TEXT[],
    kitchen_style_tags TEXT[] DEFAULT '{}'::TEXT[],
    meal_types TEXT[] DEFAULT '{}'::TEXT[],
    cuisine TEXT,
    age_range_min INTEGER DEFAULT 0 NOT NULL,
    age_range_max INTEGER DEFAULT 120 NOT NULL,
    ingredients JSONB DEFAULT '[]'::jsonb NOT NULL,
    instructions JSONB DEFAULT '[]'::jsonb NOT NULL,
    tips TEXT[] DEFAULT '{}'::TEXT[],
    time_minutes INTEGER DEFAULT 30,
    difficulty TEXT DEFAULT 'easy'::TEXT,
    servings INTEGER DEFAULT 2,
    calories INTEGER,
    rating DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    allergens TEXT[] DEFAULT '{}'::TEXT[],
    storage TEXT,
    image_description TEXT,
    CONSTRAINT recipes_difficulty_check CHECK (difficulty = ANY (ARRAY['easy'::TEXT, 'medium'::TEXT, 'hard'::TEXT])),
    CONSTRAINT recipes_rating_check CHECK (rating >= 0::DOUBLE PRECISION AND rating <= 5::DOUBLE PRECISION)
);

CREATE INDEX IF NOT EXISTS idx_recipes_age_range ON public.recipes (age_range_min, age_range_max);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON public.recipes (cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags ON public.recipes USING gin (dietary_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_feeding_types ON public.recipes USING gin (feeding_types);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_types ON public.recipes USING gin (meal_types);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'Recipes are viewable by everyone') THEN
    CREATE POLICY "Recipes are viewable by everyone" ON public.recipes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'Allow anyone to insert recipes') THEN
    CREATE POLICY "Allow anyone to insert recipes" ON public.recipes FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'Authenticated users can insert recipes') THEN
    CREATE POLICY "Authenticated users can insert recipes" ON public.recipes FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Create saved_recipes table
CREATE TABLE IF NOT EXISTS saved_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, recipe_id)
);
-- RLS Policies
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own saved recipes" 
    ON saved_recipes FOR SELECT 
    USING (auth.uid() = user_id);
CREATE POLICY "Users can save recipes" 
    ON saved_recipes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave recipes" 
    ON saved_recipes FOR DELETE 
    USING (auth.uid() = user_id);
