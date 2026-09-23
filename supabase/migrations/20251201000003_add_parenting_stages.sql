-- =====================================================
-- Migration: Add missing parenting stages to enum
-- =====================================================
-- Adds 'preschool' and 'school' to the parenting_stage enum
-- to support all 6 stages in the wizard onboarding flow

BEGIN;
DO $$ 
BEGIN
    -- Add 'preschool' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'preschool' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'parenting_stage')
    ) THEN
        ALTER TYPE parenting_stage ADD VALUE 'preschool';
    END IF;
    
    -- Add 'school' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'school' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'parenting_stage')
    ) THEN
        ALTER TYPE parenting_stage ADD VALUE 'school';
    END IF;
END $$;
-- Update enum comment with all 6 stages
COMMENT ON TYPE parenting_stage IS 'Stages of parenting journey: expecting (pregnancy), newborn (0-3 months), infant (3-12 months), toddler (1-3 years), preschool (3-5 years), school (5+ years)';
COMMIT;
