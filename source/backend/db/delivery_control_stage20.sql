-- Stage 20: customer-scoped digital deliverables and operational feature switches.
CREATE TABLE IF NOT EXISTS customer_deliverables (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES customer_journey_projects(id),
 title varchar(180) NOT NULL, kind varchar(24) NOT NULL CHECK(kind IN ('video','brand','image','document','archive','other')),
 asset_url text NOT NULL CHECK(length(asset_url)<=2048), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 status varchar(24) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','withdrawn')),
 customer_decision varchar(24) NOT NULL DEFAULT 'pending' CHECK(customer_decision IN ('pending','approved','revision_requested')),
 customer_feedback text, published_at timestamptz, created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_deliverables_project ON customer_deliverables(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS platform_service_controls (
 service_key varchar(64) PRIMARY KEY, enabled boolean NOT NULL DEFAULT true,
 note varchar(500), updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS delivery_events (
 id bigserial PRIMARY KEY, deliverable_id uuid NOT NULL REFERENCES customer_deliverables(id), actor_type varchar(16) NOT NULL,
 actor_id text NOT NULL, event_type varchar(40) NOT NULL, details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
