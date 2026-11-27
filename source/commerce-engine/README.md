# ATSH Commerce Engine — isolated development branch

A reusable merchant runtime, not a fork of a competitor or a second ATSH add-on catalog.

## Scope implemented
- Independent stores, hashed random access tokens, role checks, store-scoped products/variants, branch stock, orders, cash POS, basic revenue, cancellation and tracking.
- 21 sectors × 8 original layout presets = 168 configurations. These are presets, not 168 individually art-directed storefronts. Demo has original vector product illustrations. Merchant can set HTTPS image and logo URLs.
- Storefront and merchant workspace, section ordering, preview and saved themes, responsive CSS.
- Central add-on bridge reads `shared_addons` prices and live `customer_service_entitlements` by linked project. No price copies or self-issued entitlements. Included capabilities are not sold again in the workspace.
- Coupon and branch creation are gated. Online payment is gated and needs an external verified checkout adapter; never enter card data in this service. Other catalog items appear as orderable or implementation required, not falsely enabled.

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
4. Existing customer portal and pricing flow handle requests. Runtime GET /api/stores/:slug/addons reads centrally controlled live prices and entitlements. Submitted drafts are read-only in the current platform; later purchase workflow for already submitted projects still needs platform-side product work, not a second pricing engine.
5. Only if a verified payment adapter is implemented and tested, configure `COMMERCE_PAYMENT_SECRET` and HTTPS `COMMERCE_PAYMENT_CHECKOUT_URL`. Provider adapter must independently validate provider callback signature, merchant, order and amount before posting /api/stores/:slug/payment-event using the server secret. Do not expose this secret to browsers. No provider adapter currently deployed.
6. Dockerfile uses persistent /app/data. SQLite WAL is intended for a single runtime instance; before scaling, implement PostgreSQL storage or explicit shard lifecycle, backups/restores, access-token rotation, TLS and operational monitoring.

## Remaining work before commercial launch
- Real PostgreSQL platform integration test and production data review; token lifecycle and SSO, provisioning from accepted customer orders and secure handover.
- Rich original photography and fully distinct theme art direction, localization, visual/browser E2E verification, accessibility review.
- Production payment, shipping, n8n, marketing and other purchased module adapters; each must pass provider-specific integration tests before activation. Outbox persisted but delivery worker is not implemented.
- Product/variant editing, returns/refunds, purchase orders, warehouse transfers, fraud controls, order search, financial/tax compliance and complete operational flows. POS is basic cash sale, not full retail accounting.
- Central catalog publication/prices require approval; this branch does not publish or merge.
