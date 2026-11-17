-- Durable at-least-once integration events for n8n; no external network activity is required for commit.
CREATE TABLE IF NOT EXISTS customer_event_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_type varchar(80) NOT NULL,
 idempotency_key varchar(180) NOT NULL UNIQUE,
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
 status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 locked_at timestamptz,
 delivered_at timestamptz,
 last_error varchar(500),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_event_outbox_pending_idx
 ON customer_event_outbox(status,next_attempt_at,created_at)
 WHERE status IN ('pending','processing');
