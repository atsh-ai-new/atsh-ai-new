# Stage 3: Admin journey UI

- Added admin journey project listing endpoint (role-restricted).
- Added internal journey management tab to existing admin navigation.
- Staff can create journey projects, inspect saved messages, and request AI guidance via existing stage 2 API.
- Does not expose customer-facing assistant, alter pricing, execute n8n, or deploy.
- Requires PostgreSQL journey tables and OPENAI_API_KEY / OPENAI_MODEL on backend.
- Production verification and integration tests still pending.
