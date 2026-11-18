-- Apply after commercial_stage12.sql. Backup database before migration.
CREATE TABLE IF NOT EXISTS commercial_invoice_payments (
 id bigserial PRIMARY KEY,
 invoice_id bigint NOT NULL REFERENCES commercial_invoices(id),
 amount_piasters bigint NOT NULL CHECK(amount_piasters>0),
 paid_at timestamptz NOT NULL,
 provider text NOT NULL CHECK(provider IN ('manual_verified','gateway_verified')),
 provider_reference text NOT NULL,
 recorded_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,provider_reference)
);
CREATE INDEX IF NOT EXISTS commercial_invoices_due_idx ON commercial_invoices(due_at) WHERE status IN ('unpaid','part_paid');
CREATE INDEX IF NOT EXISTS commercial_invoice_payments_invoice_idx ON commercial_invoice_payments(invoice_id,paid_at);
