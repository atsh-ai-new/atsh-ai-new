# ATSH AI — unified builder/editor integration handoff (stage 11)

## Source of truth
The stage-10 archive is a strict superset of the stage-9 archive: comparison found only six changed/added paths, all related to builder/editor or its documentation. Stage-11 adds an integration-contract test and this handoff. Existing site, customer journey, pricing, content studio and template catalog files are retained from stage 9.

## Verified locally
- `node --check backend/src/server.js`
- `node --check backend/src/project-builder.js`
- `node --test backend/test/*.test.js`
- Static contract tests confirm API routes, authorization middleware, SQL tables and UI wiring. These are not live database or browser tests.

## Before attaching to current production code
1. Snapshot the current production repository and PostgreSQL; compare file-by-file, especially backend/src/server.js and backend/db/schema.sql. Production is newer than this archive.
2. Merge selectively into a new isolated branch; do not replace the server's current files wholesale.
3. Apply database migrations in staging, check permissions and indexes, then run authenticated API tests with PostgreSQL.
4. Install dependencies from lockfile and run `npm run typecheck` and `npm run build` in the web app, then `npm test` in backend.
5. Verify customer journey, pricing, order ownership, template catalog, content studio, AI responses and n8n webhook against staging.
6. Connect Forgejo provisioning and n8n agent execution behind approval gates; visual edits are proposals only until an isolated code-application worker and preview service exist.
7. Obtain explicit review before production deployment. Never mark payments as complete from AI messages.

## Known limitations
- No live repository creation, code-writing agent, visual editor application, automatic preview, or deployment yet.
- No successful full Next.js build or live PostgreSQL/OpenAI/n8n test is claimed.
- GitHub branch and production server have not been updated by this archive.
