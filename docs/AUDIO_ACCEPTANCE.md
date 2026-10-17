# IN/OUT audio acceptance

## Scope and inventory method

The requested `release-assets/audio/` folder is not present in this checkout. The supplied release recordings are in `release/assets/current/audio/`. They remain owner-supplied, unmodified, and untracked. The mobile app's bundled audio is under `apps/mobile/assets/audio/`.

Inventory counts are **77 bundled-directory files** (64 MP3, 13 WAV) and **21 supplied-release files** (20 MP3, 1 WAV). The latter includes 16 byte-identical copies of selected supplied recordings already in the mobile bundle, plus five unused alternatives. Thus 98 files are present across both trees, including those 16 duplicate copies.

Durations, sample rates, channels, and average MP3 bitrates below were read from MPEG audio frames or WAV headers; file sizes are exact bytes. Audio content, accent, voice gender, edits, and loop audibility have not been established by listening. `EN`/`ES`, `FEMALE`/`MALE`, and cue names in the source tree are treated as the owner's labels, not independent acoustic verification.

## Integration and supported choices

| Kind | Available app choices | Integrated behavior |
|---|---|---|
| Current voice | English, Spanish (`es`), Portuguese (`pt`); gender not established | Existing 13-cue banks from `audio/{en,es,pt}/`; individual cues follow phase indexes |
| Supplied voice | English female and male; Spanish female | Selectable per language; supplied cue recordings are used only where present |
| Nature | Air, Ocean, Warm | Incoming/outgoing phase textures; 4-second files crossfade at 120 ms; Warm is now selectable and previewable |
| Music | Bliss Breath, Sweet and Spicy, The Awakening, The Initiation, Westerpark | Offline bundled MP3s; two-player 180 ms loop crossfade; independent enable and volume |

The supplied voice choices actually represented in the selector are English female, English male, and Spanish female, in addition to the existing gender-unverified voice in each language. There is no supplied Portuguese voice and no supplied Spanish male voice. Source folder tags do not prove that Spanish is Latin American Spanish or that Portuguese is Brazilian Portuguese; the current voice bank labels use those product locale names, but accents still need listening acceptance.

No language or voice substitution is performed. Missing spoken cues remain silent, and the settings explain that missing instructions stay quiet. `musicId` and language/voice combinations are validated against the supported catalogs rather than defaulting an invalid selection to another recording.

## Supplied release originals

All five music originals below are integrated byte-for-byte into `apps/mobile/assets/audio/supplied/`. Their bitrate is 320 kbps, 48 kHz, stereo.

| Exact source path under `release/assets/current/audio/` | Bundled mapping | Size (bytes) | Duration |
|---|---|---:|---:|
| `music/Song - bliss breath.mp4.mp3` | `music-bliss-breath.mp3` | 12,003,840 | 300.096 s |
| `music/Song - Sweet and spicy.mp4.mp3` | `music-sweet-and-spicy.mp3` | 13,760,640 | 344.016 s |
| `music/Song - The awakening.mp4.mp3` | `music-the-awakening.mp3` | 17,847,360 | 446.184 s |
| `music/Song - the initiation.mp4.mp3` | `music-the-initiation.mp3` | 18,510,720 | 462.768 s |
| `music/Song - westerpark.mp4.mp3` | `music-westerpark.mp3` | 11,712,000 | 292.800 s |

The following supplied voice recordings are integrated byte-for-byte. MP3 encoding is 128 kbps, 44.1 kHz, mono.

