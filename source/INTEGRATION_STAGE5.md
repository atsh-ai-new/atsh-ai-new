# ATSH AI — Stage 5

Adds a guarded administrative link between customer journeys and existing priced orders. Uses the original `orders.snapshot` as the pricing authority, does not recalculate totals, and never infers payment. The link is one-to-one, transactional, auditable, and requires matching nonempty customer email addresses.

## Deployment prerequisites
Apply the additive SQL in `backend/db/schema.sql` (the `customer_journey_order_links` table) before deploying the updated backend. Existing auth and admin roles remain in force.

## Not completed
No verified payment webhook, public authenticated customer assistant, real template preview, n8n staging verification, or production deployment.
