-- Versioned customer-specific preview snapshots, not deployment URLs or proof of payment.
CREATE TABLE IF NOT EXISTS customer_preview_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES customer_project_drafts(id) ON DELETE CASCADE,
  revision bigint NOT NULL,
  snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
  approval_status varchar(20) NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','changes_requested')),
  customer_comment varchar(2000),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(draft_id,revision)
);
CREATE INDEX IF NOT EXISTS customer_preview_versions_draft_idx ON customer_preview_versions(draft_id,created_at DESC);
