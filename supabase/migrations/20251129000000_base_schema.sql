-- =====================================================
-- MY CURATED HAVEN DATABASE SCHEMA
-- =====================================================
-- 
-- This comprehensive database schema supports a parenting app with the following features:
-- 
-- 🔐 USER MANAGEMENT
--   - User profiles with parenting-specific information
--   - OAuth integration with Supabase Auth
--   - Onboarding flow tracking
-- 
-- 👶 CHILD TRACKING  
--   - Multiple children per parent
--   - Birth date tracking for age-based features
--   - Gender information for personalized content
-- 
-- 📈 MILESTONE TRACKING
--   - Developmental milestones by category
--   - Achievement timestamps
--   - Physical, cognitive, social, and emotional development
-- 
-- 💬 AI CHAT ASSISTANT
--   - Conversation history storage
--   - User questions and AI responses
--   - Contextual parenting advice
-- 
-- 📚 EDUCATIONAL RESOURCES
--   - Curated parenting content
--   - Stage-specific resources
--   - Categorized and tagged content
-- 
-- 🔒 SECURITY
--   - Row Level Security (RLS) policies
--   - User data isolation
--   - Secure API access
-- 
-- This script creates all necessary tables, indexes, and RLS policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =====================================================
-- ENUMS
-- Custom data types for consistent categorization
-- =====================================================

CREATE TYPE parenting_stage AS ENUM ('expecting', 'newborn', 'infant', 'toddler');
CREATE TYPE feeding_preference AS ENUM ('breastfeeding', 'formula', 'mixed');
CREATE TYPE milestone_type AS ENUM ('physical', 'cognitive', 'social', 'emotional');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
-- Add descriptions for ENUM types
COMMENT ON TYPE parenting_stage IS 'Stages of parenting journey: expecting (pregnancy), newborn (0-3 months), infant (3-12 months), toddler (1-3 years)';
COMMENT ON TYPE feeding_preference IS 'Feeding methods: breastfeeding (exclusively breast milk), formula (exclusively formula), mixed (combination)';
COMMENT ON TYPE milestone_type IS 'Categories of child development milestones: physical (motor skills), cognitive (thinking/learning), social (interaction), emotional (feelings/behavior)';
COMMENT ON TYPE gender IS 'Gender options: male, female, or other for inclusive representation';
-- =====================================================
-- PROFILES TABLE (extends auth.users)
-- Stores user profile information for parents using the app
-- =====================================================

CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 50),
    email TEXT NOT NULL UNIQUE,
    parenting_stage parenting_stage DEFAULT 'expecting',
    feeding_preference feeding_preference DEFAULT 'breastfeeding',
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add table and column descriptions
COMMENT ON TABLE public.users IS 'User profiles for parents, extending Supabase auth.users with parenting-specific information';
COMMENT ON COLUMN public.users.id IS 'Primary key referencing auth.users.id';
COMMENT ON COLUMN public.users.name IS 'Full name of the parent (2-50 characters)';
COMMENT ON COLUMN public.users.email IS 'Email address, must be unique across all users';
COMMENT ON COLUMN public.users.parenting_stage IS 'Current parenting stage: expecting, newborn, infant, or toddler';
COMMENT ON COLUMN public.users.feeding_preference IS 'Preferred feeding method: breastfeeding, formula, or mixed';
COMMENT ON COLUMN public.users.has_completed_onboarding IS 'Whether the user has completed the initial onboarding flow';
COMMENT ON COLUMN public.users.avatar_url IS 'URL to the user''s profile picture';
COMMENT ON COLUMN public.users.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN public.users.updated_at IS 'Timestamp when the profile was last updated';
-- =====================================================
-- CHILDREN TABLE
-- Stores information about children/babies for each parent
-- =====================================================

CREATE TABLE public.children (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 50),
    birth_date DATE,
    gender gender,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add table and column descriptions
COMMENT ON TABLE public.children IS 'Information about children/babies belonging to each parent user';
COMMENT ON COLUMN public.children.id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN public.children.user_id IS 'Foreign key referencing the parent''s profile ID';
COMMENT ON COLUMN public.children.name IS 'Child''s name (1-50 characters)';
COMMENT ON COLUMN public.children.birth_date IS 'Child''s date of birth, used for age calculations and milestone tracking';
COMMENT ON COLUMN public.children.gender IS 'Child''s gender: male, female, or other';
COMMENT ON COLUMN public.children.created_at IS 'Timestamp when the child record was created';
COMMENT ON COLUMN public.children.updated_at IS 'Timestamp when the child record was last updated';
-- =====================================================
-- MILESTONES TABLE
-- Tracks developmental milestones achieved by children
-- =====================================================

CREATE TABLE public.milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(title) >= 1 AND length(title) <= 100),
    description TEXT,
    achieved_at TIMESTAMP WITH TIME ZONE,
    milestone_type milestone_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add table and column descriptions
COMMENT ON TABLE public.milestones IS 'Developmental milestones achieved by children, categorized by type';
COMMENT ON COLUMN public.milestones.id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN public.milestones.child_id IS 'Foreign key referencing the child who achieved this milestone';
COMMENT ON COLUMN public.milestones.title IS 'Brief title of the milestone (1-100 characters)';
COMMENT ON COLUMN public.milestones.description IS 'Detailed description of the milestone achievement';
COMMENT ON COLUMN public.milestones.achieved_at IS 'Timestamp when the milestone was achieved';
COMMENT ON COLUMN public.milestones.milestone_type IS 'Category of milestone: physical, cognitive, social, or emotional';
COMMENT ON COLUMN public.milestones.created_at IS 'Timestamp when the milestone record was created';
COMMENT ON COLUMN public.milestones.updated_at IS 'Timestamp when the milestone record was last updated';
-- =====================================================
-- CHAT MESSAGES TABLE (for AI chat history)
-- Stores conversation history between users and the AI assistant
-- =====================================================

