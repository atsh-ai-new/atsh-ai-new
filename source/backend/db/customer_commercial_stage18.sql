-- Apply after commercial_stage12.sql, commercial_stage13.sql, customer_auth_stage15.sql.
-- No automatic email-based ownership backfill: explicit token claim is required.
ALTER TABLE commercial_quotes ADD COLUMN IF NOT EXISTS customer_account_id uuid REFERENCES customer_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_commercial_quotes_customer_account ON commercial_quotes(customer_account_id,created_at DESC);