| Exact source path under `release/assets/current/audio/` | Bundled mapping | Cue | Size (bytes) | Duration |
|---|---|---|---:|---:|
| `voice/EN/FEMALE/Hold & flow/Hold - Georgia K - Warm - Elevenlabs.mp3` | `voice-en-female-hold.mp3` | English female hold | 50,373 | 2.090 s |
| `voice/EN/FEMALE/Hold & flow/Just go with the flow - Georgia K - Warm - Elevenlabs.mp3` | `voice-en-female-flow.mp3` | English female flow | 49,537 | 2.038 s |
| `voice/EN/FEMALE/In/Breath in - Georgia K - Warm - Elevenlabs.mp3` | `voice-en-female-in.mp3` | English female inhale | 49,537 | 2.038 s |
| `voice/EN/FEMALE/Out/Breath out - Georgia K - Warm - Elevenlabs.mp3` | `voice-en-female-out.mp3` | English female exhale | 49,537 | 2.038 s |
| `voice/EN/MALE/Hold & Flow/Hold - Adam Stone - Smooth and Relaxed - Elevenlabs.mp3` | `voice-en-male-hold.mp3` | English male hold | 50,373 | 2.090 s |
| `voice/EN/MALE/Hold & Flow/Just go with the flow - Adam Stone - Smooth and Relaxed - Elevenlabs.mp3` | `voice-en-male-flow.mp3` | English male flow | 49,537 | 2.038 s |
| `voice/EN/MALE/In/Breath in - Adam Stone - Smooth and Relaxed - Elevenlabs.mp3` | `voice-en-male-in.mp3` | English male inhale | 49,537 | 2.038 s |
| `voice/EN/MALE/Out/Breath out - Adam Stone - Smooth and relaxed - Elevenlabs.mp3` | `voice-en-male-out.mp3` | English male exhale | 49,537 | 2.038 s |
| `voice/ES/FEMALE/Hold & Flow/Hold - Marcela - Youthful, Smooth and Natural - Elevenlabs.mp3` | `voice-es-female-hold.mp3` | Spanish female hold | 40,760 | 1.489 s |
| `voice/ES/FEMALE/In/In - Marcela - Youthful, Smooth and Natural - Elevenlabs.mp3` | `voice-es-female-in.mp3` | Spanish female inhale | 42,014 | 1.567 s |
| `voice/ES/FEMALE/Out/Exhala - Marcela - Youthful, Smooth and Natural - elevenlabs.mp3` | `voice-es-female-out.mp3` | Spanish female exhale | 44,522 | 1.724 s |

Five supplied release files are **not integrated**:

| Exact source path under `release/assets/current/audio/` | Encoding | Size (bytes) | Duration | Status |
|---|---|---:|---:|---|
| `voice/EN/MALE/Hold & Flow/Just go with the flow.mp3` | MP3, 320 kbps, 48 kHz, stereo | 78,720 | 1.968 s | Alternative male flow clip; different from the selected source |
| `voice/EN/MALE/Hold & Flow/Wim Hof - Hold on.mp4.wav` | PCM WAV, 2,304 kbps, 48 kHz, stereo | 589,588 | 2.042 s | Alternative male hold clip; not substituted for the selected recording |
| `voice/EN/MALE/In/Breath in - Wim Hof Original.mp3` | MP3, 320 kbps, 48 kHz, stereo | 78,720 | 1.968 s | Alternative male inhale clip; not substituted |
| `voice/EN/MALE/Out/Breath out.mp3` | MP3, 320 kbps, 48 kHz, stereo | 78,720 | 1.968 s | Alternative male exhale clip; not substituted |
| `voice/ES/FEMALE/Hold & Flow/Just go with the flow - Marcela - Youthful, Smooth and Natural - Elevenlabs.mp3` | MP3, 128 kbps, 44.1 kHz, mono | 57,061 | 2.508 s | Unused; cue filename is English despite the `ES` folder, so spoken language/content is ambiguous |

## Complete mobile asset inventory

All mobile MP3s outside the `owner/` subfolder are statically referenced by the app. All 13 WAVs are also referenced. The legacy locale MP3s below are 96 kbps, 24 kHz, mono.

