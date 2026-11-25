CREATE TABLE IF NOT EXISTS site_demo_assets (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  html text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Asset bodies are immutable and independent of page rows.
-- Existing assets are retained when a reference changes to support rollback.

ALTER TABLE site_demo_assets ADD COLUMN IF NOT EXISTS thumbnail bytea;
ALTER TABLE site_demo_assets ADD COLUMN IF NOT EXISTS thumbnail_retry_at timestamptz;
