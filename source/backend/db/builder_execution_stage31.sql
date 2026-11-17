-- Run after builder_execution_stage30.sql.
ALTER TABLE builder_execution_jobs DROP CONSTRAINT IF EXISTS builder_execution_jobs_status_check;
ALTER TABLE builder_execution_jobs ADD CONSTRAINT builder_execution_jobs_status_check CHECK (status IN ('queued','dispatching','dispatched','running','succeeded','failed','cancelled'));
ALTER TABLE builder_execution_jobs ADD COLUMN IF NOT EXISTS preview_url text;
ALTER TABLE builder_execution_jobs ADD COLUMN IF NOT EXISTS commit_sha char(40);
ALTER TABLE builder_execution_jobs ADD COLUMN IF NOT EXISTS finished_at timestamptz;
ALTER TABLE builder_execution_jobs ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;
ALTER TABLE builder_execution_jobs ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS builder_execution_jobs_retry_idx ON builder_execution_jobs(status,next_attempt_at);
CREATE TABLE IF NOT EXISTS builder_execution_events (
 id bigserial PRIMARY KEY, job_id uuid NOT NULL REFERENCES builder_execution_jobs(id) ON DELETE CASCADE,
 old_status text, new_status text NOT NULL, message text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS builder_execution_events_job_idx ON builder_execution_events(job_id,created_at DESC);
