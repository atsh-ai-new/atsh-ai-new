# Stage 30 — approved project/edit dispatch
- Run `backend/db/builder_execution_stage30.sql` after base schema.
- Set `DATABASE_URL`, `BUILDER_DISPATCH_WEBHOOK`, `BUILDER_DISPATCH_SECRET` (>=32 chars).
- Run worker separately: `node backend/src/builder-worker.js` from backend directory (or `node src/builder-worker.js`).
- n8n webhook MUST verify `x-atsh-signature` HMAC SHA-256 over raw request bytes, enforce jobId idempotency, and implement its own safe Forgejo provisioning, tests, preview and approval workflow.
- API endpoints: POST `/api/admin/builder/plans/:id/approve`, POST `/api/admin/builder/edits/:id/approve`, GET `/api/admin/builder/jobs`.
- Approval queues dispatch; it does NOT autonomously implement projects or apply edits to source. n8n workflow and Forgejo credentials are not included.
- A crashed worker can leave `dispatching` jobs pending; operational reconciliation is needed before production.
