# ATSH AI — Safe Coolify connection to the existing PostgreSQL and backend
Last reviewed: 2026-11-17. Repository: `atshpana/atsh-ai`, **branch: `atsh-platform-rebuild`**.
This runbook intentionally does **not** delete, replace, unlink, or reset any live database or admin account.

## Critical fact: the GitHub repository has a `source/` monorepo directory
Configure Coolify as follows (Dockerfile build pack in both cases):

| Existing/new Coolify application | Git branch | Base Directory | Dockerfile Location | Internal port |
| --- | --- | --- | --- | --- |
| Existing API service `atsh-website-api` | `atsh-platform-rebuild` | `/source/backend` | `/Dockerfile` | 3000 |
| Separate private preview frontend | `atsh-platform-rebuild` | `/source` | `/Dockerfile` | 3000 |

Do **not** choose `main`, `/`, or `/backend`: those were stale instructions for an earlier layout. Coolify resolves Dockerfile Location relative to Base Directory.

## 0. Inventory / safety gate — before touching the active backend
1. From Coolify, identify the **existing** `atsh-website-api` application, its current branch/commit and assigned HTTPS domain, internal alias, network, environment variable *names* and source location. Record all configuration in a secure private backup; never commit API keys, JWT or DB URLs to Git and never paste them in chat.
2. Identify the **existing PostgreSQL** application/service and its persistent volume. **Keep the same database service, database name, user, `DATABASE_URL`, volume and network**. No fresh Postgres container or empty database should replace it.
3. Create a PostgreSQL backup using Coolify **Databases → [existing PostgreSQL] → Backups**. Verify the backup succeeded, then restore to a separate private test DB before treating it as rollback-safe. A filesystem/archive backup of Coolify itself is not a DB backup.
4. Capture a safe fingerprint of **row counts only** (not passwords, hashes or customer records) for `owner_password_overrides`, `team_members`, `site_pages`, `packages`, `orders`, and `customer_accounts` where available. Compare after upgrade. The owner password override and staff accounts live in PostgreSQL, while the configured owner identity, initial hash and JWT signing key are environment secrets.
5. Disable automatic deploy from this development branch for any production Coolify application until tests and approval are complete.

## 1. Safest validation (isolated staging before the existing API changes)
- Clone/restore the **verified backup into a private staging PostgreSQL** (access restricted to administrators), and deploy an isolated staging API from this branch to test migrations against a copy of the *actual* schema. Never point publicly accessible testing containers at a dump with live personal data.
- Keep staging API independent of the production domain. Use a separate alias and internal Docker network resolution; bind the staging frontend to an HTTPS preview hostname.
- Preserve all original `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET` *within the appropriate staging environment* if verifying an existing session/credential. Never replace production admin secrets to test the branch.
- Verify `/api/health` (backend), `/api/catalog`, login to `/admin`, edit one **unpublished** admin page or catalog, save, refresh, restart the staging API, sign in again, and confirm changes persist. Check the Admin Audit log.
- Also verify both new and old customer project records and the state of the historical contract templates. Avoid initiating real payments or sending emails in staging.

## 2. Upgrade the existing API in place (only after backup + staging pass)
Use the existing `atsh-website-api` Coolify application; **do not delete it**. Keep its networking, API hostname/alias, environment variables and persisted volumes unchanged. Update only:
- Git repository `atshpana/atsh-ai`, branch `atsh-platform-rebuild`.
- Build Pack `Dockerfile`, Base Directory `/source/backend`, Dockerfile Location `/Dockerfile`.
- Internal Port `3000`, network/alias `atsh-website-api` (or the original alias, if different).
- `DATABASE_URL` must be the original internal PostgreSQL URL (not a new database).
- **Preserve** `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, `COOKIE_SECURE=true`, `DATABASE_SSL`, any owner reset override stored in DB and all existing `ALLOWED_ORIGINS`.
- Add the private preview HTTPS origin to the comma-separated `ALLOWED_ORIGINS` while retaining the official origin `https://atsh-ai.com`. Avoid wildcard origins.
- The backend runs additive SQL at startup. **No schema rollback is guaranteed**. If an application rollback is needed, first assess DB compatibility; restoring the verified backup may be required.

Once approved, deploy **the existing API** and confirm health. This keeps the original admin password override/staff records in the existing database.

## 3. Preview frontend connected to that SAME API
Create or update a **separate preview frontend** Coolify application and give it its own HTTPS preview domain (not the production hostname). Use branch `atsh-platform-rebuild`, Base Directory `/source`, Dockerfile Location `/Dockerfile`, port `3000`.

Configure only this server-side frontend environment variable:
```env
ATSH_API_BASE_URL=http://atsh-website-api:3000
```
Replace `atsh-website-api` **only if the actual API network alias differs**. Place frontend on a Docker network where this alias resolves. The frontend should have **no** PostgreSQL URL, password hashes or JWT signing secret.

Admin uses a **same-origin Next.js proxy** (`/api/admin/...`), forwarding cookies to the existing backend.

The upgraded API uses a persisted **owner credential revision** to correctly invalidate sessions after a password reset without changing existing passwords. A browser may need to sign in once after upgrading because older JWTs do not carry the new revision; **the original password, owner override and staff records are retained**. Keep `COOKIE_SECURE=true` and valid HTTPS on the preview domain. A browser session may require a fresh sign-in when changing domains; that is not a password reset.

## 4. Persistence acceptance test (on the connected preview)
1. Log in at `https://<preview-host>/admin` using the **same existing administrator email/password**. Do not send credentials to ChatGPT.
2. Create or edit **unpublished** content (for example, an unpublished GPT FAQ draft or one hidden catalog entry). Save.
3. Reload the page and verify the draft remains. Log out, sign in again and verify it remains.
4. Restart **only the API application**, not PostgreSQL; verify the same admin credentials still work and the draft remains.
5. Publish a non-sensitive test catalog item, verify it appears in public `/catalog`, then hide it and verify it disappears. Compare DB row counts and audit history with the baseline.
6. Verify existing orders, customer accounts, and staff users remain; if something differs unexpectedly, stop and investigate rather than wiping or reseeding PostgreSQL.

The GitHub Actions PostgreSQL test `test/persistence-restart.mjs` also proves admin/employee credentials and CMS data survive launching a second backend against the same disposable database. **That does not replace this real-server acceptance test.**

## 5. Later, GPT (after DB/CMS are proven)
Set `OPENAI_API_KEY` and `OPENAI_MODEL` in the **backend Coolify environment**, never in the frontend or repository. Check admin-maintained `assistant-knowledge` records and published packages. Use a minimal read-only chat test and monitor `/api/admin/visitor-ai-usage`. Payment/hosting/n8n provider secrets remain separately gated; no automatic spending or deployment is authorized by the GPT output.

## Rollback
- Keep the old source commit/branch and working container/image noted before switching.
- If the new frontend fails, revert only the preview frontend; do **not** change or drop the database.
- If backend migration fails, **do not retry by replacing the DB**. Collect the sanitized Coolify runtime log and compare schema differences; restore an approved backup only after understanding intervening writes and recovery implications.
- Do not merge into `main` or replace the live domain during this validation.
