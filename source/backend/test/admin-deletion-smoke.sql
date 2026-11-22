-- Transactional database smoke test: no persistent test data.
BEGIN;
INSERT INTO team_members(email,display_name,role,password_hash) VALUES('ci-purge@example.test','CI Purge','viewer','ci-only');
INSERT INTO customer_journey_projects(customer_name,created_by) VALUES('CI Project','ci@example.test');
DO $$ DECLARE v_project_id uuid; v_member_id uuid; BEGIN
 SELECT id INTO v_project_id FROM customer_journey_projects WHERE customer_name='CI Project';
 SELECT id INTO v_member_id FROM team_members WHERE email='ci-purge@example.test';
 INSERT INTO customer_journey_messages(project_id,actor,body) VALUES(v_project_id,'admin','CI test message');
 INSERT INTO customer_journey_tasks(project_id,title,created_by,updated_by,assigned_to) VALUES(v_project_id,'CI test task','ci@example.test','ci@example.test',v_member_id);
 UPDATE customer_journey_projects SET status='archived' WHERE id=v_project_id;
 IF NOT EXISTS(SELECT 1 FROM customer_journey_projects WHERE id=v_project_id AND status='archived') THEN RAISE EXCEPTION 'Archive failed'; END IF;
 DELETE FROM team_members WHERE id=v_member_id;
 IF EXISTS(SELECT 1 FROM customer_journey_tasks WHERE project_id=v_project_id AND assigned_to IS NOT NULL) THEN RAISE EXCEPTION 'Member delete failed to detach task'; END IF;
 DELETE FROM customer_journey_projects WHERE id=v_project_id;
 IF EXISTS(SELECT 1 FROM customer_journey_messages WHERE project_id=v_project_id) THEN RAISE EXCEPTION 'Project delete failed to cascade messages'; END IF;
 IF EXISTS(SELECT 1 FROM customer_journey_tasks WHERE project_id=v_project_id) THEN RAISE EXCEPTION 'Project delete failed to cascade tasks'; END IF;
END $$;
ROLLBACK;
