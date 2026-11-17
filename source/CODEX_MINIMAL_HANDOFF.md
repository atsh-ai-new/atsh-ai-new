# ATSH AI — minimal Codex integration handoff

## Source of truth
Production server is NEWER than this archive. Do not copy this project over production. Do not merge directly to `main` or run schema against production without backup and comparison. Import changes into a fresh branch on the production repository and resolve conflicts there.

## What this package contains
The Stage 13 candidate plus Stage 14 commercial admin UI (`src/app/admin/commercial-manager.tsx`, mounted as the `commercial` tab in `src/app/admin/page.tsx`) and 3 new contract tests. The admin UI creates draft quotes, issues quotes, creates contract templates, issues contract snapshots, generates one-time review tokens, and displays support tickets. Backend endpoints were already present in Stage 13. It is NOT a payment processor, verified e-signature, repository delivery engine, or production-complete CRM.

## Codex — short instruction (paste verbatim)
"Compare this archive with the newest running ATSH AI server source; keep production changes. In an isolated feature branch, selectively port commercial admin UI and existing Stage 12/13 additive migrations and APIs only where absent. Do not duplicate routes or apply migrations blindly. Confirm existing pricing and n8n content studio stay intact. Run backend tests, Next.js typecheck/build, Postgres integration, origin/CSRF checks, browser signing flow, and security review. Report exact failures and missing env values without exposing secrets. Do not deploy or merge until approved."

## Known blockers requiring runtime access
- Next.js dependency installation / build not verified in this environment.
- PostgreSQL schema compatibility, migrations, and transaction behavior not verified against real database.
- Payment gateway, real Git/ZIP delivery, legally verified electronic signatures, subscription billing, backup/restore, tenant isolation, and security scans are NOT implemented end-to-end.
- Browser review flow and email delivery need E2E validation.
- Existing review tokens are used in a page query string; review token transport and URL leakage risk should be addressed before production.
- Password recovery fallback token logging was removed in this candidate; verify the entire recovery flow and rate limits before production.

## Commands
`cd backend && npm ci && npm test && npm run check`
`cd .. && npm ci && npm run typecheck && npm run build`

## Database
Review `backend/db/schema.sql`, `commercial_stage12.sql`, `commercial_stage13.sql` against production schema; take backup, apply additive migrations in staging, validate rollback and constraints.

## No secrets
Never commit `.env` files, access tokens, passwords or DB credentials. Configure them only in deployment secret store.
