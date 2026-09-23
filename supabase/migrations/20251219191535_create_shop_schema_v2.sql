-- =====================================================
-- CURATED SHOP DATABASE SCHEMA
-- =====================================================
-- 
-- This migration creates the database schema for the Curated Shop feature:
-- 
-- 🛍️ PRODUCT CATALOG
--   - Products with detailed metadata
--   - Categories with emoji indicators
--   - Multiple affiliate links per product
-- 
-- 🎯 PERSONALIZATION
--   - User-specific recommendation caching
--   - Click tracking for analytics
-- 
-- 🔒 SECURITY
--   - Row Level Security (RLS) policies
--   - User data isolation
--   - Public product browsing
-- 
-- NOTE: This creates NEW shop_* tables and does NOT modify existing
-- affiliate_products, affiliate_clicks, or product_mentions_log tables.

-- =====================================================
-- ENUMS
-- =====================================================

DO $$ 
BEGIN
    -- Product category enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shop_category') THEN
        CREATE TYPE shop_category AS ENUM (
            'feeding', 'sleep', 'safety', 'toys', 
            'health', 'clothing', 'travel', 'nursery'
        );
    END IF;
    
    -- Recommendation section types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_section') THEN
        CREATE TYPE recommendation_section AS ENUM (
            'for_you',           -- Personalized AI picks
            'chat_based',        -- From chat context
            'age_based',         -- Perfect for X months
            'recipe_based',      -- From your recipes
            'milestone_based',   -- Milestone helpers
            'category_spotlight',-- Category essentials
            'top_rated',         -- Highest rated
            'popular'            -- Parent favorites
        );
    END IF;
END $$;

-- =====================================================
-- SHOP CATEGORIES TABLE
-- Defines product categories with display info
-- =====================================================

CREATE TABLE IF NOT EXISTS shop_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    emoji TEXT NOT NULL DEFAULT '🛍️',
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE shop_categories IS 'Product categories for the Curated Shop with display metadata';

-- =====================================================
-- SHOP AFFILIATES TABLE
-- Defines affiliate partner info
-- =====================================================

CREATE TABLE IF NOT EXISTS shop_affiliates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    base_url TEXT NOT NULL,
    tag_param TEXT,                    -- e.g., 'tag' for Amazon, 'affid' for others
    store_tag TEXT,                    -- e.g., 'mycuratedhaven-20' for Amazon
    commission_rate DECIMAL(5,2),      -- e.g., 4.00 for 4%
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,        -- Higher = preferred when product on multiple affiliates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE shop_affiliates IS 'Affiliate partner information including store tags and commission rates';

-- =====================================================
-- SHOP PRODUCTS TABLE
-- Master product catalog
-- =====================================================

CREATE TABLE IF NOT EXISTS shop_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price DECIMAL(10,2),
    original_price DECIMAL(10,2),      -- For showing discounts
    rating DECIMAL(2,1),               -- 0.0 to 5.0
    review_count INTEGER DEFAULT 0,
    category_id UUID REFERENCES shop_categories(id) ON DELETE SET NULL,
    category_slug TEXT,                -- Denormalized for quick filtering
    age_range_min INTEGER DEFAULT 0,   -- In months
    age_range_max INTEGER,             -- In months (NULL = no upper limit)
    tags TEXT[],                       -- Search and grouping tags
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE shop_products IS 'Master product catalog with metadata, pricing, and ratings';

-- =====================================================
-- SHOP PRODUCT AFFILIATES TABLE
-- Links products to affiliate URLs (many-to-many)
-- =====================================================

CREATE TABLE IF NOT EXISTS shop_product_affiliates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES shop_products(id) ON DELETE CASCADE NOT NULL,
    affiliate_id UUID REFERENCES shop_affiliates(id) ON DELETE CASCADE NOT NULL,
    affiliate_product_id TEXT,         -- Product ID on affiliate platform (e.g., ASIN)
    affiliate_url TEXT NOT NULL,       -- Full affiliate URL
    price DECIMAL(10,2),               -- Affiliate-specific price
    is_available BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,  -- Primary affiliate for this product
    last_checked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, affiliate_id)
);

COMMENT ON TABLE shop_product_affiliates IS 'Links products to affiliate partner URLs with availability tracking';

-- =====================================================
-- SHOP CLICKS TABLE
-- Tracks user clicks for analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS shop_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    product_id UUID REFERENCES shop_products(id) ON DELETE CASCADE NOT NULL,
    affiliate_id UUID REFERENCES shop_affiliates(id) ON DELETE SET NULL,
    session_id TEXT,
    source TEXT,                       -- Where click originated (shop, chat, recipe, milestone)
    section_type recommendation_section,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE shop_clicks IS 'Click tracking for affiliate analytics and recommendation optimization';

-- =====================================================
-- SHOP USER RECOMMENDATIONS TABLE
-- Cached personalized recommendations per user
-- =====================================================

CREATE TABLE IF NOT EXISTS shop_user_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    section_type recommendation_section NOT NULL,
    product_ids UUID[] NOT NULL,       -- Array of recommended product IDs
    context JSONB,                     -- Context data (e.g., chat topic, milestone name)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, section_type)
);

