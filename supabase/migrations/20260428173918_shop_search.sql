ALTER TYPE recommendation_section ADD VALUE IF NOT EXISTS 'search';

CREATE OR REPLACE FUNCTION search_shop_products(
    query_text TEXT,
    result_limit INT DEFAULT 30
)
RETURNS TABLE (product_id UUID, relevance INT)
LANGUAGE sql STABLE AS $$
    WITH q AS (SELECT lower(trim(query_text)) AS term)
    SELECT
        sp.id AS product_id,
        (CASE
            WHEN lower(sp.name) = (SELECT term FROM q)             THEN 100
            WHEN lower(sp.name) LIKE (SELECT term FROM q) || '%'   THEN 80
            WHEN EXISTS (
                SELECT 1 FROM unnest(sp.name_variants) v
                WHERE lower(v) = (SELECT term FROM q)
            )                                                      THEN 60
            WHEN sp.name ILIKE '%' || (SELECT term FROM q) || '%'  THEN 40
            WHEN sp.description ILIKE '%' || (SELECT term FROM q) || '%' THEN 20
            ELSE 0
        END) AS relevance
    FROM shop_products sp
    WHERE sp.is_active = true
      AND (
          sp.name ILIKE '%' || (SELECT term FROM q) || '%'
          OR sp.description ILIKE '%' || (SELECT term FROM q) || '%'
          OR EXISTS (
              SELECT 1 FROM unnest(sp.name_variants) v
              WHERE lower(v) LIKE '%' || (SELECT term FROM q) || '%'
          )
      )
    ORDER BY relevance DESC, sp.click_count DESC NULLS LAST
    LIMIT result_limit;
$$;

GRANT EXECUTE ON FUNCTION search_shop_products(TEXT, INT) TO anon, authenticated;;
