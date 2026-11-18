# Stage 31 — verified execution queue hardening

This is an incremental patch on Stage 30, **not** a fully integrated or production-ready platform.

## Implemented
- Apply missing builder stage30 schema at backend boot, followed by stage31 schema.
- Signed raw-body HMAC callback endpoint `POST /api/integrations/builder/result`, header `x-atsh-signature: sha256=<hex>`; set `BUILDER_CALLBACK_SECRET` (>=32 chars) in both n8n and backend.
- Callback payload `{jobId,status,previewUrl?,commitSha?,error?}` with allowed statuses `running`, `succeeded`, `failed` and transition validation; transaction/row lock/idempotent same-status response.
- Admin `POST /api/admin/builder/jobs/:id/retry` and `.../cancel` (only queued/failed jobs can be cancelled); job listing includes preview and commit fields.
- Worker respects retry scheduling and caps dispatch attempts at 5. Note: manual retry will be blocked once cap reached.
- Unit tests for transition, preview validation, HMAC. `node --check` backend server and worker passed; 63/63 backend unit tests passed.

## Still NOT implemented or validated
- Actual Forgejo repository creation, code writing, test/build execution, preview deployment, and applying visual edits: n8n workflows and agent runner are not bundled here.
- Payment gateway webhook integration, legal electronic signature evidence workflow, full operational monitoring, customer file malware scanning.
- PostgreSQL integration/migrations in a live database, Next.js build, frontend end-to-end and security tests.
- Production setup, secrets, domains, SMTP, backups and disaster recovery.

## Security / integration requirements
- Only expose callback over HTTPS and restrict its source network where possible.
- n8n must HMAC-sign the exact JSON bytes using callback secret, never the dispatch secret. Do not use unsigned callbacks.
- The worker dispatch is at-least-once: n8n must deduplicate by jobId.
- A `dispatched` job remains dispatched without a callback; an external watchdog is required for stale-job detection.
- The worker's `failed` dispatch jobs require an admin retry; automatic retry policy remains unimplemented.
- The callback's `previewUrl` validation checks HTTPS scheme, not host ownership. Configure trusted preview domain validation before exposing customer previews.
- The schema is applied at backend boot in current code; for production use an ordered migration runner.
