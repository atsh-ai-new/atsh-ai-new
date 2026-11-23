-- Registration preference is separate from browser push permission.
ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS notification_consent_at timestamptz;
