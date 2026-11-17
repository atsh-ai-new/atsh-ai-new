# ATSH AI — unified integration candidate

## Included
- Original platform: pricing, orders, admin/team, content studio, n8n approval handoff.
- Stages 1–6: customer journey persistence, internal guidance, order links, customer access, customer chat.
- Added: PostgreSQL-backed template catalog with protected admin CRUD, public API and Arabic public catalog page.

## Boundaries
- This is a local unified code candidate, **not** a completed merge of all GitHub feature branches.
- Existing GitHub standalone assistant is not imported here. The platform already contains its own guidance and customer chat routes; reconciling behaviors requires branch comparison.
- Preview URLs must be independently deployed and verified; no pretend preview links are seeded.
- Database migration runs during backend startup, as in the original code; production needs migration review and backup.
- No live OpenAI, PostgreSQL, payment, n8n, or production integration has been validated.
- Never overwrite the newer production server from this older ZIP snapshot.

## Verification
Run `node --check backend/src/server.js`, then `npm ci && npm run typecheck && npm run build` with dependency access; validate database and API tests in staging.
