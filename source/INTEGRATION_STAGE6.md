# ATSH AI — Stage 6 customer portal (isolated development package)

## Implemented
- Admin-only creation/rotation and revocation of project-specific customer access codes.
- Codes generated with 32 cryptographically random bytes; only SHA-256 digest stored in PostgreSQL. Seven-day default expiry, configurable 1–30 days.
- Scoped customer project status and last 50 conversation messages; no admin cookies or access to other projects.
- Customer AI chat uses published package data, limited response length, OpenAI Responses API with `store:false`, and no ability to execute payments, deploy, alter pricing, or change lifecycle.
- Customer-facing `/customer-portal` page and same-origin Next.js API proxy; no credentials in URLs or browser storage.
- Admin audit log for access issuance and revocation; global and per-route rate limiting.

## Operational requirements
- Run `backend/db/schema.sql` against a **staging** PostgreSQL database first. Existing backend executes schema.sql on startup; review migrations before production use.
- Set `ATSH_API_BASE_URL` on Next.js, and `OPENAI_API_KEY`, `OPENAI_MODEL`, `DATABASE_URL`, `ALLOWED_ORIGINS`, `JWT_SECRET` on backend.
- An owner/admin calls `POST /api/admin/journey/projects/{uuid}/customer-access` with `{ "expiresInDays": 7 }` and securely delivers the returned code and UUID to the customer. Reissuing revokes the previous code.
- An owner/admin can revoke access using `DELETE /api/admin/journey/projects/{uuid}/customer-access`.
- Customer manually enters UUID and code at `/customer-portal`.

## Important gaps
- No real database, OpenAI, or n8n connectivity tested.
- npm dependencies unavailable; Next.js build and TypeScript typecheck unverified.
- The GitHub integration branch is NOT updated by this archive; integration with standalone engine and catalog previews is outstanding.
- Customer login currently uses a high-entropy bearer code, not a full account-based identity system; consider customer accounts and abuse controls before production.
- AI usage costs, quotas per tenant, abuse detection, and conversation retention policy require production design.
- No payment gateway, verified staging preview links, or automatic deployments implemented.
- No production changes.
