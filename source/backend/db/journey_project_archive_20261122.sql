-- Idempotent migration: extend only the journey project's status check.
DO $$
DECLARE constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT con.conname FROM pg_constraint con
    WHERE con.conrelid = 'customer_journey_projects'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE customer_journey_projects DROP CONSTRAINT %I',constraint_record.conname);
  END LOOP;
  ALTER TABLE customer_journey_projects
    ADD CONSTRAINT customer_journey_projects_status_check
    CHECK (status IN ('draft','configured','quoted','payment_pending','paid','building','preview_ready','approved','delivered','support','archived'));
END $$;
