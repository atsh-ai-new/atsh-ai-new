# ATSH AI — integration baseline (2026-11-16)

## Sources
- `atsh-ai-platform-main(1).zip` is the working platform baseline.
- `atsh-ai-platform-codex-content-manager-review(1).zip` was compared file-by-file; no files exist exclusively in the review archive. The main archive has `src/app/admin/content-studio.tsx` and changes to 14 shared files.
- Existing journey agent is on GitHub branch `feature/ai-customer-journey-standalone`, and a copy of its seven source/config/test files was added to `feature/atsh-hybrid-engine-integration-20261116`.

## Verified existing functions in uploaded platform
- Pricing and order quote calculation, configurable packages/options.
- Admin team roles and content/page/media management.
- Content studio: OpenAI analysis, review approval, n8n production webhook, MP4 storage and audit logs.

## Pending integration — NOT completed
1. Apply this uploaded platform baseline to the isolated integration branch, reviewing all 14 changed files; do not overwrite production.
2. Bind journey agent to verified ATSH session and PostgreSQL; do not use the agent's in-memory store for production.
3. Connect agent to authoritative catalog and pricing API; do not let the model invent prices.
4. Connect n8n with authenticated and idempotent server-side workflow calls; preserve existing content studio endpoints.
5. Add client portal and end-to-end tests for quotation, approval, payment and delivery.
6. Run npm install, typecheck, Next build, database migration tests and security review in staging.

## Validation executed on this archive
- `node --check backend/src/server.js` passed.
- Frontend typecheck and Next build NOT run (dependencies unavailable in current environment).
- No deployment, database migration or production merge performed.
