-- Stage 13: token hashes only; do not expose review links in logs.
CREATE TABLE IF NOT EXISTS commercial_review_links (id bigserial PRIMARY KEY, quote_id bigint NOT NULL REFERENCES commercial_quotes(id), token_hash char(64) NOT NULL UNIQUE, expires_at timestamptz NOT NULL, issued_by text NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS commercial_review_links_quote_idx ON commercial_review_links(quote_id);
