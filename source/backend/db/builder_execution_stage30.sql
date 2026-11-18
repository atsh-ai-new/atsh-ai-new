CREATE TABLE IF NOT EXISTS builder_execution_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN ('project','visual_edit')),
 source_id uuid NOT NULL,
 payload jsonb NOT NULL,
 approved_by text NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','dispatching','dispatched','failed')),
 attempts integer NOT NULL DEFAULT 0,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(kind,source_id)
);
CREATE INDEX IF NOT EXISTS builder_execution_jobs_queue_idx ON builder_execution_jobs(status,created_at);
