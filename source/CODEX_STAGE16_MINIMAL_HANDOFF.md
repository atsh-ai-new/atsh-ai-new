# Stage 16: secure account-to-project binding

Baseline: Stage 15; all existing platform features preserved. **Do not replace newer server files wholesale.**

Changes: `backend/src/customer-auth.js` (claim endpoint, account-ID project listing), `backend/db/customer_auth_stage16.sql` (nullable FK and index), `backend/src/server.js` (migration load), and `backend/test/customer-ownership-stage16.test.js`.

Migration order: schema.sql -> customer_auth_stage15.sql -> customer_auth_stage16.sql. Do not backfill by email.

To associate legacy project: authenticated verified customer calls `POST /api/customer/auth/projects/claim` with `{projectId, accessToken}`. Claim requires matching customer email plus an unexpired, unrevoked project access token; token is revoked on success. Projects are listed by account UUID, never by matching email alone.

**Remaining for Codex/server integration:** secure portal UI to submit claim token, full account-ID ownership on quote/contract/invoice/ticket/order endpoints, actual Google frontend, real Brevo and PostgreSQL smoke tests, Next.js production build, payment and delivery integration, and server-branch reconciliation. Avoid production deployment until authorization/E2E tests pass. This stage does not assert completion of those features.
