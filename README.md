# IN/OUT

IN/OUT is a native breathing app for iPhone and Android, built with React Native and Expo. The phone app is the canonical product. Sessions, saved routines and history work offline; the supporting website currently provides privacy, safety and support pages.

**Current release scope: free, guest-only, offline version 1.0.0.** No account, subscription, ads, analytics or health-sensor integration. Publisher: **David Clerc**. Support: **davidclerc@imrtech.xyz**.

## For product and business consultation

Start with the [Product, features and monetization briefing](PRODUCT_STRATEGY_BRIEF.md). It covers target-user hypotheses, the feature/option inventory, free versus paid choices, monetization alternatives, priorities, what to defer or skip, research and measurement, operating costs, and decisions the consultant should help resolve. Proposals are explicitly separated from implemented capabilities and approved release scope.

**Key commercial distinction:** the original vision proposes charging for Custom Patterns and Mix Mode; the current release includes them free. There is no billing system or validated pricing. Changing that boundary requires an explicit product decision and a policy for existing users.

Use this README for delivery status and technical evidence, the briefing for product/business decisions, [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the original vision, and the [store submission guide](release/STORE_SUBMISSION_GUIDE.md) for publication requirements. Together they form the consultant handoff; mockups and future vision are not evidence of shipped features.

## Current status

**Status consolidated September 17, 2026, against repository commit `a848eb4`. The app is implemented, but release validation is unfinished and it has not been submitted to either store.**

This README is the central project status tracker. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) describes the broader product vision, including features that are not built yet. The [App Store and Google Play submission guide](release/STORE_SUBMISSION_GUIDE.md) contains the store-console handoff and acceptance requirements. Implementation and verification are tracked separately below: a feature existing in code does not mean it has passed physical-device acceptance.

| Area | Current state |
| --- | --- |
| Native app and first complete session flow | Implemented, with earlier successful Android and iPhone automated flows |
| Generic engine, persistence and recovery | Implemented; automated domain, storage and mobile tests pass in the latest verification job |
| Custom patterns, mixes, history and progress | Implemented with local persistence |
| Styling and breathing animations | Refined, including the Box breathing path and protocol-specific visuals |
| Privacy, safety, support and store copy | Prepared; public pages published |
| Android native build | Latest APK builds; latest full smoke test fails at History navigation after relaunch |
| iOS native build | Latest simulator app builds and launches; latest separate capture flow fails |
| Store screenshots | Earlier Android captures available locally; final Android/iOS sets unfinished |
| Signed store builds and physical-device acceptance | Outstanding; account/signing access and device checks still needed |
| Store submission | Not done |

### Remaining engineering work

The work underway before this handoff was **native release verification and store screenshot packaging**. The next work is bounded by these tasks:

- [ ] Diagnose the latest Android History navigation failure. The test stays on Progress after attempting “View session history”; whether this is an automation issue or an app interaction bug is not established.
- [ ] Diagnose the latest iPhone capture failure and retain a complete screenshot set. The simulator launched, but Maestro reported a failed flow; the job log does not identify the underlying assertion.
- [ ] Refresh and visually review screenshots from the final candidate on both platforms, validate the image formats, and commit the pending asset work.
- [ ] Obtain a passing verification/build/runtime evidence set for the same release candidate. Earlier successful runs do not close failures in the latest runs.
- [ ] Complete physical-device acceptance and signed distribution builds once account/signing access is available.

No additional feature expansion or visual polish is needed to resolve these specific open tasks.

### Owner-dependent release steps

- [ ] Complete Apple and Google developer enrollment and identity verification.
- [ ] Create the store app records and reserve `com.imrtech.inout` on both platforms.
- [ ] Provide the Expo project and signing access needed for production builds.
- [ ] Complete the current store-console privacy, health, age/content and publisher declarations; set free pricing and distribution countries.
- [ ] Arrange physical iPhone/Android testing, TestFlight/Play testing and any required tester cohort.
- [ ] Submit the accepted builds for review.

