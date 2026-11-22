-- Durable replay protection for public and authenticated unlinked order submissions.
CREATE TABLE IF NOT EXISTS order_submission_keys (
  submission_key uuid PRIMARY KEY,
  request_hash text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_submission_keys_complete CHECK (
    (order_id IS NULL AND response_payload IS NULL) OR
    (order_id IS NOT NULL AND response_payload IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS order_submission_keys_created_idx ON order_submission_keys(created_at);
