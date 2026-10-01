# IN/OUT

IN/OUT is a native iPhone and Android breathing app built with React Native and Expo. Core practice, routines and history work offline without an account. Publisher: **David Clerc**. Support: **davidclerc@imrtech.xyz**.

Three maintained documents cover the project:

- **This README:** implementation, development, engineering backlog, QA and release evidence.
- **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md):** product direction, design principles and business/research decisions.
- **[OWNER_SETUP_CHECKLIST.md](OWNER_SETUP_CHECKLIST.md):** one ordered list of everything the owner must do for functionality, testing access and Android/iOS publication.

The updated [Stitch design reference](UI/inout/DESIGN.md) remains with the exported design assets; it is not another status tracker. Release JSON files remain the machine-readable content and readiness sources.

## Current status

**Updated September 30, 2026. Commercial v1 is not ready for store submission.** Native implementation now includes ten protocols (high-intensity cyclic practice requires explicit safety confirmation), local reminders, Pro insights, profiles/rituals/rewards, English/Spanish/Brazilian Portuguese, and Light/Dark/System themes. Core practice stays offline and account-free. Free includes one saved pattern, one mix and one reminder; Pro removes pattern/mix save limits, includes up to five reminders and insights, and suppresses ads. Existing saved items remain usable after downgrade.

Short, revocable exercise sharing is deployed: Supabase **InOut**, organization **IMR TECH**, São Paulo (`sa-east-1`), project `jvmrsoxknaidcbqoasst`; browser practice runs on the existing public site. Native feature/backend source changes remain in the local working tree. The narrow public-page publication is commit `e78da14840c2c7b5adde58b5b06fc7f8b33ccecc`, not delivery of the entire mobile candidate.

RevenueCat/AdMob adapters and event wiring exist, but production provider acceptance remains open. All six [readiness gates](release/readiness.json) remain false and store metadata remains a draft. Automated checks, live browser/API tests, physical native acceptance and store approval are distinct milestones. All manual actions belong in the [owner checklist](OWNER_SETUP_CHECKLIST.md).

## Commercial implementation and trying it

- [Entitlements](apps/mobile/src/entitlements.ts): centralized capabilities and save quotas, preservation of existing routines after downgrade, normalized store cache with a 72-hour maximum offline age and rollback rejection. Legacy preferences and development grants do not establish production Pro.
- [Subscriptions](apps/mobile/src/subscriptions.ts): RevenueCat and no-charge development adapters, monthly/annual offers, purchase/restore, lifecycle mapping and store management. The adapter reads the current offering's monthly and annual packages.
- Settings → **Pro & subscriptions** offers development purchase/failure/cancellation/restore and lifecycle simulations where enabled. These are not store transactions and cannot establish release acceptance.
- [Ads](apps/mobile/src/ads.ts) and [native slots](apps/mobile/src/ad-slot.tsx): Today/Progress only, protected-flow and Pro suppression. Native test mode uses Google's demo inventory with explicit loading; Expo Go shows only a placement preview. Live requests require configured IDs and UMP eligibility.
- [Analytics](apps/mobile/src/analytics.ts): event names only, local/dev sink, no remote transport. Core native and browser lifecycle triggers are wired; production collection remains disabled. See the event map for semantics and reserved events.
- [Environment template](apps/mobile/.env.example): consumed public provider variables. Native SDK testing requires a native build; Expo Go does not verify purchases or native ads.

## What has been implemented

### Complete native session flow

Launch/onboarding → Today → Calm Now → Physiological Sigh → optional Pre-State Shift → Active Session → Post-State Shift → Result → History.

