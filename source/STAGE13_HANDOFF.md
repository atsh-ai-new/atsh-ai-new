# ATSH AI Stage 13 — commercial review and signature

Added commercial migration loading on API boot (Stage 12 was not loaded by original server), immutable contract snapshot issuance, quote revision (new record), quote issuance, expiring single-use random review links, public quote/contract review, explicit typed-name consent, signing evidence, printable customer page, and Next.js API proxy.

Admin workflow: create quote -> issue quote -> create contract template -> issue contract -> create review link -> send token privately to verified customer -> customer reviews/prints/accepts and signs. Customer token is single use and expires in 7 days. Never log token or put it in query string.

IMPORTANT: typed-name signature is an evidence-capture prototype, NOT verified qualified electronic signature or a legal compliance certification. Independent identity verification and locally applicable legal validation required. Payment remains unimplemented and never marked paid. No actual Git/ZIP delivery yet.

Deployment: compare migrations with production DB, backup before migration, run Postgres integration tests, verify reverse proxy origins and rate limits, perform full Next.js build, security audit and E2E test. Never overwrite newer production server.