COMMENT ON TABLE shop_user_recommendations IS 'Cached personalized product recommendations per user and section';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON shop_products(category_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_category_slug ON shop_products(category_slug);
CREATE INDEX IF NOT EXISTS idx_shop_products_rating ON shop_products(rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_shop_products_click_count ON shop_products(click_count DESC);
CREATE INDEX IF NOT EXISTS idx_shop_products_age_range ON shop_products(age_range_min, age_range_max);
CREATE INDEX IF NOT EXISTS idx_shop_products_active ON shop_products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_shop_products_tags ON shop_products USING GIN(tags);

-- Product affiliates indexes
CREATE INDEX IF NOT EXISTS idx_shop_product_affiliates_product ON shop_product_affiliates(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_product_affiliates_affiliate ON shop_product_affiliates(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_shop_product_affiliates_primary ON shop_product_affiliates(product_id) WHERE is_primary = TRUE;

-- Clicks indexes
CREATE INDEX IF NOT EXISTS idx_shop_clicks_user ON shop_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_clicks_product ON shop_clicks(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_clicks_date ON shop_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_clicks_source ON shop_clicks(source);

-- Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_shop_recommendations_user ON shop_user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_recommendations_expires ON shop_user_recommendations(expires_at);

-- =====================================================
-- TRIGGERS FOR updated_at COLUMNS
-- =====================================================

-- Apply existing update_updated_at() function to shop tables
DROP TRIGGER IF EXISTS update_shop_categories_updated_at ON shop_categories;
CREATE TRIGGER update_shop_categories_updated_at
    BEFORE UPDATE ON shop_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_shop_affiliates_updated_at ON shop_affiliates;
CREATE TRIGGER update_shop_affiliates_updated_at
    BEFORE UPDATE ON shop_affiliates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_shop_products_updated_at ON shop_products;
CREATE TRIGGER update_shop_products_updated_at
    BEFORE UPDATE ON shop_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_shop_product_affiliates_updated_at ON shop_product_affiliates;
CREATE TRIGGER update_shop_product_affiliates_updated_at
    BEFORE UPDATE ON shop_product_affiliates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_shop_recommendations_updated_at ON shop_user_recommendations;
CREATE TRIGGER update_shop_recommendations_updated_at
    BEFORE UPDATE ON shop_user_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_product_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_user_recommendations ENABLE ROW LEVEL SECURITY;

-- Categories: Public read access
DROP POLICY IF EXISTS "Anyone can view active shop categories" ON shop_categories;
CREATE POLICY "Anyone can view active shop categories"
    ON shop_categories FOR SELECT
    USING (is_active = TRUE);

-- Affiliates: Public read access
DROP POLICY IF EXISTS "Anyone can view active affiliates" ON shop_affiliates;
CREATE POLICY "Anyone can view active affiliates"
    ON shop_affiliates FOR SELECT
    USING (is_active = TRUE);

-- Products: Public read access
DROP POLICY IF EXISTS "Anyone can view active products" ON shop_products;
CREATE POLICY "Anyone can view active products"
    ON shop_products FOR SELECT
    USING (is_active = TRUE);

-- Product affiliates: Public read access
DROP POLICY IF EXISTS "Anyone can view available product affiliates" ON shop_product_affiliates;
CREATE POLICY "Anyone can view available product affiliates"
    ON shop_product_affiliates FOR SELECT
    USING (is_available = TRUE);

-- Clicks: Users can insert their own clicks, view only their own
DROP POLICY IF EXISTS "Users can insert their own clicks" ON shop_clicks;
CREATE POLICY "Users can insert their own clicks"
    ON shop_clicks FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can view their own clicks" ON shop_clicks;
CREATE POLICY "Users can view their own clicks"
    ON shop_clicks FOR SELECT
    USING (auth.uid() = user_id);

-- Recommendations: Users can only access their own recommendations
DROP POLICY IF EXISTS "Users can view their own recommendations" ON shop_user_recommendations;
CREATE POLICY "Users can view their own recommendations"
    ON shop_user_recommendations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recommendations" ON shop_user_recommendations;
CREATE POLICY "Users can insert their own recommendations"
    ON shop_user_recommendations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recommendations" ON shop_user_recommendations;
CREATE POLICY "Users can update their own recommendations"
    ON shop_user_recommendations FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recommendations" ON shop_user_recommendations;
CREATE POLICY "Users can delete their own recommendations"
    ON shop_user_recommendations FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to increment product click count
CREATE OR REPLACE FUNCTION increment_shop_click(product_id_input UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE shop_products
    SET click_count = click_count + 1
    WHERE id = product_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SEED DATA: CATEGORIES
-- =====================================================

INSERT INTO shop_categories (name, slug, emoji, description, sort_order) VALUES
    ('Feeding', 'feeding', '🍼', 'Bottles, high chairs, utensils, bibs, and food prep', 1),
    ('Sleep', 'sleep', '💤', 'Cribs, sleep sacks, monitors, and white noise machines', 2),
    ('Safety', 'safety', '🛡️', 'Baby proofing, monitors, car seats, and safety gates', 3),
    ('Toys & Development', 'toys', '🧸', 'Age-appropriate toys, learning aids, and books', 4),
    ('Health & Care', 'health', '❤️', 'First aid, grooming, bath time, and skincare', 5),
    ('Clothing', 'clothing', '👕', 'Seasonal and milestone-based clothing', 6),
    ('Outdoor & Travel', 'travel', '✈️', 'Strollers, carriers, and diaper bags', 7),
    ('Nursery', 'nursery', '🌼', 'Furniture, decor, and organization', 8)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- SEED DATA: AFFILIATES
-- =====================================================

INSERT INTO shop_affiliates (name, slug, logo_url, base_url, tag_param, store_tag, commission_rate, priority) VALUES
    ('Amazon', 'amazon', 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', 'https://www.amazon.com', 'tag', 'mycuratedhave-20', 4.00, 100),
    ('Walmart', 'walmart', 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Walmart_logo.svg', 'https://www.walmart.com', NULL, NULL, 4.00, 50),
    ('Target', 'target', 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Target_logo.svg', 'https://www.target.com', NULL, NULL, 5.00, 50)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION increment_shop_click(UUID) TO authenticated;
;