- Today recommendations and a quick 48-second Physiological Sigh session.
- Protocol discovery, filters, details, favorites and safety guidance.
- Ten available versioned built-ins: Physiological Sigh, Box, Coherent, Extended Exhale, 4-7-8, Diaphragmatic, Equal, Nadi Shodhana, Bhramari and high-intensity cyclic breathing (Wim Hof Method). High-intensity content requires safety confirmation in native practice and is excluded from public exercise sharing.
- Pause, resume, restart and early end, with recovery after interruptions.
- Optional pre/post tension ratings from 1–10. Raw answers are stored; a comparison is calculated only after a post-session answer. Skipped answers are not invented or treated as zero.
- Results support improved, unchanged and increased reported tension. State Shift is self-reported, not biometric or a medical measurement.

### Routines, history and progress

- Custom patterns: add, remove, reorder and duplicate phases; edit durations and cycles; preview total time; run, save, edit, duplicate and delete routines.
- Mix Mode: combine built-ins and saved patterns in ordered blocks, set block cycles and whole-mix repeats, reorder/duplicate/remove blocks, save and run mixes, and see the next block during a session.
- History: session details, filters, replay using the stored protocol snapshot, individual deletion and clearing history.
- Native text result sharing through the operating system's share sheet, with private details excluded by default; separate hosted exercise links share only the validated cadence.
- Progress: period filters, session counts, practice time, streaks, activity, protocol usage and average paired self-reported shift.
- Settings, preferences, favorites, saved routines and full local-data reset.

### Reminders, insights and personalization

- Local profile/photo, goals, rituals, practice rewards and manually logged sessions; no cloud profile or account synchronization.
- Reminders select local time, weekdays and a quick practice or saved ritual. Permission is requested when enabling/saving an enabled reminder, never at startup. Alerts contain neutral text, no sound/badge/vibration, and never auto-start practice. Active/post-session banners are suppressed. Denied permission, missing rituals and scheduling failures have recovery paths. Expo Go cannot validate this feature.
- Pro insights compare the last seven days with the preceding seven. Most repeated completed pattern needs three completions in 30 days; median reported tension change needs five paired completed sessions across three days per unchanged protocol/version/plan. Manual and early-ended sessions do not establish tension patterns. Insufficient data stays explicit; no causal or efficacy claim.
- English, Spanish and Brazilian Portuguese UI/voice content; Light/Dark/System theme persistence without remounting active practice.

### Native behavior and visual work

- Real Expo haptic phase cues, bundled audio cues, voice/tone/silent preferences and screen-awake behavior during active practice.
- Portrait layouts, safe areas, accessible control labels and touch targets, font scaling and reduced-motion behavior.
- Refined cards, navigation, protocol discovery, progress filters, session colors and fixed session controls.
- Box breathing follows a smooth native rounded-square path with phase colors. Other protocols use appropriate expansion, wave, alternating-side or ripple visuals.
- Onboarding, wordmark, optional ratings, keyboard layouts and fixed session controls have been refined in source; current signed-device acceptance is still open.
- Offline privacy, safety and help screens, plus user-initiated support email.

Physical haptic/audio quality, screen readers and large-text layouts still require device acceptance; implementation alone does not establish that these checks passed.

## Architecture

The repository uses npm workspaces. Current mobile dependencies include Expo SDK 57, React Native 0.86.3, React 19.2.3, Expo Router and TypeScript. Reanimated drives native animation; Expo SQLite provides local persistence.

