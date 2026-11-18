# Progress log

## 2026-11-12 — Text-file upload repair

- Found that the source-file validator rejected every TXT/MD/CSV containing a zero byte, which can occur in UTF-16 text files. It also sent plain text as a binary `input_file` to the AI endpoint.
- Updated the local Content Studio API to decode UTF-8, UTF-16, and legacy Windows-1256 text, then send TXT/MD/CSV content as text for analysis. Text over 100,000 characters receives a clear size message.
- The fix is local on `codex/content-studio`; it has not been checked by CI or deployed. Do not tell the owner the production upload is repaired until the change is reviewed, deployed, and confirmed.

## 2026-11-12 — Current Content Studio status

- The Content Studio implementation is committed locally on branch `codex/content-studio` at `b6f8f6a` (`feat(admin): add content studio workflow`); the working tree is clean.
- Verification passed: frontend typecheck/build, backend check, and `git diff --check`. No end-to-end video job was run.
- The internal Coolify API has the AI/n8n environment variable names configured, and the existing n8n video workflow is active with its approved-plan webhook. Secret values remain outside Git and chat.
- Publishing is still blocked. Forgejo rejected the earlier write-only token; a replacement was scoped to `atsh-ai/atsh-ai-platform` with the repository Read and write choice. The Windows terminal input path did not reliably submit credentials, so the corrected credential has not been validated.
- No Content Studio pull request was opened, no production deployment occurred, and the current public site/API were not changed by this attempt.
- Next: establish a working secure Forgejo authentication path, push `codex/content-studio`, open a PR to `main`, assign the independent reviewer, wait for required checks/review, then deploy and verify an approved n8n video run.

## 2026-11-11 — Content Studio and domain-search queue

- Added a protected admin section for uploaded campaign files, manager notes, a detailed Arabic production brief, editable scenes/brand/voiceover, draft approval, optional logo/audio, MP4 preview, and downloads.
- Added additive PostgreSQL storage for draft plans and generated MP4s, plus authenticated routes for OpenAI Responses analysis, save/review, n8n production, video retrieval, and audit events. Source files are not stored in the platform database.
- Matched the local n8n workflow contract in `tools/n8n-video-ad`: approved version-1 plan, 1–4 scenes, optional PNG/MP3, and MP4 response from `atsh-approved-ad-plan-v1`.
- Work is local and not yet deployed. Read-only inspection of both `atsh-website-api` and `atsh-website-api-internal` confirmed the four AI/workflow variable names are absent: `OPENAI_API_KEY`, `OPENAI_MODEL`, `N8N_AD_APPROVED_PLAN_URL`, and `N8N_AD_APPROVED_PLAN_TOKEN`.
- Forgejo source is configured as the `internal` remote, but the workstation cannot currently connect/authenticate to `git.atsh-ai.com`; changes have not been pushed or deployed. No Coolify setting was changed and no secret value was opened.
- Before enabling production, set the backend secrets in Coolify and confirm the existing n8n Header Auth credential expects `Authorization: Bearer <token>`.
- Queued per owner's order: after Content Studio is completed, connect the custom package domain field to a live search/availability provider; registration is a separate later step.

## 2026-11-09

