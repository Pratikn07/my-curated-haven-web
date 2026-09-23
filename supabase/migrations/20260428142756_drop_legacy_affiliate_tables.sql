DROP INDEX IF EXISTS idx_shop_products_legacy_affiliate_id;

ALTER TABLE shop_products DROP COLUMN IF EXISTS legacy_affiliate_id;

DROP TABLE IF EXISTS affiliate_clicks;
DROP TABLE IF EXISTS affiliate_products;

DROP FUNCTION IF EXISTS increment_affiliate_click(uuid);;
