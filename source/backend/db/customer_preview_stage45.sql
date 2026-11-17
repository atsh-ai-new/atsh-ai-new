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

-- Keep a copy of the logo per approved preview so subsequent branding changes cannot rewrite an old snapshot.
CREATE TABLE IF NOT EXISTS customer_preview_logo_versions (
 preview_id uuid PRIMARY KEY REFERENCES customer_preview_versions(id) ON DELETE CASCADE,
 mime_type varchar(30) NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
 data bytea NOT NULL,
 digest char(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT preview_logo_size CHECK (octet_length(data) BETWEEN 1 AND 2097152)
);
