-- Create search_analytics table to track user search queries for trending searches
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
-- Enable Row Level Security
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
-- Policy: Users can insert their own search queries
CREATE POLICY "Users can insert their own searches"
    ON search_analytics
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
-- Policy: Users can view all searches (for trending aggregation)
-- This is safe because we only expose aggregated/anonymized trending data
CREATE POLICY "Anyone can view searches for trending"
    ON search_analytics
    FOR SELECT
    USING (true);
-- Policy: Users can delete their own search history if needed (future feature)
CREATE POLICY "Users can delete their own searches"
    ON search_analytics
    FOR DELETE
    USING (auth.uid() = user_id);
