\set ON_ERROR_STOP on
BEGIN;
INSERT INTO customer_journey_projects(customer_name,created_by) VALUES('CI test customer','ci') RETURNING id AS project_id \gset
INSERT INTO team_members(email,display_name,role,password_hash) VALUES('ci-task@example.invalid','CI team','editor','test-only') RETURNING id AS member_id \gset
INSERT INTO customer_journey_tasks(project_id,title,assigned_to,created_by,updated_by)
VALUES(:'project_id','CI smoke task',:'member_id','ci','ci') RETURNING id AS task_id \gset
DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM customer_journey_tasks WHERE title='CI smoke task'
 ) THEN RAISE EXCEPTION 'Task insert failed'; END IF;
END $$;
UPDATE customer_journey_tasks SET status='in_progress' WHERE id=:'task_id';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM customer_journey_tasks WHERE status='in_progress' AND title='CI smoke task') THEN
  RAISE EXCEPTION 'Task status update failed';
 END IF;
END $$;
UPDATE customer_journey_tasks SET assigned_to=NULL WHERE id=:'task_id';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM customer_journey_tasks WHERE title='CI smoke task' AND assigned_to IS NULL) THEN
  RAISE EXCEPTION 'Task unassignment failed';
 END IF;
END $$;
-- Reject invalid states and orphan references.
DO $
BEGIN
 BEGIN
  UPDATE customer_journey_tasks SET status='invalid' WHERE title='CI smoke task';
  RAISE EXCEPTION 'Invalid task status was accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  UPDATE customer_journey_tasks SET assigned_to='11111111-1111-4111-8111-111111111111' WHERE title='CI smoke task';
  RAISE EXCEPTION 'Unknown team member was accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO customer_journey_tasks(project_id,title,created_by,updated_by)
  VALUES('11111111-1111-4111-8111-111111111111','orphan','ci','ci');
  RAISE EXCEPTION 'Unknown project was accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
END $;
ROLLBACK;
