# ATSH AI — n8n integration handoff (20 Nov 2026)

Status: **code staged on an isolated GitHub branch; not deployed or connected to any live n8n server**.

## Deployment target and isolation
- Intended destination: the new ATSH AI server (previously supplied as `2.29.185.103`), **after** confirming Coolify is running there.
- In Coolify: **New Resource → Service → n8n with PostgreSQL** (not the SQLite default or a queue worker).
- Proposed URL: `https://n8n.atsh-ai.com`. Create DNS A record for `n8n` pointing to the **new server** and route TLS through Coolify's proxy.
- Do not expose ports 5678 or 5432 to the Internet. HTTPS only. Keep n8n's database separate from ATSH's existing application PostgreSQL.
- Configure the n8n service with stable persistent storage and secrets: `N8N_ENCRYPTION_KEY` (generate a strong random value **once**, retain securely across upgrades), `WEBHOOK_URL=https://n8n.atsh-ai.com/`, `N8N_EDITOR_BASE_URL=https://n8n.atsh-ai.com/`, `N8N_HOST=n8n.atsh-ai.com`, `N8N_PROTOCOL=https`, `N8N_PROXY_HOPS=1`, `GENERIC_TIMEZONE=Africa/Cairo`, `TZ=Africa/Cairo`. Confirm the template's defaults before changing them.
- Set up daily backups of **both n8n PostgreSQL and its encryption key**, and verify a restore on an isolated instance.
- Do not migrate the old n8n's data/workflows or any platform data without separate authorization.

## Existing ATSH platform code already present
- `source/backend/src/customer-event-outbox.js` queues customer events in the ATSH database and retries until a 2xx is received. Payload: `{id,type,key,payload}`, headers: `Authorization: Bearer <secret>`, `X-ATSH-Event-ID`, `X-ATSH-Idempotency-Key`.
- The backend expects two Coolify-only secrets: `ATSH_N8N_EVENT_URL` and `ATSH_N8N_EVENT_TOKEN` (token length at least 20). The URL must be an HTTPS URL with no query string.
- Other *separate* integrations are `N8N_AD_APPROVED_PLAN_URL`/`N8N_AD_APPROVED_PLAN_TOKEN` for video rendering and `BUILDER_CALLBACK_SECRET` for signed builder callbacks. **Do not enable them until their workflows, permission gates and tests exist**.

## Inbound event workflow: staging instructions
1. Import `ATSH_AI_customer_journey_ingest.json` into the **new** n8n instance. The workflow starts **inactive** and contains **no passwords or personal data**.
2. In the webhook node create a **Header Auth** credential: name `Authorization`, value `Bearer <unique-secret>`. Use a newly generated, long secret, stored only in n8n credentials and Coolify; never paste it in GitHub or chat.
3. Execute `n8n_inbound_schema.sql` on **n8n's own PostgreSQL database only**; create a PostgreSQL credential inside n8n with access restricted to `public.atsh_inbound_events`, and select it in “Store Once in n8n Postgres”.
4. Test on the **test** webhook URL with a synthetic event (e.g., `contract.signed` carrying only dummy numeric IDs). Verify a `202` response and one row inserted; repeat using the same key and verify `inserted=false` and **no second row**. Invalid Authorization must yield 401/403, and malformed envelopes must never be stored.
5. Activate the workflow only after tests. Use its **production** webhook URL: `https://n8n.atsh-ai.com/webhook/atsh-journey`. Only then configure `ATSH_N8N_EVENT_URL` and `ATSH_N8N_EVENT_TOKEN` in the ATSH **backend** Coolify environment, and redeploy the backend.
6. Trigger a harmless customer-journey test from the platform, confirm exactly one event in the inbound table and `delivered` in ATSH's `customer_event_outbox`. **No production financial or email automations** until independently reviewed and approved.

## Operational limitations
This workflow **receives, authenticates, validates and durably deduplicates** events. It does **not** generate customer messages, change project status, call AI models, deploy code, or mark payments. Downstream workflows must consume these stored events under least-privilege service accounts and implement their own action-level idempotency, retries, audit and human approval gates. The ATSH platform DB remains the source of truth.

## Verification checklist
- Coolify n8n + PostgreSQL healthy, TLS valid and login private.
- n8n encryption key and PostgreSQL backup/restore tested.
- Test webhooks succeed and unauthorized events fail.
- Duplicate event writes exactly once.
- ATSH event-outbox dispatch completes without lost or duplicated business actions.
- No ATSH existing data, domain routes, containers or repositories replaced.
