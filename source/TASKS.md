# ATSH AI platform task log

Update this list whenever an implementation, integration, or deployment state changes.

## Current status — 2026-11-12

- [x] Implement and commit Content Studio locally on `codex/content-studio` (`b6f8f6a`); working tree is clean.
- [x] Pass frontend typecheck/build, backend check, and `git diff --check`; no end-to-end video run yet.
- [x] Configure the internal API's AI/n8n environment names and confirm the existing n8n workflow is active.
- [x] Fix local TXT/MD/CSV analysis: accept common Arabic text encodings and pass decoded text to the AI API.
- [ ] Complete secure authentication to Forgejo and push the branch. A scoped replacement token exists for `atsh-ai/atsh-ai-platform`; the terminal credential prompt has not accepted it.
- [ ] Open the internal PR, assign `atshpana`, and wait for required security/build checks and independent review.
- [ ] Deploy only after the PR gates pass, then verify one approved Content Studio job returns an MP4.
- [ ] Revoke the temporary Content Studio repository tokens after the internal publish flow is complete.

## Implemented locally

- [x] Arabic-first branded landing page, EGP package cards, configurator, VAT breakdown, and customer request submission.
- [x] Authenticated `/admin` workspace for content, packages/options, colors/VAT, orders/assignment, team accounts/roles, and audit history.
- [x] Package and option creation/editing in the admin UI, including copied option templates and soft publication/deactivation controls.
- [x] Public package cards/catalog driven from the API, including dynamic package IDs, card features, custom quotes, and package-specific add-ons.
- [x] Public home-page content and theme/VAT settings connected through a same-origin API proxy.
- [x] Added a page and card editor for the home page and future pages: reorderable text/card sections, editable benefit/process/FAQ/trust cards, visibility, alignment, columns, and per-section colors.
- [x] Added an empty, published `/works` portfolio page with admin-managed projects, publication toggles, optional cover images, client/category/details, links, and ordering.
- [x] Added dynamic Arabic pages that can be created as drafts, edited in the admin, and published from the page selector; published pages appear in the public navigation.
- [x] Extended branding controls with logo, homepage hero and site background image upload/preview, Arabic font selection, card corner radius, and existing colors. Uploaded images are stored as PostgreSQL `bytea` records and served through a same-origin media proxy.
- [x] Expanded editable copy fields to cover home page wizard instructions, labels, quote/review panels, customer form messages, and public contact links while retaining the current defaults.
- [x] Additive database migration for card tagline/featured/custom-quote fields; package and copied option creation is transactional and audited.
- [x] `npm run typecheck`, `npm run build`, `npm run check` in the API, and `git diff --check` pass for the current local CMS changes. No test suite was run.
- [x] Cloudflare Email Routing has four active aliases (`info`, `sales`, `support`, `admin`) forwarding to the verified Gmail destination `atshpana@gmail.com`.
- [x] Built a manual customer-email composer in the admin inbox; server sends only to the email saved on the selected customer order and logs the subject/recipient in the audit trail.

## Production state

- [ ] Publish the new admin Content Studio after source review and server configuration; preserve the existing site, users, packages, and customer data.
- [x] Configure `OPENAI_API_KEY`, `OPENAI_MODEL`, `N8N_AD_APPROVED_PLAN_URL`, and `N8N_AD_APPROVED_PLAN_TOKEN` in the Coolify API service environment; keep secret values out of Git and chat. Coolify contains production and preview entries; these settings are not active in the running container until the reviewed code is deployed.
- [x] Confirm the n8n workflow is active and its `Approved plan from platform` webhook uses the `Header Auth account 2` credential at `/webhook/atsh-approved-ad-plan-v1`.
- [ ] After publishing the reviewed Content Studio release, run its first approved production job and verify that n8n returns an MP4.
- [ ] After the Content Studio is complete, connect the custom-package domain field to a live availability/search provider. Keep domain purchase disabled until provider, price, and registrant confirmation are ready.

