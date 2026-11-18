# ATSH AI Platform

Arabic-first website builder and administration workspace for ATSH AI. This repository is intentionally separate from the existing `atsh-ai-v2` checkout.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Install the package dependencies with `npm install`.
3. Start the app with `npm run dev` and open `http://localhost:3100`.

The public site is available at `/`. The authenticated administration workspace is at `/admin`.

The `backend/` directory extends the existing ATSH API used by the Coolify service. Its idempotent startup migration creates the configurable content/theme/team tables and seeds the EGP packages and options when missing.

## Backend connection

The public configurator loads prices and options from the API, submits server-calculated customer orders, and the admin workspace authenticates against its cookie session. See [API integration notes](docs/API-INTEGRATION.md) for routes, roles, and the email limitation.

## Work tracking

- [TASKS.md](TASKS.md) tracks requested deliverables and blockers.
- [PROGRESS.md](PROGRESS.md) records findings and implementation updates.

## Deployment

The frontend and API are prepared for separate Coolify applications from this repository. The existing API application can keep its current database connection, environment secrets, service alias, and port while switching its source to `backend/`. See [deployment notes](docs/DEPLOYMENT.md).
