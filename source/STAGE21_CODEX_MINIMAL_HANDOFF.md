# ATSH AI — Stage 21 / minimal Codex handoff

**Authority:** The production server is newer than this snapshot. Cherry-pick/add changes; NEVER overwrite production server or deploy automatically.

## Added in this stage
- `backend/db/stage21_invoice_ledger.sql`: immutable payment entries and indexes. Apply after `commercial_stage12.sql`, after a verified backup.
- `backend/src/server.js`: admin invoice list, installment schedule, payment history, verified manual payment entry with transaction/locking, audit and duplicate reference protection.
- `src/app/admin/commercial-manager.tsx`: invoice dashboard, due dates, balances, schedule and manual payment entry.

## Invariants
- Amounts stored in integer piasters, displayed in EGP.
- Schedule must equal issued/accepted quote total and cannot be recreated if any invoice exists.
- Only owner/admin can record payments; manual evidence must be checked by human. Never infer payment from a customer action.
- Payment gateway webhooks, refunds/reversals, automated reminders, PDF receipts, and integration with actual production order/payment tables **not yet implemented**. Do not enable production billing without them.
- Apply DB migration and test against isolated PostgreSQL; confirm current production schema/roles/identity before merging.

## Tests
`node --check backend/src/server.js`; `npm --prefix backend test`; `npm run build` (dependencies required). Verify permission boundaries and transaction rollback using a real DB.
