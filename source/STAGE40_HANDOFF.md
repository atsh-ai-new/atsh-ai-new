# Stage 40 — Real authenticated review API and Forgejo publication

Mounted the Stage 39 PostgreSQL migration in server startup. Added administrator-only routes:

- `POST /api/admin/project-reviews/generate` with `{jobId,repo,specification}`: invokes configured agent, scans and persists immutable draft.
- `GET /api/admin/project-reviews`: metadata without source code.
- `GET /api/admin/project-reviews/:id`: source code for human review, no-store.
- `POST /api/admin/project-reviews/:id/approve` with `{jobId,digest}`: authenticates reviewer from admin session and approves digest once.
- `POST /api/admin/project-reviews/:id/publish` with `{jobId,digest}`: atomic claim, publishes reviewed manifest to Forgejo, persists success as `testing` and failures as `failed`.

All mutations require an allowed Origin, existing admin cookie, owner/admin role. No public endpoints.

**Limitations:** no actual PostgreSQL or Forgejo integration tests; no source checkout to isolated Docker tests; no preview deployment. Publishing may be partially complete if Forgejo fails mid-manifest; the response and database status report failure. The Stage 39 draft `recordReviewStage` does not yet enforce transitions. Do not claim end-to-end readiness.
