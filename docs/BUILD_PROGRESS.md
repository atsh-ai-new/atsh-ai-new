# ATSH AI — Development Status
Updated: 2026-11-17 | Working branch: atsh-platform-rebuild | Production deployment: NOT authorized

## Implemented in this branch
- Extracted Stage40 source into source/ while preserving original ZIP.
- Reference user journey: docs/ATSH_AI_CUSTOMER_JOURNEY_MASTER.md.
- Arabic catalog pages with sector search/category filtering, preview routes and four starter demos.
- Catalog admin: backend-backed drafts, create/edit, show/hide, archive/restore, ordering, image upload via protected media endpoint. Requires actual ATSH API, database and an authenticated admin to function; fallback catalog is read-only.
- Demo personalization: business name, brand color, local logo and descriptive copy. Demo interactions are local only.
- Catalog selection carried to the main configurator through sector query parameter and into request notes. Sector-specific development fees are NOT assumed to be covered by the generic quote; admin approval is necessary.
- Frontend typecheck and Next.js build validation via GitHub Actions; backend syntax and unit test job added.

## Not yet implemented / not approved
- True domain availability, purchase or provisioning, production hosting automation.
- Customer authentication and persistent personalized preview lifecycle linked to selected catalog item.
- Contract generation, compliant e-signature and real payment confirmation webhook.
- Full dynamic sector-specific pricing and source-license/managed subscription billing.
- AI concierge workflow and n8n event integration end-to-end.
- Real interactive production sector management apps (starter demos remain illustrative).
- End-to-end browser/mobile, security and authenticated catalog CRUD integration tests.
- Deployment of this branch or changes to production main, database and Coolify.

## Delivery gates before launch
1. Each new feature is testable with no fictitious service success.
2. Preserve existing core configurator/packages/admin capabilities.
3. All code changes remain on atsh-platform-rebuild; no main merge without approval.
4. PostgreSQL/API integration with catalog schema, authenticated CRUD, audit trail and media ownership.
5. Verified per-item backend quote, signed contract version, secure payment event and delivery entitlement.
6. E2E test: visitor → assistant → catalog → configurable quote → login → personalized preview → approval → contract → payment → delivery.
7. Admin E2E test: create → draft → edit → upload → publish → filter → hide → restore, without destroying historical orders.

Current CI status must be checked in GitHub Actions; never infer success from a pushed commit alone.
