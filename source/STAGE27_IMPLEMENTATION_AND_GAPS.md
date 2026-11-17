# Stage 27 — actual changes and release blockers

## Implemented in this iteration
- Admin deliverables: file picker, client-side MIME/25 MiB checks, authenticated raw PUT upload to existing private storage endpoint, upload state/errors.
- Customer account: authenticated private download link when a private file exists, fallback to legacy HTTPS asset link.
- Customer deliverables API now reports `has_private_file` through an ownership-filtered LEFT JOIN.
- Optional external URL on new draft creation; confidential deliverables no longer require an externally hosted asset URL.
- Express raw upload parsing cap raised slightly above 25 MiB to avoid rejecting valid files due to decimal-megabyte mismatch; application validation still enforces 25 MiB.
- No-store and nosniff response headers on customer delivery proxy.

## Verified
- `node --check` for modified backend modules passed.
- `node --test backend/test/*.test.js`: 53 passed, 0 failed. These are existing tests and do not prove new upload UI integration.

## NOT complete; cannot claim 100% or 'database/backend connection only'
- Next.js dependencies not installed; no TypeScript typecheck, production build or browser tests.
- PostgreSQL migrations not executed on a live database; private-file upload/download end-to-end untested.
- 25 MiB upload cap inadequate for many advertising videos; implement streamed or direct-to-object-storage multipart upload and antivirus scanning.
- Private file replacement does not garbage-collect old blobs; retention/backups not proven.
- External n8n, Forgejo, payment gateway, Google OAuth, email and AI integrations need credentials, configuration and live integration testing.
- Automated project code generation and edit execution are not proven operational; contractual e-signature compliance is not established.
- Need complete endpoint/permissions inventory, security review and production smoke tests before release.

## Integration prerequisites
- Apply SQL migrations in order, including `backend/db/delivery_control_stage20.sql` and `backend/db/private_deliverable_files_stage26.sql`.
- Configure `ATSH_PRIVATE_FILES_DIR` as persistent private volume and `ATSH_API_BASE_URL` for Next.js proxy.
- Do not expose private file directory on web server. Ensure DB backup and file-volume backup are coordinated.
- Deploy only after full build, migrations and customer/admin role tests pass.
