-- Refunds are separate from immutable incoming payment records.
BEGIN;
CREATE TABLE IF NOT EXISTS commercial_refund_payments (
 id bigserial PRIMARY KEY,
 quote_id bigint NOT NULL REFERENCES commercial_quotes(id) ON DELETE RESTRICT,
 amount_piasters bigint NOT NULL CHECK(amount_piasters>0),
 method text NOT NULL CHECK(method IN ('cash','bank_transfer','instapay','wallet_direct','xpay')),
 reference text NOT NULL UNIQUE CHECK(length(trim(reference)) BETWEEN 1 AND 180),
 recorded_by text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 note text
);
CREATE INDEX IF NOT EXISTS commercial_refunds_quote_idx ON commercial_refund_payments(quote_id);
COMMIT;
