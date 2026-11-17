# ATSH API integration

The existing Coolify API service is `atsh-website-api` on the `coolify` Docker network, listening on port `3000`. Set the frontend's server-only `ATSH_API_BASE_URL` to `http://atsh-website-api:3000`. The frontend never receives the database URL or API secrets.

## Database initialization

`backend/db/schema.sql` is applied idempotently when the API starts. It adds page content, theme, team accounts, order assignment, option codes, and per-page pricing. It seeds the 1,000 / 2,500 / 6,000 EGP plans and their options only when those names are absent. It sets VAT to 14 only when the setting is unset. Existing orders and database credentials are preserved.

The schema requires PostgreSQL permissions already used by the current API, including `pgcrypto`. The API will fail to start if migration SQL fails, rather than serving a partially initialized catalog.

## Routes used by the platform

| Route | Purpose |
|---|---|
| `GET /api/catalog` | Published EGP packages and options, including stable option codes |
| `GET /api/site-content/home` | Published home-page text and public theme |
| `POST /api/orders` | Validates package/option IDs, per-page quantities, and stores the server-calculated price snapshot |
| `POST /api/admin/login` | Authenticates the existing owner account or a team member and sets an HTTP-only session cookie |
| `GET /api/admin/me`, `POST /api/admin/logout` | Session status and logout |
| `/api/admin/packages`, `/api/admin/options` | Read, create, edit, or deactivate catalog entries |
| `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status` | View customer emails, update status, and assign active team members |
| `POST /api/admin/orders/:id/email` | Send a manually composed message to that order's customer through Brevo; owner/admin/sales only |
| `GET /api/admin/email-status` | Show whether the outbound provider is configured and which official address is used |
| `GET/PATCH /api/admin/pages`, `/api/admin/pages/:slug` | Read and publish page content |
| `GET/PATCH /api/admin/settings` | Manage theme colors and VAT |
| `/api/admin/team` | Create, update, and deactivate role-based accounts |
| `GET /api/admin/audit` | Review administrative changes |

The owner login uses the existing Coolify-only `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `JWT_SECRET`. Roles are `owner`, `admin`, `editor`, `sales`, and `viewer`; team accounts use bcrypt password hashes and are rechecked for active status on every request.

## Origin and email

Add the final frontend HTTPS origin to the existing API's comma-separated `ALLOWED_ORIGINS` value before enabling admin writes. Keep all existing allowed origins when adding it. Do not expose `DATABASE_URL`, password hashes, or JWT secrets to the browser.

Customer submissions are stored with the supplied email address and shown in the authenticated admin inbox. Cloudflare Email Routing forwards `info@`, `sales@`, `support@`, and `admin@atsh-ai.com` to `atshpana@gmail.com`; the owner confirmed delivery to `info@`, while the other aliases have not been individually tested. The landing page links the general, sales, and support addresses; admin remains internal. Email Routing handles inbound forwarding only.

The backend has a Brevo transactional-email adapter for owner/admin/sales staff to compose messages to a saved order contact. It uses server-only variables `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (defaults to `info@atsh-ai.com`), `BREVO_SENDER_NAME` (defaults to `ATSH AI`), and `BREVO_REPLY_TO` (defaults to `sales@atsh-ai.com`). No API key belongs in the repository or frontend. Brevo verified `info@atsh-ai.com` and the owner authenticated `atsh-ai.com` after the four DNS records were added. Sending remains disabled until the owner completes Brevo's required phone verification and adds the API key directly to the API service in Coolify. Password-reset codes will be sent to `admin@atsh-ai.com` when the provider works; otherwise the existing private Coolify log fallback stays available. Team accounts are created directly and their temporary passwords must be shared through a separate secure channel.
