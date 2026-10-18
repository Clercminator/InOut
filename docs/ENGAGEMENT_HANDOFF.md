# Engagement infrastructure handoff

Baseline: `codex/production-quality` at `3f30b339662974838a83270c4e138e6c752e1f8a`. This implementation is on `codex/launch-infrastructure-20261017`.

## 1. Analytics contract

Use `AnalyticsService.track(event, properties?)` from `apps/mobile/src/analytics.ts`; `productEvents` and `ProductEvent` are the event-name contract. `AnalyticsService.setConsent(enabled)` controls Firebase collection through `TelemetrySink` and `telemetry-native.ts`. Tracking is best-effort and never blocks practice. Firebase Analytics and Crashlytics default to off in `apps/mobile/firebase.json`; the Settings choice is product-analytics consent, independent from AdMob consent.

`ProductEventProperties` is the complete allowlist:

- `platform`: `android`, `ios`, `web`
- `appVersion`: version string matching `major.minor.patch` with an optional short prerelease/build suffix
- `locale`: `en`, `es-419`, `pt-BR`
- `entitlement`: `free`, `pro`
- `challengeType`: `first-breath`, `seven-day-calm`, `sleep-reset`, `focus-week`, `breath-explorer`, `consistency`, `three-by-three`
- `acquisitionSource`: `organic`, `shared-link`, `campaign`, `unknown`
- `outcome`: `success`, `cancelled`, `failed`, `unavailable`, `dismissed`
- `errorCategory`: `decode`, `playback`, `timeout`, `permission`, `scheduler`, `delivery`, `link`, `unknown`
- `source`: the existing finite paywall source values in `paywallSources`

Unknown fields and invalid values are removed at runtime. Do not add identifiers, free text, exact location, practice ratings/effects, notes, goals, medical details, profile data, receipts, or recordings. Firebase initialization is platform-specific: provide `GOOGLE_SERVICES_JSON` for Android and/or `GOOGLE_SERVICES_PLIST` for iOS through the existing build environment; neither file belongs in git. On consent withdrawal the sink suppresses events immediately, disables collection, resets the analytics identifier, and deletes unsent crash reports.

Existing canonical events are retained rather than duplicated: `app_open` represents an app foreground session; `session_started`, `session_completed`, and `session_abandoned` represent breathing-session lifecycle; `safety_acknowledged` represents acceptance; `purchase_success` is emitted only after store entitlement verification; `share_created` and `shared_web_*` represent the existing sharing flow. New non-Challenge events cover first consented open, safety views, reminder schedule/open, external practice entries, audio mode, guided programs, explicit result-share invocation and exercise-link creation, ad lifecycle, purchase failures/entitlement transitions, and categorized audio/notification/share failures. Existing Challenge event names are unchanged; new Challenge definitions and emitters remain for Codex.

## 2. Notifications

- `nativeReminderAdapter()` implements the existing on-device practice reminder permission, schedule, list, and cancel interface. `ReminderService` continues to persist local schedules and enforce existing Free/Pro reminder limits.
- The Settings notification controls persist local-only category preferences for Daily Reset, rotating motivational prompts, practice check-ins, and achievement alerts. New categories are all off by default. At most three selected weekdays are scheduled per calendar week; achievement alerts are capped at one per rolling seven days and use an unreserved selected day/time.
- Check-in notifications expose “Log practice” and “Not now” actions. The log action opens the existing manual-session form, or returns to an active/post session instead of interrupting it. Notification text is neutral and does not include the achievement name, profile, ritual, ratings, or notes.
- Optional quiet hours are off by default. When enabled, engagement and achievement notices are shifted outside the configured local-time interval; existing practice reminders are shifted as well. Settings default to 22:00–08:00 when the user enables quiet hours. Foreground reconciliation updates one-shot schedules after date or timezone changes.
- `scheduleDailyReset({ enabled, hour, minute, weekdays })` remains a reusable native weekly-schedule API. The Settings category scheduler uses the same Daily Reset category with the user's shared time/day preferences.
- `ReminderEffects` suppresses presentation during active/post-session practice, de-duplicates response taps, and routes cold-start opens to Home, practice, manual logging, or progress as appropriate.
- Android's `monochrome-icon.png` is a 1024-square white-on-transparent PNG and is configured as the small notification icon; tint is `#5B2DFF`. The installed Expo Notifications content API has no local-notification large-icon field.

Provider notification configuration and native acceptance still need verification on physical iOS and Android devices, including action-button presentation, timezone changes and OS quiet-hour interactions. Practice reminders created by the user remain separate from the three-day engagement-prompt cap and continue to use existing Free/Pro limits.

## 3. Post-session ads

