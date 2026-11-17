# Stage 37 — Agent generation, isolated tests, preview request

## Implemented
- `backend/src/agent-project-pipeline.js`: OpenAI-compatible chat-completions adapter; generates JSON manifest, validates it through existing security gate, returns `awaiting_review`; explicit reviewer identity required before publishing approved manifest to Forgejo.
- `backend/src/isolated-project-tests.js`: Docker-only test runner with CPU/RAM/PID/time limits, read-only source, no network, no extra capabilities, and restricted workspace root. Requires a separate hardened Docker host; do NOT expose Docker socket to the web API. Dependencies must already exist in the project snapshot; no network installs in test container. Do not treat this as a full malicious-code sandbox (Docker daemon and kernel still need hardening).
- `backend/src/preview-dispatch.js`: HMAC-authenticated preview deployment request to a configured HTTPS webhook, and strict preview URL host validation. It does not deploy by itself.
- `backend/test/agent-project-pipeline.test.js`: six focused unit tests.

## Integration points still needed
1. Configure `CODE_AGENT_ENDPOINT`, `CODE_AGENT_API_KEY`, `CODE_AGENT_MODEL` on the agent worker, not browser. For localhost only, `CODE_AGENT_ALLOW_LOCAL_HTTP=true`.
2. Wire the existing approved execution jobs to agent generation -> human review -> Forgejo publish -> isolated test runner -> signed preview deployment webhook. Job transitions and retries must be persisted in PostgreSQL; do not bypass approvals.
3. Configure `PREVIEW_DEPLOY_WEBHOOK`, `PREVIEW_DEPLOY_SECRET` (>=32 chars), `PREVIEW_ALLOWED_HOST_SUFFIX`; implement the webhook receiver on deployment infrastructure, deploy an isolated staging container, and report its verified URL via authenticated callback.
4. Configure Forgejo environment as described in stage33. Never run untrusted generated projects on the main ATSH server.
5. Run real end-to-end tests against Forgejo, n8n, Docker, PostgreSQL and preview host; test frontend build separately.

## Verification
`node --test backend/test/*.test.js`: 95 passed / 95 total. JavaScript syntax checks passed. No external services or browser builds were exercised.

This is a **code integration candidate**, not a finished automated production deployment.
