-- =====================================================
-- Migration: Create tables for Dynamic Progress Feature
-- =====================================================
-- Creates tables for tracking user activity, progress stats,
-- daily tips, and milestone progress.

BEGIN;
-- =====================================================
-- 1. Create activity_type ENUM
-- =====================================================

DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM (
        'resource_viewed', 
        'resource_saved', 
        'resource_shared',
        'milestone_completed',
        'milestone_uncompleted',
        'question_asked',
        'tip_viewed',
        'search_performed',
        'category_filtered'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- =====================================================
-- 2. Create daily_tips table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.daily_tips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tip_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    parenting_stage parenting_stage NOT NULL,
    child_age_months INTEGER,
    quick_tips TEXT[],
    is_viewed BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tip_date)
);
COMMENT ON TABLE public.daily_tips IS 'Personalized daily tips generated for users based on their profile and children';
-- Enable RLS
ALTER TABLE public.daily_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own daily tips"
    ON public.daily_tips FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily tips"
    ON public.daily_tips FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily tips"
    ON public.daily_tips FOR UPDATE
    USING (auth.uid() = user_id);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_tips_user_id ON public.daily_tips(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tips_tip_date ON public.daily_tips(tip_date);
-- =====================================================
-- 3. Create user_activity_log table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type activity_type NOT NULL,
    resource_id UUID, -- Can reference articles or resources, kept loose for flexibility
    milestone_id UUID, -- Can reference milestones or templates
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.user_activity_log IS 'Log of user interactions and engagement activities';
-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own activity log"
    ON public.user_activity_log FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activity log"
    ON public.user_activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_activity_type ON public.user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON public.user_activity_log(created_at);
-- =====================================================
-- 4. Create user_progress_stats table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_progress_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    questions_asked INTEGER DEFAULT 0,
    tips_received INTEGER DEFAULT 0,
    content_saved INTEGER DEFAULT 0,
    milestones_completed INTEGER DEFAULT 0,
    resources_viewed INTEGER DEFAULT 0,
    search_queries INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);
COMMENT ON TABLE public.user_progress_stats IS 'Weekly aggregated user engagement and progress statistics';
-- Enable RLS
ALTER TABLE public.user_progress_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own progress stats"
    ON public.user_progress_stats FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress stats"
    ON public.user_progress_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress stats"
    ON public.user_progress_stats FOR UPDATE
    USING (auth.uid() = user_id);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_stats_user_id ON public.user_progress_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_stats_week_start ON public.user_progress_stats(week_start_date);
-- Trigger for updated_at
CREATE TRIGGER update_user_progress_stats_updated_at
    BEFORE UPDATE ON public.user_progress_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- 5. Create milestone_templates table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.milestone_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL CHECK (length(title) >= 1 AND length(title) <= 100),
    description TEXT,
    category milestone_type NOT NULL,
    age_min_months INTEGER NOT NULL CHECK (age_min_months >= 0),
    age_max_months INTEGER NOT NULL CHECK (age_max_months >= age_min_months),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.milestone_templates IS 'Master list of developmental milestones organized by age range and category';
-- Enable RLS
ALTER TABLE public.milestone_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view active milestone templates"
    ON public.milestone_templates FOR SELECT
    TO authenticated
    USING (is_active = TRUE);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_milestone_templates_category ON public.milestone_templates(category);
CREATE INDEX IF NOT EXISTS idx_milestone_templates_age_range ON public.milestone_templates(age_min_months, age_max_months);
-- =====================================================
-- 6. Create user_milestone_progress table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_milestone_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    milestone_template_id UUID REFERENCES public.milestone_templates(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, child_id, milestone_template_id)
);
COMMENT ON TABLE public.user_milestone_progress IS 'User-specific milestone progress tracking for each child';
-- Enable RLS
ALTER TABLE public.user_milestone_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view milestone progress for their children"
    ON public.user_milestone_progress FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert milestone progress for their children"
    ON public.user_milestone_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update milestone progress for their children"
    ON public.user_milestone_progress FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can delete milestone progress for their children"
    ON public.user_milestone_progress FOR DELETE
    USING (auth.uid() = user_id);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_milestone_progress_user_id ON public.user_milestone_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_milestone_progress_child_id ON public.user_milestone_progress(child_id);
-- Trigger for updated_at
CREATE TRIGGER update_user_milestone_progress_updated_at
    BEFORE UPDATE ON public.user_milestone_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
COMMIT;
