DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='content_studio_assets'::regclass AND conname='content_studio_assets_kind_check' AND pg_get_constraintdef(oid) NOT LIKE '%music%') THEN
  ALTER TABLE content_studio_assets DROP CONSTRAINT content_studio_assets_kind_check;
  ALTER TABLE content_studio_assets ADD CONSTRAINT content_studio_assets_kind_check CHECK (kind IN ('hero','background','prop','music'));
 END IF;
END $$;
