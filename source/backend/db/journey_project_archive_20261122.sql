-- Apply before deploying project archive endpoints.
DO $$
DECLARE constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name FROM pg_constraint con
  JOIN pg_class rel ON rel.oid=con.conrelid
  WHERE rel.relname='customer_journey_projects' AND con.contype='c' AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LIMIT 1;
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE customer_journey_projects DROP CONSTRAINT %I',constraint_name);
  END IF;
  ALTER TABLE customer_journey_projects ADD CONSTRAINT customer_journey_projects_status_check CHECK (status IN ('draft','configured','quoted','payment_pending','paid','building','preview_ready','approved','delivered','support','archived'));
END $$;
