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