CREATE TABLE public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    is_from_user BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add table and column descriptions
COMMENT ON TABLE public.chat_messages IS 'Chat conversation history between users and the AI parenting assistant';
COMMENT ON COLUMN public.chat_messages.id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN public.chat_messages.user_id IS 'Foreign key referencing the user who sent/received the message';
COMMENT ON COLUMN public.chat_messages.message IS 'The message content (user question or AI response)';
COMMENT ON COLUMN public.chat_messages.response IS 'AI response to user message (deprecated, use is_from_user instead)';
COMMENT ON COLUMN public.chat_messages.is_from_user IS 'True if message is from user, false if from AI assistant';
COMMENT ON COLUMN public.chat_messages.created_at IS 'Timestamp when the message was sent/received';
-- =====================================================
-- RESOURCES TABLE (for parenting content)
-- Stores educational content and resources for parents
-- =====================================================

CREATE TABLE public.resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    category TEXT,
    parenting_stages parenting_stage[],
    tags TEXT[],
    image_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add table and column descriptions
COMMENT ON TABLE public.resources IS 'Educational content and resources for parents, organized by category and parenting stage';
COMMENT ON COLUMN public.resources.id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN public.resources.title IS 'Title of the resource article or content';
COMMENT ON COLUMN public.resources.description IS 'Brief description or summary of the resource';
COMMENT ON COLUMN public.resources.content IS 'Full content of the resource (markdown or HTML)';
COMMENT ON COLUMN public.resources.category IS 'Category of the resource (e.g., Sleep, Feeding, Development)';
COMMENT ON COLUMN public.resources.parenting_stages IS 'Array of parenting stages this resource applies to';
COMMENT ON COLUMN public.resources.tags IS 'Array of tags for categorization and search';
COMMENT ON COLUMN public.resources.image_url IS 'URL to the resource''s featured image';
COMMENT ON COLUMN public.resources.is_featured IS 'Whether this resource should be featured prominently';
COMMENT ON COLUMN public.resources.created_at IS 'Timestamp when the resource was created';
COMMENT ON COLUMN public.resources.updated_at IS 'Timestamp when the resource was last updated';
-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON public.users(email);
CREATE INDEX idx_profiles_parenting_stage ON public.users(parenting_stage);
-- Children indexes  
CREATE INDEX idx_children_user_id ON public.children(user_id);
CREATE INDEX idx_children_birth_date ON public.children(birth_date);
-- Milestones indexes
CREATE INDEX idx_milestones_child_id ON public.milestones(child_id);
CREATE INDEX idx_milestones_achieved_at ON public.milestones(achieved_at);
CREATE INDEX idx_milestones_type ON public.milestones(milestone_type);
-- Chat messages indexes
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
-- Resources indexes
CREATE INDEX idx_resources_category ON public.resources(category);
CREATE INDEX idx_resources_parenting_stages ON public.resources USING GIN(parenting_stages);
CREATE INDEX idx_resources_tags ON public.resources USING GIN(tags);
CREATE INDEX idx_resources_featured ON public.resources(is_featured);
-- =====================================================
-- TRIGGERS FOR updated_at COLUMNS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON public.children
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_milestones_updated_at
    BEFORE UPDATE ON public.milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON public.resources  
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
-- Profiles policies (users can only access their own profile)
CREATE POLICY "Users can view their own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT 
    WITH CHECK (auth.uid() = id);
-- Children policies (users can only access their own children)
CREATE POLICY "Users can view their own children"
    ON public.children FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own children"
    ON public.children FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own children"
    ON public.children FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own children"
    ON public.children FOR DELETE
    USING (auth.uid() = user_id);
-- Milestones policies (users can only access milestones for their children)
CREATE POLICY "Users can view milestones for their children"
    ON public.milestones FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.children 
        WHERE children.id = milestones.child_id 
        AND children.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert milestones for their children"
    ON public.milestones FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.children 
        WHERE children.id = milestones.child_id 
        AND children.user_id = auth.uid()
    ));
CREATE POLICY "Users can update milestones for their children"
    ON public.milestones FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.children 
        WHERE children.id = milestones.child_id 
        AND children.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete milestones for their children"
    ON public.milestones FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.children 
        WHERE children.id = milestones.child_id 
        AND children.user_id = auth.uid()
    ));
-- Chat messages policies (users can only access their own chat history)
CREATE POLICY "Users can view their own chat messages"
    ON public.chat_messages FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chat messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);
-- Resources policies (all authenticated users can view resources)
CREATE POLICY "Authenticated users can view resources"
    ON public.resources FOR SELECT
    TO authenticated
    USING (true);
-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
-- =====================================================
-- SAMPLE DATA (optional - for development)
-- =====================================================

-- Insert some sample resources (uncomment for development)
/*
INSERT INTO public.resources (title, description, category, parenting_stages, tags, is_featured) VALUES
('Newborn Sleep Guide', 'Complete guide to newborn sleep patterns', 'Sleep', ARRAY['newborn']::parenting_stage[], ARRAY['sleep', 'newborn', 'guide'], true),
('Breastfeeding Basics', 'Essential breastfeeding tips for new mothers', 'Feeding', ARRAY['newborn', 'infant']::parenting_stage[], ARRAY['breastfeeding', 'feeding'], true),
('Toddler Development Milestones', 'Key developmental milestones for toddlers', 'Development', ARRAY['toddler']::parenting_stage[], ARRAY['development', 'milestones'], false);
*/;
