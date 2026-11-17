-- One authenticated customer workspace shared across configurator, catalog, concierge and previews.
-- No quote, price, payment or entitlement is authorized by this mutable preference draft.
CREATE TABLE IF NOT EXISTS customer_workspace_drafts (
  customer_id uuid PRIMARY KEY REFERENCES customer_accounts(id) ON DELETE CASCADE,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_draft_object CHECK (jsonb_typeof(draft)='object')
);
