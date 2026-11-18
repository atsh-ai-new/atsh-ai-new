-- One authenticated customer workspace shared across configurator, catalog, concierge and previews.
-- No quote, price, payment or entitlement is authorized by this mutable preference draft.
CREATE TABLE IF NOT EXISTS customer_workspace_drafts (
  customer_id uuid PRIMARY KEY REFERENCES customer_accounts(id) ON DELETE CASCADE,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_draft_object CHECK (jsonb_typeof(draft)='object')
);

-- Private customer branding media; access requires a verified account session.
CREATE TABLE IF NOT EXISTS customer_workspace_logos (
  customer_id uuid PRIMARY KEY REFERENCES customer_accounts(id) ON DELETE CASCADE,
  mime_type varchar(30) NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
  data bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_logo_limit CHECK (octet_length(data) BETWEEN 1 AND 2097152)
);
