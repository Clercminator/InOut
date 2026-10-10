# IN/OUT

IN/OUT is a native iPhone and Android breathing app built with React Native and Expo. Core practice, routines and history work offline without an account. Publisher: **David Clerc**. Support: **davidclerc@imrtech.xyz**.

Three maintained documents cover the project:

- **This README:** implementation, development, engineering backlog, QA and release evidence.
- **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md):** product direction, design principles and business/research decisions.
- **[OWNER_SETUP_CHECKLIST.md](OWNER_SETUP_CHECKLIST.md):** one ordered list of everything the owner must do for functionality, testing access and Android/iOS publication.

The updated [Stitch design reference](UI/inout/DESIGN.md) remains with the exported design assets; it is not another status tracker. Release JSON files remain the machine-readable content and readiness sources.

## Current status

**Updated October 1, 2026. Commercial v1 is not ready for store submission.** Native implementation now includes ten protocols (high-intensity cyclic practice requires explicit safety confirmation), local reminders, Pro insights, profiles/rituals/rewards, English/Spanish/Brazilian Portuguese, and Light/Dark/System themes. Core practice stays offline and account-free. Free includes one saved pattern, one mix and one reminder; Pro removes pattern/mix save limits, includes up to five reminders and insights, and suppresses ads. Existing saved items remain usable after downgrade.

Short, revocable exercise sharing is deployed: Supabase **InOut**, organization **IMR TECH**, São Paulo (`sa-east-1`), project `jvmrsoxknaidcbqoasst`; browser practice runs on the existing public site. Native feature/backend source changes remain in the local working tree. The narrow public-page publication is commit `e78da14840c2c7b5adde58b5b06fc7f8b33ccecc`, not delivery of the entire mobile candidate.

RevenueCat/AdMob adapters and event wiring exist, but production provider acceptance remains open. All seven [readiness gates](release/readiness.json) remain false and store metadata remains a draft. Automated checks, live browser/API tests, physical native acceptance and store approval are distinct milestones. All manual actions belong in the [owner checklist](OWNER_SETUP_CHECKLIST.md).

## Commercial implementation and trying it

- [Entitlements](apps/mobile/src/entitlements.ts): centralized capabilities and save quotas, preservation of existing routines after downgrade, normalized store cache with a 72-hour maximum offline age and rollback rejection. Legacy preferences and development grants do not establish production Pro.
- [Subscriptions](apps/mobile/src/subscriptions.ts): provider-neutral service with an isolated RevenueCat adapter and a guarded test provider, weekly/monthly/yearly offers, purchase/restore, lifecycle mapping and store management. The adapter reads offering `default` and entitlement `in_out_pro`.
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
- [EAS configuration](apps/mobile/eas.json): preview APK, iOS simulator, signed `store-test` AAB/TestFlight and gated production profiles. Real EAS project/signing credentials remain owner setup.

CI Android APKs use internal/development signing; simulator `.app` files are not installable iPhone IPAs. Neither is a completed store upload. CI artifacts can expire; retain approved release evidence deliberately.

## Store presentation and public pages

