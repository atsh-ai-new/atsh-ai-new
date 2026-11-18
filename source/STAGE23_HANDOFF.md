# Stage 23 — finance audit extension

## Added
- `GET /api/admin/commercial/finance/summary` — aggregate verified payments, outstanding, overdue and next 50 installments; existing admin role guard.
- `GET /api/customer/commercial/invoices/:id/payments` — payment history only after invoice ownership through quote.customer_account_id; excludes payment reference and recorded_by.
- `backend/src/invoice-ledger-rules.js` — integer piaster accounting and strict calendar date validation. Invoice schedule rejects impossible dates.
- Six unit tests for new pure rules.

## Integration required
1. Merge selectively against latest server version; never overwrite production server.js.
2. Apply stage 12 and stage 21 SQL migrations in order; validate quote ownership stage 18 migration.
3. Install backend dependencies; run complete tests and Next.js build, then run PostgreSQL integration tests with separate test DB.
4. Review payment reconciliation, invoice void/refunds and webhook signature validation before enabling payment gateway.
5. Add dashboard widgets consuming finance/summary and customer payment-history endpoint in the production UI.
6. Ensure same-site cookie/CSRF policy and permissions in deployed reverse proxy.

Not deployed or connected to live PostgreSQL. The new endpoints are implemented, but UI integration and end-to-end tests remain pending.
