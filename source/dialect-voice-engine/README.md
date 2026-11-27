# Server dialect voices — staging runbook

Ten independent stable IDs: Egyptian, Alexandrian, Saidi, Saudi, Gulf;
each male and female. Neither pitch shifting nor relabeling one speaker is
a substitute for a separately reviewed dialect and identity. The existing
MSA provider remains separate. The browser sends the selected stable ID;
the private server synthesizes it. Scene audio is never sent to a cloud API.

## Candidates (not deployed or auditioned)

- Piper: Emirati female candidate, pinned upstream revision by the installer.
  Review its MIT metadata, original training-data provenance and speaker
  rights before approval.
- Audar Flash Q4_K_M: CPU GGUF, upstream AudarAI Open License v1.0
  permits commercial use subject to its conditions; preserve its license.
  Upstream supports Arabic including Gulf dialects, but specific regional
  accent and speaker quality must be checked individually. NeuCodec is a
  separate dependency; review its Apache-2.0 license, accept gated access
  and pin a reviewed revision. No noncommercial models are included.
- The other nine reference slots require distinct consented voices with
  matching transcripts, not fabricated dialect labels. If the Emirati
  candidate fails review, use an independently consented Gulf female
  reference and an Audar profile instead.

Sources:
https://huggingface.co/audarai/Audar-TTS-V1-Flash
https://huggingface.co/neuphonic/neucodec
https://huggingface.co/vadimbelsky/arabic-emirati-female-piper

## Staging, before production

1. Use an isolated host/maintenance slot with adequate disk and RAM.
   Install huggingface_hub in a staging Python environment. Run
   `python install_candidates.py /srv/atsh/voices` for the Piper candidate.
   For Audar append `--audar --codec-revision FULL_REVIEWED_REVISION`
   after authenticating to the model host and accepting the codec terms.
   Verify/download all codec transitive assets (including any semantic
   encoder weights needed by the installed codec) into
   `/srv/atsh/voices/hf` using that exact runtime during staging.
   The inference container uses offline mode with a read-only model mount.
   Never place tokens or recordings in Git.
2. Edit private profiles.json (the installer creates an example only
   if none exists). Obtain explicit permission for each reference voice's
   commercial synthesis use; record that approval privately. Provide a
   5–15 second clean mono PCM16 16 kHz WAV and exact transcript per Audar
   profile. Set commercialRights true only when actually authorized.
3. Set VOICE_MODELS_DIR and a fresh 64-hex CHARACTER_DIALECT_SERVICE_TOKEN
   via the deployment's private environment. Build the Piper service with
   `docker compose build`; for the experimental Audar runtime use
   `docker compose -f compose.yaml -f compose.audar.yaml build` and the
   same compose file options for subsequent commands. No host port mapping.
4. With a private writable output directory owned by UID 10001, run
   `docker compose run --rm -v /srv/atsh/auditions:/auditions dialect-voice python service.py --audition /auditions gulf-female`
   (same overlay options if using Audar). Repeat by voice ID. A speaker
   of the target dialect should review naturalness, identity/gender,
   pronunciation and dialogue, and measure time and memory on representative
   sentences. The code tests are not substitutes for listening or benchmarking.
5. Only after passing those checks set that profile's approved flag true.
   Restart the private service. Configure the ATSH API's
   CHARACTER_DIALECT_SERVICE_URL, matching secret and JSON array
   CHARACTER_DIALECT_VOICES of approved IDs. Verify the authenticated
   /voices and actual rendered video, and verify unavailable voices
   remain unavailable. Do not expose the private service publicly.
6. CPU limits are two cores, one inference at a time, 2 GiB (Piper)
   or 3 GiB (experimental Audar overlay). Actual resource use and timing
   have not been verified. If over limits, do not deploy alongside live
   services. No paid inference API or automatic fallback is configured.

Tests: `python -m unittest -v test_voices` checks registry, unique
identities, authorization, token protocol and refusal of unavailable voices.
Actual model inference, container build and live integration still require
a network-enabled staging host with approved assets.
