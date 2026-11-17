# Stage 17 — customer auth UI completion

Baseline: stage 16. Existing backend and migrations retained unchanged.

Changes: `src/app/account/[action]/page.tsx`: Google Identity Services button on register/login, posts Google ID credential to existing `/api/customer/auth/google`, legacy project claim UI (project UUID and one-time access token), project listing and logout. Google requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` at Next.js build time AND matching `GOOGLE_CLIENT_ID` in backend; configure Google authorized origins. The backend validates ID token audience and issuer. Do not expose any private API keys in NEXT_PUBLIC variables.

Important: this does NOT grant access to quotes/contracts/invoices/orders by email. Those must be explicitly bound to customer_account_id and authorized before customer endpoints are added. The existing project-claim mechanism requires verified identity and a project access token; verify this behavior against real PostgreSQL before deployment.

Remaining: actual Google/Brevo/Postgres E2E, secure quote/contract/invoice ownership, production Next.js build, payment/delivery, reconciliation with newer production server. Do not overwrite production.
