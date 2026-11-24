# Content Studio — n8n integration contract

Configure backend environment N8N_AD_APPROVED_PLAN_URL (production webhook URL) and N8N_AD_APPROVED_PLAN_TOKEN (secret). HTTPS required in production unless explicitly permitted internal HTTP to n8n.

1. Webhook POST with Header Auth Authorization: Bearer <configured token>. Receive JSON production plan (approved=true, campaign, brand, scenes, voiceover, musicAndSound, cta, postProduction), jobId, callbackPath, callbackToken, optional logoBase64 PNG and audioBase64 MP3.
2. Respond to Webhook immediately with HTTP 202 JSON {"accepted":true}, within 15 seconds. Continue execution after response.
3. Generate scenes, narration and music as appropriate; render final MP4 with requested scene durations and captions. Configure provider credentials in n8n, not frontend. Do not invent claims. Use supplied assets where present.
4. HTTP Request POST to trusted ATSH backend base URL + callbackPath. Authorization: Bearer <callbackToken>. Content-Type: video/mp4. Send binary MP4 as raw request body, not multipart or JSON. Maximum 25 MiB.
5. On production failure, POST to same callback with same token, Content-Type application/json, body {"status":"failed"}. HTTP 409 means attempt expired or already completed; do not retry production automatically.
6. Keep callback token confidential; restrict execution log access. Production attempts expire after two hours when draft is reopened. Never send credentials to browser.

Acceptance: submit direct brief, approve, produce, verify 202, close/reopen browser, finish n8n job, verify video_ready and play/download. Test invalid token, duplicate callback, failure callback, oversized/invalid MP4 and restart during n8n execution. The actual video providers and n8n nodes are deployment work; this contract does not implement them.
