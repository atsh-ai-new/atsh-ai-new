# ATSH AI two-way notifications — implementation contract

## Delivery stages
1. Durable in-app inbox for each authenticated customer and team member, scoped by server-derived identity. Persist unread state, timestamp, actor and project link. No cross-tenant access.
2. Hook actual persisted customer/admin/team messages and project status changes to notification creation, inside the same transaction or a transactional outbox. Never claim a notification was delivered if only queued.
3. Browser Web Push via HTTPS, VAPID keys, service worker, permission requested after user action, per-device subscriptions, unsubscribe and expired endpoint cleanup. Customer and admin mobile supported.
4. Telegram adapter for the owner, disabled by default. Enable only after BOT_TOKEN and ADMIN_CHAT_ID are configured and a test delivery succeeds. Do not require a phone number in the application.
5. Badge counters, unread/read controls, deep links, per-project notification settings and retries; integration tests for privacy, permissions and duplicate delivery.

## Current scope
This branch contains database migration and pure validation helpers/tests only. No routes, message hooks, browser push delivery, or Telegram transport are wired yet. No notification is claimed to be live.

## Deployment prerequisites
Database migration; VAPID public/private key pair and subject; production HTTPS; service-worker scope; optional Telegram bot token/chat ID later. Never commit secrets.
