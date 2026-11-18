# Stage 24 — Finance UI completion

Changes: `src/app/admin/commercial-manager.tsx` consumes `/api/admin/commercial/finance/summary`, displays aggregate invoice/paid/outstanding/overdue values and next 50 due installments, and displays payment history on demand from `/api/admin/commercial/invoices/:id/payments`. `src/app/account/[action]/page.tsx` displays verified paid and remaining amounts and fetches only authenticated, owned invoice payment histories from `/api/customer/commercial/invoices/:id/payments`.

Backend unchanged from stage 23. 53 backend unit tests passed. Next.js TypeScript/build NOT verified because npm dependency installation did not complete in this environment. No live DB, end-to-end, or browser testing. No production deployment or Git push.

Codex: merge these two UI files selectively with the latest server UI; preserve existing auth and proxy routing. Verify financial roles, session cookies, CSRF, payment-history data, integer-piaster conversion, TypeScript build, PostgreSQL migrations and E2E. Do not overwrite the production branch.
