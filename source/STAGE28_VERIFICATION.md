# Stage 28 verification and fixes

- Fixed operational guard bypass: admin `PUT /deliverables/:id/file` now checks `customer_deliveries` service control (as POST/PATCH do).
- Customer private-file downloads now stream from disk instead of buffering entire file in Express.
- Customer Next.js proxy now streams response bodies instead of buffering downloads; preserves content length and private/no-store headers.
- Disk file size is checked against database metadata before streaming.

## Remaining blockers
- Live PostgreSQL migrations, OAuth, AI, n8n, payment and Forgejo integrations cannot be verified without services/credentials.
- Full Next.js build and typecheck require installed npm dependencies.
- Backend raw upload still has a 25 MiB cap; large video upload and antivirus/retention remain outstanding.
- This is **not** a claim of 100% completeness.
