-- One authoritative catalog. Package rows are compatibility projections, preserving
-- their IDs and existing order snapshots for older checkout clients and ledgers.
ALTER TABLE packages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE TABLE IF NOT EXISTS shared_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE CHECK(code NOT IN ('domain_com','domain_eg','domain','logo_design','visual_identity')),
  name varchar(160) NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(12,2) NOT NULL CHECK(price>=0),
  pricing_type varchar(20) NOT NULL CHECK(pricing_type IN ('fixed','monthly','yearly','per_page')),
  unit_label varchar(40) NOT NULL DEFAULT '',
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prefer the existing published active row, then the configured package order.
-- The migration never rewrites a previously saved central definition on restart.
INSERT INTO shared_addons(code,name,description,price,pricing_type,unit_label,is_required,is_active,sort_order)
SELECT DISTINCT ON (o.code) o.code,o.name,o.description,o.price,o.pricing_type,o.unit_label,o.is_required,o.is_active,o.sort_order
FROM package_options o JOIN packages p ON p.id=o.package_id
WHERE o.code NOT IN ('domain_com','domain_eg','domain','logo_design','visual_identity')
  AND p.deleted_at IS NULL
ORDER BY o.code,(p.is_published AND o.is_active) DESC,p.is_published DESC,o.is_active DESC,p.sort_order,o.created_at,o.id
ON CONFLICT(code) DO NOTHING;

CREATE OR REPLACE FUNCTION project_shared_addon() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO package_options(package_id,code,name,description,price,pricing_type,unit_label,is_required,is_active,sort_order,visibility)
  SELECT p.id,NEW.code,NEW.name,NEW.description,NEW.price,NEW.pricing_type,NEW.unit_label,NEW.is_required,NEW.is_active,NEW.sort_order,'both'
  FROM packages p WHERE p.deleted_at IS NULL
  ON CONFLICT(package_id,code) DO UPDATE SET
    name=EXCLUDED.name,description=EXCLUDED.description,price=EXCLUDED.price,pricing_type=EXCLUDED.pricing_type,
    unit_label=EXCLUDED.unit_label,is_required=EXCLUDED.is_required,is_active=EXCLUDED.is_active,
    sort_order=EXCLUDED.sort_order,visibility='both';
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS shared_addon_projection ON shared_addons;
CREATE TRIGGER shared_addon_projection AFTER INSERT OR UPDATE ON shared_addons
FOR EACH ROW EXECUTE FUNCTION project_shared_addon();

CREATE OR REPLACE FUNCTION inherit_shared_addons() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO package_options(package_id,code,name,description,price,pricing_type,unit_label,is_required,is_active,sort_order,visibility)
  SELECT NEW.id,a.code,a.name,a.description,a.price,a.pricing_type,a.unit_label,a.is_required,a.is_active,a.sort_order,'both'
  FROM shared_addons a
  ON CONFLICT(package_id,code) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS shared_addon_package_inheritance ON packages;
CREATE TRIGGER shared_addon_package_inheritance AFTER INSERT ON packages
FOR EACH ROW EXECUTE FUNCTION inherit_shared_addons();

-- Reconcile on startup; keep existing projection IDs and historical orders.
-- These updates also invoke the existing unified price ledger synchronization.
UPDATE shared_addons SET sort_order=sort_order;
