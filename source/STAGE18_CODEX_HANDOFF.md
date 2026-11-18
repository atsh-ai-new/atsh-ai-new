# Stage 18 — customer commercial ownership (additive, no production merge)

Base: stage17. New: backend/src/customer-commercial.js, customer-commercial-rules.js, backend/db/customer_commercial_stage18.sql, backend/test/customer-commercial.test.js. Modified: backend/src/server.js (router import/mount only).

Customer endpoints (JWT cookie `atsh_customer`): POST /api/customer/commercial/quotes/claim {quoteId,reviewToken}; GET /quotes; GET /quotes/:id; GET /contracts; GET /invoices. Explicit quote claim requires authenticated verified account, matching email, valid review token, and no different owner. All reads filter by account id. No automatic email-only backfill. Contracts/invoices inherit quote ownership.

**Before production:** compare with newer server version, apply migrations in order, check cookie CORS/CSRF, ensure admin-issued review links are delivered privately, add request/response integration tests with real PostgreSQL, confirm review token lifecycle, check current API error handling, run npm ci and Next.js build. No payment integration or server deployment is claimed. Existing orders still require separate explicit ownership linkage.

Verified here: node --check backend/src/server.js and customer-commercial.js; five pure-rule tests. No DB/E2E/build verification.
