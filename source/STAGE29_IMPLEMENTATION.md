# Stage 29: streamed private video uploads

- Streaming upload to disk through Next.js proxy and Express; maximum 512 MiB; does not buffer file in application memory.
- MIME allowlist plus binary signature verification; invalid uploads removed.
- Existing project ownership checks for downloads and draft-only upload restriction preserved.
- No migrations required for this change.

## Deployment dependencies and limits
- Configure reverse proxy request size >= 512 MiB and adequate timeouts, disk space and persistent ATSH_PRIVATE_FILES_DIR.
- Server antivirus scanning, resumable uploads, orphan cleanup and object storage are not implemented.
- External payment, n8n, Forgejo, OAuth and full database integration remain unverified. This is NOT a 100% completion claim.
- Test with real PostgreSQL, browser uploads, interrupted uploads, and Next.js production build before release.
