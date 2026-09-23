-- AFFILIATE CONSOLIDATION: legacy affiliate_* -> shop_*

ALTER TABLE shop_products
    ADD COLUMN IF NOT EXISTS name_variants TEXT[];

ALTER TABLE shop_products
    ADD COLUMN IF NOT EXISTS legacy_affiliate_id UUID;

COMMENT ON COLUMN shop_products.name_variants IS
    'Alternative names / aliases used to match LLM bold-text mentions in chat enrichment';
COMMENT ON COLUMN shop_products.legacy_affiliate_id IS
    'Original id from the legacy affiliate_products table (for click backfill traceability). Will be dropped after deprecation soak.';

CREATE INDEX IF NOT EXISTS idx_shop_products_name_variants
    ON shop_products USING GIN (name_variants);

CREATE INDEX IF NOT EXISTS idx_shop_products_legacy_affiliate_id
    ON shop_products(legacy_affiliate_id)
    WHERE legacy_affiliate_id IS NOT NULL;

INSERT INTO shop_products (
    name, description, image_url, price, category_slug, category_id,
    age_range_min, age_range_max, is_active, click_count, name_variants, legacy_affiliate_id
)
SELECT
    ap.product_name, ap.description, ap.image_url, ap.price,
    CASE ap.category WHEN 'development' THEN 'toys' ELSE ap.category END,
    (SELECT id FROM shop_categories WHERE slug = CASE ap.category WHEN 'development' THEN 'toys' ELSE ap.category END),
    COALESCE(ap.age_range_min, 0), ap.age_range_max,
    COALESCE(ap.is_active, TRUE), COALESCE(ap.click_count, 0),
    ap.name_variants, ap.id
FROM affiliate_products ap
WHERE NOT EXISTS (SELECT 1 FROM shop_products sp WHERE sp.legacy_affiliate_id = ap.id);

INSERT INTO shop_product_affiliates (
    product_id, affiliate_id, affiliate_url, price, is_primary, is_available
)
SELECT sp.id, sa.id, ap.affiliate_url, ap.price, TRUE, TRUE
FROM shop_products sp
JOIN affiliate_products ap ON sp.legacy_affiliate_id = ap.id
JOIN shop_affiliates sa ON sa.slug = ap.affiliate_network
WHERE NOT EXISTS (
    SELECT 1 FROM shop_product_affiliates spa
    WHERE spa.product_id = sp.id AND spa.affiliate_id = sa.id
);

INSERT INTO shop_clicks (
    user_id, product_id, affiliate_id, session_id, source, section_type, clicked_at
)
SELECT
    ac.user_id, sp.id, spa.affiliate_id, ac.session_id::TEXT,
    'chat', 'chat_based'::recommendation_section, ac.clicked_at
FROM affiliate_clicks ac
JOIN shop_products sp ON sp.legacy_affiliate_id = ac.product_id
LEFT JOIN shop_product_affiliates spa ON spa.product_id = sp.id AND spa.is_primary = TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM shop_clicks sc
    WHERE sc.user_id IS NOT DISTINCT FROM ac.user_id
      AND sc.product_id = sp.id
      AND sc.clicked_at = ac.clicked_at
);
;
