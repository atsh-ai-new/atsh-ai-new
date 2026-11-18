-- Individual logo assets belong to a customer project draft, not a global customer profile.
CREATE TABLE IF NOT EXISTS customer_project_logos (
  draft_id uuid PRIMARY KEY REFERENCES customer_project_drafts(id) ON DELETE CASCADE,
  mime_type varchar(30) NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
  data bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_project_logo_size CHECK (octet_length(data) BETWEEN 1 AND 2097152)
);
