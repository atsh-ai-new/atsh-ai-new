# ATSH Commerce Engine — isolated development branch

A reusable merchant runtime, not a fork of a competitor or a second ATSH add-on catalog.

## Scope implemented
- Independent stores, hashed random access tokens, role checks, store-scoped products/variants, branch stock, orders, cash POS, basic revenue, cancellation and tracking.
- 21 sectors × 8 original layout presets = 168 configurations. These are presets, not 168 individually art-directed storefronts. Demo has original vector product illustrations. Merchant can set HTTPS image and logo URLs.
- Storefront and merchant workspace, section ordering, preview and saved themes, responsive CSS.
- Central add-on bridge reads `shared_addons` prices and live `customer_service_entitlements` by linked project. No price copies or self-issued entitlements. Included capabilities are not sold again in the workspace.
- Coupon, additional page publication, branch creation and branch operations are gated. Online payment is gated and needs an external verified checkout adapter; never enter card data in this service. Other catalog items appear as orderable or implementation required, not falsely enabled.

## Local test
Node 24 recommended. No npm dependencies.
```sh
cd source/commerce-engine
npm test
npm run demo
npm start
```
The demo prints the owner access token once. Visit /store/dara or /manage/dara at localhost:3200. Demo has no linked central project.

## Integration (not activated on production)
1. Deploy only after review, using a private connection from commerce service to the platform backend.
2. Configure the same high-entropy `COMMERCE_BRIDGE_SECRET` on both services. Set `ATSH_API_BASE` to the private backend origin and `ATSH_CUSTOMER_PORTAL` to the ATSH customer-facing origin.
3. Set `COMMERCE_PROVISION_SECRET` on the commerce service. From trusted provisioning, POST /api/stores with Bearer provision secret and {name,slug,theme,mode,projectId,shipping}. Use approved project draft UUID, mode rent/rent_monthly/copy/code, shipping in piasters. Deliver the owner token through an approved secure channel. Project link is unique. No automatic commercial activation or deployment.
4. Existing customer portal and pricing flow handle requests. Runtime GET /api/stores/:slug/addons reads centrally controlled live prices and entitlements. Submitted drafts are read-only in the current platform; supplemental purchases for paid projects are handled through the separate existing commercial quote ledger (Phase 3 below), not a second pricing engine.
5. Only if a verified payment adapter is implemented and tested, configure `COMMERCE_PAYMENT_SECRET` and HTTPS `COMMERCE_PAYMENT_CHECKOUT_URL`. Provider adapter must independently validate provider callback signature, merchant, order and amount before posting /api/stores/:slug/payment-event using the server secret. Do not expose this secret to browsers. No provider adapter currently deployed.
6. Dockerfile uses persistent /app/data. SQLite WAL is intended for a single runtime instance; before scaling, implement PostgreSQL storage or explicit shard lifecycle, backups/restores, owner token rotation/recovery, TLS and operational monitoring.

## Remaining work before commercial launch
- Real PostgreSQL platform integration test and production data review; owner recovery, SSO, provisioning from accepted customer orders and secure handover.
- Rich original photography and fully distinct theme art direction, localization, visual/browser E2E verification, accessibility review.
- Production payment, shipping, n8n, marketing and other purchased module adapters; each must pass provider-specific integration tests before activation. Automation event polling and idempotent acknowledgements are implemented; an actual n8n consumer is not deployed.
- Purchase orders, partial/online returns and refunds, fraud controls, order search, financial/tax compliance and complete operational flows. POS is basic cash sale, not full retail accounting.
- Central catalog publication/prices require approval; this branch does not publish or merge.

## Phase 2: operations and additional pages
- Product metadata, variant prices/additions and archive; historic order lines remain unchanged. Stock adjustments can check the last known quantity. Stock transfer is atomic and both sides share a reference. Ledger starts when this update is installed; it does not reconstruct past operations.
- Branch stock and POS are gated against the live central multi_branch entitlement. Existing orders can still be fulfilled or cancelled after expiry; no historical data is deleted.
- Full cash/COD return can be recorded by owner or manager after money has actually been returned, with optional restock, once per order. No automatic money transfer. Team owners can suspend, reactivate and rotate staff tokens.
- Additional pages: extra_page price comes from the existing central catalog, not a new price table. One active entitlement row grants one additional published page; management must explicitly issue one row per approved page (with distinct source IDs). Drafts are free to prepare. On revocation or unavailable bridge, pages exceeding the active quota are hidden from public routing and navigation; content is retained. Base storefront does not consume an additional-page entitlement. The current central pricing flow limits extra_page to five units per selection, not per lifetime. Supplemental purchase requests for paid projects now use the central commercial quote and verified invoice workflow described in Phase 3.
- Optional automation contract: set COMMERCE_AUTOMATION_SECRET (at least 32 characters, private) and grant workflow_automation in the existing engine. GET /api/stores/:slug/events returns up to 100 undelivered event IDs and minimal payloads; POST /api/stores/:slug/events/ack with {id} marks that event delivered. Both require the server bearer secret and the active central entitlement; consumer must deduplicate by ID, only acknowledge after successful processing. No n8n connection or outbound delivery is configured.

## Phase 3: ATSH central administration and supplemental orders
- Platform admin → Content → Products → Stores (directly after Products). The tab displays the original bundled theme library even offline, and live stores/metrics when connected. It includes paid-project provisioning with the existing ownership selection, one-time owner token handoff, and a direct button opening the existing central add-on catalog.
- Configure the platform backend with COMMERCE_RUNTIME_INTERNAL_URL (private runtime origin), COMMERCE_PROVISION_SECRET (same as commerce runtime), and optional COMMERCE_RUNTIME_PUBLIC_URL (HTTPS public origin). No credential is exposed in the store listing or browser configuration. Commerce store creation from the admin portal is restricted to owner/admin with products and customers permissions and an already paid project; its ownership mode is read from the original project.
- Customer portal → My projects → Add pages and features. After the original project has verified payment, the customer may select active catalog add-ons and quantities. The central backend uses calculateUnifiedPricing and VAT, saves an independently priced commercial quote, and retains an immutable link to the original project. A request key prevents duplicate creation. The original quote, contract and lifecycle are unchanged.
- Administration reviews the request using existing commercial quote issuance, contract and verified invoice mechanisms. After acceptance and full payment, an owner/admin can activate the corresponding entitlement rows exactly once. Each paid extra_page unit grants one page; recurring items grant their initial term, expiring after one calendar month/year from activation. No automatic renewal or provider provisioning is performed. An active entitlement does not imply an unsupported provider adapter is operational.
- Added real SQL integration test (ATSH_TEST_POSTGRES points to a dedicated disposable test database, or ATSH_PGLITE_MODULE points to the PGlite module for offline test) and admin navigation browser test. GitHub CI builds the platform and runs dedicated PG and browser tests. No production deployment or automatic merge.
