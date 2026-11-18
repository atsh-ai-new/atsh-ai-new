# ATSH AI — Stage 9: verification and Codex handoff

## Verified in this local candidate
- `node --check backend/src/server.js`: passed.
- `npm --prefix backend test`: 9/9 unit tests passed (shared policy engine only).
- Source includes Next.js customer portal, admin journey manager, template catalog routes, PostgreSQL schema, and n8n content-studio handoff.

## Unverified / blocked
- `npm ci --offline` failed with `ENOTCACHED` for `undici-types@6.21.0`. Consequently Next.js build and TypeScript typecheck remain unverified.
- No PostgreSQL, OpenAI, n8n, payment gateway, Forgejo, or staging environment was connected or exercised.
- No merge with the newer production server or all GitHub feature branches; do not overwrite production.
- No public interactive preview deployed or validated.

## Codex integration checklist
1. On the actual server, make a backup and create a new branch from its latest commit. Compare this candidate file-by-file; retain all newer server changes.
2. Apply database changes as reviewed migrations, not automatic unreviewed schema replacement. Check existing tables and indexes.
3. Reconcile `backend/src/server.js` with latest template-catalog routes and GitHub standalone journey branch; do not create duplicate API routes.
4. Install pinned dependencies, run `npm ci`, `npm run typecheck`, `npm run build`, `npm --prefix backend test`.
5. Test staff RBAC, customer project token isolation, order ownership, quote source of truth, payment verification, OpenAI timeouts/rate limits, n8n webhook, and content-studio approval.
6. Deploy staging preview, verify mobile experience and customer/admin workflows; request approval before production merge.

## Known risk
The 9 passing tests validate only policy text generation and OpenAI response extraction; they do not establish API security, database correctness, or end-to-end readiness.
