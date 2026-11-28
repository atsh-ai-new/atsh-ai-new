# Replica pilot (disabled unless explicitly deployed)

The existing studio voice API and Layered Worker need no code migration. Deploy
`compose.replica.yaml` as a different application on the existing private backend
network, using the same dialect service contract. It has no public port, uses one
inference slot and a 1.5 CPU quota, runs at reduced priority, has a 1,450 MiB
Docker limit with no swap, and stops inference before its 160-second deadline.
Do not run two Replica containers side by side on a small production host.

This pilot advertises six reviewed Cairo presets: two men, two women, one boy and one girl. The other child slots remain outside the registry until approved. It always uses
Egyptian language `arz` with Arabic marks removed, without voice references.
It does not expose the other audition profiles. Native whisper is advertised by the pilot and passed through when supported. Other presets guide pauses and the duration estimate; they are not distinct emotions. A prompt describes a designed voice;
it is not a fixed verified speaker embedding across scripts.

## Prepare and test before deployment

1. Verify the host has amd64 with AVX2/FMA/BMI2, sufficient disk, and enough
   **MemAvailable** under normal load with zero active swap churn. Keep at least
   512 MiB free for the platform even at the full voice container cap; also
   account for any current render. Do not change the renderer's resource cap.
2. Prepare the model on the test computer, **never quantize on the shared VPS**.
   Get the model, audio tokenizer and metadata from
   [the pinned Replica release](https://huggingface.co/tokenaii/Replica-Preview-0.6B/tree/baee36fac5d2348fb84ee06ada5895942611420a)
   and convert with Audio.cpp v0.9.6:

   ```sh
   audiocpp_gguf --family omnivoice --type q4_k --root checkpoint \
     --input weights=checkpoint/model.safetensors \
     --input audio_tokenizer_weights=checkpoint/audio_tokenizer/model.safetensors \
     --output replica-q4.gguf
   sha256sum replica-q4.gguf
   ```

   Expected SHA-256:
   `8583aa11b17f7851520bfc9cdc08f368737941f72b948b3bad6490ad628de03d`.
   Install the verified file read-only at `$VOICE_MODELS_DIR/replica-q4.gguf`.
   Keep model weights and credentials out of Git. The container verifies the hash
   before serving requests.
3. Verify the container and the backend share a private Docker network. Supply
   the voice token through Coolify as a secret; configure the same token on the
   backend. Set the backend's `CHARACTER_DIALECT_SERVICE_URL` to the service's
   private HTTP origin (usually `http://dialect-voice:8080`) and
   `CHARACTER_DIALECT_VOICES` to `["egyptian-male","egyptian-male-2","egyptian-female","egyptian-female-2","egyptian-child-male","egyptian-child-female"]`. Disable public exposure
   and check the private alias is not already used. Save current settings for rollback.
4. Test the service first via bearer-authenticated `GET /voices` and
   `POST /voice-preview` from the backend network, and one preview in the studio.
   Confirm the WAV can be played and the text is audible. Check cgroup peak,
   OOM counters, and host free memory during a short sample and a 30-second
   queued Layered Worker project. Keep voice requests serial. Do not enable
   longer generation on a static site's reverse proxy until its preview timeout
   is checked. Layered Worker uses the existing per-line backend connection.
5. Roll back on any OOM, pressure, regression, or failed preview: restore the
   prior dialect environment values and stop only this pilot. Do not modify
   the original Arabic service or the animation worker.
