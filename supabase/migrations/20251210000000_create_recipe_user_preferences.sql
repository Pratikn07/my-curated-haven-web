-- Migration: Create recipe_user_preferences table
-- This table stores recipe-related user preferences, keeping the profiles table clean

CREATE TABLE IF NOT EXISTS public.recipe_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Cooking preferences
    cuisine_preference TEXT,                    -- 'indian', 'italian', 'mexican', 'asian', 'american', etc.
    cooking_skill_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    
    -- Track substitution history for personalization
    common_substitutes_used JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One preferences row per user
    CONSTRAINT recipe_user_preferences_profile_id_unique UNIQUE(profile_id)
);
-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipe_user_preferences_profile_id 
ON public.recipe_user_preferences(profile_id);
-- Enable RLS
ALTER TABLE public.recipe_user_preferences ENABLE ROW LEVEL SECURITY;
-- RLS Policies: Users can only access their own preferences
CREATE POLICY "Users can view their own recipe preferences"
ON public.recipe_user_preferences
FOR SELECT
USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert their own recipe preferences"
ON public.recipe_user_preferences
FOR INSERT
WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own recipe preferences"
ON public.recipe_user_preferences
FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own recipe preferences"
ON public.recipe_user_preferences
FOR DELETE
USING (auth.uid() = profile_id);
-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recipe_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger for auto-updating updated_at
CREATE TRIGGER recipe_preferences_updated_at_trigger
    BEFORE UPDATE ON public.recipe_user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_preferences_updated_at();
-- Grant permissions
GRANT ALL ON public.recipe_user_preferences TO authenticated;
GRANT ALL ON public.recipe_user_preferences TO service_role;