```text
apps/mobile                 Canonical iOS/Android Expo application
apps/web                    Public content and shared browser exercise player
packages/sharing            Validated public snapshots and sharing API client
supabase                    Share-service migrations and Edge Function
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

The web folder provides a focused shared exercise player and public pages, not the full mobile app. Sharing requires the hosted service; offline mobile practice does not. Authenticated accounts and cloud sync remain deferred.

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
- Full reset clears local sessions, preferences, routines and feature state, and reconciles reminder schedules. It also removes local share-management secrets: revoke links first if desired. Reset does not revoke hosted links or erase copies already loaded by recipients; the UI warns before deletion.

Data lives in the application's sandbox. There is no separate database encryption, developer cloud backup or sync. Operating-system backups may include app data. User-directed sharing and support email leave the app only when initiated by the user. Share records have the separate retention and revocation behavior below.

### Stitch design reuse

The [original UI exports](UI/) contain screen references and generated HTML/Tailwind presentations, including account, subscription and shared-web concepts. These exports are design inputs; current implementation status is described above.

Reusable work includes the surface hierarchy, vivid phase accents, Inter/Space Grotesk typography, cards, buttons, pills, rating scales, tab patterns, spacing and screen composition. These are reproduced with native components and bundled fonts. HTML elements, CDN styling/fonts, browser layout and DOM animation were not retained as the application architecture.

[Design tokens](packages/design-tokens/src/index.ts) hold the current Light/Dark constants. The updated [design reference](UI/inout/DESIGN.md) preserves the selected Stitch composition while documenting subsequent native refinements. Historical export colors do not override current tokens; instrumentation styling is not biometric sensing.

## Verification evidence and limits

The following is the September 29–30 implementation checkpoint, not physical-device or store approval. Documentation edits on September 30 do not rerun or renew application acceptance.

| Evidence | Recorded result / location |
| --- | --- |
| `npm run verify` | 202 tests passed: 93 domain/service/storage + 109 mobile in nine suites; localization and mobile/web/backend type checks passed. Local log: `artifacts/launch-features-final-verify.log`. |
| Dependency/native compatibility | Clean `npm ci`, zero reported `npm audit` vulnerabilities, Expo Doctor 21/21, Android and iOS JavaScript exports passed. Export log: `artifacts/launch-features-export.log`. These are not signed native builds. |
| Live sharing API | Create 201, resolve 200, incorrect revocation secret 404, valid revoke 200, subsequent resolve 404, CORS 204. `artifacts/live-sharing-verified.json`. |
| Real public browser | Start/completion/native CTA and revoked-link rejection passed; all test links revoked. EN/ES/PT, narrow layout, pause/background and reduced motion also exercised. |
| Hosted security | Private tables, client-role denial and service-role-only RPC access checked; Supabase security advisor returned no findings at that checkpoint. |
| Public publication | [Successful Pages run](https://github.com/Clercminator/InOut/actions/runs/36633884975), commit `e78da14840c2c7b5adde58b5b06fc7f8b33ccecc`. |
| Release preflight | Local metadata check passed; production preflight intentionally fails for missing provider configuration, draft metadata and six open gates. |

Logs/screenshots under `artifacts/` are local and ignored, not durable CI evidence. Preserve relevant results with the eventual source revision, build number, device/OS, date and reviewer in the existing checklist and retained build artifacts. Older September 17 Android/iPhone captures predate these features and cannot approve the current candidate. The Kotlin compatibility plugin is present; fresh native SDK compilation and distribution-build runtime evidence remain required.

Physical audio/haptics, notification delivery, screen readers, large text, real interruptions, billing/consent, verified native links and signed installation remain unaccepted.

## Run and develop

Use Node.js 24 (matching CI) and npm. From the repository root:

```powershell
npm ci
npm start
```

For a remote phone preview, run `npm run start:go:tunnel`; use its fresh QR and keep the terminal/computer awake. Ctrl+C stops that preview. Open with a compatible Expo Go version; tunnel URLs expire between sessions. The current app does not require backend credentials for offline practice. Development serving uses Metro; an installed native build is needed to validate standalone offline operation.

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
- [Owner setup checklist](OWNER_SETUP_CHECKLIST.md): the single list of manual setup, testing access and publication tasks.

The configured app marketing version is `1.0.0`; workspace package versions remain `0.1.0`. Both native platforms use `com.imrtech.inout`. Store copy is marked `draft-commercial-v1`. `release/readiness.json` keeps production gates closed until billing, ads/consent, sharing, analytics decision, device acceptance and metadata/legal approval are evidenced. Native high-intensity practice requires safety confirmation; public sharing rejects it.


## Engineering backlog

Owner actions and acceptance outcomes are tracked once in the [owner checklist](OWNER_SETUP_CHECKLIST.md); this list covers remaining code/build work.

- Deliver the complete reviewed native/backend source from the current working tree and run fresh CI against that exact revision. The published pages alone do not include it.
- Link the real EAS project and prepare a correctly signed, store-distributed acceptance build profile. Current `preview` is internal, `simulator` is iOS simulator-only, and `production` is intentionally gated; do not falsify gates to obtain a test build.
- Configure and exercise actual RevenueCat products, native SDKs, test ads and consent; resolve native build/runtime issues before acceptance. Preserve anonymous purchase/restore and the 72-hour maximum offline entitlement cache policy.
- Implement verified Universal Links/App Links on an owner-controlled origin with correct signing associations and real store destinations. Current `inout://shared?id=…` custom-scheme routing is implemented but does not satisfy this requirement.
- Apply the final SDK data inventory, audience/region policy, consent/tracking decision and any selected analytics transport. Production measurement may remain explicitly disabled.
- Resolve physical-device QA failures, approve actual candidate screenshots and release content, and close gates only with evidence.

