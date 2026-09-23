-- Migration: Add message_type to chat_messages
-- This allows filtering recipe chats from general parenting chats

-- Add message_type column
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'general';
-- Add check constraint to ensure valid values
ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('general', 'recipe'));
-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type 
ON public.chat_messages(message_type);
-- Update existing messages to be 'general' type
UPDATE public.chat_messages 
SET message_type = 'general' 
WHERE message_type IS NULL;
