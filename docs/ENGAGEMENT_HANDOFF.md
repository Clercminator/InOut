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
- `scheduleDailyReset({ enabled, hour, minute, weekdays })` in `reminder-native.ts` is a reusable local weekly-schedule API for the future Daily Reset. Weekdays use Expo's 1–7 convention. It does not create a Challenge screen or persist preferences; a future caller must store its category preference and call `nativeReminderAdapter().permission(true)` at the appropriate user action.
- `ReminderEffects` suppresses presentation during active/post-session practice, de-duplicates response taps, and routes cold-start reminder opens. Daily Reset currently opens Home until its future destination exists.
- Android's `monochrome-icon.png` is a 1024-square white-on-transparent PNG and is configured as the small notification icon; tint is `#5B2DFF`. The installed Expo Notifications content API has no local-notification large-icon field.

Only practice reminders and the Daily Reset scheduling interface are implemented here. Motivational-message rotation, outside-app check-in action buttons/manual-form routing, achievement notifications, independent category switches, quiet hours, and category-wide frequency caps still need implementation and native acceptance. Do not enable them implicitly.

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

This change owns the supplied audio registry/assets; typed analytics and consent wiring; Firebase platform config; local reminder scheduling/telemetry and Daily Reset API; post-session ad lifecycle telemetry/disclosure; privacy copy; and focused regression tests. Primary modules are `approved-audio.ts`, `analytics.ts`, `telemetry.ts`, `telemetry-native.ts`, `commercial.ts`, `ads.ts`, `ad-disclosure.ts`, `reminders.ts`, `reminder-native.ts`, `reminder-context.tsx`, `session-effects.tsx`, `session-controller.ts`, `subscriptions.ts`, `share-exercise.tsx`, and the existing provider/settings/result routes.

No Challenge UI/content, breathing engine, store product identifiers, remote notification backend, or ad configuration was changed.

## 6. Verification and outstanding acceptance

Automated checks run:

- `npm run typecheck`
- `npm test` — 180 passed
- `npm run test:mobile` — 201 passed
- `npm run locales:check`
- `npm run release:pages`
- `npx expo export --platform android` from `apps/mobile` — bundle exported with the selected supplied audio assets

Still required before release: Android/iOS device checks for all voice selections and phase timing; music/texture loop continuity, pause/resume, offline, headphones and interruptions; reminder permission/weekday/timezone/cold-start behavior; ad consent, test inventory, Pro/reviewer suppression and explicit Done navigation; Firebase consent/withdrawal and Crashlytics behavior on each configured platform. No production ad, analytics, store, or physical-device dashboard acceptance was performed.

Remaining owner/platform work: provide platform Firebase service files through protected build inputs; confirm provenance for the four excluded male recordings; supply PT-BR voice or ambience only if desired; decide whether native large-icon support is required beyond Expo's configured small icon; and define category preferences/timing for the unimplemented notification types listed above.
