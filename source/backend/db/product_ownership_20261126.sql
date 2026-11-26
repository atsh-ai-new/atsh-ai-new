-- Independent tariffs. Existing orders and historic base prices are untouched.
CREATE TABLE IF NOT EXISTS product_ownership_prices (
  scope text NOT NULL CHECK(scope IN ('package','sector')),
  owner_key text NOT NULL,
  mode text NOT NULL CHECK(mode IN ('rent','copy','code','rent_monthly')),
  list_price numeric(12,2) NOT NULL CHECK(list_price>=0),
  initial_price numeric(12,2) NOT NULL CHECK(initial_price>=0),
  discount_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(discount_percent BETWEEN 0 AND 100),
  PRIMARY KEY(scope,owner_key,mode)
);

-- Upgrade existing installations without deleting or replacing existing prices.
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='product_ownership_prices'::regclass
   AND conname='product_ownership_prices_mode_check'
   AND position('rent_monthly' IN pg_get_constraintdef(oid))=0) THEN
  ALTER TABLE product_ownership_prices DROP CONSTRAINT product_ownership_prices_mode_check;
  ALTER TABLE product_ownership_prices ADD CONSTRAINT product_ownership_prices_mode_check
   CHECK(mode IN ('rent','copy','code','rent_monthly'));
 END IF;
END $$;
