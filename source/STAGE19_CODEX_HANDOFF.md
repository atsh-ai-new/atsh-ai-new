# ATSH AI — Stage 19: customer account documents and linked orders

## Changed files
- `backend/src/customer-commercial.js`: authenticated `/orders` and `/orders/:id`, strictly joined through customer-owned project IDs and existing project-order links. No email-based order ownership.
- `src/app/account/[action]/page.tsx`: account dashboard sections for linked orders, quotes, contracts and invoices.

## Codex low-token integration
1. Use the **newer production server tree** as the source of truth. Cherry-pick or manually port only the two changed files' additions. Never overwrite production `main` or credentials.
2. Ensure stage 16–18 database migrations exist, and `customer_journey_order_links`, `customer_journey_projects.customer_account_id`, commercial tables are present.
3. Ensure `/api/customer/commercial/*` is routed by Next.js proxy to backend, cookies forwarded safely.
4. Run backend tests, Next.js typecheck/build, migration on staging PostgreSQL, and authenticated E2E isolation tests (account A cannot see B's orders or documents).
5. Existing orders with no owned project link intentionally remain invisible. Implement explicit proof-based order claim separately; do not grant ownership by email alone.

## Unverified
No real PostgreSQL, Google OAuth, Brevo, OpenAI, n8n, payment gateway, or deployment tested here. Existing UI is a preliminary account dashboard, not a fully designed portal. Do not deploy before testing.
