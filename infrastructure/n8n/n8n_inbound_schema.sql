-- Run only in n8n's dedicated PostgreSQL database (NOT the ATSH platform database).
-- Safe bootstrap: non-destructive and idempotent.
CREATE TABLE IF NOT EXISTS public.atsh_inbound_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processing', 'done', 'failed'))
);
CREATE INDEX IF NOT EXISTS idx_atsh_inbound_events_status
ON public.atsh_inbound_events (processing_status, received_at);
