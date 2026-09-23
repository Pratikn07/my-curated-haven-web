-- Migration: Add Child Context Enhancements for Deep Personalization
-- Created: 2025-11-29
-- Purpose: Add developmental stage tracking and conversation summaries for personalized AI chat

-- Add developmental stage tracking to children table
ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS developmental_stage TEXT,
ADD COLUMN IF NOT EXISTS last_milestone_check DATE;
-- Add comments for new columns
COMMENT ON COLUMN public.children.developmental_stage IS 'Current developmental stage: "newborn (0-1 month)", "infant (3-6 months)", etc.';
COMMENT ON COLUMN public.children.last_milestone_check IS 'Last date when milestones were checked/updated';
-- Create conversation summaries table for long-term memory
CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  summary_period TEXT NOT NULL CHECK (summary_period IN ('week', 'month')),
  topics JSONB DEFAULT '{}'::jsonb, -- {"sleep": 3, "feeding": 2, "tantrums": 5}
  key_insights TEXT[] DEFAULT ARRAY[]::TEXT[], -- ["Improved sleep routine", "Started solid foods"]
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add table comment
COMMENT ON TABLE public.conversation_summaries IS 
  'Stores summarized conversation history for long-term context and memory across chat sessions';
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_child 
  ON public.conversation_summaries(user_id, child_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_period 
  ON public.conversation_summaries(period_end DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_period
  ON public.conversation_summaries(user_id, period_start, period_end);
-- Enable RLS
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
-- RLS Policies for conversation_summaries
CREATE POLICY "Users can view their own conversation summaries"
  ON public.conversation_summaries FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own conversation summaries"
  ON public.conversation_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversation summaries"
  ON public.conversation_summaries FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversation summaries"
  ON public.conversation_summaries FOR DELETE
  USING (auth.uid() = user_id);
-- Add trigger for updated_at on conversation_summaries
CREATE TRIGGER update_conversation_summaries_updated_at
  BEFORE UPDATE ON public.conversation_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
