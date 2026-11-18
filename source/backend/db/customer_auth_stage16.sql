-- Apply after schema.sql and customer_auth_stage15.sql.
-- Do not backfill ownership by email: legacy projects require a valid project access token.
ALTER TABLE customer_journey_projects
 ADD COLUMN IF NOT EXISTS customer_account_id uuid REFERENCES customer_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS journey_projects_customer_account_idx
 ON customer_journey_projects(customer_account_id,created_at DESC)
 WHERE customer_account_id IS NOT NULL;
