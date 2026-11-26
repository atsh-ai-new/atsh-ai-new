-- Revision proposals preserve historical invoices and payments.
BEGIN;
CREATE TABLE IF NOT EXISTS commercial_invoice_revision_requests (
 id bigserial PRIMARY KEY,
 quote_id bigint NOT NULL REFERENCES commercial_quotes(id) ON DELETE RESTRICT,
 base_revision integer NOT NULL CHECK(base_revision>0),
 proposed_items jsonb NOT NULL CHECK(jsonb_typeof(proposed_items)='array'),
 proposed_total_piasters bigint NOT NULL CHECK(proposed_total_piasters>=0),
 proposed_schedule jsonb NOT NULL CHECK(jsonb_typeof(proposed_schedule)='array'),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 2000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','accepted','rejected','cancelled')),
 proposed_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 issued_at timestamptz,
 accepted_at timestamptz,
 acceptance_evidence jsonb,
 contract_pdf bytea CHECK(octet_length(contract_pdf) BETWEEN 8 AND 5242880),
 contract_sha256 text CHECK(contract_sha256 ~ '^[0-9a-f]{64}$'),
 CHECK((contract_pdf IS NULL)=(contract_sha256 IS NULL)),
 CHECK(status NOT IN ('issued','accepted') OR (contract_pdf IS NOT NULL AND issued_at IS NOT NULL)),
 CHECK(status <> 'accepted' OR (accepted_at IS NOT NULL AND acceptance_evidence IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS commercial_revision_one_open_idx ON commercial_invoice_revision_requests(quote_id) WHERE status IN ('draft','issued');
CREATE TABLE IF NOT EXISTS commercial_invoice_adjustment_ledger (
 id bigserial PRIMARY KEY,
 revision_request_id bigint NOT NULL UNIQUE REFERENCES commercial_invoice_revision_requests(id) ON DELETE RESTRICT,
 quote_id bigint NOT NULL REFERENCES commercial_quotes(id) ON DELETE RESTRICT,
 previous_total_piasters bigint NOT NULL CHECK(previous_total_piasters>=0),
 revised_total_piasters bigint NOT NULL CHECK(revised_total_piasters>=0),
 paid_snapshot_piasters bigint NOT NULL CHECK(paid_snapshot_piasters>=0),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
