-- =====================================================
-- Migration: Seed age-appropriate parenting articles
-- =====================================================
-- 27 articles covering all stages (expecting, newborn, infant, toddler, preschool)
-- and all categories (sleep, feeding, development, health, behavior, activities, safety)

-- =====================================================
-- EXPECTING STAGE (Pre-birth) - 5 articles
-- =====================================================

INSERT INTO articles (slug, title, body_md, age_min_days, age_max_days, tags, locale)
VALUES
(
  'preparing-for-baby-sleep',
  'Setting Up a Safe Sleep Space Before Baby Arrives',
  E'Creating a safe sleep environment is one of the most important preparations you can make before your baby arrives.\n\n## What You''ll Need\n\n- **Firm, flat mattress** that fits snugly in the crib\n- **Fitted sheet** designed for your crib size\n- **Empty crib** - no blankets, pillows, bumpers, or toys\n\n## Room Setup Tips\n\nKeep the room temperature comfortable (68-72°F). Consider a white noise machine to help baby sleep. Place the crib away from windows, cords, and curtains.\n\n## The ABCs of Safe Sleep\n\n- **A**lone in their own sleep space\n- **B**ack position for every sleep\n- **C**rib that''s empty and safe\n\nStart practicing these guidelines now so they become second nature when baby arrives.',
  NULL,
  0,
  ARRAY['sleep', 'safety', 'expecting'],
  'en-US'
),
(
  'prenatal-nutrition-basics',
  'Essential Nutrients During Pregnancy',
  E'Good nutrition during pregnancy supports your baby''s development and your own health throughout this journey.\n\n## Key Nutrients to Focus On\n\n**Folic Acid (400-800mcg daily)**\nCritical for neural tube development. Found in leafy greens, fortified cereals, and prenatal vitamins.\n\n**Iron (27mg daily)**\nSupports increased blood volume. Sources include lean meats, beans, and spinach.\n\n**Calcium (1000mg daily)**\nBuilds baby''s bones and teeth. Dairy, fortified plant milks, and leafy greens are great sources.\n\n**DHA (200-300mg daily)**\nSupports brain development. Found in fatty fish, walnuts, and supplements.\n\n## Quick Tips\n\n- Take your prenatal vitamin daily\n- Eat small, frequent meals if nausea is an issue\n- Stay hydrated with 8-10 glasses of water\n- Limit caffeine to 200mg daily',
  NULL,
  0,
  ARRAY['feeding', 'health', 'expecting'],
  'en-US'
),
(
  'preparing-for-breastfeeding',
  'Getting Ready to Breastfeed',
  E'Preparing for breastfeeding before baby arrives can help you feel more confident and ready.\n\n## What to Learn\n\n**Latch basics** - Watch videos or attend a breastfeeding class to understand proper positioning.\n\n**Feeding cues** - Learn to recognize early hunger signs like rooting, hand-to-mouth movements, and lip smacking.\n\n**Supply and demand** - Understand that frequent feeding in early days helps establish your milk supply.\n\n## What to Have Ready\n\n- Nursing pillow for support\n- Nursing bras (2-3 comfortable ones)\n- Breast pump (check if insurance covers one)\n- Nipple cream for comfort\n- Water bottle to stay hydrated\n\n## Build Your Support Network\n\nIdentify a lactation consultant before birth. Many hospitals offer free consultations. Having support lined up makes the early days much easier.',
  NULL,
  0,
  ARRAY['feeding', 'expecting'],
  'en-US'
),
(
  'baby-development-in-womb',
  'Understanding Your Baby''s Development',
  E'Knowing what''s happening during each trimester helps you connect with your growing baby.\n\n## First Trimester (Weeks 1-12)\n\nAll major organs begin forming. By week 12, your baby is about 2 inches long with tiny fingers and toes. The heart beats at 150-170 beats per minute.\n\n## Second Trimester (Weeks 13-26)\n\nBaby starts moving and you''ll feel those first kicks! Hearing develops - baby can recognize your voice. By week 26, baby is about 14 inches and weighs nearly 2 pounds.\n\n## Third Trimester (Weeks 27-40)\n\nRapid brain development and weight gain. Baby practices breathing and develops sleep cycles. By full term, baby weighs 6-9 pounds.\n\n## Ways to Bond\n\n- Talk and sing to your baby\n- Play music\n- Gently massage your belly\n- Read stories aloud\n\nYour baby is already learning your voice!',
  NULL,
  0,
  ARRAY['development', 'expecting'],
  'en-US'
),
(
  'childproofing-before-baby',
  'Childproofing Checklist for New Parents',
  E'While your newborn won''t be mobile right away, getting a head start on safety gives you peace of mind.\n\n## Immediate Needs (Before Birth)\n\n- **Smoke & CO detectors** - Test and replace batteries\n- **Water heater** - Set to 120°F to prevent scalding\n- **Crib safety** - Ensure slats are no more than 2⅜ inches apart\n- **Car seat** - Install and have it inspected\n\n## Before Baby is Mobile (4-6 Months)\n\n- Outlet covers throughout the home\n- Cabinet locks for cleaning supplies and medications\n- Toilet locks\n- Corner guards on sharp furniture\n\n## Ongoing Safety Habits\n\n- Never leave baby unattended on elevated surfaces\n- Keep small objects out of reach\n- Secure furniture to walls\n- Keep cords and blinds out of reach\n\nSafety is an ongoing process that evolves as your child grows!',
  NULL,
  0,
  ARRAY['safety', 'expecting'],
  'en-US'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  body_md = EXCLUDED.body_md,
  age_min_days = EXCLUDED.age_min_days,
  age_max_days = EXCLUDED.age_max_days,
  tags = EXCLUDED.tags;
-- =====================================================
-- NEWBORN STAGE (0-90 days / 0-3 months) - 5 articles
-- =====================================================

INSERT INTO articles (slug, title, body_md, age_min_days, age_max_days, tags, locale)
VALUES
(
  'newborn-sleep-patterns',
  'Understanding Your Newborn''s Sleep',
  E'Newborn sleep can feel unpredictable, but understanding normal patterns helps set realistic expectations.\n\n## What''s Normal\n\n- **14-17 hours** of sleep per day\n- Sleep in **2-4 hour stretches**\n- No difference between day and night initially\n- Frequent waking for feeding\n\n## Helping Baby Learn Day vs Night\n\n**Daytime:**\n- Keep the house bright and active\n- Don''t tiptoe around normal noise\n- Engage and play during wake windows\n\n**Nighttime:**\n- Keep lights dim for feeds\n- Minimize stimulation and talking\n- Use a calm, quiet voice\n\n## Safe Sleep Reminders\n\n- Always on their back\n- Firm, flat surface\n- Nothing in the crib\n- Room-share for 6-12 months\n\nPatience is key - sleep patterns improve around 3-4 months!',
  0,
  90,
  ARRAY['sleep', 'newborn'],
  'en-US'
),
(
  'breastfeeding-first-weeks',
  'Breastfeeding in the First Weeks',
  E'The early weeks of breastfeeding are a learning curve for both you and baby. Here''s what to expect.\n\n## First Few Days\n\n- **Colostrum** is your first milk - small amounts packed with antibodies\n- Feed **8-12 times per day** to establish supply\n- Baby''s stomach is tiny (marble-sized day 1!)\n\n## Signs of Good Feeding\n\n- Baby has **6+ wet diapers** daily by day 5\n- You hear swallowing during feeds\n- Baby seems satisfied after feeding\n- Steady weight gain after initial loss\n\n## Getting a Good Latch\n\n1. Bring baby to breast, not breast to baby\n2. Aim nipple toward baby''s nose\n3. Wait for wide open mouth\n4. Bring baby on quickly, chin first\n\n## When to Get Help\n\n- Painful latch that doesn''t improve\n- Baby not gaining weight\n- Concerns about milk supply\n\nLactation consultants are your best resource!',
  0,
  90,
  ARRAY['feeding', 'newborn'],
  'en-US'
),
(
  'newborn-development-milestones',
  'Your Newborn''s Amazing Development',
  E'Your newborn is learning and growing every day, even when it doesn''t seem like much is happening.\n\n## What to Expect\n\n**Week 1-2:**\n- Focuses on faces 8-12 inches away\n- Recognizes your voice and smell\n- Strong reflexes (rooting, grasping, startle)\n\n**Week 3-4:**\n- Starts tracking objects briefly\n- May begin smiling\n- Holds head up briefly during tummy time\n\n**Month 2-3:**\n- Social smiling emerges\n- Coos and makes vowel sounds\n- Better head control\n- Follows objects with eyes\n\n## How to Support Development\n\n- **Tummy time** - Start with 3-5 minutes, several times daily\n- **Talk and sing** - Narrate your day\n- **Face time** - Get close and make eye contact\n- **High contrast images** - Black and white patterns are fascinating\n\nEvery baby develops at their own pace!',
  0,
  90,
  ARRAY['development', 'newborn'],
  'en-US'
),
(
  'newborn-health-essentials',
  'Keeping Your Newborn Healthy',
  E'New parents often worry about every little thing. Here''s guidance on what''s normal and when to call the doctor.\n\n## Normal Newborn Things\n\n- **Baby acne** - Peaks around 2-4 weeks, clears on its own\n- **Cradle cap** - Scaly scalp patches, harmless\n- **Hiccups and sneezing** - Very common, not a concern\n- **Irregular breathing** - Periodic breathing is normal during sleep\n\n## When to Call the Doctor\n\n- Fever over 100.4°F (rectal)\n- Refusing to eat multiple feedings\n- Fewer than 6 wet diapers after day 5\n- Yellow skin/eyes that worsen\n- Difficulty breathing\n- Unusual lethargy or irritability\n\n## Wellness Visits\n\n- **3-5 days** after birth\n- **2 weeks** old\n- **1 month** old\n- **2 months** old (first vaccines)\n\nTrust your instincts - if something feels wrong, call your pediatrician.',
  0,
  90,
  ARRAY['health', 'newborn'],
  'en-US'
),
(
  'bonding-with-newborn',
  'Building Your Bond with Baby',
  E'Bonding happens naturally through everyday care, but here are ways to strengthen your connection.\n\n## Skin-to-Skin Contact\n\nHold baby against your bare chest. This:\n- Regulates baby''s temperature and heart rate\n- Promotes breastfeeding\n- Releases bonding hormones for both of you\n- Calms and soothes baby\n\n## Respond to Cues\n\nPicking up your baby when they cry doesn''t spoil them - it builds trust. Learn their:\n- Hunger cues\n- Tired signs\n- Overstimulation signals\n\n## Daily Bonding Moments\n\n- **Eye contact** during feeds\n- **Talking and singing** during diaper changes\n- **Baby massage** after bath time\n- **Reading** - even now, your voice matters\n\n## For Partners\n\n- Do skin-to-skin too\n- Take over bath time or bedtime routine\n- Wear baby in a carrier\n- Talk and sing during care tasks\n\nBonding takes time - don''t pressure yourself!',
  0,
  90,
  ARRAY['activities', 'development', 'newborn'],
  'en-US'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  body_md = EXCLUDED.body_md,
  age_min_days = EXCLUDED.age_min_days,
  age_max_days = EXCLUDED.age_max_days,
  tags = EXCLUDED.tags;
-- =====================================================
-- INFANT STAGE (91-365 days / 3-12 months) - 6 articles
-- =====================================================

INSERT INTO articles (slug, title, body_md, age_min_days, age_max_days, tags, locale)
VALUES
(
  'infant-sleep-training',
  'Gentle Sleep Training for Infants',
  E'Around 4-6 months, many babies are ready to learn independent sleep skills.\n\n## Signs of Readiness\n\n- At least 4 months old (adjusted age for preemies)\n- No longer needs night feeds (check with pediatrician)\n- Consistent bedtime routine established\n- Can self-soothe somewhat\n\n## Gentle Approaches\n\n**Pick Up/Put Down:**\nPick up when crying, put down when calm. Repeat as needed.\n\n**Chair Method:**\nSit beside crib, gradually move chair farther away over nights.\n\n**Timed Check-ins:**\nCheck at increasing intervals (3, 5, 10 minutes) offering brief comfort.\n\n## Key Success Factors\n\n- **Consistent bedtime** (within 30 minutes)\n- **Solid routine** (bath, book, feed, bed)\n- **Drowsy but awake** placement\n- **Both parents on same page**\n\n## Be Patient\n\nMost methods take 1-2 weeks of consistency. Regressions are normal during illness or travel.',
  91,
  365,
  ARRAY['sleep', 'infant'],
  'en-US'
),
(
  'starting-solid-foods',
  'Your Guide to Starting Solid Foods',
  E'Most babies are ready for solids around 6 months. Here''s how to get started safely.\n\n## Signs of Readiness\n\n- Can sit with minimal support\n- Good head and neck control\n- Shows interest in food\n- Lost the tongue-thrust reflex\n\n## First Foods to Try\n\n**Single-ingredient options:**\n- Iron-fortified baby cereal\n- Pureed sweet potato, avocado, banana\n- Pureed peas, carrots, squash\n- Pureed chicken or beef for iron\n\n## How to Start\n\n1. Offer solids **after** breast milk or formula\n2. Start with **1-2 tablespoons** once daily\n3. Wait **3-5 days** before new foods\n4. Gradually increase variety and texture\n\n## Safety Tips\n\n- Always supervise eating\n- Avoid honey until age 1\n- Cut round foods (grapes, hot dogs) lengthwise\n- No added salt or sugar\n\nMake it fun - messy eating is learning!',
  120,
  270,
  ARRAY['feeding', 'infant'],
  'en-US'
),
(
  'infant-development-4-8-months',
  'Development Milestones: 4-8 Months',
  E'Your baby is becoming more interactive and mobile every week!\n\n## Physical Development\n\n- **4-5 months:** Rolls over, reaches for toys\n- **5-6 months:** Sits with support, transfers objects hand to hand\n- **6-7 months:** Sits without support, may start scooting\n- **7-8 months:** Gets on hands and knees, may crawl\n\n## Cognitive Development\n\n- Recognizes familiar faces and objects\n- Understands object permanence (things exist when hidden)\n- Responds to own name\n- Explores with mouth and hands\n\n## Language Development\n\n- Babbles with consonants (ba-ba, ma-ma)\n- Uses voice to express emotions\n- Responds to tone of voice\n\n## How to Support Growth\n\n- **Floor time** for movement practice\n- **Peek-a-boo** for cognitive development\n- **Name objects** you''re interacting with\n- **Read daily** with board books\n\nEvery baby develops at their own pace!',
  120,
  240,
  ARRAY['development', 'infant'],
  'en-US'
),
(
  'infant-common-illnesses',
  'Common Infant Illnesses and When to Worry',
  E'Babies get sick - it''s part of building their immune system. Here''s what to know.\n\n## Common Illnesses\n\n**Colds (6-8 per year is normal)**\n- Runny nose, mild cough, low fever\n- Use saline drops and bulb syringe\n- Keep baby hydrated\n\n**Ear Infections**\n- Fussiness, ear tugging, fever\n- May follow a cold\n- See doctor for diagnosis\n\n**Teething**\n- Drooling, chewing, mild fussiness\n- Does NOT cause high fever or diarrhea\n- Cold teething rings help\n\n## When to Call the Doctor\n\n- Fever over 100.4°F under 3 months\n- Fever over 102°F at any age\n- Difficulty breathing\n- Refuses to drink\n- Unusually sleepy or irritable\n- Rash with fever\n\n## Medicine Cabinet Essentials\n\n- Infant acetaminophen (after 2 months)\n- Infant ibuprofen (after 6 months)\n- Saline drops\n- Thermometer',
  91,
  365,
  ARRAY['health', 'infant'],
  'en-US'
),
(
  'infant-play-activities',
  'Play Ideas for Your Growing Baby',
  E'Play is how babies learn! Here are age-appropriate activities for your infant.\n\n## 3-6 Months\n\n**Tummy Time Games**\n- Place toys just out of reach\n- Use a mirror for engagement\n- Get down at their level\n\n**Sensory Exploration**\n- Textured toys and fabrics\n- Crinkle books\n- Rattles and shakers\n\n## 6-9 Months\n\n**Cause and Effect**\n- Drop toys from highchair (they love this!)\n- Push-button toys\n- Stacking and knocking down\n\n**Peek-a-Boo Variations**\n- Hide toys under blankets\n- Hide behind furniture\n- Peek-a-boo books\n\n## 9-12 Months\n\n**Container Play**\n- Fill and dump activities\n- Sorting by size\n- Nesting cups\n\n**Movement Games**\n- Chase and crawl games\n- Dance to music\n- Push toys for cruising\n\nFollow your baby''s interests - they''ll show you what engages them!',
  91,
  365,
  ARRAY['activities', 'development', 'infant'],
  'en-US'
),
(
  'infant-safety-mobile-baby',
  'Safety for Your Mobile Baby',
  E'Once baby starts rolling and crawling, your childproofing needs to level up!\n\n## Floor Level Check\n\nGet down on hands and knees and look for:\n- Small objects (coins, buttons, batteries)\n- Cords and cables\n- Sharp corners\n- Unstable furniture\n\n## Must-Do Safety Steps\n\n**Secure furniture**\n- Anchor bookshelves, dressers, TVs to walls\n- Move wobbly items out of reach\n\n**Cover hazards**\n- Outlet covers throughout\n- Corner guards on coffee tables\n- Door stoppers to prevent pinched fingers\n\n**Gate danger zones**\n- Top and bottom of stairs\n- Kitchen\n- Bathrooms\n\n## Ongoing Vigilance\n\n- Never leave baby unattended near water\n- Keep hot drinks out of reach\n- Check floor for small items daily\n- Supervise around pets\n\n## Car Seat Update\n\nEnsure rear-facing seat still fits properly as baby grows.',
  150,
  365,
  ARRAY['safety', 'infant'],
  'en-US'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  body_md = EXCLUDED.body_md,
  age_min_days = EXCLUDED.age_min_days,
  age_max_days = EXCLUDED.age_max_days,
  tags = EXCLUDED.tags;
-- =====================================================
-- TODDLER STAGE (366-1095 days / 1-3 years) - 6 articles
-- =====================================================

INSERT INTO articles (slug, title, body_md, age_min_days, age_max_days, tags, locale)
VALUES
(
  'toddler-sleep-transitions',
  'Navigating Toddler Sleep Changes',
  E'Toddler sleep brings new challenges: dropping naps, bedtime battles, and the big kid bed transition.\n\n## Nap Transitions\n\n**Two to One Nap (12-18 months)**\n- Signs: Fighting second nap, taking forever to fall asleep\n- Transition gradually over 2-3 weeks\n- Move single nap to midday (12:30-1pm)\n\n## Bedtime Battles\n\n**Common Causes:**\n- Overtired or undertired\n- Seeking connection after busy day\n- Fear of missing out\n\n**Solutions:**\n- Consistent routine (same steps, same order)\n- One-on-one time before bed\n- Limited choices: "Blue or green pajamas?"\n- Clear expectations with consequences\n\n## Big Kid Bed\n\n**When to switch:**\n- Climbing out of crib\n- Around age 3 if possible (less wandering)\n\n**Making it work:**\n- Toddler-proof the room\n- Use a toddler clock for "okay to wake"\n- Stay calm and consistent with returns to bed',
  366,
  1095,
  ARRAY['sleep', 'toddler'],
  'en-US'
),
(
  'toddler-picky-eating',
  'Surviving Picky Eating',
  E'Picky eating peaks between ages 2-3. Here''s how to navigate without battles.\n\n## Why It Happens\n\n- Neophobia (fear of new foods) is developmentally normal\n- Toddlers crave control and autonomy\n- Appetites vary wildly day to day\n- Growth slows after year one\n\n## Strategies That Work\n\n**Division of Responsibility:**\n- You decide WHAT, WHEN, WHERE\n- Child decides IF and HOW MUCH\n\n**Reduce Pressure:**\n- No bribing, forcing, or begging\n- Keep portions small\n- Serve one accepted food with new foods\n\n**Increase Exposure:**\n- Offer new foods 10-15 times\n- Let them play with and explore food\n- Involve them in cooking and shopping\n\n## What NOT to Worry About\n\n- Eating the same foods repeatedly\n- Some days eating very little\n- Rejecting foods they previously liked\n\nMost picky eaters grow out of it by school age!',
  366,
  1095,
  ARRAY['feeding', 'behavior', 'toddler'],
  'en-US'
),
(
  'toddler-tantrums',
  'Understanding and Managing Tantrums',
  E'Tantrums are a normal part of toddler development. Here''s how to handle them with grace.\n\n## Why Tantrums Happen\n\n- Big emotions, limited words\n- Desire for independence vs. limited abilities\n- Hunger, tiredness, overstimulation\n- Testing boundaries (which is healthy!)\n\n## During a Tantrum\n\n**DO:**\n- Stay calm (your energy affects theirs)\n- Ensure safety\n- Offer simple comfort: "I''m here"\n- Wait it out\n\n**DON''T:**\n- Try to reason or explain\n- Give in to demands\n- Punish or shame\n- Match their intensity\n\n## Preventing Tantrums\n\n- **Routine and predictability**\n- **Offer choices** within limits\n- **Acknowledge feelings** before limits\n- **Catch them being good**\n\n## After the Storm\n\n- Reconnect with a hug\n- Keep it simple: "That was hard"\n- Move on - don''t lecture\n\nTantrums decrease as language develops, usually by age 4.',
  366,
  1095,
  ARRAY['behavior', 'toddler'],
  'en-US'
),
(
  'toddler-language-development',
  'Boosting Your Toddler''s Language',
  E'Language explodes during the toddler years - here''s how to support this amazing growth.\n\n## What to Expect\n\n**12-18 months:** 1-20 words, follows simple commands\n**18-24 months:** 50+ words, 2-word phrases\n**2-3 years:** Sentences, 200+ words, asks questions\n\n## How to Build Language\n\n**Narrate your day:**\n"I''m putting on your shoes. One foot, two feet!"\n\n**Expand their words:**\nChild: "Ball!" You: "Yes, big red ball!"\n\n**Read, read, read:**\n- Point to pictures\n- Ask questions\n- Let them turn pages\n\n**Limit screen time:**\nReal conversation beats any app\n\n## When to Get Help\n\n- No words by 16 months\n- No 2-word phrases by 24 months\n- Losing words they had\n- You can''t understand 50% by age 2\n\nEarly intervention makes a big difference!',
  366,
  1095,
  ARRAY['development', 'toddler'],
  'en-US'
),
(
  'toddler-play-learning',
  'Learning Through Play: Toddler Edition',
  E'Everything is a learning opportunity when you know what to look for!\n\n## Sensory Play\n\n**Water play:** Pouring, scooping, splashing\n**Sand/rice bins:** Hiding and finding objects\n**Playdough:** Squishing, rolling, cutting\n\nBenefits: Fine motor skills, cause and effect, vocabulary\n\n## Imaginative Play\n\n- Play kitchen and food\n- Baby dolls and stuffed animals\n- Dress up clothes\n- Building forts\n\nBenefits: Language, emotional development, problem-solving\n\n## Physical Play\n\n- Climbing (supervised!)\n- Running and chasing\n- Balls - kicking, throwing, rolling\n- Dancing and movement songs\n\nBenefits: Gross motor skills, body awareness, energy release\n\n## Simple Activities\n\n- Sorting by color/size\n- Puzzles (3-6 pieces)\n- Coloring and painting\n- Block building\n\n**Remember:** Process over product - it''s about exploring, not creating masterpieces!',
  366,
  1095,
  ARRAY['activities', 'development', 'toddler'],
  'en-US'
),
(
  'toddler-safety-independence',
  'Keeping Curious Toddlers Safe',
  E'Toddlers are determined explorers. Here''s how to balance safety with their need for independence.\n\n## High-Risk Areas\n\n**Kitchen:**\n- Turn pot handles inward\n- Lock cabinets with chemicals\n- Use back burners\n- Supervise around hot items\n\n**Bathroom:**\n- Never leave alone near water\n- Lock medications and cleaners\n- Set water heater below 120°F\n- Use non-slip mats\n\n**Outdoors:**\n- Fence pools and water features\n- Check playground equipment for hot surfaces\n- Constant supervision near streets\n- Teach boundaries\n\n## Teaching Safety\n\n- Use simple, clear words: "Hot! Ouch!"\n- Practice "stop" and "come"\n- Role-play safe behaviors\n- Praise safe choices\n\n## Car Seat Update\n\nKeep rear-facing as long as possible (until 40+ lbs or max height). Then forward-facing with harness.',
  366,
  1095,
  ARRAY['safety', 'toddler'],
  'en-US'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  body_md = EXCLUDED.body_md,
  age_min_days = EXCLUDED.age_min_days,
  age_max_days = EXCLUDED.age_max_days,
  tags = EXCLUDED.tags;
-- =====================================================
-- PRESCHOOL STAGE (1096-1825 days / 3-5 years) - 5 articles
-- =====================================================

INSERT INTO articles (slug, title, body_md, age_min_days, age_max_days, tags, locale)
VALUES
(
  'preschool-sleep-independence',
  'Building Sleep Independence in Preschoolers',
  E'Preschoolers often test boundaries at bedtime. Here''s how to maintain healthy sleep habits.\n\n## Common Challenges\n\n**Bedtime resistance:** "One more story!"\n**Night waking:** Coming to your room\n**Early rising:** Up at 5am ready to play\n**Nightmares:** Beginning of vivid dreams\n\n## Solutions\n\n**Bedtime routine chart:**\nVisual checklist they can follow independently\n\n**Okay-to-wake clock:**\nLight changes color when it''s okay to get up\n\n**Limited callbacks:**\nOne "ticket" for one request after lights out\n\n**Monster spray:**\nFor fears - water in a spray bottle\n\n## Ideal Schedule (Ages 3-5)\n\n- **Sleep need:** 10-13 hours total\n- **Bedtime:** 7-8pm\n- **Wake time:** 6-7am\n- **Nap:** Many drop nap by age 4, some need quiet time\n\n## Nightmare Help\n\n- Comfort briefly, don''t dwell\n- Nightlight if helpful\n- Avoid scary content before bed\n- Reassure that dreams aren''t real',
  1096,
  1825,
  ARRAY['sleep', 'preschool'],
  'en-US'
),
(
  'preschool-healthy-eating',
  'Nutrition for Your Preschooler',
  E'Preschoolers are busy and need fuel! Here''s how to keep them well-nourished.\n\n## Daily Needs\n\n- **Calories:** 1,200-1,400\n- **Protein:** 2-4 ounces (eggs, meat, beans)\n- **Dairy:** 2-2.5 cups (milk, yogurt, cheese)\n- **Fruits:** 1-1.5 cups\n- **Vegetables:** 1.5-2 cups\n- **Grains:** 4-5 ounces\n\n## Making Meals Fun\n\n- Let them help prepare food\n- Use cookie cutters for shapes\n- Make faces with food\n- Dips make everything better\n- Colorful plates are more appealing\n\n## Handling Picky Eating\n\n- Keep offering variety\n- Model healthy eating\n- No pressure, no bribes\n- Family meals together\n- Small portions, seconds available\n\n## Healthy Snack Ideas\n\n- Apple slices with nut butter\n- Cheese and crackers\n- Yogurt with berries\n- Veggies and hummus\n- Trail mix (age-appropriate pieces)',
  1096,
  1825,
  ARRAY['feeding', 'health', 'preschool'],
  'en-US'
),
(
  'preschool-emotional-development',
  'Supporting Your Preschooler''s Emotional Growth',
  E'Preschoolers feel BIG emotions and are learning to manage them. Here''s how to help.\n\n## Emotional Milestones\n\n**Age 3:**\n- Expresses wide range of emotions\n- Beginning empathy\n- May have imaginary fears\n\n**Age 4:**\n- Better at calming down\n- Understands others'' feelings\n- Tests limits emotionally\n\n**Age 5:**\n- More emotionally stable\n- Can wait for things\n- Understands rules better\n\n## Teaching Emotional Intelligence\n\n**Name feelings:**\n"You look frustrated that the tower fell."\n\n**Validate:**\n"It''s okay to feel sad. I understand."\n\n**Problem-solve:**\n"What could help you feel better?"\n\n## Calming Strategies to Teach\n\n- Deep belly breaths\n- Counting to 10\n- Squeeze a stuffed animal\n- Take a break in a cozy corner\n- Draw the feeling\n\n## Books Help\n\nRead books about feelings together. Discuss how characters feel and why.',
  1096,
  1825,
  ARRAY['behavior', 'development', 'preschool'],
  'en-US'
),
(
  'preschool-school-readiness',
  'Getting Ready for Kindergarten',
  E'School readiness isn''t just about ABCs. Here''s what really matters for kindergarten.\n\n## Social-Emotional Skills\n\n- Separates from parents\n- Takes turns and shares\n- Follows simple directions\n- Expresses needs with words\n- Shows independence in self-care\n\n## Academic Foundations\n\n**Language:**\n- Speaks in sentences\n- Tells simple stories\n- Knows full name and age\n\n**Literacy:**\n- Recognizes some letters\n- Holds a book correctly\n- Understands print has meaning\n\n**Math:**\n- Counts to 10\n- Recognizes some numbers\n- Sorts by color, shape, size\n\n## Motor Skills\n\n- Holds pencil/crayon\n- Uses scissors\n- Buttons and zips\n- Runs, jumps, climbs\n\n## Building These Skills\n\n- Read together daily\n- Play board games\n- Practice self-help skills\n- Playdates for social skills\n- Art projects for fine motor\n\nDon''t stress - kindergarten meets kids where they are!',
  1096,
  1825,
  ARRAY['development', 'activities', 'preschool'],
  'en-US'
),
(
  'preschool-safety-awareness',
  'Teaching Safety Awareness to Preschoolers',
  E'Preschoolers can start learning safety rules that will protect them as they gain independence.\n\n## Body Safety\n\n**Private parts rules:**\n- Teach proper names for body parts\n- "Your body belongs to you"\n- Good touch vs. bad touch\n- Okay to say no, tell a trusted adult\n\n## Stranger Safety\n\n**Safe adults:**\n- Know who''s on the safe list\n- Never go with strangers\n- Practice saying "No, I need to ask my parent"\n\n**What if lost:**\n- Stay where you are\n- Find a mom with kids or store worker\n- Know parent''s phone number\n\n## Traffic Safety\n\n- Always hold hands in parking lots\n- Look both ways together\n- Stop at the curb\n- Practice pedestrian skills\n\n## Home Safety Rules\n\n- Never open door for strangers\n- Don''t touch medicine or cleaning products\n- What to do in emergency (call 911)\n- Fire drill practice\n\n## Online Safety\n\n- Screens in common areas\n- Don''t share personal information\n- Tell a grown-up if something feels wrong',
  1096,
  1825,
  ARRAY['safety', 'preschool'],
  'en-US'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  body_md = EXCLUDED.body_md,
  age_min_days = EXCLUDED.age_min_days,
  age_max_days = EXCLUDED.age_max_days,
  tags = EXCLUDED.tags;
