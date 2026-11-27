-- Supplemental orders are references to the existing commercial quote and entitlement ledgers.
CREATE TABLE IF NOT EXISTS project_addon_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 draft_id uuid NOT NULL REFERENCES customer_project_drafts(id) ON DELETE RESTRICT,
 customer_id uuid NOT NULL REFERENCES customer_accounts(id) ON DELETE RESTRICT,
 quote_id bigint NOT NULL UNIQUE REFERENCES commercial_quotes(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL,
 items jsonb NOT NULL CHECK(jsonb_typeof(items)='array'),
 created_at timestamptz NOT NULL DEFAULT now(),
 activated_at timestamptz,
 activated_by text,
 UNIQUE(customer_id,request_key)
);
CREATE INDEX IF NOT EXISTS project_addon_requests_draft_idx ON project_addon_requests(draft_id,created_at DESC);
