# ATSH AI — Master execution tracker through production launch

Updated: 2026-11-17
Repository: atshpana/atsh-ai
Working branch: stage40-integration
Source of truth for initial assessment: user-provided ATSH_AI_stage40_review_api(2).zip, including STAGE40_HANDOFF.md.
Status values: [x] verified complete, [~] implemented but unverified/incomplete, [ ] not done, [!] blocker.

## Current verified state
- [x] Private GitHub repository exists, default branch main; development branch stage40-integration exists.
- [x] Initial n8n intake-only scaffold committed at integrations/n8n/builder-dispatch-intake.json.
- [!] Stage 40 application source has NOT been imported into this repository yet. The current branch contains only README and the integration scaffold.
- [!] No live application deployment, live database integration, n8n connection, preview, or end-to-end test has been verified.
- [~] Stage 40 ZIP contains frontend/backend, SQL migrations, tests, AI journey assistant, pricing/commerce, builder dispatch, code-agent manifest generation, authenticated admin review routes, and Forgejo publication code.
- [!] STAGE40_HANDOFF.md explicitly reports no real PostgreSQL or Forgejo integration tests, no source checkout to isolated Docker tests, no preview deployment; partial Forgejo publication possible on failure.
- [!] Server-only small changes are not included in the provided ZIP and must be reconciled before declaring final parity.

## Execution plan — complete in order; update status with evidence
### P0 — Source preservation and import
- [ ] Inventory ZIP files, identify executable app roots, and scan for secrets/private customer data.
- [ ] Import Stage 40 source to stage40-integration without overwriting unrelated files; preserve ZIP handoff docs and history.
- [ ] Compare against latest server-only changes when available; reconcile without destructive overwrites.
- [ ] Confirm gitignore, environment templates, dependency lockfiles and reproducible build instructions.
- [ ] Run baseline syntax, unit tests and builds; record pass/fail counts and logs.

### P1 — Platform functional completeness
- [ ] Verify real frontend-to-backend integration, routing, Arabic/mobile layouts, and role-specific UI.
- [ ] Verify registration, login, customer portal, admin RBAC and session protections.
- [ ] Verify dynamic catalog/pricing, quote consistency, order creation and PostgreSQL persistence.
- [ ] Verify project status, payments/invoicing rules, deliverables and audit trail.
- [ ] Validate all database migrations on a disposable PostgreSQL instance.
- [ ] Verify assistant journey configuration, provider errors, rate limits and safe API key handling.

### P2 — n8n and builder execution
- [ ] Define authenticated, versioned dispatch/callback contract with jobId, idempotency key, timestamps, signature, and retry policy.
- [ ] Harden initial intake workflow: verify HMAC before accepting, reject invalid payloads, persist job state; no unauthenticated execution.
- [ ] Connect real n8n endpoint through environment variables (no secrets in GitHub).
- [ ] Implement or integrate coding executor with bounded iterations, file sandbox, resource/time/cost limits, and human approval.
- [ ] Add reliable retries, failure recovery, cancellation, deduplication and traceable logs.
- [ ] Test n8n dispatch and callback end to end using a nonproduction job.

### P3 — Review, repository publication, tests and preview
- [ ] Verify immutable reviewed drafts, SHA-256 digest, authorization, approval and transition state machine.
- [ ] Make Forgejo publication recoverable/idempotent; test partial failures.
- [ ] Implement isolated checkout/build/test runner with sandbox controls.
- [ ] Deploy functional preview with frontend, backend, database, and controlled sample data.
- [ ] Support customer revisions, re-review and approval before delivery.
- [ ] Test complete order → generation → admin review → tests → preview → delivery lifecycle.

### P4 — Production readiness and migration
- [ ] Configure production secrets, TLS, domains, CORS, backups, monitoring, alerts, logging and resource limits.
- [ ] Run security, permissions, regression, mobile, performance and recovery checks.
- [ ] Verify deployment reproducibility and restore procedure for future server/account migration.
- [ ] Publish live production platform only after test gates pass and explicit confirmation of target environment.
- [ ] Capture live URLs, commit SHA, test evidence, outstanding limitations, rollback plan and final handoff.

## Acceptance gates (do not mark complete without evidence)
1. All application code committed to the working branch with no exposed secrets.
2. Automated tests/build pass; PostgreSQL integration and RBAC verified.
3. n8n job dispatch and coding workflow run with secure callbacks and bounded spend.
4. Admin approval gates publication; isolated tests and interactive preview work.
5. Real end-to-end customer request tested; operational deployment and migration guide verified.

## Operating rules
- Keep main untouched until explicitly approved for merge.
- No deletion of existing server, production data, or services.
- Do not publish credentials or paid API keys.
- Record each completed item with commit SHA, test evidence and date.
- This file is the persistent tracker; update it in the same branch as work progresses.
