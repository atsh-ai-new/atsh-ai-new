-- Approval is distinct from payment verification and preview acceptance.
-- Apply before activating the corresponding API/UI endpoints.
ALTER TABLE customer_journey_projects ADD COLUMN IF NOT EXISTS customer_approved_at timestamptz;
ALTER TABLE customer_journey_projects ADD COLUMN IF NOT EXISTS admin_approved_at timestamptz;
ALTER TABLE customer_journey_projects ADD COLUMN IF NOT EXISTS customer_approval_revoked_at timestamptz;
ALTER TABLE customer_journey_projects ADD COLUMN IF NOT EXISTS admin_approval_revoked_at timestamptz;
CREATE INDEX IF NOT EXISTS customer_journey_approval_idx ON customer_journey_projects(customer_approved_at,admin_approved_at) WHERE status <> 'archived';
