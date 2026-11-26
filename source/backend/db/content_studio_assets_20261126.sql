CREATE TABLE IF NOT EXISTS content_studio_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('hero','background','prop')),
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
 payload jsonb NOT NULL,
 archived boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
