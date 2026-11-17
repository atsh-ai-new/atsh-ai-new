# ATSH AI — Stage 25 source audit and integration blockers

Scope: all locally supplied Stage 24 source files (not the newer VPS/Forgejo version). Inventory: 9 Next.js page files, 11 backend JS modules, 11 backend test files, 7 SQL files, 13 Next.js API route files after fixes. This is a source-level inventory and targeted repair, NOT a complete production certification.

## Critical defects fixed in Stage 25
1. Customer dashboard fetched `/api/customer/commercial/*`, but there was no matching Next.js proxy route. Added `src/app/api/customer/commercial/[...path]/route.ts` with cookies, method, path validation, request size and upstream timeout.
2. Customer dashboard fetched `/api/customer/deliverables` and posted decisions, but neither path was proxied by Next.js. Added optional catch-all `src/app/api/customer/deliverables/[[...path]]/route.ts` for both root GET and decision POST. Forwarded Origin for existing backend origin checks.
3. Backend startup ran older migrations but OMITTED `customer_commercial_stage18.sql` and `stage21_invoice_ledger.sql`. Added both in dependency order; without these, quote ownership and invoice ledger endpoints could fail with missing columns/tables. **WARNING:** existing startup runs DDL automatically; on production, back up DB and run reviewed migrations in controlled deployment before startup.
4. Customer logout button navigated to login even if logout failed; now navigation occurs only on successful logout response.

## Verified
- `node --test backend/test/*.test.js`: 53 passed, 0 failed.
- `node --check` for every backend/src JS file: passed.
- npm dependency installation with offline cache: FAILED (missing `undici-types` tarball), so TypeScript, Next.js build and browser E2E were NOT verified.
- PostgreSQL unavailable; migrations, transactions, SQL constraints and production data not validated against a real DB.

## Outstanding critical blockers — do not call this 'connection only'
- Real private object storage and expiring signed download URLs for video, brand identity and customer files. Current HTTPS asset URLs are not an access-control boundary.
- End-to-end database migration, transactional and authorization tests (customer vs other customer; admin role; quote claim, installment/payment concurrency, refunds).
- CSRF/security review for all cookie-authenticated write endpoints and forwarded Origin behind reverse proxy; full threat model and rate limits.
- Actual Google OAuth verification with live credentials, Brevo sender verification and transactional delivery.
- Payment gateway webhook signature validation, replay prevention, reconciliation and refund/chargeback support.
- n8n / Forgejo / Coolify real execution with scoped credentials, retries, audit trails, stop controls and safe failure semantics. Stored service flags alone cannot stop external workers.
- Actual project generation, edit execution, approval gates, tests, preview, deployment and rollback (current builder contains planning functionality; no full production orchestrator).
- Admin/customer role flows, support ticket lifecycle, legal contract signatures and consent verification need E2E and business acceptance.
- Backups, restore drills, monitoring, alerting, secrets management, log retention and operational runbooks.
- Full TypeScript/Next.js build, PostgreSQL integration, security scanning and real browser/mobile testing.
- Reconcile this Stage 25 source tree against the newer production VPS/Forgejo branch before merging; do not overwrite it.

## Codex minimal integration order
1. Diff production branch against this stage; cherry-pick only the four fixes, preserving newer server behavior.
2. Back up database; review and apply missing stage18/stage21 migrations once, transactionally where possible.
3. Install dependencies, run `npm run typecheck`, `npm run build`, backend tests, and DB integration tests.
4. Validate cookie proxy flows for `/api/customer/commercial/{orders,quotes,contracts,invoices}`, `/api/customer/deliverables`, and `/api/customer/deliverables/:id/decision` with authenticated real accounts.
5. Complete the blockers above before calling it production ready.

No Git push, VPS changes or deployment were made.
