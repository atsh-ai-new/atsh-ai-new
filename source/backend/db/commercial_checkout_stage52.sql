-- Additive, reversible customer-facing commercial review queue.
-- Run on staging/backup first; no existing quote/contract/payment rows are mutated.
CREATE TABLE IF NOT EXISTS commercial_quote_change_requests (
 id bigserial PRIMARY KEY,
 quote_id bigint NOT NULL REFERENCES commercial_quotes(id) ON DELETE RESTRICT,
 customer_account_id uuid NOT NULL REFERENCES customer_accounts(id) ON DELETE RESTRICT,
 details text NOT NULL CHECK (char_length(details) BETWEEN 10 AND 2000),
 status varchar(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolution_note text,
 resolved_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS commercial_quote_one_pending_change_idx
 ON commercial_quote_change_requests(quote_id,customer_account_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS commercial_quote_changes_quote_idx
 ON commercial_quote_change_requests(quote_id,created_at DESC);

-- Custom projects have no fixed package/order price before a staff-approved proposal.
-- Link their official quotations to an account-owned draft and a real journey record,
-- while keeping the immutable order-to-quote path untouched.
CREATE TABLE IF NOT EXISTS commercial_custom_quote_links (
 id bigserial PRIMARY KEY,
 quote_id bigint NOT NULL UNIQUE REFERENCES commercial_quotes(id) ON DELETE RESTRICT,
 draft_id uuid NOT NULL REFERENCES customer_project_drafts(id) ON DELETE RESTRICT,
 project_id uuid NOT NULL REFERENCES customer_journey_projects(id) ON DELETE RESTRICT,
 customer_account_id uuid NOT NULL REFERENCES customer_accounts(id) ON DELETE RESTRICT,
 is_current boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commercial_custom_one_current_quote_idx
 ON commercial_custom_quote_links(draft_id) WHERE is_current=true;
CREATE INDEX IF NOT EXISTS commercial_custom_project_idx
 ON commercial_custom_quote_links(project_id,created_at DESC);
