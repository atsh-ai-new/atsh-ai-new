-- Canonical, non-destructive pricing ledger. Legacy tables remain compatible.
CREATE TABLE IF NOT EXISTS unified_price_items (
  scope text NOT NULL CHECK (scope IN ('package','package_option','sector','sector_addon')),
  owner_key text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(14,2),
  pricing_type text NOT NULL CHECK (pricing_type IN ('fixed','monthly','yearly','per_page')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(scope,owner_key,code)
);
INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
SELECT 'package',id::text,'base',name,description,price,'fixed' FROM packages
ON CONFLICT(scope,owner_key,code) DO NOTHING;
INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
SELECT 'package_option',package_id::text,code,name,description,price,pricing_type FROM package_options
ON CONFLICT(scope,owner_key,code) DO NOTHING;
INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
SELECT 'sector',item->>'slug','base',item->>'name',coalesce(item->>'description',''),(item->>'basePrice')::numeric,'fixed'
FROM site_pages p CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.content::jsonb->'items','[]'::jsonb)) item
WHERE p.slug='catalog' AND p.locale='ar' AND (item->>'basePrice') ~ '^[0-9]+(\\.[0-9]+)?$'
ON CONFLICT(scope,owner_key,code) DO NOTHING;
INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
SELECT 'sector_addon',item->>'slug',addon->>'code',addon->>'name',coalesce(addon->>'description',''),(addon->>'price')::numeric,addon->>'pricingType'
FROM site_pages p CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.content::jsonb->'items','[]'::jsonb)) item
CROSS JOIN LATERAL jsonb_array_elements(coalesce(item->'pricedAddons','[]'::jsonb)) addon
WHERE p.slug='catalog' AND p.locale='ar' AND (addon->>'price') ~ '^[0-9]+(\\.[0-9]+)?$' AND addon->>'pricingType' IN ('fixed','monthly','yearly')
ON CONFLICT(scope,owner_key,code) DO NOTHING;
