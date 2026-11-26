-- Sandbox records are isolated from real invoice payments.
BEGIN;
CREATE TABLE IF NOT EXISTS commercial_xpay_test_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 invoice_id bigint NOT NULL REFERENCES commercial_invoices(id) ON DELETE RESTRICT,
 amount_piasters bigint NOT NULL CHECK(amount_piasters>0),
 session_id text UNIQUE,
 checkout_url text,
 status text NOT NULL DEFAULT 'creating' CHECK(status IN ('creating','open','test_paid','expired','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 verified_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS commercial_xpay_test_active ON commercial_xpay_test_attempts(invoice_id) WHERE status IN ('creating','open');
COMMIT;
