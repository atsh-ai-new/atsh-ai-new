CREATE TABLE IF NOT EXISTS customer_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(120) NOT NULL,
 email varchar(254) NOT NULL UNIQUE,
 password_hash text,
 google_sub text UNIQUE,
 email_verified_at timestamptz,
 is_active boolean NOT NULL DEFAULT true,
 session_version integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT customer_login_method CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS customer_auth_tokens (
 id bigserial PRIMARY KEY,
 customer_id uuid NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
 purpose varchar(16) NOT NULL CHECK (purpose IN ('verify','reset')),
 token_hash char(64) NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_auth_tokens_lookup_idx ON customer_auth_tokens(token_hash,purpose) WHERE used_at IS NULL;