The owner's account setup is separate from the unresolved engineering tasks above. Expo Go connectivity was fixed and is not a current blocker.

### Local changes not yet committed

At this checkpoint, these existing changes remain outside the committed release:

- `release/assets/google-play-icon.png`: conversion to RGBA PNG.
- `scripts/generate-store-assets.py`: matching Play icon export change.
- `scripts/check-release.mjs`: PNG signature, size and color-type validation.
- `release/screenshots/android/`: six untracked 1080 × 1920 captures from an earlier native build: Today, Active Session, Result, History, Saved Pattern and Saved Mix. These predate the latest branding fixes and are not the final approved store set.

There is no packaged iOS screenshot set yet. The Android screenshots use synthetic test ratings, not real user health data or promised results. Local `artifacts/` output is ignored by Git and is not available in a fresh clone. This documentation checkpoint does not commit or approve the pending assets.

## What has been implemented

### Complete native session flow

Launch/onboarding → Today → Calm Now → Physiological Sigh → optional Pre-State Shift → Active Session → Post-State Shift → Result → History.

- Today recommendations and a quick 48-second Physiological Sigh session.
- Protocol discovery, filters, details, favorites and safety guidance.
- Nine available built-ins: Physiological Sigh, Box, Coherent, Extended Exhale, 4-7-8, Diaphragmatic, Equal, Nadi Shodhana and Bhramari.
- Ten versioned protocol definitions in the shared model. High-intensity cyclic breathing remains defined but is excluded from starting, recovery, replay and mixes in this release.
- Pause, resume, restart and early end, with recovery after interruptions.
- Optional pre/post tension ratings from 1–10. Raw answers are stored; a comparison is calculated only after a post-session answer. Skipped answers are not invented or treated as zero.
- Results support improved, unchanged and increased reported tension. State Shift is self-reported, not biometric or a medical measurement.

### Routines, history and progress

- Custom patterns: add, remove, reorder and duplicate phases; edit durations and cycles; preview total time; run, save, edit, duplicate and delete routines.
- Mix Mode: combine built-ins and saved patterns in ordered blocks, set block cycles and whole-mix repeats, reorder/duplicate/remove blocks, save and run mixes, and see the next block during a session.
- History: session details, filters, replay using the stored protocol snapshot, individual deletion and clearing history.
- Native text result sharing through the operating system's share sheet.
- Progress: period filters, session counts, practice time, streaks, activity, protocol usage and average paired self-reported shift.
- Settings, preferences, favorites, saved routines and full local-data reset.

### Native behavior and visual work

- Real Expo haptic phase cues, bundled audio cues, voice/tone/silent preferences and screen-awake behavior during active practice.
- Portrait layouts, safe areas, accessible control labels and touch targets, font scaling and reduced-motion behavior.
- Refined cards, navigation, protocol discovery, progress filters, session colors and fixed session controls.
- Box breathing follows a smooth native rounded-square path with phase colors. Other protocols use appropriate expansion, wave, alternating-side or ripple visuals.
- Onboarding and wordmark layout fixes are in the latest native build.
- Offline privacy, safety and help screens, plus user-initiated support email.

Physical haptic/audio quality, screen readers and large-text layouts still require device acceptance; implementation alone does not establish that these checks passed.

## Architecture

The repository uses npm workspaces. Current mobile dependencies include Expo SDK 57, React Native 0.86.3, React 19.2.3, Expo Router and TypeScript. Reanimated drives native animation; Expo SQLite provides local persistence.

```text
apps/mobile                 Canonical iOS/Android Expo application
apps/web                    Static public privacy, safety and support pages
packages/breathing-engine   Platform-independent timing and session logic
packages/protocols          Versioned built-in protocol definitions
packages/shared-types       Common domain types
packages/design-tokens      Shared colors, spacing, typography and motion constants
UI                          Original Stitch references
tests                       Engine, persistence, geometry and progress tests
release                     Store metadata, public content and release assets
scripts                     Validation, public-page generation and capture tooling
.github/workflows           Verification, native builds/captures and public-page deployment
```

