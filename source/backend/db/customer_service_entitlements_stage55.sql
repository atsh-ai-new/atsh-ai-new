-- Entitlements are issued by management only, never inferred from a quote, add-on selection, or draft.
-- Apply after customer_auth_stage15.sql and customer_project_drafts_stage44.sql.
CREATE TABLE IF NOT EXISTS customer_service_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  project_draft_id uuid NOT NULL REFERENCES customer_project_drafts(id) ON DELETE CASCADE,
  service_code varchar(100) NOT NULL,
  service_name varchar(160) NOT NULL,
  description text NOT NULL DEFAULT '',
  source_type varchar(24) NOT NULL CHECK (source_type IN ('package','addon','offer','manual')),
  source_id varchar(120),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','expired','cancelled')),
  activated_at timestamptz,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlement_active_requires_activation CHECK (status <> 'active' OR activated_at IS NOT NULL),
  CONSTRAINT entitlement_expiry_after_activation CHECK (expires_at IS NULL OR activated_at IS NULL OR expires_at > activated_at)
);
CREATE INDEX IF NOT EXISTS customer_service_entitlements_customer_project_idx
 ON customer_service_entitlements(customer_id,project_draft_id,status);
CREATE UNIQUE INDEX IF NOT EXISTS customer_service_entitlements_source_unique
 ON customer_service_entitlements(project_draft_id,service_code,source_type,source_id)
 WHERE source_id IS NOT NULL;
-- Read API must additionally verify customer_id from the authenticated session,
-- and project_draft_id ownership. Never accept either identity from client-supplied JSON.
