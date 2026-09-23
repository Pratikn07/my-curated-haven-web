-- =====================================================
-- SEED MILESTONE TEMPLATES
-- Evidence-based developmental milestones organized by age
-- Source: CDC Developmental Milestones, AAP Guidelines
-- =====================================================

-- Clear existing templates (for clean seeding)
TRUNCATE TABLE public.milestone_templates CASCADE;
-- =====================================================
-- NEWBORN (0-3 months)
-- =====================================================

-- Physical (0-3 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Lifts head briefly during tummy time', 'Can lift and hold head up for short periods when lying on stomach', 'physical', 0, 3, 1),
('Moves arms and legs', 'Makes smooth movements with arms and legs, not jerky', 'physical', 0, 3, 2),
('Opens and closes hands', 'Beginning to develop hand control by opening and closing fists', 'physical', 0, 3, 3),
('Brings hands to mouth', 'Discovers hands and brings them to mouth to explore', 'physical', 0, 3, 4),
('Pushes down with legs when feet on flat surface', 'Shows leg strength when held in standing position', 'physical', 0, 3, 5);
-- Cognitive (0-3 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Focuses on faces', 'Shows interest in faces and can focus on them up close', 'cognitive', 0, 3, 1),
('Follows objects with eyes', 'Tracks moving objects and people with their gaze', 'cognitive', 0, 3, 2),
('Recognizes familiar people at a distance', 'Shows recognition of parents and caregivers', 'cognitive', 0, 3, 3),
('Starts to act bored if activity doesn''t change', 'Shows preference for new experiences', 'cognitive', 0, 3, 4);
-- Social (0-3 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('First social smile', 'Smiles in response to seeing faces or hearing voices', 'social', 0, 3, 1),
('Enjoys playing with others', 'Shows enjoyment during interactive play', 'social', 0, 3, 2),
('Calms down when spoken to or picked up', 'Can be soothed by caregiver''s voice or touch', 'social', 0, 3, 3),
('Looks at parent''s face', 'Makes eye contact and studies faces', 'social', 0, 3, 4);
-- Emotional (0-3 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Makes cooing sounds', 'Begins making soft vowel sounds like "ooh" and "aah"', 'emotional', 0, 3, 1),
('Turns head toward sounds', 'Responds to sounds by looking in their direction', 'emotional', 0, 3, 2),
('Cries differently for different needs', 'Develops distinct cries for hunger, tiredness, discomfort', 'emotional', 0, 3, 3);
-- =====================================================
-- INFANT (3-6 months)
-- =====================================================

-- Physical (3-6 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Holds head steady without support', 'Good head control when sitting with support', 'physical', 3, 6, 1),
('Pushes up on arms during tummy time', 'Can lift chest and head while on stomach', 'physical', 3, 6, 2),
('Rolls over (tummy to back)', 'Can roll from stomach to back', 'physical', 3, 6, 3),
('Reaches for and grasps toys', 'Coordinates reaching and grasping objects', 'physical', 3, 6, 4),
('Brings objects to mouth', 'Explores objects by putting them in mouth', 'physical', 3, 6, 5),
('Begins to sit with support', 'Can sit when propped up or held', 'physical', 3, 6, 6);
-- Cognitive (3-6 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Watches faces intently', 'Studies faces with focused attention', 'cognitive', 3, 6, 1),
('Follows moving things with eyes', 'Smooth tracking of objects side to side', 'cognitive', 3, 6, 2),
('Recognizes familiar objects and people', 'Shows recognition of common items and faces', 'cognitive', 3, 6, 3),
('Looks at hands with interest', 'Discovers and studies own hands', 'cognitive', 3, 6, 4),
('Responds to affection', 'Reacts positively to cuddles and attention', 'cognitive', 3, 6, 5);
-- Social (3-6 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Smiles spontaneously', 'Smiles on their own, not just in response', 'social', 3, 6, 1),
('Likes to play with people', 'Shows enjoyment in social interactions', 'social', 3, 6, 2),
('Copies some facial expressions', 'Imitates smiles and expressions', 'social', 3, 6, 3),
('Knows familiar faces', 'Distinguishes between familiar and unfamiliar people', 'social', 3, 6, 4);
-- Emotional (3-6 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Babbles with expression', 'Makes babbling sounds with varied tones', 'emotional', 3, 6, 1),
('Laughs out loud', 'Produces genuine laughter in response to play', 'emotional', 3, 6, 2),
('Expresses displeasure', 'Shows when unhappy through sounds and expressions', 'emotional', 3, 6, 3),
('Shows curiosity', 'Displays interest in surroundings and new things', 'emotional', 3, 6, 4);
-- =====================================================
-- INFANT (6-9 months)
-- =====================================================

-- Physical (6-9 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Sits without support', 'Can sit independently on the floor', 'physical', 6, 9, 1),
('Rolls both ways', 'Rolls from tummy to back and back to tummy', 'physical', 6, 9, 2),
('Rocks back and forth on hands and knees', 'Preparing for crawling motion', 'physical', 6, 9, 3),
('Passes objects between hands', 'Transfers toys from one hand to the other', 'physical', 6, 9, 4),
('Uses raking grasp', 'Picks up small objects using fingers against palm', 'physical', 6, 9, 5);
-- Cognitive (6-9 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Looks for dropped objects', 'Understands object permanence is developing', 'cognitive', 6, 9, 1),
('Explores objects in different ways', 'Shakes, bangs, throws toys to learn about them', 'cognitive', 6, 9, 2),
('Finds partially hidden objects', 'Can find toys covered by cloth or hand', 'cognitive', 6, 9, 3),
('Plays peek-a-boo', 'Enjoys and participates in hiding games', 'cognitive', 6, 9, 4);
-- Social (6-9 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Responds to own name', 'Turns or looks when name is called', 'social', 6, 9, 1),
('Shows stranger anxiety', 'May be wary or fearful of unfamiliar people', 'social', 6, 9, 2),
('Has favorite toys', 'Shows preference for certain objects', 'social', 6, 9, 3),
('Understands "no"', 'Responds to the word no (even if doesn''t always comply)', 'social', 6, 9, 4);
-- Emotional (6-9 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Makes many different sounds', 'Produces variety of consonant and vowel sounds', 'emotional', 6, 9, 1),
('Copies sounds and gestures', 'Imitates sounds, actions like clapping', 'emotional', 6, 9, 2),
('Uses fingers to point', 'Beginning to use pointing to communicate', 'emotional', 6, 9, 3);
-- =====================================================
-- INFANT (9-12 months)
-- =====================================================

-- Physical (9-12 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Crawls', 'Moves on hands and knees across the floor', 'physical', 9, 12, 1),
('Pulls to stand', 'Uses furniture to pull up to standing position', 'physical', 9, 12, 2),
('Cruises along furniture', 'Walks while holding onto furniture for support', 'physical', 9, 12, 3),
('Uses pincer grasp', 'Picks up small objects with thumb and forefinger', 'physical', 9, 12, 4),
('Takes first steps', 'Walks a few steps without support', 'physical', 9, 12, 5),
('Stands alone briefly', 'Can stand without holding onto anything momentarily', 'physical', 9, 12, 6);
-- Cognitive (9-12 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Finds hidden objects easily', 'Good understanding of object permanence', 'cognitive', 9, 12, 1),
('Looks at correct picture when named', 'Associates words with images', 'cognitive', 9, 12, 2),
('Imitates gestures', 'Copies waving, clapping, blowing kisses', 'cognitive', 9, 12, 3),
('Starts using things correctly', 'Uses objects like phone, brush appropriately', 'cognitive', 9, 12, 4),
('Explores objects in many ways', 'Shakes, pokes, drops, throws to learn', 'cognitive', 9, 12, 5);
-- Social (9-12 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Shy or anxious with strangers', 'Shows clear preference for familiar people', 'social', 9, 12, 1),
('Cries when parent leaves', 'Exhibits separation anxiety', 'social', 9, 12, 2),
('Repeats actions for attention', 'Performs behaviors to get response from others', 'social', 9, 12, 3),
('Plays simple back-and-forth games', 'Engages in interactive play like pat-a-cake', 'social', 9, 12, 4);
-- Emotional (9-12 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Says first words', 'Uses "mama", "dada" or other simple words meaningfully', 'emotional', 9, 12, 1),
('Uses simple gestures', 'Waves bye-bye, shakes head for no', 'emotional', 9, 12, 2),
('Shows moods', 'Expresses range of emotions clearly', 'emotional', 9, 12, 3);
-- =====================================================
-- TODDLER (12-18 months)
-- =====================================================

-- Physical (12-18 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Walks independently', 'Walks without holding on or falling frequently', 'physical', 12, 18, 1),
('Climbs onto furniture', 'Can climb onto couch, chair, or low structures', 'physical', 12, 18, 2),
('Helps undress self', 'Assists with removing simple clothing items', 'physical', 12, 18, 3),
('Drinks from cup', 'Can drink from an open cup with some spilling', 'physical', 12, 18, 4),
('Eats with spoon', 'Attempts to use spoon, may be messy', 'physical', 12, 18, 5),
('Scribbles with crayons', 'Makes marks on paper with writing tools', 'physical', 12, 18, 6);
-- Cognitive (12-18 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Knows what ordinary things are for', 'Understands purpose of phone, brush, spoon', 'cognitive', 12, 18, 1),
('Points to get attention', 'Uses pointing to show something interesting', 'cognitive', 12, 18, 2),
('Shows interest in dolls or stuffed animals', 'Pretends to feed, cuddle toys', 'cognitive', 12, 18, 3),
('Points to one body part', 'Can identify at least one body part when asked', 'cognitive', 12, 18, 4),
('Follows simple commands', 'Understands and follows one-step instructions', 'cognitive', 12, 18, 5);
-- Social (12-18 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Hands things to others as play', 'Gives objects to others and takes them back', 'social', 12, 18, 1),
('May have temper tantrums', 'Shows frustration when unable to communicate needs', 'social', 12, 18, 2),
('Shows affection to familiar people', 'Hugs, kisses family members spontaneously', 'social', 12, 18, 3),
('Plays simple pretend', 'Acts out simple scenarios like feeding doll', 'social', 12, 18, 4);
-- Emotional (12-18 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Says several single words', 'Vocabulary of 5-10 words used meaningfully', 'emotional', 12, 18, 1),
('Says "no" and shakes head', 'Uses word and gesture to express refusal', 'emotional', 12, 18, 2),
('Points to show what they want', 'Communicates desires through pointing', 'emotional', 12, 18, 3);
-- =====================================================
-- TODDLER (18-24 months)
-- =====================================================

-- Physical (18-24 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Runs', 'Can run though may fall sometimes', 'physical', 18, 24, 1),
('Kicks a ball', 'Can kick a ball forward without losing balance', 'physical', 18, 24, 2),
('Walks up stairs with help', 'Climbs stairs while holding hand or railing', 'physical', 18, 24, 3),
('Throws ball overhand', 'Can throw a ball in intended direction', 'physical', 18, 24, 4),
('Stacks blocks', 'Can stack 4 or more blocks to make a tower', 'physical', 18, 24, 5);
-- Cognitive (18-24 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Points to things in a book', 'Identifies pictures when you name them', 'cognitive', 18, 24, 1),
('Points to at least two body parts', 'Shows nose, eyes, ears, etc. when asked', 'cognitive', 18, 24, 2),
('Begins to sort shapes and colors', 'Matches objects by shape or color', 'cognitive', 18, 24, 3),
('Completes sentences in familiar books', 'Anticipates words in favorite stories', 'cognitive', 18, 24, 4),
('Follows two-step instructions', 'Understands commands like "Pick up the toy and give it to me"', 'cognitive', 18, 24, 5);
-- Social (18-24 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Plays alongside other children', 'Parallel play - near but not with other kids', 'social', 18, 24, 1),
('Notices when others are hurt or upset', 'Shows concern for others'' feelings', 'social', 18, 24, 2),
('Copies others, especially adults', 'Imitates household activities like cleaning', 'social', 18, 24, 3),
('Shows defiant behavior', 'Tests limits and says no to instructions', 'social', 18, 24, 4);
-- Emotional (18-24 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Uses two-word phrases', 'Combines words like "more milk" or "daddy go"', 'emotional', 18, 24, 1),
('Names items in books', 'Can label pictures of familiar objects', 'emotional', 18, 24, 2),
('Shows more independence', 'Wants to do things without help', 'emotional', 18, 24, 3);
-- =====================================================
-- TODDLER (24-36 months / 2-3 years)
-- =====================================================

-- Physical (24-36 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Climbs well', 'Climbs on playground equipment and furniture easily', 'physical', 24, 36, 1),
('Runs easily', 'Runs smoothly and can change direction', 'physical', 24, 36, 2),
('Pedals tricycle', 'Can ride a three-wheel bike', 'physical', 24, 36, 3),
('Walks up and down stairs', 'One foot per step with support', 'physical', 24, 36, 4),
('Dresses and undresses self', 'Can put on and remove simple clothing', 'physical', 24, 36, 5);
-- Cognitive (24-36 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Can work simple puzzles', 'Completes puzzles with 3-4 pieces', 'cognitive', 24, 36, 1),
('Turns book pages one at a time', 'Has fine motor control for page turning', 'cognitive', 24, 36, 2),
('Plays make-believe with dolls and animals', 'Engages in imaginative play scenarios', 'cognitive', 24, 36, 3),
('Draws a circle', 'Can draw or copy a circle shape', 'cognitive', 24, 36, 4),
('Understands concept of "two"', 'Grasps basic number concept', 'cognitive', 24, 36, 5);
-- Social (24-36 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Plays with other children', 'Engages in cooperative play, not just parallel', 'social', 24, 36, 1),
('Shows concern for crying friend', 'Displays empathy for others', 'social', 24, 36, 2),
('Takes turns in games', 'Can wait for turn with prompting', 'social', 24, 36, 3),
('Shows wide range of emotions', 'Expresses happiness, sadness, anger appropriately', 'social', 24, 36, 4);
-- Emotional (24-36 months)
INSERT INTO public.milestone_templates (title, description, category, age_min_months, age_max_months, sort_order) VALUES
('Speaks in sentences', 'Uses 2-3 word sentences regularly', 'emotional', 24, 36, 1),
('Can say first name, age, and sex', 'Knows and shares personal information', 'emotional', 24, 36, 2),
('Names a friend', 'Has and can identify at least one friend', 'emotional', 24, 36, 3),
('Says words like "I", "me", "we"', 'Uses pronouns correctly', 'emotional', 24, 36, 4);
-- =====================================================
-- Verify seed data
-- =====================================================
-- SELECT category, age_min_months, age_max_months, COUNT(*) as count 
-- FROM public.milestone_templates 
-- GROUP BY category, age_min_months, age_max_months 
-- ORDER BY age_min_months, category;;