`AdService.prepareCompletion(sessionId)`, `showCompletion(sessionId)`, and `cancelCompletion()` are the reusable completion-flow interface. The Result screen prepares only for a saved, completed, in-app Free session and invokes `showCompletion` only on explicit Done → Home. Existing Pro/reviewer suppression, consent, cooldown, session/day caps, duplicate-ID guard, and immediate navigation when inventory is unavailable remain in force. Banner and interstitial lifecycle events use the same analytics service.

`freeAdsDisclosure` provides the one-time localized EN/ES/PT explanation. It is persisted in local preferences after dismissal and is not shown to Pro/reviewer users or preview builds. Ads are never tied to sharing.

## 4. Audio asset manifest

Supplied files were found under `release/assets/current/audio/` (21 files). These selected files are copied into `apps/mobile/assets/audio/supplied/` and registered in `approved-audio.ts`:

- Music: Bliss Breath (300.1 s), Sweet and Spicy (344.02 s), The Awakening (446.18 s), The Initiation (462.77 s), Westerpark (292.8 s). Existing track IDs, independent music volume, and two-player 180 ms crossfades are preserved.
- EN male (Adam Stone): inhale, exhale, hold, “Just go with the flow”; measured clips are 2.038 s except hold at 2.090 s.
- EN female (Georgia K): inhale, exhale, hold, “Just go with the flow”; durations match the selected EN male clips.
- ES female (Marcela): inhale (1.567 s), exhale (1.724 s), hold (1.489 s). No English-language cue is mapped into the Spanish bank.
- Existing EN/ES/PT voice banks remain available. PT-BR has no new supplied voice recordings; it continues to use the existing bank.
- The four unused EN male files are not mapped: `Just go with the flow.mp3`, `Wim Hof - Hold on.mp4.wav`, `Breath in - Wim Hof Original.mp3`, and `Breath out.mp3`. Their voice/provenance/rights are ambiguous and need owner confirmation before use.
- No separate nature/ambient files were supplied. Existing in-app breathing textures are WAV assets in `audio-library.ts`; no new ambience was inferred.

Spoken cues remain one-shot and skip expired phase cues; music uses the existing overlap/crossfade path. Timing, headphones, interruption recovery, and loop smoothness still require physical-device listening.

## 5. Implementation ownership

This change owns the supplied audio registry/assets; typed analytics and consent wiring; Firebase platform config; local reminder scheduling/telemetry and notification categories; post-session ad lifecycle telemetry/disclosure; privacy copy; and regression tests. Primary modules are `approved-audio.ts`, `analytics.ts`, `telemetry.ts`, `telemetry-native.ts`, `commercial.ts`, `ads.ts`, `ad-disclosure.ts`, `local-notifications.ts`, `reminders.ts`, `reminder-native.ts`, `reminder-context.tsx`, `session-effects.tsx`, `session-controller.ts`, `subscriptions.ts`, `share-exercise.tsx`, and the existing provider/settings/result routes.

No Challenge UI/content, breathing engine, store product identifiers, remote notification backend, or ad configuration was changed.

## 6. Verification and outstanding acceptance

Automated checks run:

- `npm run typecheck`
- `npm test` — 184 passed
- `npm run test:mobile` — 202 passed
- `npm run locales:check`
- `npm run release:pages`
- `npx expo export --platform android` from `apps/mobile` — bundle exported with selected supplied audio assets and the notification changes

Still required before release: Android/iOS device checks for all voice selections and phase timing; music/texture loop continuity, pause/resume, offline, headphones and interruptions; notification permission, category action buttons, quiet hours, weekday/timezone/cold-start behavior; ad consent, test inventory, Pro/reviewer suppression and explicit Done navigation; Firebase consent/withdrawal and Crashlytics behavior on each configured platform. No production ad, analytics, store, or physical-device dashboard acceptance was performed.

Remaining owner/platform work: provide platform Firebase service files through protected build inputs; confirm provenance for the four excluded male recordings; supply PT-BR voice or ambience only if desired; decide whether native large-icon support is required beyond Expo's configured small icon; and define category preferences/timing for the unimplemented notification types listed above.

## 7. Engagement feature integration

Daily Reset extends `SessionRecord`, `storage.ts`, and `session-controller.ts` with an explicit session tag and transactional, once-per-local-day credits. It uses the existing coherent protocol, safety screen, Pulse session, audio preferences, optional result capture, and recovery. `analytics.ts` only extends the event/property contract; transport is unchanged. `reminder-context.tsx` routes the existing Daily Reset notification to its progress/start screen. `share-exercise.tsx` accepts a button label; link creation, expiry and revocation remain unchanged. Result and challenge sharing reuse the approved square/Story artwork. No backend, store or deployment changes.

Feature checks: Daily Reset and existing Challenge domain tests pass (20 tests); TypeScript passes. Device acceptance remains pending.

