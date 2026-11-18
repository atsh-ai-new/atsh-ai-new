# Stage 20 — Digital deliverables + operations center

- Based on the stage 19 ZIP, preserving the platform code.
- SQL migration: `backend/db/delivery_control_stage20.sql`; loaded at backend startup.
- Admin UI: `/admin/deliverables`; customer UI: `/account/dashboard`.
- Admin API: `/api/admin/deliverables` (GET/POST/PATCH), `/api/admin/operations/services` (GET/PATCH).
- Customer API: `/api/customer/deliverables` (GET), `/:id/decision` (POST).
- Admin auth uses existing role middleware; customer auth uses existing signed session and ownership joins.
- **Limitations**: asset URLs are references, not uploaded binary storage; do not use public links for confidential client content. Connect private object storage with short-lived signed downloads and upload flow before production. Feature switches are persisted configuration, not yet enforced in all existing n8n/agent/service execution paths. Admin role `editor` can manage deliverables; only owner/admin can change switches. No server deployment or real database E2E verification performed.
- Codex: compare against newer server code, apply migration, configure secure object storage, enforce feature switches at every service entry point, run full build, DB, auth, tenant isolation, security and browser tests. Never overwrite production or merge main without review.
