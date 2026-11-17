-- Immutable logo snapshot for each approved customer preview.
-- Changing a draft logo will never rewrite the artwork associated with a signed-off version.
ALTER TABLE customer_preview_versions ADD COLUMN IF NOT EXISTS logo_mime_type varchar(30);
ALTER TABLE customer_preview_versions ADD COLUMN IF NOT EXISTS logo_data bytea;
ALTER TABLE customer_preview_versions ADD CONSTRAINT customer_preview_logo_type_chk
  CHECK (logo_mime_type IS NULL OR logo_mime_type IN ('image/png','image/jpeg','image/webp'));
ALTER TABLE customer_preview_versions ADD CONSTRAINT customer_preview_logo_size_chk
  CHECK (logo_data IS NULL OR octet_length(logo_data) BETWEEN 1 AND 2097152);
ALTER TABLE customer_preview_versions ADD CONSTRAINT customer_preview_logo_pair_chk
  CHECK ((logo_mime_type IS NULL) = (logo_data IS NULL));
