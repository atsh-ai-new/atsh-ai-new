# ATSH AI — Stage 12 commercial foundation

Base: Stage 11 unified candidate, additive changes only. No production server access or GitHub push.

## Implemented
- SQL migration for leads, versioned quote records, contract templates and signed snapshots, invoices, subscriptions, support tickets, delivery requests and AI usage ledger.
- Admin-only API: create/list leads, quotes, contract templates, tickets; transition ticket state; request Git/ZIP delivery.
- Pure domain rules and tests: quote totals in integer Egyptian piasters, installments, approval gates, ticket transitions, delivery types, profitability.
- Existing project builder, editor, journey, pricing, content studio retained.

## NOT implemented / blockers before commercial launch
- Customer-facing contract display, legal e-signature and PDF/print UI; signed evidence must be immutable and verified.
- Quote revisions/acceptance endpoints and synchronization with existing authoritative pricing engine.
- Payment gateway verified webhook, invoice collection, installment scheduler and subscriptions billing.
- Actual Git repository transfer or ZIP build; delivery requests are queued records only.
- Customer-authenticated ticket and contract portals; tenant isolation, audit logging and permissions need end-to-end verification.
- AI usage ingestion, alerting, backups, monitoring, security pipeline and full deployment tests.

## Deployment precautions
1. Compare with latest server code first; never replace production wholesale.
2. Backup database, review and apply backend/db/commercial_stage12.sql.
3. Validate environment, access controls, schema migration, billing and signature provider in staging.
4. Run npm test in backend and Next.js build with dependencies installed; perform PostgreSQL integration tests.
5. Never mark payment paid, contract signed, or project delivered from a client-submitted flag.
