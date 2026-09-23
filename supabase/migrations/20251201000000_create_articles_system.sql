-- =====================================================
-- Migration: Create articles table and related structures
-- =====================================================
--
-- This migration creates the articles table for age-appropriate parenting content
-- and the saved_articles table for bookmarking functionality.
--
-- Combines:
-- - migrations/004_create_articles_table.sql
-- - migrations/003_saved_articles.sql (with FK fix)

BEGIN;
-- =====================================================
-- 1. Create articles table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  age_min_days INTEGER,
  age_max_days INTEGER,
  tags TEXT[],
  locale TEXT DEFAULT 'en-US' NOT NULL,
  last_reviewed_at TIMESTAMPTZ,
  reviewer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add table and column comments
COMMENT ON TABLE public.articles IS 'Expert-written parenting articles with age-based filtering for personalized recommendations';
COMMENT ON COLUMN public.articles.id IS 'Primary key';
COMMENT ON COLUMN public.articles.slug IS 'URL-friendly unique identifier for SEO';
COMMENT ON COLUMN public.articles.title IS 'Article headline displayed to users';
COMMENT ON COLUMN public.articles.body_md IS 'Full article content in markdown format';
COMMENT ON COLUMN public.articles.age_min_days IS 'Minimum child age in days (null = all ages/expecting)';
COMMENT ON COLUMN public.articles.age_max_days IS 'Maximum child age in days (null = all ages)';
COMMENT ON COLUMN public.articles.tags IS 'Array of tags for categorization (sleep, feeding, development, etc.)';
COMMENT ON COLUMN public.articles.locale IS 'Language/region code for internationalization';
COMMENT ON COLUMN public.articles.last_reviewed_at IS 'Timestamp of last content review for freshness tracking';
COMMENT ON COLUMN public.articles.reviewer IS 'Name/ID of person who last reviewed content';
COMMENT ON COLUMN public.articles.created_at IS 'Timestamp when article was created';
COMMENT ON COLUMN public.articles.updated_at IS 'Timestamp when article was last modified';
-- Enable Row Level Security
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
-- Articles are educational content - publicly readable by all authenticated users
CREATE POLICY "Anyone can view articles"
  ON public.articles FOR SELECT
  USING (true);
-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_articles_age_range 
  ON public.articles(age_min_days, age_max_days);
CREATE INDEX IF NOT EXISTS idx_articles_tags 
  ON public.articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_locale 
  ON public.articles(locale);
CREATE INDEX IF NOT EXISTS idx_articles_slug 
  ON public.articles(slug);
-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply trigger to articles table
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- 2. Create saved_articles table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saved_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);
-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_saved_articles_user_id ON public.saved_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_articles_article_id ON public.saved_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_saved_articles_created_at ON public.saved_articles(created_at);
-- Enable RLS
ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;
-- RLS Policies: Users can only access their own saved articles
CREATE POLICY "Users can view their own saved articles"
  ON public.saved_articles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can save articles"
  ON public.saved_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave their own articles"
  ON public.saved_articles FOR DELETE
  USING (auth.uid() = user_id);
-- Add table comments
COMMENT ON TABLE public.saved_articles IS 'Stores user bookmarked/saved articles for quick access';
COMMENT ON COLUMN public.saved_articles.user_id IS 'Reference to the user who saved the article';
COMMENT ON COLUMN public.saved_articles.article_id IS 'Reference to the saved article';
COMMENT ON COLUMN public.saved_articles.created_at IS 'Timestamp when the article was saved';
COMMIT;
-- =====================================================
-- Migration complete
-- =====================================================
-- Next step: Run migrations/005_seed_articles.sql to insert 27 articles;