| Cue filename under each of `apps/mobile/assets/audio/en/`, `es/`, `pt/` | English bytes / seconds | Spanish bytes / seconds | Portuguese bytes / seconds |
|---|---:|---:|---:|
| `complete.mp3` | 13,292 / 1.104 | 13,868 / 1.152 | 15,596 / 1.296 |
| `exhale-left.mp3` | 11,852 / 0.984 | 17,900 / 1.488 | 15,884 / 1.320 |
| `exhale-right.mp3` | 11,276 / 0.936 | 17,036 / 1.416 | 15,884 / 1.320 |
| `exhale.mp3` | 8,108 / 0.672 | 8,972 / 0.744 | 7,532 / 0.624 |
| `hold.mp3` | 5,228 / 0.432 | 7,244 / 0.600 | 8,684 / 0.720 |
| `hum.mp3` | 11,564 / 0.960 | 16,748 / 1.392 | 18,476 / 1.536 |
| `inhale-left.mp3` | 10,988 / 0.912 | 17,036 / 1.416 | 16,748 / 1.392 |
| `inhale-right.mp3` | 10,412 / 0.864 | 15,884 / 1.320 | 16,172 / 1.344 |
| `inhale.mp3` | 7,532 / 0.624 | 7,820 / 0.648 | 8,396 / 0.696 |
| `natural.mp3` | 12,716 / 1.056 | 18,476 / 1.536 | 17,612 / 1.464 |
| `recover.mp3` | 8,108 / 0.672 | 11,852 / 0.984 | 11,564 / 0.960 |
| `rest.mp3` | 6,956 / 0.576 | 10,124 / 0.840 | 9,836 / 0.816 |
| `top-up.mp3` | 10,700 / 0.888 | 12,428 / 1.032 | 12,716 / 1.056 |

The five supplied tracks and eleven supplied voice files in `apps/mobile/assets/audio/supplied/` are exactly the 16 source/mapping rows above; their byte sizes and durations are listed there.

The remaining **unreferenced, preserved** files in `apps/mobile/assets/audio/owner/` are not part of the Metro asset graph:

| Exact bundled-directory path | Owner-labeled content | Size (bytes) | Duration | Encoding |
|---|---|---:|---:|---|
| `owner/bliss-breath.mp3` | Music | 6,002,924 | 300.144 s | MP3, 160 kbps, 48 kHz, stereo |
| `owner/sweet-and-spicy.mp3` | Music | 6,881,324 | 344.064 s | MP3, 160 kbps, 48 kHz, stereo |
| `owner/the-awakening.mp3` | Music | 8,924,684 | 446.232 s | MP3, 160 kbps, 48 kHz, stereo |
| `owner/the-initiation.mp3` | Music | 9,256,364 | 462.816 s | MP3, 160 kbps, 48 kHz, stereo |
| `owner/westerpark.mp3` | Music | 5,857,004 | 292.848 s | MP3, 160 kbps, 48 kHz, stereo |
| `owner/male-in.mp3` | English male-labeled inhale | 40,364 | 2.016 s | MP3, 160 kbps, 48 kHz, stereo |
| `owner/male-out.mp3` | English male-labeled exhale | 40,364 | 2.016 s | MP3, 160 kbps, 48 kHz, stereo |
| `owner/male-hold.mp3` | English male-labeled hold | 42,284 | 2.112 s | MP3, 160 kbps, 48 kHz, stereo |
| `owner/male-rest.mp3` | English male-labeled rest | 40,364 | 2.016 s | MP3, 160 kbps, 48 kHz, stereo |

The 13 mobile WAV files are PCM, 24 kHz, mono, 16-bit (384 kbps) except `focus.wav` (16 kHz mono, 256 kbps). Their exact paths, sizes, and roles are:

| Exact path under `apps/mobile/assets/audio/` | Role | Size (bytes) | Duration |
|---|---|---:|---:|
| `breath-hum.wav` | Hum-phase texture | 192,044 | 4.000 s |
| `breath-in.wav` | Air inhale texture | 192,044 | 4.000 s |
| `breath-out.wav` | Air exhale texture | 192,044 | 4.000 s |
| `chime-bell.wav` | Bell completion cue | 96,044 | 2.000 s |
| `chime-bloom.wav` | Bloom completion cue | 96,044 | 2.000 s |
| `focus.wav` | Silent audio-focus guard | 32,044 | 1.000 s |
| `ocean-in.wav` | Ocean inhale texture | 192,044 | 4.000 s |
| `ocean-out.wav` | Ocean exhale texture | 192,044 | 4.000 s |
| `preview-air.wav` | Air preview | 288,044 | 6.000 s |
| `preview-ocean.wav` | Ocean preview | 288,044 | 6.000 s |
| `preview-warm.wav` | Warm preview | 288,044 | 6.000 s |
| `warm-in.wav` | Warm inhale texture | 192,044 | 4.000 s |
| `warm-out.wav` | Warm exhale texture | 192,044 | 4.000 s |

## Missing, ambiguous, and unused recordings

