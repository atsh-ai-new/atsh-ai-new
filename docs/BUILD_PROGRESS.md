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

## Stage 41 — GPT, sector pricing and shared customer workspace
- Visitor concierge now attempts GPT using OPENAI_API_KEY and OPENAI_MODEL on the backend. Frontend never gets API credentials; it labels rule-based fallback explicitly when GPT fails.
- Published package prices, option catalog, published sector descriptions and an editable assistant-knowledge page are injected into each GPT request as facts, not privileged instructions. Admin entry: "معرفة مساعد GPT" to edit service overview/policies/FAQ; publishing is explicit. No production GPT calls were tested without API credentials.
- Separate sector additions (fixed/monthly/yearly) editable from admin; backend validates sector publication, addon codes and prices, and includes server-priced charges in order snapshot. Unpriced sectors produce "custom quote required" and cannot produce a misleading zero-price purchase.
- Configurator restores sector selection and addon choices; it shows server-estimated sector fees, while initial recurring charges and taxes require final legal/billing review.
- Customer workspace database table tied to verified customer account ID. Guest selections follow catalog → configurator → preview, and require *explicit consent* on the account dashboard before importing, to avoid mixing shared-browser visitors. Authenticated order creation links to an account-owned journey project only after session and email verification.
- Customer preview now supports name, colors and text in workspace and private logo upload per authenticated account, capped at 2MB and restricted to PNG/JPEG/WebP.
- Stage 41 test suite covers sector price computation, forged addons and custom quotes. GitHub Actions runs frontend typecheck/build and backend tests.
- No claim that GPT provider, PostgreSQL, payment or domain search is connected in the live site. Main remains untouched.

### Still missing for production
1. Full per-customer preview version history and approval workflow, quote signature/delivery integration end-to-end.
2. Real domain registrar lookup/purchase and hosting provisioning.
3. Production proof of GPT configured credentials, catalog admin edits, signed-in workspace/logo upload and account-owned orders against a test database.
4. Monthly vs annual invoice schedule and subscription entitlements, and E2E browser/mobile/security tests.
5. Final launch approval before connecting providers/production domain.

## Stage 42 — Hierarchical catalog interface (2026-11-17)
- Replaced flat public gallery filter with a mobile-friendly hierarchy: top-level sector tabs → optional subcategory filter → live catalog cards, grouped by major sector.
- The administrative catalog editor now supports creating, renaming, showing/hiding, safely removing, and reordering **major sectors** and **subcategories**. Sector icons/descriptions can also be edited. Deletion is refused when catalog entries reference the group, including archived entries.
- Each catalog can be assigned a specific sector and optional subcategory. Changes are saved to the existing authenticated CMS `catalog` page as `sectors` plus `items`, so both front-end and admin share one published source.
- Legacy four sample catalogs retain their initial placements via a migration-friendly fallback. A category that has been unpublished does not render its dependent catalogs publicly.
- Build checks run on branch push. Integration and browser visual checks against real deployed database remain outstanding. No changes to main.

## Master remaining-work checklist
- Prioritized open tasks, definitions of done, and newly required **admin contract wording/template editor**: [`docs/REMAINING_BUILD_TASKS_MASTER.md`](REMAINING_BUILD_TASKS_MASTER.md).
- The existing contract UI supports creation of templates but **not editing and versioning of existing templates**. This is explicitly tracked as `ATSH-004` (P0) and is not yet implemented.

## Stage 43–51 update — real tests and security gates (2026-11-17)

**Verified code progress**
- Admin contract template wording editor, categories for managed plans/source-code/hosting, publish/archive/clone/preview and immutable revision history. Issued contract snapshots do not mutate when templates change.
- Per-project customer drafts and logos are account-isolated; preview versions have explicit customer approval/change request and immutable logo snapshots.
- Corrected frontend pricing split by one-time/monthly/yearly charges, stored server-calculated billing in order snapshots, and rejected null-priced packages as free.
- Domain lookup with Namecheap API is **configuration-dependent**; lookup never implies reservation or standard price. WHM provisioning helper explicitly requires independently verified payment and administrator approval; it is not exposed to the public.
- GPT guest assistant uses published company knowledge and catalog, with daily request/output-token quotas and aggregate usage counts readable only by authorized admins. Real OpenAI credentials are not set here.
- Customer events are committed into a transactional outbox and dispatched to n8n with idempotency identifiers and bounded retries.
- Catalog CMS refuses outdated concurrent writes and preserves unsaved form content on failed requests.
- `npm run preflight` added to detect missing credentials and launch controls without printing secrets.

**Verification**
- Backend unit tests, frontend TypeScript + Next production build, and fresh isolated PostgreSQL API integration have passed on GitHub Actions after the above changes.
- A new Chromium browser E2E workflow tested desktop and mobile catalog filtering, sector previews, test-record actions and configurator navigation: first complete run `44150921533` **passed**. Extra mobile overflow assertion was subsequently added and needs its own run result.
- These tests cannot establish that registrar/hosting/payment/GPT/n8n credentials are configured or that external production operations work. All live-provider deployments and actual full-sector application previews remain launch blockers.
- Main and the published domain remain unchanged.

**Critical remaining release gates:** configure actual providers and test sandboxes, complete commercially representative sector apps (not demo placeholders), legally approve contract signature and policy, enforce entitlement-based delivery and renewals, run multi-tenant security/performance tests on staging, then obtain explicit approval before main merge or deployment.

## Stage 52 — Safe live-database connection preparation (2026-11-17)
- Corrected Coolify deployment instructions for repository `atshpana/atsh-ai` branch `atsh-platform-rebuild`, monorepo base `/source/backend` for API and `/source` for frontend; previously documented `main` and `/backend` were inaccurate. See `source/docs/DEPLOYMENT.md`.
- Added `source/backend/test/persistence-restart.mjs`: in disposable PostgreSQL, creates owner override, a staff account, and admin-edited unpublished page, starts a second backend on the *same database*, confirms owner/staff login and saved CMS page still exist after startup migrations. Integrated into PostgreSQL GitHub Actions.
- CI exposed a same-second owner password reset/session comparison bug caused by integer JWT `iat` vs microsecond timestamps. Replaced this with a **persisted monotonic owner credential revision** via an additive SQL column and a JWT claim. Existing owner password override and staff hashes are never erased or regenerated by the migration; previously issued owner session cookies may require sign-in again.
- GitHub Actions `ATSH PostgreSQL API Integration` and `ATSH Source Validation` both **passed** for commit `fc7830cf98af86b3293cdc33e0b5e6fa9320c662`. **This verifies CI's disposable DB only, NOT the user's live server.**
- **No direct Coolify/VPS/production PostgreSQL connection or deployment has been performed from this chat.** Live changes remain blocked on verifying existing Coolify app/source/network config and a recoverable backup. Never delete/recreate the live database, rotate admin secrets, detach a working API app or merge to main just to test.
- After staging validates the real schema, re-source existing API in place and connect separate HTTPS preview frontend, then verify an unpublished admin draft persists across page reload and API restart. GPT provider setup comes **after** this verification.
