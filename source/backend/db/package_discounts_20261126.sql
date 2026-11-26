-- Preserve original tariff and calculate the authoritative effective package price.
ALTER TABLE packages ADD COLUMN IF NOT EXISTS list_price numeric(12,2) CHECK(list_price>=0);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS initial_price numeric(12,2) CHECK(initial_price>=0);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(discount_percent BETWEEN 0 AND 100);

-- The approved tariff is installed exactly once, never reviving deleted packages.
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM schema_migrations WHERE version='2026-11-26-package-tariff') THEN
    UPDATE packages p SET price=v.amount
    FROM (VALUES ('11111111-1111-4111-8111-111111111111'::uuid,1250),('22222222-2222-4222-8222-222222222222'::uuid,1990),('33333333-3333-4333-8333-333333333333'::uuid,2490)) v(id,amount)
    WHERE p.id=v.id AND p.deleted_at IS NULL AND NOT p.is_custom_quote;
    INSERT INTO schema_migrations(version) VALUES('2026-11-26-package-tariff');
  END IF;
END $$;
UPDATE packages SET list_price=price WHERE list_price IS NULL;
UPDATE packages SET initial_price=list_price WHERE initial_price IS NULL;
ALTER TABLE packages ALTER COLUMN list_price SET NOT NULL;
ALTER TABLE packages ALTER COLUMN initial_price SET NOT NULL;

CREATE OR REPLACE FUNCTION calculate_package_discount() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.list_price=COALESCE(NEW.list_price,NEW.price);
    NEW.initial_price=NEW.list_price;
  ELSIF NEW.price IS DISTINCT FROM OLD.price AND NEW.list_price IS NOT DISTINCT FROM OLD.list_price THEN
    NEW.list_price=NEW.price;
  END IF;
  IF NEW.is_custom_quote THEN NEW.discount_percent=0; END IF;
  NEW.price=round(NEW.list_price*(100-NEW.discount_percent)/100,2);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS package_discount ON packages;
CREATE TRIGGER package_discount BEFORE INSERT OR UPDATE ON packages
FOR EACH ROW EXECUTE FUNCTION calculate_package_discount();

-- UPDATE OF price alone does not fire when the BEFORE trigger derives the price.
CREATE OR REPLACE FUNCTION sync_package_pricing() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO unified_price_items(scope,owner_key,code,name,description,amount,pricing_type,updated_at)
  VALUES('package',NEW.id::text,'base',NEW.name,coalesce(NEW.description,''),CASE WHEN NEW.is_custom_quote THEN NULL ELSE NEW.price END,'fixed',now())
  ON CONFLICT(scope,owner_key,code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,amount=EXCLUDED.amount,updated_at=now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS unified_package_price_sync ON packages;
CREATE TRIGGER unified_package_price_sync AFTER INSERT OR UPDATE ON packages
FOR EACH ROW EXECUTE FUNCTION sync_package_pricing();
UPDATE unified_price_items u SET amount=CASE WHEN p.is_custom_quote THEN NULL ELSE p.price END
FROM packages p WHERE u.scope='package' AND u.owner_key=p.id::text AND u.code='base'
AND u.amount IS DISTINCT FROM CASE WHEN p.is_custom_quote THEN NULL ELSE p.price END;
