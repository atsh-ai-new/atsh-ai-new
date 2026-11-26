-- Independent tariffs. Existing orders and historic base prices are untouched.
CREATE TABLE IF NOT EXISTS product_ownership_prices (
  scope text NOT NULL CHECK(scope IN ('package','sector')),
  owner_key text NOT NULL,
  mode text NOT NULL CHECK(mode IN ('rent','copy','code')),
  list_price numeric(12,2) NOT NULL CHECK(list_price>=0),
  initial_price numeric(12,2) NOT NULL CHECK(initial_price>=0),
  discount_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(discount_percent BETWEEN 0 AND 100),
  PRIMARY KEY(scope,owner_key,mode)
);