- Expanded the admin catalog editor: create/edit/publish packages, edit card taglines/features/order/featured state, copy option sets into new packages, and create/edit/deactivate price options.
- Made the public catalog render published packages and card features from the API, including newly created package IDs and custom-price packages.
- Added selection and live pricing for package-specific options, including per-page, monthly, and yearly charges.
- Connected published home-page copy, brand colors, and VAT settings through a new same-origin `/api/site-content/[slug]` proxy. Public quote VAT now follows the API setting.
- Added additive database columns for package tagline, featured state, and custom-quote state. Package plus copied option creation is transactional and audited.
- Verification passed: `npm run typecheck`, `npm run build`, `node --check backend/src/server.js`, and `git diff --check`.
- Confirmed on both official hostnames that the new homepage loads. `/admin` opens the ATSH sign-in page. Owner login and protected admin writes have not been exercised; credentials remain for the owner to enter.
- PR [#1](https://github.com/atshpana/atsh-ai-platform/pull/1) was merged to `main` as commit `1d2b78c2c6a1ad4ed6a8f003469550e42fa4736b`.
- Earlier live check found the apex serving a stale “Coming Soon” page. Coolify's apex domain route was saved, DNS was rechecked, and the Cloudflare cache was purged; a fresh check now confirms the new configurator on both `atsh-ai.com` and `www.atsh-ai.com`.
- PR [#2](https://github.com/atshpana/atsh-ai-platform/pull/2) added a one-time package metadata migration and was merged as `d4b910194268bfbe19be5cb596849a1486594b44`.
- Redeployed the API at `d4b9101`; production `/api/catalog` now returns the expected package taglines, featured state for “موقع بإدارة محتوى”, and custom-quote state for “حل مخصص”.
- The owner completed Coolify sign-in. The owner later confirmed changing the `/admin` password and entering the administration successfully. New CMS writes remain pending deployment verification.
- Found and implemented the admin password recovery path. The deployed flow uses a rate-limited owner-only, 15-minute one-time recovery code, a persisted password override, single-use redemption, and prior-owner-session revocation.
- Owner asked to finish this release using the current GitHub/Coolify setup first. Afterward, create and configure an internal Git repository and review/deploy pipeline on the server, then stop using GitHub for future work.
- Found the owner's existing `ai-tools/atsh-git` Forgejo stack with PostgreSQL and CI Runner; it already reserves `git.atsh-ai.com` and is stopped. Review its access controls and continue this stack rather than deploying a second service.
- A duplicate stopped Forgejo draft `atsh-ai-git` was created in the ATSH AI project but remains unused; do not deploy it while the existing `atsh-git` resource owns the requested domain.
- Stopped `manager_openhands` at the owner's request. The owner approved deleting the application, persistent data, and configuration; Coolify still requires the owner to enter their password and submit the final confirmation.
- 2026-11-09: Cloudflare Email Routing has four active aliases (`info@`, `sales@`, `support@`, and `admin@atsh-ai.com`) forwarding to `atshpana@gmail.com`. The owner confirmed receiving Brevo's activation message in Gmail and a message addressed to `info@`, verifying delivery for that alias. The other three aliases have not been individually tested. The old Namecheap MX records were replaced, Cloudflare routing SPF is set, and website A records were preserved.
- 2026-11-09: The owner created and activated a free Brevo account, then verified the sender `info@atsh-ai.com`. Brevo required domain authentication and phone verification before initial sending. The four authentication records were subsequently added and the domain was authenticated in Brevo. The other three forwarding aliases have not been individually tested. No outbound message has been sent.
- 2026-11-09: Added Brevo's domain-code TXT, two DKIM CNAMEs (DNS only), and monitoring-only DMARC record to Cloudflare after the owner's approval. Brevo verified all four records and confirmed the domain is authenticated; it notes DNS-side completion may take a few hours to 48 hours. MX, SPF, and website A records were preserved.
- 2026-11-09: API deployment from `3b1e2fb241c9397141f3a1c8cdc7b5c5a306a909` succeeded. The frontend's TypeScript email-status assignment was fixed by explicitly mapping and defaulting the three `EmailStatus` fields. PR #5 was merged as `dad459573052ace49ed39f0a765e5a815205c37`; the production frontend build and rolling update succeeded.
- 2026-11-09: After saving the apex domain route and purging Cloudflare cache, confirmed both official hostnames serve the new Arabic configurator. `/admin` loads the ATSH AI sign-in page.
- 2026-11-09: The owner completed Brevo phone verification and authorized reusing the existing restricted API key. It is stored as `BREVO_API_KEY` in Coolify's API runtime environment; the API redeployment succeeded. No outbound test message has been sent yet.
- 2026-11-09: Resumed the existing internal `ai-tools/atsh-git` Forgejo/PostgreSQL/Runner stack. Set its only route to `https://git.atsh-ai.com`, removed the temporary `sslip.io` binding without deleting DNS, and redeployed. Forgejo is healthy and startup logs report the official HTTPS `ROOT_URL`; public registration remains disabled. Confirmed the configured `atsh-admin` account exists without reading its password.
- 2026-11-10: Owner signed in to Forgejo. Created private organization `atsh-ai` and empty private repositories `atsh-ai/atsh-ai-platform` and `atsh-ai/atsh-ai-v2`, with no starter commits. Owner authorized a temporary token limited to repository read/write on those two repositories; Git transfer and immediate token revocation are in progress.
- 2026-11-09: Audited both local Git boundaries before migration. `atsh-ai-v2` has divergent local/remote history plus uncommitted sandbox/HAI changes; `atsh-ai-platform` has an active admin/CMS branch and uncommitted CMS edits. Preserve both worktrees and migrate their histories and working changes separately; do not overwrite either from GitHub `main`.

## 2026-11-10

- Fixed the “Coming Soon” page returning on the official domain. The approved app container was healthy and serving the new homepage, but an older container also advertised `atsh-ai.com` and `www.atsh-ai.com` to Traefik. Stopped the duplicate older container and the previously approved obsolete `atsh-website` resource; kept the stopped container recoverable and did not remove application data or repositories.
- Verified directly through the server proxy that both official hostnames now return the approved ATSH AI configurator; opened `https://atsh-ai.com/` in a fresh browser tab and confirmed the live Arabic configurator, EGP pricing, package cards, and custom price builder.
- Migration scope follows the owner's latest direction: move all active approved work into internal Forgejo; exclude the Coming Soon source and anything explicitly marked unapproved. Mapped the old Coolify app to GitHub `atsh-ai-h/atsh-ai-landing` on `main`; Coolify shows the app as Exited and `atsh-website-v2` remains the approved service.
- Prepared and verified a filtered Git bundle for only the `atsh-ai-platform` approved working snapshot (`e0bed1e55954a7c9adbfbf90afde714a7dbeb446`) and its reachable history. No unrelated branch, old landing repo, or `atsh-ai-v2` exploratory code is in the bundle; transfer to Forgejo is still pending.

## 2026-11-10 — Internal Git migration status

- GitHub confirmed successful deletion of `atsh-ai-h/atsh-ai-landing` after the owner completed account verification. The approved `atsh-ai-h/atsh-ai-platform` repository remains untouched.
- The internal Forgejo host is available at `https://git.atsh-ai.com`; private repositories `atsh-ai/atsh-ai-platform` and `atsh-ai/atsh-ai-v2` exist but are still empty.
- The verified filtered website bundle exists locally, but no push has completed. Both local repositories still have GitHub `origin` remotes, and the workstation has no usable Forgejo Git credential. An `ATSH local migration` token entry exists in Forgejo, but its secret cannot be retrieved from the token list.
- Owner clarified that all active work must move to the server and GitHub must cease to be a source, review, test, or deployment dependency. Internal review/security/test workflows and Coolify source cutover are not complete.

## Additive website CMS release (deployed)

- Added an admin page manager for the existing homepage cards plus draft/published custom pages. It edits page title and summary, card/text sections, order, visibility, alignment, columns, and section colors.
- Added the published `/works` page with an empty state and an admin portfolio editor for project cards, descriptions, client/category, image, external link, order, and publication state.
- Added same-origin public page discovery so published pages and the work log appear in the site navigation; added the dynamic page renderer for custom pages.
- Expanded the editable copy registry for the configurator's step titles/instructions, inputs, labels, quote panels, and footer links, retaining the current Arabic defaults.
- Added theme controls for logo, hero image and full-page background, fonts, card radius, and colors. Uploaded PNG/JPEG/WebP files up to 5 MB are stored as PostgreSQL binary records and served through a media proxy.
- All changes are additive: the existing `home` row and package/catalog/order tables remain intact; work records use a new `works` page and uploads use a new media table.
- Verification: `npm run typecheck`, `npm run build`, `backend/npm run check`, and `git diff --check` passed before publishing. No tests were run.
- 2026-11-09: PR [#6](https://github.com/atshpana/atsh-ai-platform/pull/6) merged as `aa05b5996153152e01ae83d4fb50605f24d16d4c`. Coolify successfully rolled out this commit to both `atsh-website-api` and `atsh-website-v2`; the API deployed first so its additive media table/routes were available to the frontend.
- 2026-11-09: Existing PostgreSQL data, homepage content, catalog, orders, and admin records were not reset or edited by deployment. Protected CMS save/reload and media upload still need verification from a signed-in production admin session; no test content or image was saved.

## 2026-11-08 deployment history

- Deployed backend and frontend resource `atsh-website-v2` in Coolify; API base is `http://atsh-website-api:3000` on the internal network.
- The preview app returned the EGP catalog. The official apex domain served the new Arabic ATSH page.
- Removed only the duplicate domain bindings from the obsolete Coolify frontend. DNS, MX/SPF records, database, and API secrets were left unchanged.
- Email forwarding/mailbox work remains stopped at the owner's request.

## Remaining constraints

- Confirm the new CMS's protected database writes and media upload after deployment. The owner already confirmed successful admin sign-in. Never place credentials in repository files.
- Create the internal Forgejo repository, review/test/deploy flow, and Coolify source integration. Stop using GitHub after the internal flow is verified.
- Customer order emails are stored in the platform inbox. Cloudflare forwards the four official aliases to Gmail; the owner has confirmed delivery to `info@`. Brevo API access is configured for outbound delivery, but an actual send remains unverified; live Messenger inbox access still needs Meta Page/app access.

## 2026-11-11 — Internal site repository check
Forgejo confirms the website repo is separate at `atsh-ai/atsh-ai-platform:main` and currently points to `037ace239baa068630d7cfcc1cd326d6f0df3131`, matching the local website snapshot. Against GitHub `main` (`880c261fefef0d0df2ab6510fa2ffea7516f55a5`), all source paths exist internally, 25/33 source blobs match exactly, and 8 differ. The major admin page/content-manager files match; API routes, homepage, and global styles remain to be reviewed. No files were copied or overwritten in this check.

## 2026-11-11 — Content Studio integration setup
- Confirmed the Coolify service `atsh-website-api-internal` now contains the four Content Studio settings (`OPENAI_API_KEY`, `OPENAI_MODEL`, `N8N_AD_APPROVED_PLAN_URL`, `N8N_AD_APPROVED_PLAN_TOKEN`) for production and preview. The OpenAI model is `gpt-6-luna`; secret values remain in Coolify and were not added to Git or chat.
- Confirmed n8n workflow `صناعه محتوى الفيديو` is active, its `Approved plan from platform` webhook is POST `/webhook/atsh-approved-ad-plan-v1`, and it has the `Header Auth account 2` credential selected.
- The feature code remains local and uncommitted on `codex/allow-internal-api-host`. The internal Forgejo host responds, but the workstation's saved Git credential is rejected/expired. Do not redeploy the API until this reviewed code is published; environment settings alone do not activate Content Studio in the running application.
- Remaining: reach Forgejo through the authenticated internal Git path, complete review and publish, then run one approved production job and verify the MP4 response.
