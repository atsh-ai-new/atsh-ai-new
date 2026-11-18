-- Private files stored on persistent volume, not in public web directory.
CREATE TABLE IF NOT EXISTS customer_deliverable_files (
 deliverable_id uuid PRIMARY KEY REFERENCES customer_deliverables(id) ON DELETE CASCADE,
 storage_key uuid NOT NULL UNIQUE,
 mime_type text NOT NULL,
 byte_size bigint NOT NULL CHECK(byte_size > 0 AND byte_size <= 26214400),
 uploaded_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
