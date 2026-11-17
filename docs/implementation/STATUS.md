# ATSH AI implementation status

Date: 2026-11-17. Branch: `stage40-integration`. PR #1 targets `main`; no merge authorized.

## Audited source
This PR originally contained only `scripts/preflight.mjs`, while the branch had a short README. The historic Stage40 ZIP was not available in the GitHub PR. A separate greenfield implementation has been started here without using the old production database.

## Committed source
- Next.js App Router Arabic RTL home and four-step request configuration form, responsive CSS.
- NestJS API with health route and validated/throttled service-request intake.
- New Prisma PostgreSQL schema with ServiceRequest model, no historic DB connection.
- DTO validation unit tests, GitHub Actions checks, environment template.

## Outstanding — NOT complete
No npm install, dependency lockfile, Prisma migration, build, test or deployment has been confirmed. No database is connected. No user identity/auth/RBAC; no admin dashboard, versioned pricing/cart, secure customer portal, projects, signed n8n integrations, AI automations, payments or delivery. No externally accessible preview exists. Do not claim production readiness.

## Next execution priorities
1. CI dependency installation and schema generation, fix type errors and produce lockfile.
2. DB migration and request idempotency, anti-abuse, privacy retention controls.
3. Implement authentication, RBAC, audit logging, admin CMS and pricing engine.
4. Build quotation approval, customer portal, project lifecycle and file storage.
5. Build signed n8n coordination and sandbox tests, followed by staging and security review.
6. Backup/restore drill and explicit production-release approval.
