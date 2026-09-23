ALTER TYPE recommendation_section ADD VALUE IF NOT EXISTS 'saved';

CREATE TABLE IF NOT EXISTS shop_user_saved_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES shop_products(id) ON DELETE CASCADE NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, product_id)
);

COMMENT ON TABLE shop_user_saved_products IS
    'Per-user wishlist of saved shop products. Insert-once, delete-to-unsave.';

CREATE INDEX IF NOT EXISTS idx_shop_user_saved_products_user
    ON shop_user_saved_products(user_id, saved_at DESC);

ALTER TABLE shop_user_saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saves"
    ON shop_user_saved_products FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saves"
    ON shop_user_saved_products FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saves"
    ON shop_user_saved_products FOR DELETE
    USING (auth.uid() = user_id);;
