-- Transactional integration smoke test for customer entitlements.
BEGIN;
INSERT INTO customer_accounts(name,email,password_hash) VALUES ('CI Service Customer','ci-services@example.test','ci-only');
INSERT INTO customer_project_drafts(customer_id,title)
 SELECT id,'CI Service Project' FROM customer_accounts WHERE email='ci-services@example.test';
DO $$
DECLARE c uuid; d uuid; e uuid;
BEGIN
 SELECT id INTO c FROM customer_accounts WHERE email='ci-services@example.test';
 SELECT id INTO d FROM customer_project_drafts WHERE customer_id=c;
 INSERT INTO customer_service_entitlements(customer_id,project_draft_id,service_code,service_name,source_type,status)
 VALUES(c,d,'hosting','Hosting','manual','pending') RETURNING id INTO e;
 IF EXISTS(SELECT 1 FROM customer_service_entitlements WHERE id=e AND activated_at IS NOT NULL) THEN RAISE EXCEPTION 'Pending service was activated'; END IF;
 UPDATE customer_service_entitlements SET status='active',activated_at=now() WHERE id=e;
 IF NOT EXISTS(SELECT 1 FROM customer_service_entitlements WHERE id=e AND status='active' AND activated_at IS NOT NULL) THEN RAISE EXCEPTION 'Activation failed'; END IF;
 UPDATE customer_service_entitlements SET status='paused' WHERE id=e;
 IF NOT EXISTS(SELECT 1 FROM customer_service_entitlements WHERE id=e AND status='paused') THEN RAISE EXCEPTION 'Pause failed'; END IF;
 DELETE FROM customer_project_drafts WHERE id=d;
 IF EXISTS(SELECT 1 FROM customer_service_entitlements WHERE id=e) THEN RAISE EXCEPTION 'Project deletion did not cascade service'; END IF;
END $$;
ROLLBACK;
