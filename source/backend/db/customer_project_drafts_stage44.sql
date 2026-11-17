-- Separate customer preference drafts; never use draft JSON as a payment, contract or entitlement authority.
CREATE TABLE IF NOT EXISTS customer_project_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  title varchar(120) NOT NULL DEFAULT 'مشروع جديد',
  draft jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(draft)='object'),
  revision bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_project_drafts_account_idx ON customer_project_drafts(customer_id,updated_at DESC);

ALTER TABLE customer_project_drafts ADD COLUMN IF NOT EXISTS linked_journey_id uuid UNIQUE REFERENCES customer_journey_projects(id) ON DELETE SET NULL;

-- Project-specific branding media, independent from the older account-wide fallback.
CREATE TABLE IF NOT EXISTS customer_project_logos (
 draft_id uuid PRIMARY KEY REFERENCES customer_project_drafts(id) ON DELETE CASCADE,
 mime_type varchar(30) NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
 data bytea NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT customer_project_logo_size CHECK (octet_length(data) BETWEEN 1 AND 2097152)
);
