CREATE TABLE IF NOT EXISTS affiliate_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_name TEXT NOT NULL,
    name_variants TEXT[] DEFAULT '{}'::TEXT[],
    description TEXT,
    affiliate_url TEXT NOT NULL,
    affiliate_network TEXT DEFAULT 'amazon',
    image_url TEXT,
    price NUMERIC,
    category TEXT,
    age_range_min INTEGER DEFAULT 0,
    age_range_max INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE affiliate_products IS 'DEPRECATED: superseded by shop_products as of 2026-04-27. Kept for one-release soak window before drop.';

CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    product_id UUID,
    session_id UUID,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE affiliate_clicks IS 'DEPRECATED: superseded by shop_clicks as of 2026-04-27. Historical rows backfilled to shop_clicks with source=chat.';

CREATE TABLE IF NOT EXISTS product_mentions_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_name TEXT NOT NULL,
    had_affiliate BOOLEAN DEFAULT FALSE,
    session_id UUID,
    user_id UUID,
    mentioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE product_mentions_log IS 'Tracks every product name the LLM mentions in chat (had_affiliate=true if matched a catalog row). Still actively written by the chat Edge Function for analytics; not deprecated.';
;