- Supplied Spanish female has inhale, exhale, and hold only. The similarly named supplied `ES` flow file remains unused because its filename is English and its spoken language is not confirmed.
- Supplied English female and male each have inhale, exhale, hold, and flow. They do not provide top-up, hum, nostril-specific, recovery, or every legacy phase cue; the app does not substitute another voice.
- No owner-supplied Portuguese voice or Spanish male voice was found. Existing Portuguese/Spanish banks remain available, but their gender and regional accent are unverified.
- The source tree includes alternate English male-labeled Wim Hof/320 kbps clips and old 160 kbps copies in `audio/owner/`; they remain unused and preserved.
- All 68 statically referenced app audio assets resolve. The nine files in `audio/owner/` are present on disk but not statically bundled.

## Automated verification

| Check | Result |
|---|---|
| Audio manifest static `require()` resolution | Pass: 68 unique references resolve; no missing Metro assets |
| Supplied voice/music manifest completeness | Pass: all 16 selected files present and statically mapped |
| Voice choices | Pass: all six supported language/voice banks resolve to their own cue arrays (three gender-unverified current banks; English female/male; Spanish female) |
| Cue-to-phase routing | Pass: inhale, top-up, exhale, hold, hum, retention, recovery, free breathing, cyclic retention, and left/right nostril indexes covered |
| Invalid language/voice and music identifiers | Pass: rejected rather than silently substituted |
| Music and nature looping | Pass in mocked tests: repeated short-source crossfades, stale-seek cancellation, pause/resume position retention, live track/volume changes, and player cleanup |
| Mobile audio regression tests | Pass: 5 suites, 89 tests (`looped-audio`, `preview-audio`, `native-effects`, `approved-audio`, and existing `experience`) |
| Root audio and breathing tests | Pass: 8 tests (`audio-assets`, `audio-preferences`, and `breathing-guidance`) |
| TypeScript | Pass for mobile, web, and Supabase projects |

Automated checks do **not** establish that a loop is acoustically seamless, that cue speech matches filenames, or that playback is correct on a physical device.

## Asset size and performance

The 68 statically referenced mobile audio files total **77,271,616 bytes**. The five 320 kbps music tracks account for **73,834,560 bytes**; these are intentional offline assets and were not re-encoded or reduced in quality. Nine 160 kbps legacy/alternate files total **37,085,676 bytes** and are not statically referenced, so Metro does not bundle them. No streaming dependency or quality-reduction optimization was introduced.

Nature crossfades use two local 4-second mono WAV decoders per available texture (up to six player objects during an active session); music uses two decoders for the selected track. The loop clocks are subordinate to the breathing engine, and active players are paused/disposed on pause, interruption, settings change, and session termination as applicable. Device memory and native decoder buffering still require physical-device profiling.

## Physical-device listening checklist

- [ ] Confirm English female/male, Spanish female, and current English/Spanish/Portuguese bank speech against every filename and protocol phase.
- [ ] Confirm `es` accent suitability for Latin America and `pt` accent suitability for Brazil.
- [ ] Listen to missing-cue behavior, hold/rest transitions, top-up, hum, recovery, and nostril-specific phases; verify no wrong-language fallback.
- [ ] Preview each Air, Ocean, Warm, voice-bank, and music choice; confirm independent voice/nature/music toggles and volume levels.
- [ ] Listen through repeated short nature loops and full music loops at normal and quiet volumes with headphones and device speakers.
- [ ] Listen for gaps/clicks at loop boundaries and for artifacts on inhale/exhale changes and holds.
- [ ] Pause/resume each track; verify playback position, volume changes during a session, silent-switch behavior, and incoming audio interruptions.
- [ ] End, abandon, and navigate away from sessions; confirm no audio continues and that restarting does not layer duplicate players.
- [ ] Verify playback offline and check memory/battery behavior over a long session on representative Android and iOS devices.

## Follow-up requiring owner review

- Confirm the intended spoken content and regional dialects for legacy `es`/`pt` banks and whether the English phrase in the unused Spanish-folder flow asset is acceptable before integrating it.
- Decide whether the unused Wim Hof alternatives or old `audio/owner/` files should be retained, replaced, or separately approved; they were not removed or modified.
- Record physical-device listening/profile results before making any acoustic-seamlessness or release-readiness claim.
