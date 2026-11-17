-- Additive CMS contract-template revision model; signed and issued documents preserve body_snapshot.
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS category varchar(40) NOT NULL DEFAULT 'general';
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS updated_by varchar(254);
CREATE TABLE IF NOT EXISTS contract_template_versions (
  id bigserial PRIMARY KEY,
  template_id bigint NOT NULL REFERENCES contract_templates(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision>0),
  title text NOT NULL,
  body text NOT NULL,
  category varchar(40) NOT NULL,
  is_published boolean NOT NULL,
  is_archived boolean NOT NULL,
  edited_by varchar(254),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id,revision)
);
INSERT INTO contract_template_versions(template_id,revision,title,body,category,is_published,is_archived,edited_by)
SELECT id,revision,title,body,category,is_published,is_archived,updated_by FROM contract_templates
ON CONFLICT(template_id,revision) DO NOTHING;
