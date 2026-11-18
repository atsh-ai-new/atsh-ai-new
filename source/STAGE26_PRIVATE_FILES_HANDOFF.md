# Stage 26 — Private deliverable upload/download foundation
- Admin: `PUT /api/admin/deliverables/:uuid/file` raw body, Content-Type one of MP4/WebM/PNG/JPEG/WebP/PDF/ZIP, max 25 MiB. Deliverable must be draft. Admin auth and origin checks inherited. Upload writes to private volume; DB metadata references random storage key.
- Customer: `GET /api/customer/deliverables/:uuid/file` requires verified active customer session, published status and ownership of linked project. No public asset URL is returned for this file endpoint.
- Migration: `backend/db/private_deliverable_files_stage26.sql`.
- Set `ATSH_PRIVATE_FILES_DIR` to a persistent directory shared with backend container only, writable by its UID; back it up together with DB. Do NOT mount it under Next.js public/ or expose via Traefik.
- Limitations: no UI file picker yet, no malware scanning, no S3/object storage, old files on replacement are not garbage-collected, existing public asset_url path remains and should not be used for confidential files. Max 25MiB unsuitable for many production videos. End-to-end tests and full build not executed.
- No server/Git deployment performed.
