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
SELECT 'package',id::text,'base',name,coalesce(description,''),price,'fixed' FROM packages
ON CONFLICT(scope,owner_key,code) DO NOTHING;
INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
SELECT 'package_option',package_id::text,code,name,coalesce(description,''),price,pricing_type FROM package_options
ON CONFLICT(scope,owner_key,code) DO NOTHING;
INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
SELECT 'sector',item->>'slug','base',item->>'name',coalesce(item->>'description',''),(item->>'basePrice')::numeric,'fixed'
FROM site_pages p CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.content::jsonb->'items','[]'::jsonb)) item
WHERE p.slug='catalog' AND p.locale='ar' AND (item->>'basePrice') ~ '^[0-9]+([.][0-9]+)?$'
ON CONFLICT(scope,owner_key,code) DO NOTHING;
INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
SELECT 'sector_addon',item->>'slug',addon->>'code',addon->>'name',coalesce(addon->>'description',''),(addon->>'price')::numeric,addon->>'pricingType'
FROM site_pages p CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.content::jsonb->'items','[]'::jsonb)) item
CROSS JOIN LATERAL jsonb_array_elements(coalesce(item->'pricedAddons','[]'::jsonb)) addon
WHERE p.slug='catalog' AND p.locale='ar' AND (addon->>'price') ~ '^[0-9]+([.][0-9]+)?$' AND addon->>'pricingType' IN ('fixed','monthly','yearly')
ON CONFLICT(scope,owner_key,code) DO NOTHING;

-- Keep legacy admin writers compatible while materializing all current prices in one ledger.
CREATE OR REPLACE FUNCTION sync_package_pricing() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type,updated_at)
  VALUES('package',NEW.id::text,'base',NEW.name,coalesce(NEW.description,''),NEW.price,'fixed',now())
  ON CONFLICT(scope,owner_key,code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,amount=EXCLUDED.amount,updated_at=now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS unified_package_price_sync ON packages;
CREATE TRIGGER unified_package_price_sync AFTER INSERT OR UPDATE OF name,description,price ON packages FOR EACH ROW EXECUTE FUNCTION sync_package_pricing();

CREATE OR REPLACE FUNCTION sync_package_option_pricing() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type,updated_at)
  VALUES('package_option',NEW.package_id::text,NEW.code,NEW.name,coalesce(NEW.description,''),NEW.price,NEW.pricing_type,now())
  ON CONFLICT(scope,owner_key,code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,amount=EXCLUDED.amount,pricing_type=EXCLUDED.pricing_type,updated_at=now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS unified_option_price_sync ON package_options;
CREATE TRIGGER unified_option_price_sync AFTER INSERT OR UPDATE OF name,description,price,pricing_type ON package_options FOR EACH ROW EXECUTE FUNCTION sync_package_option_pricing();

CREATE OR REPLACE FUNCTION sync_sector_pricing() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item jsonb; addon jsonb;
BEGIN
  IF NEW.slug<>'catalog' OR NEW.locale<>'ar' THEN RETURN NEW; END IF;
  IF jsonb_typeof(NEW.content->'items') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Catalog items must be an array'; END IF;
  DELETE FROM unified_price_items WHERE scope IN ('sector','sector_addon');
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(NEW.content->'items','[]'::jsonb)) LOOP
    IF coalesce(item->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*
      INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
      VALUES('sector',item->>'slug','base',item->>'name',coalesce(item->>'description',''),(item->>'basePrice')::numeric,'fixed');
    END IF;
    FOR addon IN SELECT value FROM jsonb_array_elements(coalesce(item->'pricedAddons','[]'::jsonb)) LOOP
      IF coalesce(addon->>'price','') ~ '^[0-9]+([.][0-9]+)?$' AND addon->>'pricingType' IN ('fixed','monthly','yearly') THEN
        INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
        VALUES('sector_addon',item->>'slug',addon->>'code',addon->>'name',coalesce(addon->>'description',''),(addon->>'price')::numeric,addon->>'pricingType');
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS unified_sector_price_sync ON site_pages;
CREATE TRIGGER unified_sector_price_sync AFTER INSERT OR UPDATE OF content ON site_pages FOR EACH ROW EXECUTE FUNCTION sync_sector_pricing();
 THEN RAISE EXCEPTION 'Invalid sector slug'; END IF;
    IF coalesce(item->>'basePrice','') ~ '^[0-9]+([.][0-9]+)?
      INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
      VALUES('sector',item->>'slug','base',item->>'name',coalesce(item->>'description',''),(item->>'basePrice')::numeric,'fixed');
    END IF;
    FOR addon IN SELECT value FROM jsonb_array_elements(coalesce(item->'pricedAddons','[]'::jsonb)) LOOP
      IF coalesce(addon->>'price','') ~ '^[0-9]+([.][0-9]+)?$' AND addon->>'pricingType' IN ('fixed','monthly','yearly') THEN
        INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
        VALUES('sector_addon',item->>'slug',addon->>'code',addon->>'name',coalesce(addon->>'description',''),(addon->>'price')::numeric,addon->>'pricingType');
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS unified_sector_price_sync ON site_pages;
CREATE TRIGGER unified_sector_price_sync AFTER INSERT OR UPDATE OF content ON site_pages FOR EACH ROW EXECUTE FUNCTION sync_sector_pricing();
 THEN
      INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
      VALUES('sector',item->>'slug','base',item->>'name',coalesce(item->>'description',''),(item->>'basePrice')::numeric,'fixed');
    END IF;
    FOR addon IN SELECT value FROM jsonb_array_elements(coalesce(item->'pricedAddons','[]'::jsonb)) LOOP
      IF coalesce(addon->>'price','') ~ '^[0-9]+([.][0-9]+)?$' AND addon->>'pricingType' IN ('fixed','monthly','yearly') THEN
        INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type)
        VALUES('sector_addon',item->>'slug',addon->>'code',addon->>'name',coalesce(addon->>'description',''),(addon->>'price')::numeric,addon->>'pricingType');
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS unified_sector_price_sync ON site_pages;
CREATE TRIGGER unified_sector_price_sync AFTER INSERT OR UPDATE OF content ON site_pages FOR EACH ROW EXECUTE FUNCTION sync_sector_pricing();
