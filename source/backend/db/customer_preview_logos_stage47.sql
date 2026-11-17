-- Immutable preview artwork. Migration is safe to run repeatedly.
ALTER TABLE customer_preview_versions ADD COLUMN IF NOT EXISTS logo_mime_type varchar(30);
ALTER TABLE customer_preview_versions ADD COLUMN IF NOT EXISTS logo_data bytea;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='customer_preview_logo_type_chk') THEN
  ALTER TABLE customer_preview_versions ADD CONSTRAINT customer_preview_logo_type_chk CHECK (logo_mime_type IS NULL OR logo_mime_type IN ('image/png','image/jpeg','image/webp'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='customer_preview_logo_size_chk') THEN
  ALTER TABLE customer_preview_versions ADD CONSTRAINT customer_preview_logo_size_chk CHECK (logo_data IS NULL OR octet_length(logo_data) BETWEEN 1 AND 2097152);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='customer_preview_logo_pair_chk') THEN
  ALTER TABLE customer_preview_versions ADD CONSTRAINT customer_preview_logo_pair_chk CHECK ((logo_mime_type IS NULL) = (logo_data IS NULL));
 END IF;
END
$$;
