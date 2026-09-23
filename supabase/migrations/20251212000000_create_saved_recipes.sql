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
