# Server dialect voices — staging runbook

Twenty-two independent stable IDs: Egyptian (Cairene), Alexandrian and Saidi each have adult male/female, young child male/female and teen male/female (18 Egyptian identities). Saudi and Gulf adult male/female remain compatible. Neither pitch shifting nor relabeling one speaker is
a substitute for a separately reviewed dialect and identity. The existing
MSA provider remains separate. The browser sends the selected stable ID;
the private server synthesizes it. Scene audio is never sent to a cloud API.

## Candidates (not deployed)

- The previous Emirati Piper candidate failed owner listening review. Its exact model digest is now rejected by the registry; it is no longer downloaded by default.
- Egyptian-first: KemeTone (82M, Cairene female only) is being evaluated in a separate offline CPU trial, not registered for production. It uses its own Egyptian G2P and diacritized text. Model card lists Apache-2.0; review voice/source rights before commercial approval. Never label it Alexandrian or Saidi.
- Audar Flash Q4_K_M: CPU GGUF, upstream AudarAI Open License v1.0
  permits commercial use subject to its conditions; preserve its license.
  Upstream supports Arabic including Gulf dialects, but specific regional
  accent and speaker quality must be checked individually. NeuCodec is a
  separate dependency; review its Apache-2.0 license, accept gated access
  and pin a reviewed revision. No noncommercial models are included.
- All 22 reference slots require distinct consented voices with matching transcripts, or independently approved licensed models. No fake dialect or gender aliases. All 18 Egyptian roles are the priority review targets.

Sources:
https://huggingface.co/audarai/Audar-TTS-V1-Flash
https://huggingface.co/neuphonic/neucodec
https://huggingface.co/Rabe3/kemetone

## Staging, before production

1. Use an isolated host/maintenance slot with adequate disk and RAM.
   Install huggingface_hub in a staging Python environment. Run
   `python install_candidates.py /srv/atsh/voices` to initialize the private registry.
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
   `docker compose run --rm -v /srv/atsh/auditions:/auditions dialect-voice python service.py --audition /auditions egyptian-female`
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
6. The shared live VPS was measured at 2 vCPU / 3.7 GiB total RAM, 1.6 GiB available during inspection. Never run the existing 2–3 GiB service presets there without further profiling. The isolated Egyptian quality job caps CPU to one core and RAM to 1200 MiB with no swap. It does not prove suitability for live concurrent use. If over limits, do not deploy alongside live
   services. No paid inference API or automatic fallback is configured.

Tests: `python -m unittest -v test_voices` checks registry, unique
identities, authorization, token protocol and refusal of unavailable voices.
Actual model inference, container build and live integration still require
a network-enabled staging host with approved assets.


### Register a private reference without editing the JSON by hand

Run in the model installation host, using a local recording, exact spoken
transcript in UTF-8 and documented explicit commercial-synthesis consent:

```sh
python prepare_reference.py /srv/atsh/voices egyptian-male /private/clip.m4a \
  --transcript-file /private/transcript.txt --consent-record /private/consent.txt
```

The command normalizes audio, rejects empty/short/long/duplicate PCM,
prevents changing approved identities and stages the voice without enabling
it. Consent is an operator responsibility; existence of the file does not
prove its contents or the dialect. Keep private records outside Git.
Repeat with the distinct IDs from the example registry. Use the offline
audition step and human review before setting approved=true.

The runtime UID/GID is 10001. Before running the container, make sure the
private model tree is traversable and readable by that user (e.g. set
the private tree's group to 10001 and grant group read/traverse permission).
Do not make recordings or the manifest publicly readable.

### Candidate rejection and speech quality gate (2026-11-27)
KemeTone was rejected by the owner: whistle/no speech. The repeated control sentence failed spectral checks with high-band power 79.1%. Do not promote it, even if inference completes. All generated audio now passes a signal gate; trial artifacts additionally require independent Arabic transcription. The NAMAA candidate is an isolated CI-only study and is not sized for the current production VPS. No deployment is implied.

### Egyptian age and gender expansion
The existing adult IDs are unchanged. Each of egyptian, alexandrian and saidi now supports:
male, female, child-male, child-female, teen-male, teen-female.
Existing profiles are preserved; rerunning install_candidates.py adds missing unapproved slots.
Use a genuinely distinct licensed voice for every slot. For real children/teens use
documented guardian consent and speaker assent; add --guardian-record to the
private registration command. Prefer designed fictional voices, using --synthetic
only after source rights are reviewed. Do not use pitch-shifted adult audio as a child.
No raw references or consent records go into GitHub. The production registry stays
unavailable until the individual voice is approved after dialect, age, gender,
intelligibility, stability, naturalness and resource review.

### VoiceTut Egyptian-family audition (experimental, independent of deployment)
A second Egyptian-first model candidate is VoiceTut-TTS (Apache-2.0):
https://huggingface.co/mohammedaly22/VoiceTut-TTS
The pinned candidate and the OmniVoice 0.2.1 runtime are tested on GitHub CI (no
production endpoint, no customer data, no real child recordings). Six fictional
age/gender identities are auditioned with a reference sentence and a different
sentence using that reference, signal screening and independent Arabic ASR.
All three dialects now run as separate CI matrix jobs (six identities each), not claims of model accent support. Each failed identity is reported independently; only complete reference/dialogue pairs that pass the signal and independent ASR checks are included in listening artifacts. A partial failure cannot hide a passing pair or expose a failed pair. No machine check approves production. OmniVoice's documented voice design
training is Chinese/English; Arabic age/gender design may fail. Even successful
ASR is not dialect or identity certification. Native listening and commercial
source rights review are mandatory. Do not deploy this 2.47 GB model on the shared
VPS until a dedicated host has passed memory/latency profiling.

### Pronunciation refinement — candidate A/B
After the initial 18 identities passed machine intelligibility, compare the same
original script and same fictional reference with selective colloquial vocalization,
natural punctuation, 48 decoding steps, guidance 2.25, and 0.94 speed. The
independent ASR comparison reports both versions without replacing the original
or approving dialect, age, identity, or production. A guidance variant that is
worse must not be deployed merely because it is newer. Native listeners should
specifically compare qaf, gim, emphatic consonants, vowel length, phrasing and
local identity. If regional pronunciation is not authentic, acquire licensed
native reference voices rather than relabeling general Egyptian voices. Baseline
artifacts are short-lived experimental assets; rerun the family audition if expired.

### Temporary Egyptian voice bank (owner accepted for interim work)
Do not rerun the expensive trials just to reconstruct the same identities.
Keep the preserved 18-reference archive and manifest privately. These are
synthetic provisional voices; regional accent authenticity is not certified.
Stage the archive using `python import_voicetut_refs.py /srv/atsh/voices /private/ATSH-Egyptian-Voice-References.zip`.
Review commercial model and reference rights before repeating with
`--rights-reviewed`. Install the exact pinned revision
`mohammedaly22/VoiceTut-TTS@b36bdf4416864d84f47ca77ce3decf34f6ab16cc`
under /srv/atsh/voices/voicetut. Use the dedicated host overlay
`docker compose -f compose.yaml -f compose.voicetut.yaml build`.
Set ENABLE_PROVISIONAL_EGYPTIAN=1 only on that host after sizing and
a real end-to-end test, then configure its 18 stable IDs in the backend.
Never enable on the shared 3.7 GiB VPS. The provisional flag stays visible
to the administrator; replace an identity by updating its private profile,
not renaming the project voice ID. Existing approved identities are preserved.