The web folder is not a responsive-web/PWA implementation of the app. Browser exercises, accounts and shared links are future work. There is no backend required to use the current mobile app.

### Timing and interruption policy

The [breathing engine](packages/breathing-engine/src/index.ts) supports arbitrary ordered phases, durations, cycles and multiple blocks. It computes phase position, elapsed time and remaining time from authoritative timestamps. UI refresh intervals are not the source of elapsed time; delayed rendering does not decrement a counter incorrectly.

The mobile controller uses a monotonic running clock anchored to wall time. Backgrounding, screen lock, Android focus loss, leaving the session route and supported audio interruptions pause practice and persist it. **A session does not intentionally continue running while the app is in the background.** Returning requires an explicit resume.

Active state is checkpointed approximately every second. After process termination, recovery pauses at the last durable checkpoint and excludes unknown time after it. This favors safe recovery over assuming the user kept breathing while the app was unavailable; it cannot reconstruct the exact instant of an abrupt process kill.

### Local data and recovery

[SQLite storage](apps/mobile/src/storage.ts) uses schema version 2 with WAL and FULL synchronous persistence. It stores sessions, pending State Shift answers, preferences and saved routines. The version 1 → 2 migration preserves existing data.

- Active-session and history snapshots remain independent of subsequent routine edits.
- Pending post-session answers survive relaunch; completion is idempotent.
- Save failures pause practice and expose recovery/retry instead of silently discarding results.
- Unsupported or corrupt storage is preserved rather than silently reset.
- Full reset removes sessions, preferences and routines in a transaction.

Data lives in the application's sandbox. There is no separate database encryption, developer cloud backup or sync. Operating-system backups may include app data. User-directed sharing and support email leave the app only when initiated by the user.

### Stitch design reuse

The [original UI exports](UI/) contain screen references and generated HTML/Tailwind presentations, including future account, subscription and shared-web screens. They are design inputs, not implemented product features.

Reusable work includes the dark surface hierarchy, periwinkle accents, Inter/Space Grotesk typography, cards, buttons, pills, rating scales, tab patterns, spacing and screen composition. These are reproduced with native components and bundled fonts. HTML elements, CDN styling/fonts, browser layout and DOM animation were not retained as the application architecture.

[Design tokens](packages/design-tokens/src/index.ts) hold the shared constants. Selected Stitch screens/HTML take precedence where the prose in [DESIGN.md](UI/inout/DESIGN.md) conflicts with their palette. Later refinements preserve that visual direction. References to biometrics in the original design prose do not describe implemented sensing or measurement.

## Verification evidence and limits

These are recorded results, not a claim that every current release check is green:

