# ATSH AI Stage 22 — source audit and operational control enforcement

Source: stage 21 ZIP, not the newer production server. This is a development patch, not production certification.

## Implemented
- Central operational flags now guard actual POST order intake, customer journey AI chat, builder plan/edit creation, content-studio POST actions, and delivery publishing/customer decisions.
- Database errors fail closed with HTTP 503, preventing bypass when the control state cannot be verified.
- GET routes remain available to inspect records while write functions are suspended.
- Unit tests for enabled/disabled/missing flags and database failure.

## Gaps requiring further work before production
- Service controls are not yet enforced by external n8n workers or scheduled jobs.
- Admin flags do not yet cover every auxiliary endpoint; audit each new route as added.
- Private object storage and authenticated downloads are missing; deliverables use HTTPS URLs.
- Payment gateway signed webhook, refunds, PDF receipts and automated due reminders missing.
- Full Next.js build, PostgreSQL migrations and end-to-end auth/tenant isolation unverified.
- Existing code should be three-way merged against newer server code, never overwritten.

## Run
`node --check backend/src/server.js`
`node --check backend/src/delivery-control.js`
`node --test backend/test/operation-guards.test.js`
`npm --prefix backend test` (requires installed dependencies).
