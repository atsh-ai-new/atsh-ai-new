# Content Studio — n8n integration contract

Configure backend environment N8N_AD_APPROVED_PLAN_URL (production webhook URL) and N8N_AD_APPROVED_PLAN_TOKEN (secret). HTTPS required in production unless explicitly permitted internal HTTP to n8n.

1. Webhook POST with Header Auth Authorization: Bearer <configured token>. Receive JSON production plan (approved=true, campaign, brand, scenes, voiceover, musicAndSound, cta, postProduction), jobId, callbackPath, callbackToken, optional logoBase64 PNG and audioBase64 MP3.
2. Respond to Webhook immediately with HTTP 202 JSON {"accepted":true}, within 15 seconds. Continue execution after response.
3. Generate scenes, narration and music as appropriate; render final MP4 with requested scene durations and captions. Configure provider credentials in n8n, not frontend. Do not invent claims. Use supplied assets where present.
4. HTTP Request POST to trusted ATSH backend base URL + callbackPath. Authorization: Bearer <callbackToken>. Content-Type: video/mp4. Send binary MP4 as raw request body, not multipart or JSON. Maximum 25 MiB.
5. On production failure, POST to same callback with same token, Content-Type application/json, body {"status":"failed"}. HTTP 409 means attempt expired or already completed; do not retry production automatically.
6. Keep callback token confidential; restrict execution log access. Production attempts expire after two hours when draft is reopened. Never send credentials to browser.

Acceptance: submit direct brief, approve, produce, verify 202, close/reopen browser, finish n8n job, verify video_ready and play/download. Test invalid token, duplicate callback, failure callback, oversized/invalid MP4 and restart during n8n execution. The actual video providers and n8n nodes are deployment work; this contract does not implement them.

## Cartoon studio (local CPU production)

The cartoon workspace is separate from the legacy advertising mode. Local
planning uses editable campaign templates; the optional OpenAI analysis uses
the existing configured text model after explicit consent. Local speech uses
one Arabic MSA base voice with pitch/speed/intonation variations.

Deploy the private character engine and the separate authenticated n8n
workflow before enabling production. Set `N8N_CHARACTER_PLAN_URL`,
`CHARACTER_SERVICE_URL` and `CHARACTER_SERVICE_TOKEN` in the backend's secret
runtime environment, in addition to the existing advertising webhook token.
The API and n8n must reach the engine over an internal network; do not expose
the engine or its token publicly. Preserve the API's existing database and
proxy network connections during redeploys. The workflow must accept an
approved animation plan, acknowledge within 15 seconds, perform the voice,
timeline, scenes and master stages, report progress, and deliver the actual
MP4 via the existing signed result callback.

The deployed local mode uses preset backgrounds and 2D characters at
1080x1920. Experimental workstation diffusion is not included in this
release. The four-character, 16-second local production test completed the
real authenticated n8n webhook, returned H.264/AAC MP4, and saved the callback
to the content-studio database. No image/audio generation API was used.

## Server-side layered animation studio (2.5D)

This is an additional CPU-only production route. Existing projects and the
workstation portrait tool remain readable. New manual projects select
`animation.renderer = "layers-v1"`. The engine uses prepared WebP artwork,
transparent rig layers, pose sets and separately named wardrobe sets; it is
not generative full-body video from a single photograph. The mouth follows
speech amplitude, not a phoneme model. Door states crossfade and vehicle
sprites move; high-quality results need aligned transparent artwork.
User assets remain in the existing database, independent project snapshots,
with the existing 3.4 million encoded-character project budget. A library
entry permits eleven human/animal pose slots and up to three additional
outfits, subject to that same size budget. Music/effects accept WAV or MP3
up to 1 MB each. Use licensed artwork and recordings.

### Rollout (staging first)
- Apply the backend image and its additive music-kind migration. Preserve
  the database and all current service secrets.
- Generate a new random 32-byte hex `LAYERED_WORKER_TOKEN`; configure it on
  backend and worker. Deploy `layered-worker/compose.yaml` alongside the
  backend on its **private** Docker network; set `ATSH_API_URL` to the
  internal backend origin (e.g. `http://backend:3000`). Join the existing
  network via the deployment-specific compose override. Do not expose
  worker ports or share the token with browsers. The existing local Arabic
  voice service remains required. No GPU or paid API calls by this renderer.
- Use a staging administrator to verify library create/read/update, saved
  projects, approval, queue claim, heartbeat/cancel, result callback and
  MP4 download; verify other portal paths separately.
- Test the available CPU and RAM before increasing scene duration or
  concurrency. Worker defaults to 2 CPUs / 2 GiB. Existing timeout policies
  apply; heartbeat refreshes actively running work.

### Distinct, locally synthesized accents
The ten voice identities are **Egyptian, Alexandrian, Saidi, Saudi and Gulf,
male and female** plus the existing MSA voice. Do not mark an identity ready
until a genuine model has been sourced, tested with native speakers and
licensed for this deployment. No accent or gender fallback is used.
`dialect-voice-engine/` is a private CPU Piper adapter, not bundled model
weights. Each identity requires an ONNX model and its matching .onnx.json
configuration; a multivoice model may use distinct verified speaker IDs.
Set read-only `VOICE_MODELS_DIR` and `VOICE_MODELS_JSON` mapping approved IDs
to model filenames (optional integer speaker). For example, the deployment
operator can configure a **verified** Egyptian female model under the key
`egyptian-female`. Never rename a generic MSA model to a regional voice.
Deploy on the same private network. Configure the backend
`CHARACTER_DIALECT_SERVICE_URL`, `CHARACTER_DIALECT_SERVICE_TOKEN` and
`CHARACTER_DIALECT_VOICES` (JSON array matching the installed models).
The provider exposes authenticated GET /voices and POST /voice-preview;
the backend allowlist and live provider registry jointly control UI availability. Dialect models preserve
their own pitch/intonation, with only playback speed adjustable.
No model downloads or paid cloud service calls are made automatically.

### Tests
From source: run backend tests (using Node 22+) and TypeScript check; from
layered-worker, run `python -m unittest -v test_render` with Pillow and FFmpeg.
The render test creates synthetic artwork/audio and verifies the actual
1920×1080 MP4 containing two scenes and an audio stream. No production
media or secrets are needed. Actual server and regional voice models still
require staging certification before deployment.