Fitness integration adds versioned local `fitness-v1` data through the existing SQLite settings/transaction layer. It does not modify the database schema version or breathing/State Shift histories. Monotonic timing, one-second checkpoints, background/navigation pause and restart recovery prevent downtime or wall-clock changes from creating elapsed exercise time. Results are explicitly self-reported, with independent bests, editable repetitions, private notes, deletion and approved-artwork sharing.

Shared-file changes: `provider.tsx`, `ad-slot.tsx`, and `result.tsx` pass pending fitness attempts to the existing ad suppression interface; ad policy and placements are unchanged. `reminder-context.tsx` suppresses notices and routes taps safely during fitness attempts; scheduling is unchanged. `pre.tsx` and the controller prevent simultaneous breathing/fitness attempts. `challenge-tests.ts` and its result screen remove duration-driven Comfort Hold personal-best incentives. Fitness checks: 28 combined domain tests and 3 new mobile interaction tests passed.

Coach discovery now uses all selected goals, shows configured Free/Pro program membership, actual cadence-adjusted session lengths, saved completion counts and completion feedback. `entitlements.ts` exposes the existing program policy as `requiresPro`; no subscription integration changed. Program-completion analytics are restricted to the actual final credited session, and subsequent program practices emit a return event. All ten protocol defaults and disabled AI policy are preserved.

## 8. Final engagement candidate — 2026-10-17

Base commits `0d3fcf09` and `de7ea3ea` are present. Feature commits: `18fa6c5` (Daily Reset), `ea93f92` (fitness records), `3b390c4` (Coach discovery). The final integration commit adds frozen local fitness times, notification/locale/theme interaction coverage, sharing-artwork loading checks, midnight/restart and monotonic-clock tests, and public exercise completion tests.

The public exercise reuses the existing hosted snapshot API unchanged. Installation options now appear after completion, with the canonical site as a fallback while store URLs are unset. EN/ES/PT simulated-DOM tests run the built browser bundle through the actual 60-second cadence and background pause. `shared_web_*` calls have no configured web telemetry sink; no recipient installation or conversion is claimed. No production link was created during testing. A read-only request to the existing public exercise page returned HTTP 200 with the guide and invitation container.

Final verification evidence is in ignored local artifacts: `engagement-verify-final.log`, `engagement-export-final.log`, `engagement-release-check.log`, and `engagement-eas-history.json`. Full repository verification covers locales, public-page generation, web lint, TypeScript, domain tests and mobile tests. Android/iOS exports are JavaScript bundling evidence, not installed-device acceptance.

Remaining acceptance and owner work:

- Physical Android/iOS: timer/background/restart and clock changes; large text, screen readers and reduced motion; all ten breathing protocols and audio/music choices; native share/WhatsApp image and invitation delivery; reminder permission, cold starts and timezone behavior; actual purchase, immediate Pro membership/ad suppression, restore, expiry/offline access and consented test ads. None was executed on physical hardware in this run.
- `release/links.json` still has blank store URLs, Apple Team ID and Android signing fingerprints. Configure verified store destinations and signing associations through the existing owner checklist. Direct store-install buttons and verified app links cannot be accepted until then.
- Existing Firebase platform build inputs and owner analytics decision remain necessary; the existing Android Firebase transport is configured in EAS; iOS has no plist and web has no sink. Final stabilization fixes first-open marker consumption on failed transport initialization without adding a provider or changing RevenueCat/ad policy. All seven `release/readiness.json` production gates remain open.
- Final source is **1.2.0**, Android **5**, iOS **1**. The completed Android store-test build is `89eefe91-f2b0-4b1c-9b28-e839b539a361`, source `8373a570`; its AAB signature, upload-certificate match, archive digests, native-library alignment, Firebase configuration and supplemental source-map/native-symbol artifacts are verified. The earlier verified build `9557f794-3b6b-45e8-92fb-5fcff2ef5bf0` remains preserved as fallback. EAS history showed no code 5 before creation; Play availability remains unverified. See the owner checklist for the final artifact checksum and exact Internal testing handoff.

Only the authorized Android source archive was uploaded to EAS for compilation. No artifact was uploaded to a store, no website/backend was deployed and no store submission/settings change occurred. Owner asset moves/deletions present at task start remain untouched and excluded from the feature commits. See `OWNER_SETUP_CHECKLIST.md` for the maintained provider/store acceptance process and owner-authorized upload steps.

Final stabilization evidence: **208 domain / 218 mobile tests**, Expo Doctor **21/21**, Android/iOS exports and metadata/store-test preflight pass. Production gates remain open. Commits `e9ed29c`, `5ef4215`, `56e6a8a` finish integration, align versions and preserve first-open telemetry on initialization failure. Current acceptance classification and build status are in `OWNER_SETUP_CHECKLIST.md` and `CROSS_PLATFORM_RELEASE_READINESS.md`.
