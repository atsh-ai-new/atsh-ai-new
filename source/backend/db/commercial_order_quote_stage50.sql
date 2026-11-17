-- Commercial quotes derived from immutable order snapshots and approved customer previews.
-- Old revisions are retained; only one current quote per order.
CREATE TABLE IF NOT EXISTS commercial_order_quote_links (
 id bigserial PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
 quote_id bigint NOT NULL UNIQUE REFERENCES commercial_quotes(id) ON DELETE RESTRICT,
 project_id uuid NOT NULL REFERENCES customer_journey_projects(id) ON DELETE RESTRICT,
 draft_id uuid NOT NULL REFERENCES customer_project_drafts(id) ON DELETE RESTRICT,
 is_current boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commercial_order_one_current_quote_idx
 ON commercial_order_quote_links(order_id) WHERE is_current=true;
CREATE INDEX IF NOT EXISTS commercial_order_quote_project_idx
 ON commercial_order_quote_links(project_id,created_at);