- [Store listing](release/store-listing.json): descriptions, keywords and reviewer walkthrough.
- [Shared public content](release/content.json) and [publisher information](release/public-info.json): sources for native legal/help content and generated public pages.
- [Release assets](release/assets/): Play icon and feature graphic; native app/adaptive icons live in [mobile assets](apps/mobile/assets/).
- Published [Privacy](https://inout.imrtech.xyz/privacy), [Safety](https://inout.imrtech.xyz/safety) and [Support](https://inout.imrtech.xyz/support) pages.
- [Owner setup checklist](OWNER_SETUP_CHECKLIST.md): the single list of manual setup, testing access and publication tasks.

The configured app marketing version is `1.0.0`; workspace package versions remain `0.1.0`. Both native platforms use `com.imrtech.inout`. Store copy is marked `draft-commercial-v1`. `release/readiness.json` keeps production gates closed until billing, ads/consent, sharing, analytics decision, device acceptance and metadata/legal approval are evidenced. Native high-intensity practice requires safety confirmation; public sharing rejects it.


## Engineering backlog

Owner actions and acceptance outcomes are tracked once in the [owner checklist](OWNER_SETUP_CHECKLIST.md); this list covers remaining code/build work.

- Deliver the complete reviewed native/backend source from the current working tree and run fresh CI against that exact revision. The published pages alone do not include it.
- Apply real EAS project/provider/signing configuration to the implemented `store-test` profile, then accept store-installed candidates. Production remains gated.
- Configure and exercise actual RevenueCat products, native SDKs, test ads and consent; resolve native build/runtime issues before acceptance. Preserve anonymous purchase/restore and the 72-hour maximum offline entitlement cache policy.
- Implement verified Universal Links/App Links on an owner-controlled origin with correct signing associations and real store destinations. Current `inout://shared?id=…` custom-scheme routing is implemented but does not satisfy this requirement.
- Approve the SDK data inventory below and resolve audience/region/consent declarations. Remote product analytics remain disabled for v1; no analytics SDK was added.
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

[Supabase InOut](https://supabase.com/dashboard/project/jvmrsoxknaidcbqoasst) is in IMR TECH, São Paulo. The public API is configured in [release/sharing.json](release/sharing.json); native links use the public origin from [publisher information](release/public-info.json). Public links use `https://inout.imrtech.xyz/reset.html?s=<id>&lang=en|es|pt`.

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

All seven keys in [release/readiness.json](release/readiness.json) are still false. Their manual completion criteria and evidence fields live only in [owner checklist section 7](OWNER_SETUP_CHECKLIST.md#7-approve-and-publish). `release/store-listing.json` remains `draft-commercial-v1` until approval. Do not treat a passing local metadata check as permission to flip either status.

Run production preflight in the environment containing the intended production public configuration:

```powershell
$env:INOUT_RELEASE = '1'
try { npm run release:check } finally { Remove-Item Env:INOUT_RELEASE }
```

The production build intentionally refuses missing/demo provider configuration, unapproved metadata or open gates. Store approval and the owner's release decision remain external steps after technical acceptance.

## Provider-neutral subscriptions and reviewer access

`SubscriptionProvider` exposes store-neutral offers, normalized grants, purchase/restore, refresh, management links, lifecycle notifications and an authenticated-identity boundary. Only `src/subscription-providers/revenuecat.ts` imports RevenueCat. It retains the SDK-generated anonymous ID. The future `SubscriptionService.identify` boundary clears prior identity access before SDK logIn/logOut; it is not wired to editable profile fields. Mobile account sign-in and account deletion are still unimplemented and remain a separate launch blocker.

The shared contract in `release/monetization.json` is entitlement **`in_out_pro`**, offering **`default`**, with standard **Weekly**, **Monthly**, **Annual** packages (UI: Yearly; internal ID: `annual`). No real product IDs were found in this repository. Proposed owner-created IDs are `inout_pro_weekly`, `inout_pro_monthly`, `inout_pro_yearly`; these are not claims of configured products. The adapter deliberately selects `offerings.all.default`, so RevenueCat targeting of another current offering does not silently change this release.

The paywall starts on Monthly, shows all available valid plans, and never selects Weekly automatically. `productConfig.defaultPlan`, `planOrder` and `emphasizeAnnual` control presentation. Yearly gets Best value only when valid same-currency prices make it cheaper than all available shorter plans. Missing prices, currencies, periods or offering configuration yield no invented offer. Localized prices come from the store; introductory details appear only with SDK eligibility/selected Android offer metadata. Purchase cancellation, pending approval, network errors, restore-with-no-entitlement, cancellation with paid-through access, billing retry, grace, expiry and refunds have distinct handling.

`EntitlementService` resolves subscription OR independent temporary reviewer access for every Pro capability. Store grants require RevenueCat verified response metadata; failed/unrequested verification cannot grant Pro. Production normalized grants are cached in device-bound SecureStore, not editable SQLite preferences. Legacy SQLite grants are ignored. Debug cache uses a separate namespace and Test Store/development grants are never persisted as paid evidence. Offline access is bounded by 72 hours since provider verification and paid/grace expiry; rollback is rejected. A rooted/compromised device is outside the protection of a client cache; future paid server resources must authorize on the server.

The supplied key is a **public RevenueCat Test Store SDK key**, not a secret management key. It is configured only in ignored `apps/mobile/.env.local` with `EXPO_PUBLIC_REVENUECAT_MODE=test-store`; the native adapter requires `__DEV__`. It shows a Test Store notice and creates development grants. Real store builds require `EXPO_PUBLIC_REVENUECAT_MODE=store` and platform `appl_`/`goog_` public SDK keys; build policy rejects Test Store configuration. An explicit `mock` mode remains available only in development. Expo Go does not run the native billing/ads SDKs. No Test Store transaction, management API configuration, or store sandbox transaction has been verified in this run.

Both native AdMob app IDs, banners and interstitials supplied by the owner are centralized in `release/monetization.json` and consumed by Expo config and runtime. No UI embeds an ad ID. Debug builds always use Google test units. Store-test also uses test units; production requires explicit live mode. All native requests wait for UMP eligibility, reviewer hydration and initial subscription reconciliation. Paid Pro and reviewer Pro make no ad requests or preloads. Request options are non-personalized and contain no practice/profile targeting; no ATT prompt or tracking permission was added. This does not imply that provider identifiers or diagnostics are absent.

Banners are restricted to Today and Progress outside practice/challenge attempts. Interstitials can preload only on a newly completed non-manual breathing result after consent has already been obtained, and show only on **Done → View history**. No ready ad means immediate navigation. Interrupted/unwell sessions, challenges, onboarding, safety, paywalls, background and active breathing cannot trigger them. Caps in `productConfig.interstitial`: at least three eligible completions, three minutes after launch, ten minutes between ad attempts, five minutes after dismissing a paywall, maximum two per UTC day. Deduplication/caps persist in SQLite and corrupt cap state fails closed. An upgrade or route/background change discards a pending ad. Native Google event delivery still requires physical-device acceptance.

**Future Qonversion:** implement the same provider interface and reconcile store transaction IDs, paid-through/grace/refund state, guest aliases and receipt imports before changing the factory. Preserve `in_out_pro`, all three plans, restore and cache bounds; invalidate the old provider cache at cutover. No second billing SDK or auth system was added.

**October 8 monetization verification:** `npm run verify` passed localization generation/checks, web lint, mobile/web/Edge TypeScript, **145 core/backend tests and 152 mobile tests (11 suites)**. Both Android and iOS production-mode JavaScript/Hermes exports passed with `.env` loading disabled; the supplied Test Store key was absent from both exports. These are bundles, not signed AAB/IPA builds. Draft `release:check` passes; production preflight intentionally fails for missing real platform keys/EAS configuration, draft metadata and seven open gates. Additional fixtures reject Test Store/secret keys for store builds. Native load/show exceptions, privacy-consent races, all three plan defaults and failed identity migration have regression coverage.

The public terms correction (Weekly/Monthly/Yearly) is deployed to Vercel production: **`dpl_BhdeHWa569sVshz2ccspuMSYTNVd`**, READY, static build from the working tree based on `e78da148` (not a clean committed release), approximately 2.1 seconds build time. HTTPS `/terms`, `/privacy`, `/support`, `/delete-account` and `/delete-data` returned 200 with security headers; `/terms` contains the three durations. No live ad, real store transaction, signing operation, store submission, DNS change or new tracking SDK was performed. Runtime log/drain monitoring was not audited in this terms-only deployment.

### Reviewer threat model and operation

Settings → Plan & privacy → Pro & subscriptions → Reviewer access accepts a code only in memory. The HTTPS `inout-reviewer` Edge Function compares its SHA-256 to a server secret, checks enablement/code expiry, and returns a random 256-bit opaque grant. This is a **server-validated grant**, not a self-verifying JWT. Its hash, hashed random installation ID, generation, expiry and revoked flag are stored in private RLS tables; only service-role invoker RPCs can access them. No code, token or raw installation ID is logged by the handler. Public JWT verification is deliberately disabled because reviewers have no account; the code/token is the credential. Credentials belong in POST bodies, never URLs.

The mobile record (installation ID, token, server expiry/validation time and local clock high-water mark) lives in Expo SecureStore with device-only iOS keychain accessibility and Android encrypted storage/backup exclusion. Maximum grant lifetime is seven days or code expiry, whichever is earlier. Offline access ends at the earliest of server expiry, elapsed server-approved remaining lifetime and **one hour after validation**. Foreground and 15-minute active timers validate it again; server denial clears it immediately. Network/server failure never extends cached access. Time rollback, invalid timestamps, excessive server/device clock skew and secure-storage failure fail closed. Local reset clears reviewer access before completing. iOS keychain records can survive reinstall on the same device; they remain time-limited and server-revocable.

Atomic Postgres limits apply before code/token validation: redeem 10 attempts/installation/hour and 300 globally/hour; validate 60/installation/hour and 3,000 globally/hour. Global caps bound rotating-installation attacks; they can also be exhausted to deny reviewer service. Platform traffic budgets/monitoring remain necessary. These controls do not claim protection against a compromised/rooted device, patched app, stolen unlocked-device storage, deliberate manipulation of all local clocks/storage, leaked review codes or distributed denial of service. A bearer token plus its installation ID can be copied on a compromised device; there is no hardware attestation. Premium server resources, if introduced later, must enforce authorization on the server.

Rotate the code hash **and generation**, disable access, shorten code expiry, or mark a grant revoked. Connected clients lose access on their next validation; an already validated offline device may retain it for at most one hour and never past its grant deadline. Expired grants/rate buckets are pruned by subsequent reviewer requests, not by a scheduled exact-time deletion. Supabase logs/backups have separate owner-controlled retention. Secret setup and private store text are in the owner checklist.

### Acceptance-build and link configuration

`store-test` uses store distribution, remote EAS credentials, Android AAB and non-simulator iOS builds with auto-incremented build numbers, the EAS `preview` environment, real platform RevenueCat keys and real AdMob app IDs, but explicit Google **test banner and interstitial** inventory. This supports Play internal testing and TestFlight once the owner links the EAS project and supplies signing. A test inventory pass does not validate production ad units/consent. Configure a later acceptance candidate's explicit live mode only with real units, registered test devices and approved consent policy; do not click live ads. `production` still requires every readiness gate, approved metadata and live non-demo IDs. Both `app.config.ts` and the EAS preinstall hook enforce policy, so invoking production through EAS cannot silently fall back to demo IDs.

`release/links.json` owns the final HTTPS origin/path, Apple Team ID, Play **app-signing** SHA-256 fingerprints and real store destinations. The origin is https://inout.imrtech.xyz. `npm run release:pages` emits empty association declarations until the real signing values are supplied; empty declarations do not verify native links. Host them at the origin root with JSON content type and no redirect; GitHub project-subpath hosting alone is insufficient. Native config adds associated domains/verified intent filters, and `+native-intent.tsx` maps a verified `reset.html?s=<id>` into the existing validated shared route. Native creation uses the configured origin, browser fallback keeps practice available and optional real store buttons appear only when supplied. Rebuild and verify installed/absent behavior using the Apple team and Play production signing certificate, not the upload key.

## October 8 production web verification and submission boundary

The public surface is deployed on the existing **In/Out** Vercel project at **https://inout.imrtech.xyz**, operated by **IMR Tech SpA**. No DNS, corporate-site or store-console changes were made. Final deployment: `dpl_DA3j2m9VJxU2svto4wqDEM2KeH5U` (READY, production domain assigned). EAS CLI reports not logged in; no signed store build was created in this pass. The app is **not yet ready for submission**: accounts, provider/device acceptance and owner sign-off remain open. The new `accountsAndDeletionVerified` gate prevents those missing requirements being overlooked.

| Requested surface | Implementation and evidence |
| --- | --- |
| Architecture and landing | Existing static HTML/TypeScript/esbuild architecture; no new framework/backend service. `scripts/build-public-pages.mjs`, `apps/web/site-content.mjs`, `apps/web/site.css`, `vercel.json`. Responsive, semantic landing uses actual app icon/colors. |
| Public routes | `/`, `/privacy`, `/terms`, `/support`, `/delete-account`, `/delete-data`, `/safety`; production HTTP 200, correct operator and canonical URLs. Unknown path returns a genuine 404. |
| Privacy and Terms | Describe current local-first practice, planned accounts, configured RevenueCat/AdMob, optional welcome email, infrastructure, retention and deletion limits. Safety and store billing/cancellation/restore are covered. Content exists and is public; legal approval remains open. |
| Support | Existing `davidclerc@imrtech.xyz`, FAQs and deletion links. Mailbox deliverability and staffing still need owner confirmation. No invented contacts, testimonials, metrics, prices or store IDs. |
| Account deletion | Existing-account Supabase magic-link verification → displayed scope → required confirmation → authenticated request receipt. Email assistance is available without reinstalling the app. `Settings → Account & data requests` opens the page. This is a **request workflow requiring operator fulfillment**, not automatic deletion. |
| Partial deletion | Same verification; select eligible server data, welcome-email records or support correspondence while retaining account. Explicit local-history/reset instructions match mobile implementation. Browser cannot erase SQLite data. |
| Supabase | Applied `20261008214815_privacy_requests.sql` and `20261008215902_privacy_request_rate_limit.sql`; deployed `inout-privacy` version 1 with JWT verification and Auth user lookup. Private RLS tables, service-only invoker RPC, confirmation/input/origin/size checks, duplicate receipts and 20 requests/hour/account. Live anon/authenticated RPC grants are denied. Security advisors returned no notices. |
| Deletion acceptance limit | Initial live Auth user count was zero. No real inbox → verified session → fulfilled deletion acceptance was established. Auth redirect allowlist, production mail delivery and operator fulfillment must be validated. Mobile account creation/sign-in is still absent and remains engineering work for the stated production-account scope. |
| Sharing | Existing `/reset.html?s=<random-id>` architecture preserved; 30-day expiry/revocation and privacy filtering remain. Open-in-app CTA available after load; optional store URLs and reusable OG image supported. Challenge/result images still use the OS share sheet; no new hosted private-result endpoint or user-ID lookup added. |
| Android/iOS links | Both `.well-known` URLs return HTTP 200 with JSON content type and no redirect. Empty declarations deliberately authorize no app until actual Apple Team ID and Play signing SHA-256 are supplied. Native identifiers remain `com.imrtech.inout`; physical installed/uninstalled acceptance is outstanding. |
| Store URL/configuration | `APP_STORE_URL`, `GOOGLE_PLAY_URL`, `SUPPORT_EMAIL` at build time; defaults in `release/links.json` and `release/public-info.json`. Unknown store destinations stay hidden. Canonical origin fixed to the authorized production domain. |
| Security/metadata | No service credentials in browser bundles; only existing public anon key. Memory-only verification token; URL fragment removed immediately; HTTPS, no-referrer, CSP, anti-framing, no-store for deletion routes. Titles, descriptions, canonical/OG/Twitter metadata, favicon, sitemap, robots and accessible labels/live status included. |
| Validation | Production build, web/backend ESLint and TypeScript pass. 144 core/backend tests and 129 mobile tests pass. Browser checks cover invalid email and expired link, legal/footer navigation, form labels and no horizontal overflow at phone/tablet/desktop viewport overrides. Live absent/invalid/anon credentials return 401. Automated/local results do not establish real-account fulfillment or store/device acceptance. |
| Submission blockers | Seven readiness gates remain false; metadata remains draft. Missing accepted signed AAB/IPA, billing/ads and physical-device evidence, reviewer acceptance, production account lifecycle, deletion fulfillment, legal/store disclosures. Signing association values and final store destinations are also missing. Exact owner actions remain in `OWNER_SETUP_CHECKLIST.md`. |

Privacy-request operations: monitor pending rows with a privileged server/operator connection; never expose the private schema to clients. Verify a support-only request by an independent confirmation sent to the claimed address before disclosing or deleting records. Fulfill applicable account data and provider requests, explain retained categories to the requester, then update the receipt to `status='completed', completed_at=now(), email=null, user_id=null`. Do not mark it completed before fulfillment. Completed anonymous receipts are cleaned after 90 days on subsequent requests; hourly rate counters expire after one day on subsequent requests. An operator should schedule equivalent cleanup when traffic is idle. Auth deletion alone does not revoke already-issued JWTs: revoke sessions and ensure privileged endpoints revalidate identities. Sharing/reviewer installation IDs and welcome-email hashes are not account-owned and need their appropriate verification/lookup, not broad deletion of unrelated rows.

Dependency audit: `npm audit --omit=dev` reports 56 affected dependency entries (51 high, 5 moderate), propagated from `braces`, `node-forge` and `sprintf-js`. The current paths are Jest/Expo CLI tooling; the static deployed site has no Node runtime or those dependencies. Registry latest versions were still affected on October 8. No forced Expo/Jest/native downgrades were applied. Engineering must resolve or explicitly assess the build-chain advisories before calling the whole candidate security-clean: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).

### Google Play Data Safety working inventory

This table is source-backed preparation, not a submitted declaration. A service-provider transfer can be exempt from Play's definition of “shared”; final classification depends on contracts, SDK settings and actual production behavior. HTTPS protects the app/web service endpoints; separately sent support email depends on the sender/mail provider. No blanket all-data deletion or ephemeral-processing claim is justified.

| Play data category | Collected off-device? | Shared? | Required/optional | Purpose | Transit | Deletion | Processor and implementation evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Personal info: name/email | Optional welcome delivery, support; verified privacy requests. Account email when accounts are available | Service providers; assess exception | Optional features; required to verify a request | Requested email, support, account/privacy management | HTTPS APIs; email provider transport separate | Verified request; provider records subject to retention | Supabase/Resend/mail provider; `welcome-email.ts`, `inout-welcome/index.ts`, `inout-privacy/index.ts` |
| Personal info: user IDs | Purchase SDK anonymous ID, reviewer installation hashes; Supabase ID for provisioned-account requests | Providers; assess exception | Required for the selected feature | Entitlements, authentication, fraud prevention | HTTPS | Request/retention-dependent | RevenueCat/Supabase; `subscription-providers/revenuecat.ts`, `reviewer-native.ts`, privacy migrations |
| Financial info: purchase history | Yes when billing configured/used | RevenueCat and stores; assess provider exception | Optional purchase; validation required | Purchase/restore, subscription management, fraud prevention, provider reporting | Provider HTTPS | Provider/store transaction retention; no promise to erase store records | RevenueCat, Apple, Google; `apps/mobile/src/subscription-providers/revenuecat.ts` |
| Location: approximate | AdMob can derive from IP; no location permission requested | Google advertising processing | Conditional on ads/consent; do not label all processing optional without SDK verification | Ads, measurement, abuse prevention | SDK transport; verify native candidate | Provider-dependent | AdMob/UMP; `ads.ts`, `ad-slot.tsx`, installed Mobile Ads SDK |
| Device or other IDs | Ad SDK, purchase SDK, reviewer installation ID, optional welcome abuse counters | Google and service providers | Conditional feature/SDK processing | Ads, subscription functionality and security | HTTPS | Provider-dependent; verified server request where applicable | `commercial.ts`, `ads.ts`, reviewer/welcome handlers |
| App activity: interactions | Ad interactions through SDK; app's own event logger has no remote sink | Google for advertising | Conditional ads | Advertising/measurement/security | SDK HTTPS; verify final native traffic | Provider-dependent | `ads.ts`, `ad-slot.tsx`, `analytics.ts` |
| App info/performance: diagnostics | AdMob/provider diagnostics; no app-owned crash reporting SDK | Google/provider processing | Conditional SDK processing | Performance, fraud prevention | SDK HTTPS | Provider retention | `apps/mobile/package.json`, `app.config.ts`, provider disclosure guides |
| App activity: other user-generated content | Opt-in uploaded exercise cadence; support text/attachments. Milestone/results are user-directed OS sharing | Public cadence link; chosen sharing recipient | Optional | Sharing/support | HTTPS share API; selected recipient transport separate | Revoke link; retained recipient copies cannot be recalled | Supabase, chosen service; `share-exercise.tsx`, `packages/sharing`, `challenge-share.ts` |
| Health/fitness: practice and subjective wellness | Session/Challenge history, State Shift and personal bests stay local by default; a user may explicitly share shown result content | Only user-directed result sharing | Optional local inputs/sharing | Practice/progress | No app history upload | Local history/reset; shared copies external | SQLite `storage.ts`, `challenge-share.ts`, `challenge-test.tsx`; no HealthKit/Health Connect |
| Photos | Profile photo remains local; no backend upload | No app transfer | Optional | Local profile | Not transmitted | Replace/reset local data; OS backups separate | `profile-photo.ts`, system photo picker |
| Web/network metadata | IP, browser requests and infrastructure diagnostics | Hosting processors; provider exception review | Necessary to access online services | Hosting/security | HTTPS | Logs/backups follow provider retention | Vercel/Supabase; `vercel.json`, Edge handlers |

For Apple, reconcile the same categories with App Privacy's linked-to-user and tracking definitions. “Non-personalized ads” does not settle ATT or tracking answers. No store forms were submitted. References: [Google Data Safety definitions](https://support.google.com/googleplay/android-developer/answer/10787469), [Google ad SDK disclosure](https://developers.google.com/admob/android/privacy/play-data-disclosure), [RevenueCat privacy guidance](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy), [Apple account deletion](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion), [Google account deletion](https://support.google.com/googleplay/android-developer/answer/13327111).

## Privacy and store data inventory (October 8, 2026 source)

This is a recommended declaration inventory, not a submitted form or packet-capture certification. “Collected” means transmitted off-device; “shared” below describes recipient disclosure, with store-specific service-provider exceptions requiring owner review. Optional user actions do not make all SDK processing optional. Mobile account creation and remote profile/history sync are not implemented. The web supports verification of provisioned Supabase accounts for deletion requests. No remote product analytics, push-token registration, Expo Updates or crash-reporting transport is configured by In/Out.

| Source/data | Storage and transmission | Classification, purpose and retention |
| --- | --- | --- |
| SQLite sessions, phase snapshots, optional ratings/effects, history/manual entries, preferences, favorites, custom patterns/mixes, goals/profile, rituals/rewards, reminder schedules | App sandbox only; OS backups may include data | Local-only; user-entered ratings/profile optional. Practice/functionality; until user deletion/reset. No separate SQLite encryption. |
| Optional profile photo | OS picker, copied to app files; no upload, EXIF is not requested | Local-only/optional. Existing copies cleared by photo replacement/reset; OS backups separate. No camera permission. |
| Store entitlement cache | Normalized status/source, verified/expiry/grace times in SQLite; provider SDK maintains its own cache | Local access cache capped at 72 hours, not proof of continued payment. |
| RevenueCat / Apple / Google billing | Anonymous SDK app-user identity, app/device/platform/version context, product/offering requests, receipts/purchase tokens, transactions and entitlement lifecycle; provider endpoints receive IP/network metadata | Collected for purchase validation, restore, fraud prevention and provider subscription reporting. No profile, ratings, photo, private routine or contact attributes sent by app; no card/bank data handled by app. Provider/store retention and deletion policy must be approved. No cross-provider identity link added. |
| AdMob / UMP | Explicit ad/privacy action; SDK requests include IP, identifiers as permitted by OS/consent, ad interaction and diagnostic data; consent strings/status stored by SDK | Collected and shared with Google for ads, measurement and fraud prevention. IP can imply approximate location. Non-personalized request flag is set; it is not a claim of no data collection/tracking. Effective Pro suppresses ad requests/display. No practice/ratings/profile payload supplied. No ATT prompt implemented; owner must approve compliant region/tracking configuration before live release. |
| Local notifications | Weekday/time, neutral message and local destination identifiers scheduled with OS | Local-only/optional permission; no remote push service/device token registration. OS delivery; removed on deletion/reset. |
| Shared exercises | Validated cadence/nostril instructions, link ID, creation/expiry and revocation hash sent to Supabase; creator keeps management secret and label locally | Optional collected user content; cadence is publicly shared to anyone with the link. No names, ratings or notes uploaded. 30-day access expiry; revoke removes snapshot, tombstone/expired-row cleanup on later creation; provider backups separate. Raw secret processed ephemerally to hash, not saved in DB. |
| Reviewer access | HTTPS body carries code or token and random installation ID; server stores only hashes/generation/expiry/revocation and hourly counters; SecureStore keeps temporary token/clock state | Optional collected identifiers/credential for app functionality and fraud prevention. Plaintext code/token processed ephemerally by handler, not logged. Not shared for advertising. Max seven-day grant/one-hour offline access; cleanup on later requests. Hosting request logs/backups are not claimed ephemeral. |
| Support email / OS share sheet | User chooses email/share provider; support receives sender address and submitted text/attachments | Optional collected contact information/user content for support; external sharing is user-directed. Retention follows support purpose/approved obligations and recipient policies. Not automatically included in analytics. |
| Public Vercel / Supabase hosting | IP, request URL, user-agent and infrastructure diagnostics may be processed/logged by hosts | Collected hosting/security data, not necessarily ephemeral. Public pages/player have no IN/OUT analytics/cookies/ads; provider retention must be reviewed. |
| Expo/native SDKs | Audio/fonts bundled; SQLite, crypto, SecureStore, file picker, haptics and local notifications operate on device. EAS build/CLI/Expo Go dev traffic is separate from store runtime. OS/app stores may process install/crash/diagnostic data under platform controls | No IN/OUT Expo Updates/Observe/remote push/crash SDK configured. Inspect the final native merged manifest/privacy manifests and consent traffic; transitive SDK processing remains part of the declaration. |

Recommendations: Google Play **collects data = Yes**, **contains ads = Yes**, **restricted/paywalled content = Yes** with the reusable reviewer code. Declare purchase history, SDK device/other identifiers, ad interaction/diagnostics and IP-derived approximate location; evaluate user-generated shared cadence and voluntary support email/content under the precise form definitions. Store-entered payment details are processed by stores, not by IN/OUT. Local-only photos/history/ratings/reminders are not falsely labeled developer cloud collection. Do not mark all transmitted data ephemeral: credentials are ephemeral in handler memory, but hashed records and provider logs persist. HTTPS covers app network endpoints. Do not claim a global deletion guarantee for independent providers; mobile account creation is still unimplemented; verified requests for provisioned Supabase accounts now have a dedicated endpoint.

Apple: disclose Purchases/Purchase History for functionality and RevenueCat dashboard analytics; remote **product** analytics being disabled does not remove this provider processing. RevenueCat anonymous IDs do not intentionally link to a named profile in this app. Include AdMob's applicable identifiers, coarse location, usage/advertising data and diagnostics, plus optional support/user-content categories where required. Review Apple's linked-to-user/tracking questions against actual SDK/consent behavior: non-personalized ads alone do not settle them. Do not claim “Data Not Collected.”

Google Health declaration: disclose breathing/wellbeing/stress-management functionality in the applicable current Health & Fitness category; no Health Connect/HealthKit, sensor measurements, diagnosis/treatment or medical-device claim. Answer audience/age questions for the actual approved audience and high-intensity safety flow. Final wording/consent/legal declarations and provider retention remain owner approval.

Sources for final console reconciliation: [Google Data Safety definitions](https://support.google.com/googleplay/android-developer/answer/10787469), [Google Mobile Ads disclosure](https://developers.google.com/admob/android/privacy/play-data-disclosure), [RevenueCat Apple privacy guidance](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy), [Expo SecureStore behavior](https://docs.expo.dev/versions/latest/sdk/securestore/). Installed AdMob wrapper pins Android SDK 25.4.0 and iOS SDK 13.5.0; verify final native resolution, since Google's current disclosure page describes its latest SDK. Store forms are recommendations pending owner attestation, not submissions.

## October 2 release-hardening verification

- `npm run verify`: 100 domain/backend tests + 111 mobile tests in ten suites passed, including provider isolation, pending/restore/refund behavior, reviewer SQL role denial, rotation/revocation/rate limits, secure cache/rollback/reset and reviewer UI states. TypeScript and EN/ES/PT catalog checks passed. `artifacts/release-hardening-verify.log`.
- Expo Doctor: 21/21. Android/iOS JavaScript exports passed. `artifacts/release-hardening-doctor.log`, `artifacts/release-hardening-export.log`. These do not establish native signing or device acceptance.
- Local release checks pass; production and unconfigured store-test preflights reject missing configuration as intended. No readiness boolean changed. Production guard logs are in `artifacts/release-hardening-production-gate.log` and `artifacts/release-hardening-store-test-gate.log`.
- Supabase `inout-reviewer` v1 and the private reviewer migration deployed. Live disabled access returns generic HTTP 403, live transactional grant/revoke SQL was exercised and rolled back, security advisor returned no findings. No real review code was generated or installed; positive owner-secret activation remains acceptance work.
- Complete source is delivered independently on `codex/release-hardening-20261001`; the user's current branch/index/working edits are preserved. App source revision `e71e7a492a74cb12505dd58e35ccdb14dd5b3f0c` passed the verification job and compiled both Android Release APK and iOS Release simulator app in [native run 36961638948](https://github.com/Clercminator/InOut/actions/runs/36961638948). Its original interaction jobs exposed stale automation selectors and a hosted Android launcher ANR; separate capture runs below use the same app code with corrected scripts. Later branch changes affect automation/documentation only.
- [Expo Go run 36962209594](https://github.com/Clercminator/InOut/actions/runs/36962209594) passed launch, complete breathing and saved history on SDK 57. This does not validate billing, ads or store signing.
- Simulator reviewer testing exposed missing Keychain entitlements in the previous unsigned CI artifact. The iOS verification workflow now generates simulator-only Keychain entitlements before Xcode linking and uses Xcode ad-hoc signing. No Apple Team ID or distribution credential is invented; EAS store-test signing is unchanged.
- [iOS-only native run 36964310473](https://github.com/Clercminator/InOut/actions/runs/36964310473), source `543544b69e7cf93bae568c78e59f2acbeb0dfcff`, passed verification, Xcode compilation/launch, manual entry/date/time/history/charts, both Box hold phases, pause/resume/completion and the reviewer invalid-code flow using real SecureStore and HTTPS. JUnit reports zero failures on iPhone 17 Pro / iOS 26.4. This source has the same app code as `e71e7a4`; the changes are CI/test/docs. Downloaded evidence: `artifacts/release-hardening-ios-verified/`. Positive reviewer activation still requires the owner secret and signed-candidate acceptance.
- Android Release preview APK from `e71e7a4` is downloaded at `artifacts/release-hardening-android/app-release.apk` (SHA-256 `1d1323d4c5f2dd75ba1aba895b5b99e07cbd1222a5aeb2375a9600b5d6992307`). It uses the generated development signing key and is not a Play upload artifact.
- [Android capture 37010036827](https://github.com/Clercminator/InOut/actions/runs/37010036827), scripts `4a31178`, passed the complete native flow against the `e71e7a4` APK: offline completion, background/process/post recovery, durable rated history, saved pattern/mix, compact phone with 1.6 font scale, charts, keyboard, native picker cancellation, manual save/history, Box cycle recording, manual pause and reviewer invalid-code response after reconnection. Evidence: `artifacts/release-hardening-android-evidence/`.
- [iPhone capture 37009925776](https://github.com/Clercminator/InOut/actions/runs/37009925776), scripts `160593f`, passed the breathing/pre/post/result/history flow and exported six real screenshots from the simulator build in run `36964310473`. Evidence: `artifacts/release-hardening-ios-capture/`. Screenshots are candidate QA evidence, not owner-approved store assets.
- Engineering verification is complete for this pass. No actual store product, production ad unit, positive owner-secret reviewer activation, signed store installation, real-device audio/haptics, final-domain association, legal approval or store approval is implied. All seven readiness gates remain false.


## October 2026 product refinement

The native app now uses bright white/aqua surfaces, dark-teal controls, shared 22/16-point card/button radii and original line icons. Existing Light/Dark/System selection, engine timing, interruption recovery, State Shift, custom routines, browser exercise links, RevenueCat adapter, guest purchase/restore, reviewer access and 72-hour subscription cache remain in place.

- **First run:** immediate breathing through safety, or Welcome → persisted primary goal → short personalized value → safety → dismissible shared paywall → Home. Each step saves locally; existing `onboardingComplete` users bypass the new funnel. Profile → Personalize lets them add/change a goal. No history/schema reset is required.
- **Home/library:** deterministic goal recommendation, preferring a compatible gentle protocol completed twice among the ten latest sessions; 48-second reset remains available. Protocols are grouped by purpose with intensity/precautions and configurable visible locks. The cyclic protocol's public name is now **Cyclic Breathwork**; its ID, stored snapshots and engine are unchanged.
- **Progress:** Overview/Calendar/Badges share actual local records. Lifetime time includes saved early endings; streaks and badges require a completed result with positive elapsed time. Manual records qualify (except Explorer). Local start dates define days, Monday defines weeks, and yesterday's streak remains current until today's opportunity passes. Calendar days link to dated history and individual Results. State Shift averages include only completed paired check-ins and display their sample count.
- **Achievements:** data-driven First Breath, 15/60 minutes, 7-day streak, 30 sessions, five protocols, five calm/sleep/morning sessions, and four distinct practice weeks. Morning means 05:00–11:59 local time. Calm/sleep use the protocol's goal tags; manual entries use their selected goal. Existing cosmetic awards remain. Earned dates are backfilled, deduplicated and retained after deleting history; full local reset clears them. Fresh awards offer Share/Close without replaying on cold launch.
- **Sharing:** native view capture/share exports PNG at 1080×1920 or 1080×1080. Earned badges and streaks of at least three days can be shared. Total time is opt-in; names, photos, notes and ratings are excluded. Cards show the valid InOut support URL; the adjacent exercise action preserves functional revocable browser-link sharing. No completed-share event is fabricated.
- **Profile/manual entries:** existing photo, name, bio, cosmetic choices and ritual features remain, with goal/streak/subscription/reminder shortcuts. Manual logging adds optional before/after ratings and a 500-character private note; ID-based persistence avoids repeated saves.

### Configuration and integration boundaries

[`product-config.ts`](apps/mobile/src/product-config.ts) owns onboarding paywall, annual emphasis, Pro protocol IDs/capabilities, guided monthly quota, badge thresholds, welcome email, manual logging, Learn and future health flags. Defaults keep all ten protocols and unlimited guidance Free; existing saved-pattern/mix limits, ad removal, advanced insights and reminders remain the Pro benefits. All enforcement goes through `EntitlementService`; verified reviewer access bypasses the same gates. Plans/prices/trial eligibility come from the store adapter. Annual receives Best Value only when comparable real prices support it.

When a voice quota is enabled, a persisted per-session reservation consumes one slot at start, resets by UTC month, survives history deletion, and falls back to tones when exhausted; Pro bypasses it. Guest usage is local and resets with full app data deletion/reinstall. This product has no account system: the service-role-only `inout_guided_allowance` SQL function is a future authenticated-account boundary, not a claim of active cross-device enforcement. A future account adapter must derive the user from verified auth and the allowance from server configuration.

The existing names-only analytics abstraction now includes persisted onboarding steps, paywall selection/purchase/restore/dismissal, quota fallback, earned badges, progress/calendar views and native share invocation. It retains no notes or ratings and has no production transport. Goals remain saved locally for future consented segmentation. Existing session/State Shift event names are retained rather than duplicated.

No HealthKit/Health Connect integration exists. `healthMetrics` remains false and no HRV is shown. A later adapter should return real timestamped measurements with source, units and method (for example SDNN versus RMSSD), request explicit platform permission, distinguish unavailable/denied data, and keep sensor data separate from self-reported State Shift. Games, scores, leaderboards, followers and Community remain deferred.

### Welcome email and validation

`inout-welcome` and migration `20261007031007_inout_lifecycle_and_allowance.sql` are deployed to the existing Supabase project. The app sends only after onboarding is complete and the person explicitly requests the optional email. EN/ES/PT templates use first name, primary goal and a matching `inout://pre?id=...` installed-app destination. Resend is behind a provider-neutral interface; all API secrets remain server-side. Private SQL receipts, leases, persisted retry payloads, provider idempotency and bounded retries prevent automatic duplicate sends; uncertain delivery after the safe retry window requires review. Rate limits are 500 global/20 network/3 installation attempts per UTC day. Successful delivery drops the body, preserving only deduplication/status metadata. Stale pending bodies are scrubbed on a subsequent claim after 23 hours. Full phone reset does not erase a server delivery receipt.

Live verification: unauthenticated request → 401; valid app JWT → 503 `disabled`; no mail sent; Supabase security advisors returned no findings. Only owner-supplied provider secrets remain before delivery testing. Exact setup is in [the owner checklist](OWNER_SETUP_CHECKLIST.md#welcome-email-activation).

Validation: `npm run verify` passes 110 domain/SQL tests and 114 native-component tests; `npx expo-doctor` passes 21/21 after compatible SDK 57 patch updates. `npm run release:check` and `npm run release:pages` pass; metadata remains draft. There is no configured lint command. Android and iOS Expo exports passed. Hermes bundles are 5.279 MiB (Android) and 4.980 MiB (iOS); exported assets total 5.541 MiB, including 2.738 MiB of fonts, 2.320 MiB of actually imported WAV cues and 0.457 MiB of voice MP3s. These exclude native runtime/binary overhead and are not download/install-size measurements. No new signed APK/IPA or simulator screenshots are implied. Updated Maestro/Android/Expo Go smoke scripts follow the real new onboarding, but were not executed on a native device in this pass.

App-owned media: 39 voice MP3 files (0.457 MiB), 30 cue WAV files (3.186 MiB), four PNGs (0.040 MiB), no byte-identical duplicates or video. No new media library or runtime dependency was added. Existing offline cues/fonts remain bundled. Temporary exports/debug artifacts stay ignored. A transitive shell-quote critical advisory was removed with a compatible dependency update; npm still reports 51 high/5 moderate transitive tooling advisories (braces/node-forge/sprintf-js chains), whose proposed major/downgrade changes were not applied blindly. These are dependency-audit findings, not proof of a mobile exploit.
