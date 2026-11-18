# ATSH AI — Stage 15 minimal Codex handoff

Source: Stage 14 complete development archive. No production deployment and no replacement of newer server code.

## Added files
- backend/src/customer-auth.js — customer registration, verification, password login, reset, Google ID token validation endpoint, session and project listing.
- backend/db/customer_auth_stage15.sql — customer identities and single-use hashed auth tokens.
- backend/test/customer-auth-contract.test.js — source-level security contract checks.
- src/app/account/[action]/page.tsx — registration/login/forgot/reset/verification/dashboard UI.
- src/app/api/customer/auth/[...path]/route.ts — same-origin API proxy.

## Changed
- backend/src/server.js — installs migration and mounts /api/customer/auth.

## Required configuration
- PUBLIC_SITE_URL=https://atsh-ai.com
- ALLOWED_ORIGINS=https://atsh-ai.com (plus actual app origins)
- BREVO_API_KEY, BREVO_SENDER_EMAIL (verified domain)
- GOOGLE_CLIENT_ID (Google Identity Services browser credential; Google button UI not yet wired)
- JWT_SECRET, DATABASE_URL and existing variables.

## Known limitations — do not claim production-ready
1. Google backend credential verification is implemented, but Google Identity Services browser button and account-linking UX are not wired.
2. Customer account dashboard currently lists projects by verified email; migrate to immutable customer_account_id with explicit ownership/claim verification before enabling sensitive data or actions. Current endpoint only returns basic project metadata.
3. Existing portal token flow and contracts/orders must be migrated to customer session ownership and authorization. No automatic account linking by email for sensitive assets.
4. Verify real Brevo email, real Google credential, Postgres migration, Next.js build, CSRF/origin/proxy behavior and end-to-end flows on staging.
5. Test multi-tenant isolation, session revocation, brute-force/rate limits and operational backups.
6. Ensure PUBLIC_SITE_URL uses actual canonical domain and cookies are Secure in production.

## Minimal Codex task
Diff Stage 15 against live server (server is authoritative). Cherry-pick new auth module/migration/routes and UI, resolve changed server.js with surgical additions only. Add Google button + verified account linking, enforce immutable customer ownership for projects/orders/contracts, run staging E2E and security tests. Do not overwrite main or deploy without approval.
