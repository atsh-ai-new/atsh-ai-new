CREATE TABLE IF NOT EXISTS reviewed_project_drafts (
 id uuid PRIMARY KEY,
 job_id varchar(100) NOT NULL,
 repo varchar(64) NOT NULL,
 manifest jsonb NOT NULL,
 digest char(64) NOT NULL,
 status varchar(30) NOT NULL DEFAULT 'awaiting_review'
   CHECK(status IN ('awaiting_review','approved','publishing','testing','tests_failed','preview_requested','failed','completed')),
 approved_by text,
 approved_at timestamptz,
 started_at timestamptz,
 last_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT reviewed_draft_manifest_object CHECK(jsonb_typeof(manifest)='object')
);
CREATE INDEX IF NOT EXISTS reviewed_drafts_job_idx ON reviewed_project_drafts(job_id,created_at DESC);
CREATE INDEX IF NOT EXISTS reviewed_drafts_status_idx ON reviewed_project_drafts(status,created_at);
