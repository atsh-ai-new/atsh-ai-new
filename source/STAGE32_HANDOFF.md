# ATSH AI Stage 32 — execution recovery

This bundle includes all code from Stage 31 plus a recovery worker and retry fixes. **It is not a production-ready completion of the full ATSH AI platform.**

## Changes
- `backend/src/builder-worker.js`: dispatch failures are re-queued with bounded backoff while attempts < 5; terminal failure on exhaustion.
- `backend/src/builder-recovery.js`: periodic transactional, row-locked sweep for abandoned `dispatching` jobs and stale `dispatched` / `running` jobs. Stale remote jobs are **marked failed**, not automatically re-dispatched, to prevent duplicate project creation.
- `backend/src/builder-recovery-rules.js`: deterministic pure recovery policy.
- `backend/test/builder-recovery.test.js`: six unit tests.
- `backend/package.json`: `worker:builder` and `worker:recovery` commands.

## Deployment after database migrations
Run **separate** supervised processes for `npm --prefix backend run worker:builder` and `npm --prefix backend run worker:recovery`, with `DATABASE_URL` configured. Set `BUILDER_DISPATCH_WEBHOOK` and `BUILDER_DISPATCH_SECRET` for dispatcher. Configure the remote executor to de-duplicate jobId and sign callbacks. Do not expose workers publicly.

## Validation performed
- `node --check` for changed backend worker files: PASS.
- `npm test` in backend: **69/69 PASS** (unit tests only).
- No live PostgreSQL, Next.js build, browser E2E, n8n or Forgejo integration validation.

## Remaining engineering (NOT mere environment wiring)
- Real n8n workflows and sandboxed code-writing executor, Forgejo repo/branch creation, build/test pipeline and staging previews.
- Payment provider callbacks and reconciliation, legally appropriate signature evidence, secure scanning and lifecycle of uploaded files.
- Complete cross-route authorization, frontend typecheck/build and E2E, migrations on live DB, deployment and rollback drills.

## Known recovery behavior
- A dispatched/running job with no callback for 60 minutes is flagged failed. Check n8n/Forgejo for a completed remote run **before manual retry**.
- Dispatching claim abandoned for 2 minutes is re-queued up to attempt limit.
- The recovery sweep is intentionally conservative and uses row locks; it does not guarantee exactly-once remote execution.