## QA matrix

Detailed manual execution and sign-off belong in [owner checklist section 6](OWNER_SETUP_CHECKLIST.md#6-authorize-signing-and-distribute-test-candidates). Automated coverage establishes implementation behavior, not acceptance.

| Area | Existing coverage | Remaining acceptance |
| --- | --- | --- |
| Protocols/timing | Ten protocol definitions, engine phases/cycles, pause/recovery and safety confirmation | Both native platforms, real interruptions and safe high-intensity entry |
| Ratings/storage | Optional answers, persistence/retry/idempotency, corruption preservation | Relaunch, offline recovery, reset and visible error recovery |
| Routines/progress | Save quotas/downgrade, history/manual entries, calendar/rewards and insight sample rules | Complete user flows with empty and populated data |
| Reminders | Permission/scheduling failures, neutral alerts, response deduplication, no auto-start and reset races | OS delivery, timezone/DST, denial/re-enable and active-session behavior |
| UI/effects | Theme/visual timing, cue cleanup, reduced-motion and localized catalogs | Small phones, large text, screen readers, audible/tactile comfort |
| Billing/ads | Lifecycle/cache and mock exclusion; protected routes, consent/upgrade races | Real store sandbox lifecycle and native ads/consent |
| Sharing | Snapshot validation, real isolated Postgres role/expiry/revoke/rate tests, live API/browser checks | Safari/Chrome on phones, native routing and installed/uninstalled fallback |

## Hosted sharing and operations

[Supabase InOut](https://supabase.com/dashboard/project/jvmrsoxknaidcbqoasst) is in IMR TECH, São Paulo. The public API is configured in [release/sharing.json](release/sharing.json); native links use the public origin from [publisher information](release/public-info.json). Public links use `https://clercminator.github.io/InOut/reset.html?s=<id>&lang=en|es|pt`.

- `packages/sharing` allows versioned cadence only: no ratings, notes, private routine names or high-intensity cyclic snapshots. Bounds include 20 blocks, 20 phases per block, 100 cycles, 60 seconds per phase and 30 minutes total.
- `supabase/migrations` defines private share/rate tables with RLS and explicit client denial. RPC execution is restricted to the service role. `supabase/functions/inout-shares` validates public requests; JWT verification is disabled intentionally because reads are public and deletion uses the owner's secret.
- Creation stores the management secret locally before sending. Pending/uncertain requests remain manageable; failed revocations preserve controls. Public URLs never carry the secret; the server stores its hash. Do not log or publish management credentials.
- Links expire after 30 days. Revocation removes the snapshot and leaves a tombstone until cleanup, preventing a delayed retry from resurrecting it. Expired records are cleaned on creation, not by a scheduled deletion job. Expiry is an access limit, not a guarantee of physical deletion at that instant. Previously loaded/copied content cannot be recalled.
- Current abuse controls bound request size and globally cap new creation at 200/hour and 10,000 stored records; these are not per-person quotas or comprehensive DDoS protection. Operational budget, monitoring and escalation are owner checklist items.
- Browser practice has explicit start/pause/resume/stop, pauses on backgrounding, respects reduced motion, and has no account/payment/install gate, history or analytics transport. Completion offers the installed-app action; no fabricated store link.
- Source updates: apply the ordered migrations to the intended project, deploy `inout-shares` with its configured JWT policy, and run `npm run release:pages` to regenerate public pages/bundle. `scripts/build-shared-web.mjs` also emits the ignored Edge bundle. Review the target project and keep service-role credentials only in the server secret environment. Verify create → browser practice → revoke after deployment and revoke test links.

## Analytics event map

The allowlisted API accepts event names only; ratings, notes, routine content, wellbeing situations and identifiers are excluded. Native development can use a local logger; production and browser have no remote sink. Wiring does not establish collected metrics or attribution.

| Events | Implemented behavior / limit |
| --- | --- |
| `app_open` | Initialization, not a guaranteed count of every foreground return |
| `onboarding_started`, `onboarding_completed`, `situation_selected`, `protocol_opened` | Screen/user transitions; completion follows persisted preferences |
| `protocol_started`, `protocol_completed`, `protocol_abandoned`, `state_shift_pre_recorded`, `state_shift_post_recorded` | Starts and persisted terminal outcomes; rating presence only. Completion retry deduplicated in the controller; recovery does not synthesize a start. No cross-device exactly-once claim. |
| `custom_created`, `mix_created`, `custom_started`, `mix_started`, `mix_completed` | Successful first saves and execution transitions; shared snapshots excluded from custom/mix counts |
| `share_created` | OS share sheet reports shared action; does not prove recipient delivery or count every hosted creation |
| `shared_web_opened`, `shared_web_started`, `shared_web_completed`, `shared_web_app_open_clicked` | Browser lifecycle and installed-app CTA; no remote sink and no proof the app opened |
| `paywall_viewed`, `trial_started`, `subscription_started`, `subscription_restored`, `subscription_cancelled`, `ad_impression` | UI/provider callbacks implemented; store lifecycle, deduplication and device impression acceptance still needed |
| `share_link_copied`, `shared_web_install_cta_clicked` | Reserved names; no dedicated clipboard/store-install action currently implemented |

Do not describe a clipboard or installation funnel as measured. Owner approval determines whether to retain disabled production collection or commission a provider integration.

## Production design constraints

Owner decisions are recorded once in the [owner checklist](OWNER_SETUP_CHECKLIST.md). Engineering must enforce these boundaries:

- Enforce the approved offline cache cap (currently 72 hours). Cache is local sandbox state, not a cryptographic guarantee against device tampering; provider refresh remains authority. Premium server resources, if added, require server authorization.
- Implement the agreed anonymous purchase identity/restore and any future account transfer/deletion policy. Do not couple Free practice to authentication.
- Verify actual advanced benefits before selling them; reserved flags are not completed features.
- Implement the approved ad/consent/age/region policy and inventory SDK data. No sensitive targeting and no ad during core practice.
- Preserve deployed share expiry/revocation and independent offline practice. Do not promise permanent links or cross-device recovery of management secrets.

## Launch gates

All six keys in [release/readiness.json](release/readiness.json) are still false. Their manual completion criteria and evidence fields live only in [owner checklist section 7](OWNER_SETUP_CHECKLIST.md#7-approve-and-publish). `release/store-listing.json` remains `draft-commercial-v1` until approval. Do not treat a passing local metadata check as permission to flip either status.

Run production preflight in the environment containing the intended production public configuration:

```powershell
$env:INOUT_RELEASE = '1'
try { npm run release:check } finally { Remove-Item Env:INOUT_RELEASE }
```

The production build intentionally refuses missing/demo provider configuration, unapproved metadata or open gates. Store approval and the owner's release decision remain external steps after technical acceptance.
