# Stage 36 — Agent manifest pre-publication gate

Added `backend/src/agent-manifest-gate.js` and tests. `applyReviewedManifest` now checks the generated manifest before any Forgejo API calls, rejecting known secret file names, likely embedded credentials/private keys, binary content and unreviewed file extensions. This is a **heuristic safeguard**, not a complete malware/security scanner or substitute for human approval.

Run `cd backend && node --test test/*.test.js` and configure Forgejo credentials only in server environment. No credentials are included.

**Still required:** an actual coding-agent workflow, sandboxed build/test runner, review/approval integration, preview deployment, live n8n/Forgejo/PostgreSQL tests, payment provider integration, e-signature compliance, Next.js build and end-to-end UI checks. No production deployment was performed.
