# Coolify deployment

This project uses the existing official frontend application and API application in the ATSH AI production environment.

## Existing API application

Update the current `atsh-website-api` application to use this private repository and branch `main`, with base directory `/backend`, Dockerfile `/Dockerfile`, and port `3000`. Keep its database connection, admin secrets, persistent settings, `coolify` network, and internal alias `atsh-website-api` unchanged. The startup migration is backward-compatible and seeds the empty EGP catalog.

Append `https://atsh-ai.com` to `ALLOWED_ORIGINS` while preserving all current origins. Redeploy the API application so admin login and writes accept the same-origin proxy.

## Internal preview frontend application

Keep this internal preview separate from the official hostname. Set its Git source to this private repository and branch `main`, then use the repository-root Dockerfile and port `3000`. Set the server-only variable:

```text
ATSH_API_BASE_URL=http://atsh-website-api-internal:3000
```

The Next.js route handlers proxy browser requests to the internal API and preserve the admin session cookie. The internal hostname is explicitly allowlisted for production HTTP routing. No database credential or admin secret belongs in the frontend app. Keep the official hostname on the existing production application until review, source transfer, and internal pipeline checks are complete.

## Operational notes

- Start with the API application so its schema migration and catalog seed finish before publishing the frontend.
- Check `/api/health` on the API service and confirm `/api/catalog` returns four plans and their options.
- The existing admin owner logs in using the credentials already held in Coolify. Create staff accounts from `/admin`; share each temporary password through a separate secure channel.
- Customer emails are stored with orders and shown in the admin inbox. Outbound notices and email invitations require an SMTP/mail provider, which is not currently configured. DNS currently publishes registrar forwarding MX/SPF records; this does not confirm a usable mailbox or SMTP credentials.