| Evidence | App source | Result |
| --- | --- | --- |
| [Latest native verification/build run](https://github.com/Clercminator/InOut/actions/runs/35186133361) | `d8eec31` | Types, 53 automated tests, Expo Doctor and platform exports passed. Android APK built; Android smoke failed at History navigation after relaunch. iOS simulator built and launched. Overall run failed. |
| [Latest iPhone capture](https://github.com/Clercminator/InOut/actions/runs/35187207837) | `d8eec31`, capture workflow `a848eb4` | Maestro flow failed; complete screenshot set not retained. Requires diagnosis. |
| [Earlier Android capture](https://github.com/Clercminator/InOut/actions/runs/35149413571) | `8f29dfb` | Offline flow, background/process recovery, pending-post recovery, history after relaunch and saved routines passed; screenshots retained. |
| [Earlier iPhone flow](https://github.com/Clercminator/InOut/actions/runs/35185978912) | `8f29dfb` | Today → pre-rating → full Sigh session → post-rating → Result → History passed on simulator. Test report retained; screenshots were not retained. |

The 53 tests comprise 27 domain/storage/geometry/progress tests and 26 mobile tests. Coverage includes phase boundaries, pause/resume/recovery, persistence and migration, and mobile session behavior. The earlier passing runs predate the latest branding fixes. Capture workflow revisions and the source revision of the reused binary can differ, so both matter.

The last recorded dependency audit found 14 moderate advisories and no high/critical advisories, including transitive Expo tooling/router dependencies. Breaking dependency downgrades were not applied. This is a historical result, not a fresh audit performed for this README update.

**Still unverified for release:** signed physical-device builds; real calls/alarms, headphones and silent-mode behavior; haptics; lock/keep-awake behavior; recovery and storage-error handling on devices; VoiceOver/TalkBack, large text and reduced motion; final store screenshots and submission acceptance. Expo Go connectivity does not replace these checks.

## Run and develop

Use Node.js 24 (matching CI) and npm. From the repository root:

```powershell
npm ci
npm start
```

Open the project with a compatible Expo Go version on the same network. The current app does not require backend credentials for offline practice. Development serving uses Metro; an installed native build is needed to validate standalone offline operation.

For native development builds:

```powershell
cd apps/mobile
npx expo run:android
# On macOS with Xcode:
npx expo run:ios
```

Local Android builds require the Android SDK and Java tooling; local iOS builds require macOS/Xcode. GitHub Actions provides native build verification from this Windows development environment.

From the repository root, validate code and release metadata:

```powershell
npm run verify
npm run release:check
```

`verify` runs TypeScript, domain/storage tests and mobile tests. `release:check` validates release metadata/assets; it does not establish store approval or physical-device behavior. To regenerate the public pages from the shared release content, run `npm run release:pages`.

### Native builds and capture tooling

- [Verification workflow](.github/workflows/verify.yml): automated checks, Android preview APK, Android emulator smoke and iOS simulator build/launch.
- [Android capture workflow](.github/workflows/android-capture.yml) and [iPhone capture workflow](.github/workflows/ios-capture.yml): reuse a build run's native artifact for runtime/capture checks.
- [Android smoke script](scripts/android-smoke.py) and [iPhone Maestro flow](.maestro/ios-store.yaml): automated native interactions.
- [Screenshot packaging script](scripts/package-store-screens.ps1): packages actual captured screens, without replacing the UI with fabricated mockups.
- [EAS configuration](apps/mobile/eas.json): preview APK, iOS simulator and production AAB/iOS profiles. Production signing/project setup remains outstanding.

CI Android APKs use internal/development signing; simulator `.app` files are not installable iPhone IPAs. Neither is a completed store upload. CI artifacts can expire; retain approved release evidence deliberately.

## Store presentation and public pages

- [Store listing](release/store-listing.json): descriptions, keywords and reviewer walkthrough.
- [Shared public content](release/content.json) and [publisher information](release/public-info.json): sources for native legal/help content and generated public pages.
- [Release assets](release/assets/): Play icon and feature graphic; native app/adaptive icons live in [mobile assets](apps/mobile/assets/).
- Published [Privacy](https://clercminator.github.io/InOut/privacy.html), [Safety](https://clercminator.github.io/InOut/safety.html) and [Support](https://clercminator.github.io/InOut/support.html) pages.
- [App Store and Google Play submission guide](release/STORE_SUBMISSION_GUIDE.md): store-console handoff and acceptance checklist.

The configured app marketing version is `1.0.0`; workspace package versions remain `0.1.0`. Both native platforms use `com.imrtech.inout`. Store copy describes the free offline release, with no purchases or unavailable high-intensity practice.

## Deferred product vision

These items appear in the broader context or Stitch references but are **not implemented and are not part of the current free offline release**:

- Accounts, guest-to-account migration, Supabase/backend integration and cloud sync.
- Pro subscriptions, RevenueCat, purchase restoration, entitlements and web billing.
- Shared exercise URLs, browser breathing sessions, universal/app links and account/marketing web experiences.
- Reminders/notifications, developer analytics and a richer personalized insight system.
- Generated visual share cards and expanded session notes.

Future work should be distinguished from the open release checklist at the top. Mark a release task complete only when its implementation and relevant verification evidence are recorded here.
