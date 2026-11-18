# Stage 33 — Forgejo provisioning adapter

Added `backend/src/forgejo-client.js` and `backend/test/forgejo-client.test.js`.

- `ensureProjectRepository` looks up a repository first, creates it only on 404, with `private:true` and `auto_init:true`, and handles concurrent 409/422 responses by re-reading.
- `forgejoConfig` reads `FORGEJO_URL`, `FORGEJO_TOKEN`, `FORGEJO_OWNER` from the process environment; HTTPS is mandatory except explicitly permitted internal HTTP hostnames.
- The adapter is **not yet wired to the n8n workflow or project execution worker**. It does not generate code, commit files, run tests, deploy previews, or process payment/signature events.
- IMPORTANT: The Forgejo org endpoint assumes `FORGEJO_OWNER` is an organization; personal-user repositories require a separate endpoint. Configure an organization owner.
- Test result: 73/73 backend unit tests passed; JavaScript syntax check passed. No live Forgejo, PostgreSQL, Next.js, or end-to-end tests were performed.

Next integration: add a trusted sandboxed executor service, bind approved job payloads to an internal repo naming policy, use this adapter with a restricted Forgejo service token, and send signed status callbacks. Do not execute arbitrary client-supplied shell commands.
