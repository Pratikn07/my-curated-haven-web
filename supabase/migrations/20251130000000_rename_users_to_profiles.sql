-- =====================================================
-- MIGRATION: Rename users table to profiles
-- =====================================================
-- 
-- This script safely renames the 'users' table to 'profiles' following Supabase best practices
-- for extending auth.users with application-specific user data.
--
-- IMPORTANT: This migration will cause brief downtime. Ensure you have a backup before running.
--
-- Execution plan:
-- 1. Drop dependent foreign key constraints
-- 2. Rename users table to profiles
-- 3. Recreate foreign key constraints pointing to profiles
-- 4. Update RLS policies to reference profiles
-- 5. Update trigger function to insert into profiles
-- 6. Update column comments (if they reference old table name)

BEGIN;
-- =====================================================
-- STEP 1: Drop foreign key constraints that reference users
-- =====================================================

-- Drop children.parent_id constraint
ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_user_id_fkey;
ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_parent_id_fkey;
-- Drop chat_messages.user_id constraint  
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
-- Drop chat_sessions.user_id constraint (if exists)
ALTER TABLE IF EXISTS public.chat_sessions
  DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;
-- Drop conversation_summaries.user_id constraint (if exists)
ALTER TABLE IF EXISTS public.conversation_summaries
  DROP CONSTRAINT IF EXISTS conversation_summaries_user_id_fkey;
-- Drop onboarding_responses.user_id constraint (if exists)
ALTER TABLE IF EXISTS public.onboarding_responses
  DROP CONSTRAINT IF EXISTS onboarding_responses_user_id_fkey;
-- Drop user_saved_resources.user_id constraint (if exists)
ALTER TABLE IF EXISTS public.user_saved_resources
  DROP CONSTRAINT IF EXISTS user_saved_resources_user_id_fkey;
-- Drop user_activity_log.user_id constraint (if exists)
ALTER TABLE IF EXISTS public.user_activity_log
  DROP CONSTRAINT IF EXISTS user_activity_log_user_id_fkey;
-- Drop user_progress_stats.user_id constraint (if exists)
ALTER TABLE IF EXISTS public.user_progress_stats
  DROP CONSTRAINT IF EXISTS user_progress_stats_user_id_fkey;
-- Drop daily_tips.user_id constraint (if exists)
ALTER TABLE IF EXISTS public.daily_tips
  DROP CONSTRAINT IF EXISTS daily_tips_user_id_fkey;
-- Drop user_milestone_progress.user_id constraint (if exists)
ALTER TABLE IF EXISTS public.user_milestone_progress
  DROP CONSTRAINT IF EXISTS user_milestone_progress_user_id_fkey;
-- =====================================================
-- STEP 2: Rename users table to profiles
-- =====================================================

ALTER TABLE public.users RENAME TO profiles;
-- =====================================================
-- STEP 3: Recreate foreign key constraints pointing to profiles
-- =====================================================

-- Recreate children.user_id constraint
ALTER TABLE public.children
  ADD CONSTRAINT children_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;
-- Recreate chat_messages.user_id constraint
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;
-- Recreate chat_sessions.user_id constraint (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_sessions') THEN
    ALTER TABLE public.chat_sessions
      ADD CONSTRAINT chat_sessions_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.profiles(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
-- Recreate conversation_summaries.user_id constraint (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_summaries') THEN
    ALTER TABLE public.conversation_summaries
      ADD CONSTRAINT conversation_summaries_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.profiles(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
-- Recreate onboarding_responses.user_id constraint (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'onboarding_responses') THEN
    ALTER TABLE public.onboarding_responses
      ADD CONSTRAINT onboarding_responses_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.profiles(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
-- Recreate user_saved_resources.user_id constraint (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_saved_resources') THEN
    ALTER TABLE public.user_saved_resources
      ADD CONSTRAINT user_saved_resources_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.profiles(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
-- Recreate user_activity_log.user_id constraint (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_activity_log') THEN
    ALTER TABLE public.user_activity_log
      ADD CONSTRAINT user_activity_log_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.profiles(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
-- Recreate user_progress_stats.user_id constraint (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_progress_stats') THEN
    ALTER TABLE public.user_progress_stats
      ADD CONSTRAINT user_progress_stats_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.profiles(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
-- Recreate daily_tips.user_id constraint (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_tips') THEN
    ALTER TABLE public.daily_tips
      ADD CONSTRAINT daily_tips_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.profiles(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
-- Recreate user_milestone_progress.user_id constraint (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_milestone_progress') THEN
    ALTER TABLE public.user_milestone_progress
      ADD CONSTRAINT user_milestone_progress_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.profiles(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
-- =====================================================
-- STEP 4: Update RLS policies
-- =====================================================

-- Note: RLS policies are already updated in the schema files
-- The policies use auth.uid() which checks against the id column,
-- so renaming the table doesn't break the policies themselves.
-- However, we should verify they reference the correct table.

-- =====================================================
-- STEP 5: Update trigger function to insert into profiles
-- =====================================================

-- Recreate or update the handle_new_user function to insert into profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
-- =====================================================
-- STEP 6: Update table and column comments
-- =====================================================

-- Update table comment
COMMENT ON TABLE public.profiles IS 'User profiles for parents, extending Supabase auth.users with parenting-specific information';
-- Update column comments to reference 'profiles' instead of 'users'
COMMENT ON COLUMN public.profiles.id IS 'Primary key referencing auth.users.id';
COMMENT ON COLUMN public.profiles.name IS 'Full name of the parent (2-50 characters)';
COMMENT ON COLUMN public.profiles.email IS 'Email address, must be unique across all users';
COMMENT ON COLUMN public.profiles.parenting_stage IS 'Current parenting stage: expecting, newborn, infant, or toddler';
COMMENT ON COLUMN public.profiles.feeding_preference IS 'Preferred feeding method: breastfeeding, formula, or mixed';
COMMENT ON COLUMN public.profiles.has_completed_onboarding IS 'Whether the user has completed the initial onboarding flow';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user''s profile picture';
COMMENT ON COLUMN public.profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN public.profiles.updated_at IS 'Timestamp when the profile was last updated';
COMMIT;
-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these queries after migration to verify success:

-- 1. Check that profiles table exists
-- SELECT EXISTS (
--     SELECT FROM pg_tables 
--     WHERE schemaname = 'public' 
--     AND tablename = 'profiles'
-- ) as profiles_exists;

-- 2. Check that users table no longer exists
-- SELECT EXISTS (
--     SELECT FROM pg_tables 
--     WHERE schemaname = 'public' 
--     AND tablename = 'users'
-- ) as users_still_exists;

-- 3. Check all foreign keys point to profiles
-- SELECT
--     tc.table_name,
--     kcu.column_name,
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--     ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--     ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--     AND tc.table_schema = 'public'
--     AND ccu.table_name = 'profiles';

-- 4. Count rows in profiles table (should match pre-migration users count)
-- SELECT COUNT(*) FROM public.profiles;;
