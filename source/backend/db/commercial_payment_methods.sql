-- Additive payment configuration. Existing ledger remains authoritative.
BEGIN;
ALTER TABLE commercial_invoice_payments ADD COLUMN IF NOT EXISTS payment_method text
 CHECK(payment_method IN ('cash','bank_transfer','instapay','wallet_direct','xpay'));
ALTER TABLE commercial_invoice_payments ADD COLUMN IF NOT EXISTS receipt_note text;
CREATE TABLE IF NOT EXISTS commercial_payment_preferences (
 quote_id bigint PRIMARY KEY REFERENCES commercial_quotes(id),
 methods text[] NOT NULL CHECK(cardinality(methods)>0 AND methods <@ ARRAY['cash','bank_transfer','instapay','wallet_direct','xpay']::text[]),
 updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commercial_payment_instructions (
 method text PRIMARY KEY CHECK(method IN ('cash','bank_transfer','instapay','wallet_direct')),
 instructions text NOT NULL CHECK(length(instructions) BETWEEN 1 AND 2000),
 enabled boolean NOT NULL DEFAULT false,
 updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commercial_contract_pdfs (
 contract_id bigint PRIMARY KEY REFERENCES customer_contracts(id),
 filename text NOT NULL, pdf_bytes bytea NOT NULL CHECK(octet_length(pdf_bytes) BETWEEN 8 AND 5242880),
 sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 uploaded_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commercial_invoices ADD COLUMN IF NOT EXISTS milestone text;
ALTER TABLE commercial_invoices ADD COLUMN IF NOT EXISTS release_for_payment boolean NOT NULL DEFAULT false;
COMMIT;