- [x] 2026-11-10: Fixed the returning “Coming Soon” page. Two old website containers were stopped: the previously approved `atsh-website` resource and a second older container advertising the same apex/`www` host rules. The older container is preserved stopped for rollback; verified both official hostnames now render the approved ATSH AI configurator.
- [x] Additive CMS release from merged PR #6 (`aa05b5996153152e01ae83d4fb50605f24d16d4c`) deployed to both the API and `atsh-website-v2` frontend in Coolify; both rolling updates completed successfully.
- [x] Both `atsh-ai.com` and `www.atsh-ai.com` render the new ATSH configurator after correcting the Coolify domain route and purging the Cloudflare cache.
- [x] Production `/admin` route loads the ATSH AI sign-in page.
- [x] Preview previously returned the live EGP package catalog from the existing API.
- [x] Merge PR [#1](https://github.com/atshpana/atsh-ai-platform/pull/1) to `main` as commit `1d2b78c2c6a1ad4ed6a8f003469550e42fa4736b`.
- [x] Merge PR [#2](https://github.com/atshpana/atsh-ai-platform/pull/2) as `d4b910194268bfbe19be5cb596849a1486594b44`; API startup migrated existing package taglines and flags.
- [x] Production catalog returns `is_featured: true` for “موقع بإدارة محتوى” and `is_custom_quote: true` for “حل مخصص”.
- [x] Owner confirmed changing the admin password and signing in successfully. The deployed CMS includes protected content and theme controls.
- [x] Deployed the owner password recovery flow: it uses a rate-limited, 15-minute, single-use code; while Brevo sending is unavailable, the code appears only in private Coolify API runtime logs.
- [ ] Owner must initiate and complete password recovery directly in `/admin` if needed; do not request or store the code in chat.
- [x] Cloudflare Email Routing has four active aliases. The owner confirmed the Brevo activation email reached Gmail and a message to `info@atsh-ai.com` arrived; the other three aliases remain untested.
- [x] Added the four Brevo TXT/CNAME authentication records in Cloudflare with the owner's approval; Brevo verified all four and confirmed `atsh-ai.com` authenticated.
- [x] Owner completed Brevo phone verification and authorized reusing the existing restricted API key. The key is stored as `BREVO_API_KEY` in the Coolify API runtime environment and the API was redeployed; the key is not in Git.
- [x] Deployed the customer-email integration and configured `BREVO_API_KEY` in Coolify.
- [ ] Send a controlled outbound test message from the admin inbox and verify receipt; no outbound message has been sent yet.

## Content Studio — in progress

- [x] Added the Arabic admin workflow for source upload, AI brief/scene editing, approval, optional logo/audio, MP4 preview, and download.
- [x] Added additive draft storage and authenticated API routes for analysis, saving/review, workflow production, video retrieval, and audit events.
- [x] Connected source-file analysis to OpenAI Responses with structured output. The uploaded source is not stored in the platform database.
- [x] Matched the existing n8n workflow contract: version 1 approved plan, 1–4 scenes, optional PNG/MP3, returned MP4.
- [ ] Review the local implementation, then publish through Forgejo/Coolify without altering existing site content or records.
- [ ] Restore workstation access to the internal Forgejo repository and publish through its review/deployment pipeline without altering existing site content or records.
- [x] Add the AI and n8n settings to the internal API's Coolify environment and confirm the matching active n8n Header Auth configuration.
- [ ] Publish the reviewed Content Studio release to the internal API, then complete one approved production run and verify the MP4 response.

## Later: domain search for custom package

- [ ] After Content Studio completion, integrate a real domain lookup provider in the custom-package domain field and show live availability/pricing when available.
- [ ] Treat registration as a later explicit purchase step; an availability result does not reserve the domain.

## Safety and external integrations

- Preserve the existing PostgreSQL database, API secrets, and website A records. The five old forwarding MX records and root SPF were replaced for Cloudflare Email Routing and are documented in the mail setup task.
- Preserve the production database, API secrets, and website DNS. The owner later explicitly authorized stopping obsolete website resources; keep stopped containers available for rollback until the approved internal-Git migration is verified. Do not transfer the placeholder “Coming Soon” repository or branches as approved production work.
- Cloudflare Email Routing is enabled for inbound forwarding; the owner confirmed delivery to `info@atsh-ai.com`. The five Namecheap MX records were replaced, the root SPF was updated for Cloudflare, and website A records were preserved. Brevo DNS authentication and API-key setup are complete; one outbound delivery remains to be verified.
- A Messenger link exists; a live Messenger inbox still needs Meta Page/app access.
- Never store the owner's admin credentials in Git or repository files.
- Never store Brevo API keys in Git; keep them in Coolify's backend environment variables.
- CMS changes are additive: the `home` row is not reseeded or replaced, page updates merge/preserve unknown JSON fields, and portfolio data lives in its own `works` page record. Review that database writes and media uploads survive deployment before marking production verified.

## Current release deployment

- [x] Merge PR [#6](https://github.com/atshpana/atsh-ai-platform/pull/6) and deploy the page editor, dynamic page renderer, `/works` portfolio, branding controls, media proxy/storage table, and expanded editable copy from commit `aa05b5996153152e01ae83d4fb50605f24d16d4c`.
- [ ] Verify protected CMS save/reload and image upload in a signed-in production admin session. This release did not alter existing site content or upload a test image.

## After this release: internal server Git setup

- [x] Continue the existing `ai-tools/atsh-git` Forgejo/PostgreSQL/Runner stack; its containers are healthy and persistent storage remains attached.
- [x] Set `git.atsh-ai.com` as the only Forgejo route, remove the temporary `sslip.io` binding without deleting DNS, and redeploy. Forgejo startup logs report `ROOT_URL=https://git.atsh-ai.com/`; HTTPS responds and public registration remains disabled.
- [x] Confirm the configured Forgejo administrator account `atsh-admin` already exists. No password was read or copied.
- [x] Created the private organization `atsh-ai` and two empty private repositories: `atsh-ai/atsh-ai-platform` and `atsh-ai/atsh-ai-v2`. They have no README/license initialization, so original Git histories can be pushed intact.
- [x] Owner authorized a temporary token limited to repository read/write on those two repositories; revoke it immediately after migration.
- [x] Owner signed in to Forgejo as `atsh-admin`; public registration remains disabled.
- [x] Prepared and verified a one-branch Git bundle for the approved website working snapshot (`e0bed1e`); no unrelated branches or the `atsh-ai-v2` exploratory work were included.
- [ ] Import all active approved work and required Git history for both internal repositories into Forgejo. Preserve existing local working trees and changes. Exclude the “Coming Soon” source/repository and anything explicitly marked unapproved.
- [x] Delete the obsolete `atsh-ai-h/atsh-ai-landing` GitHub repository. GitHub confirmed successful deletion on 2026-11-10 after the owner completed sudo verification; the approved repositories were not touched.
- [ ] Configure server-side review, security scanning, tests, Forgejo Runner, and Coolify deployment sources for the migrated repositories.
- [ ] Remove GitHub from all source, CI, deployment, webhook, and local-remote paths after Forgejo workflows and production deployments pass verification. Do not leave GitHub as a required rollback or runtime dependency.
- [ ] Before deleting any remaining approved GitHub repository, present the exact target and obtain the required final confirmation because repository deletion is permanent.
- [ ] Resolve Git authentication for workstation-to-Forgejo pushes. A migration-token entry exists in Forgejo, but Git cannot authenticate from this workstation and the token secret is unavailable in the settings list.
- [ ] Request server access or credentials from the owner only if the existing connected access cannot complete setup; credentials should be entered directly in the server UI.

## Server cleanup

- [x] Stopped `manager_openhands` in Coolify project `ai-tools`; it is no longer running.
- [ ] Complete its permanent deletion after the owner enters the Coolify password in the open confirmation dialog. The owner approved deleting its two persistent volumes and configuration files; network deletion and global Docker cleanup are disabled.

## Current internal Forgejo migration — 2026-11-10

This entry supersedes the older migration checklist above; earlier entries remain as history.

- [x] Configure the private Forgejo repositories, protected branches, required review/check gates, and isolated runner.
- [x] Transfer the approved platform snapshot to main and keep the CMS changes on the separate codex/content-manager-review branch in PR #1.
- [x] Add Forgejo workflows for frontend typecheck/build, API syntax/dependency audit, and Semgrep. Checks passed on the prior commit and will rerun after this log reconciliation; the platform has no automated app test suite yet.
- [x] Reconcile the PR task and progress logs with main while preserving earlier history.
- [ ] Verify fresh checks on this commit and confirm the PR conflict warning is cleared.
- [ ] Obtain one independent review before merging PR #1.
- [ ] Migrate approved history and changes to atsh-ai-v2, preserving its worktree and excluding the Coming Soon/unapproved source.
- [ ] Cut over Coolify website/API sources to Forgejo and verify both official hosts and API health.
- [ ] After verified cutover, remove GitHub source/CI/deployment dependencies and revoke the repository-scoped migration token.

## 2026-11-11 — Internal site source parity
- [x] Confirmed `atsh-ai/atsh-ai-platform` is a separate private Forgejo repository; `main` is at `037ace239baa068630d7cfcc1cd326d6f0df3131` and matches the local website snapshot.
- [x] Compared source paths with GitHub `main` at `880c261fefef0d0df2ab6510fa2ffea7516f55a5`: all source paths are present internally; 25/33 source blobs are identical and 8 differ.
- [ ] Review differences in API routes, homepage, and global styles; retain internal API hostname support. Full byte-for-byte parity is not yet confirmed.
