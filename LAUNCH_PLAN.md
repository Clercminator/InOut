# IN/OUT — Commercial v1 launch plan

**September 17, 2026 owner decision:** commercial v1 supersedes the free-only launch. Native iOS/Android are canonical; all nine normal protocols remain Free, offline and account-optional. The owner subsequently expanded this task to include working subscription and ad development paths.

Checkboxes distinguish implemented/tested development behavior from production acceptance. A screen, mock purchase or configured console record does not close a launch gate. [README](README.md) records dated evidence; [OWNER_SETUP_CHECKLIST](OWNER_SETUP_CHECKLIST.md) specifies exact external tasks and secure value storage.

## 1. Current implemented state

- [x] Generic timestamp engine, nine enabled protocols, native cues, State Shift, local persistence/recovery, Custom/Mix, History, basic Progress, favorites/settings/help and text sharing.
- [x] Baseline native failures resolved: Android capture `35260857468`; iPhone capture `35261928392`, first attempt and six retained screens. Both use app source `d8eec31`.
- [x] EntitlementService, configurable limits, downgrade-safe save/duplicate enforcement and development-only Free/Pro states.
- [x] SubscriptionService with RevenueCat and no-charge dev adapters, monthly/annual UI, restore/manage and lifecycle status.
- [x] AdService with native AdMob test banners, live UMP eligibility/cleanup paths, Today/Progress placements and protected-flow/Pro suppression.
- [x] Event-name-only AnalyticsService with local/dev logger and partial event wiring; no remote analytics transport.
- [x] Local tests: 46 domain/service/storage + 33 mobile; Expo Doctor 21/21; Android/iOS JS exports passed.
- [ ] New native SDK build/runtime acceptance: CI `35282883936`, source `eae5510`, pending at this checkpoint. Earlier core captures do not prove new SDK behavior.
- [ ] Real provider configuration/acceptance, advanced insights/reminders, browser sharing, signed physical QA and store submission.

## 2. Launch scope and Free/Pro boundary

| Capability | Free | Pro |
| --- | --- | --- |
| All nine launch protocols, timer, visuals, audio, haptics | Included | Included |
| State Shift, basic History/Progress, favorites, offline practice, safety | Included | Included |
| Sharing and free browser reset | Included; browser loop still to build | Included |
| Saved Custom Patterns | 1 initially | Unlimited |
| Saved Mixes | 1 initially | Unlimited |
| Run unsaved custom/mix drafts | Included | Included |
| Ads | Conservative browsing placements | No requests or display |
| Accumulated value | Useful basic Progress | Deeper Progress/insights and recurring-practice support, still to finish |

Central capabilities: `adFree`, `unlimitedCustomPatterns`, `unlimitedMixes`, `unlimitedSavedRoutines`, `advancedProgress`, `advancedInsights`, `advancedReminders`, `advancedGuidance`, `premiumAudioVisuals`, `futureCloudSync`. Reserved capability names do not establish feature availability. Limits live in `apps/mobile/src/entitlements.ts`, not scattered plan-name checks.

All existing routines remain readable, editable, playable and deletable after downgrade, even above Free limits. Only new saves/duplicates are limited. Safety and core protocols are never paywalled. High-intensity cyclic breathing stays excluded.

Monthly/annual recurring Pro are required. Trial eligibility and final pricing come from store configuration, not mock values. Cloud sync is future scope and must not be advertised as live. No native card-entry forms.

## 3. Outstanding engineering tasks

### Stabilization and commercial foundation

- [x] Diagnose Android tap/visibility failure and iOS XCTest transport/path failures; fresh baseline native reruns passed.
- [x] Expand coverage to completion/recovery for all nine protocols and Progress-to-History navigation.
- [x] Enforce quotas at the controller mutation boundary, including retry after downgrade; preserve existing data.
- [x] Dev Free/Pro/trial/cancelled/retry/grace/expired states; mocks never persisted as store grants or accepted in production mode.
- [x] Isolated RevenueCat adapter: offers, purchase, restore, customer updates and management URL.
- [x] Bounded normalized SQLite entitlement cache: paid/grace deadline and 72-hour maximum age; refresh failure preserves unexpired access; rollback invalidates stale/future cache.
- [x] Purchase pending/success/failure/user-cancel and restore UI; optional demo trial; real offers use store pricing.
- [x] Native SDK configuration, Google demo app/unit IDs, explicit test-ad loading and live UMP eligibility path. Expo Go only previews ad placement.
- [x] Typed analytics event allowlist with no payload; production has no remote sink.
- [x] Commercial draft metadata and production preflight gates.
- [ ] Close native SDK compilation/runtime evidence, real test banner rendering and configured sandbox purchase/restore acceptance.
- [ ] Approve offline-cache window/trust policy and purchase identity/account-linking behavior before production. Current store identity is anonymous; cloud account linking is not implemented.
- [ ] Verify real introductory offers/trials, renewals, billing retry/grace, revocation/refund, restoration and consent on distribution builds.

### Premium value and settings

- [ ] Deterministic advanced Progress/insights with explicit minimum sample rules and insufficient-data states. Tension alone cannot establish improved Focus or efficacy.
- [ ] Reminder foundation: morning focus, midday reset, pre-performance, post-work recovery, wind down, custom; ask permission only when enabling a reminder.
- [ ] Final premium-benefit presentation limited to completed features; basic Free Progress remains useful.
- [ ] Finish settings/account expectations: store-backed guest purchases work without an IN/OUT account; decide whether authenticated accounts are actually required for v1. If added, deletion and lossless guest migration are required.
- [ ] Final legal/Subscription Terms and support paths; draft terms currently appear in the subscription screen.

### Sharing/distribution

- [ ] Versioned public protocol snapshot, opaque unique share ID and storage/resolution strategy; exclude scores/notes by default.
- [ ] Validate snapshot size, phases/durations and excluded protocols. Retain executed snapshot independently of later edits.
- [ ] Native share/copy URL; browser reset using shared engine without account/payment/install gate.
- [ ] Completion followed by optional Open/Get IN/OUT; no fabricated store links.
- [ ] Universal Links/App Links, native routing, installed/uninstalled fallback and malformed/deleted-link handling.
- [ ] Define record retention/deletion, abuse controls and hosting; native practice remains offline independently of links.

### Measurement and release

- [ ] Wire remaining product events and transition deduplication; local logger first, external provider optional after explicit privacy decision.
- [ ] Real SDK data inventory, region/age/consent configuration and applicable platform tracking permission assessment. UMP does not replace ATT where applicable.
- [ ] Final production metadata, policies, actual screenshots, signing and physical acceptance.

## 4. Owner-dependent tasks

- [ ] Apple/Google enrollment and app records; Expo project/signing access.
- [ ] Monthly/annual products, prices, optional trial, agreements/tax/banking and test users.
- [ ] RevenueCat apps/store connections, `pro` entitlement, offerings and public SDK keys.
- [ ] AdMob apps/units, UMP messaging and required publisher/app verification.
- [ ] Sharing domain/hosting/DNS, public association files and real store destinations.
- [ ] Legal/content approval and final store declarations; optional analytics provider decision.
- [ ] Physical iPhone/Android, TestFlight and Play Internal Testing.

Use [OWNER_SETUP_CHECKLIST.md](OWNER_SETUP_CHECKLIST.md) for each console, expected return value, storage location and secret classification. No production credentials are fabricated.

## 5. QA matrix

| Done | Area | Automated coverage / required check | Native acceptance still required |
| --- | --- | --- | --- |
| [ ] | Nine protocols | Plan validation, boundaries/cycles, completion/recovery, high-intensity rejection | Follow and finish every protocol on each OS |
| [ ] | Timing/recovery | Stalls, pause/resume/restart, checkpoint, pending post, idempotency | Calls/alarms, lock, switch, force-stop, offline relaunch |
| [ ] | State Shift | Positive/zero/negative/skip, no invented comparison | Accessible deliberate answers, no ads/paywalls |
| [ ] | Custom/Mix | Editing/order/repeats, quotas, duplicate/retry/downgrade | Creation, save/replay and offline library |
| [ ] | History/Progress | Period boundaries, navigation, deletion/replay, empty states | Relaunch and navigate on both OSes |
| [ ] | Native effects/accessibility | Cleanup and reduced-motion tests | Haptics/headphones/silent mode/keep-awake; VoiceOver/TalkBack/large text |
| [ ] | Billing | Service/UI/cache, mapping, serialization and mock exclusion tests | Real sandbox/store purchase, restore, expiry/grace/refund |
| [ ] | Ads/consent | Protected routes, Pro, consent denial/race and payload exclusion | Real test banner, UMP choices/revisit, no-fill/offline |
| [ ] | Sharing | Snapshot validation and engine parity still to build | Safari/Chrome, native links, installed/uninstalled |
| [ ] | Settings/support | Persistence/reset, subscription and privacy entry points | Mail, manage/restore, honest guest/account behavior |

## 6. Monetization test plan

- [x] Service/UI tests cover demo monthly/annual selection, success/failure/cancel, restore, paid-through cancellation and expiry/grace boundaries.
- [x] Free limits cannot be bypassed by duplicate/save retry; above-limit data survives downgrade.
- [x] Cached mocks/legacy `preferences.pro` never grant production Pro; dev simulations are nonpersistent.
- [ ] Store-supplied localized prices/durations and eligible trial terms verified against configured products.
- [ ] Pending/deferred purchase, renewal, billing retry/grace, cancellation, refund/revocation and restore after reinstall tested on both stores.
- [ ] Offline valid/expired/stale cache, refresh failure and time-change policy validated on devices.
- [ ] Pro immediately suppresses ad SDK requests/displays; expiry cannot interrupt a session with an ad.
- [ ] Production binary has no usable dev override and store-backed entitlement identity/verification is accepted.

## 7. Ad test plan

- [x] Demo mode selects Google test units only; live mode needs separate explicit IDs.
- [x] Today and Progress only; deny session, pre/post, result, safety, onboarding, inactive app and any active/pending-post session.
- [x] Pro suppression and consent-in-flight upgrade covered by tests. Live SDK initialization requires `canRequestAds`.
- [x] No rating, note, routine, situation or inferred wellbeing payload is accepted by analytics/targeting code.
- [ ] Observe actual native demo banner/impression/no-fill/error on devices; SDK callbacks, not placeholders, drive `ad_impression`.
- [ ] Configure and verify live UMP consent/denial/revisit and applicable platform permission behavior. Demo inventory is not consent acceptance evidence.
- [ ] Check layout, navigation cleanup and absence of network requests after Pro activation. No interstitials are implemented.

## 8. Sharing/distribution test plan

- [ ] Link contains/resolves the executed snapshot; ratings/notes excluded by default.
- [ ] Valid free browser reset; malformed, unsupported or high-intensity content rejected safely.
- [ ] Timestamp-correct browser timing and explicit interruption policy; audio follows user interaction.
- [ ] Useful practice before optional install CTA; no fake destination or promised automatic post-install restoration.
- [ ] Correct signed native routing and public domain association; browser fallback when app absent.
- [ ] Copy/share cancellation, network loss and deleted/expired records produce honest outcomes/events.

## 9. Analytics event map

Service is implemented, with a local/dev logger and no remote sink. It accepts **event names only**: no ratings, notes, routine names/definitions, private share contents, wellbeing situations or identifiers. Complete trigger wiring remains open. A click does not establish a purchase/install/share delivery.

| Event names | Trigger semantics | Current wiring |
| --- | --- | --- |
| `app_open` | App initialization; foreground dedup policy to finish | Initialization only |
| `onboarding_started`, `onboarding_completed` | Entry and deliberate completion/skip | Pending |
| `situation_selected`, `protocol_opened` | User navigation; omit selected health/wellbeing state | Pending |
| `protocol_started`, `protocol_completed`, `protocol_abandoned` | Controller transitions, one each; pause is not abandon | Pending |
| `state_shift_pre_recorded`, `state_shift_post_recorded` | Committed explicit answer, presence only; skip excluded | Pending |
| `custom_created`, `mix_created` | Successful first save, not edit or failed write | Implemented |
| `custom_started`, `mix_started`, `mix_completed` | Actual execution/completion, no routine payload | Pending |
| `share_created`, `share_link_copied` | Share service success / clipboard write | Pending link implementation |
| `shared_web_opened`, `shared_web_started`, `shared_web_completed` | Browser entry and engine transitions | Pending browser implementation |
| `shared_web_install_cta_clicked` | CTA action after value; not an install count | Pending |
| `paywall_viewed` | Pro screen entered, not every render | Implemented |
| `trial_started`, `subscription_started` | Store-confirmed successful activation, never demo conversion | Implemented; store acceptance pending |
| `subscription_restored` | Restore with actual active entitlement, not empty/error | Implemented; store acceptance pending |
| `subscription_cancelled` | Observed provider renewal-cancellation transition, not purchase-dialog cancellation | Listener implemented; lifecycle/dedup acceptance pending |
| `ad_impression` | Actual SDK callback, never placeholder/render | Implemented; device impression pending |

- [x] Event allowlist and rejection of extra sensitive runtime payloads tested.
- [ ] Complete wiring/dedup tests; decide any external provider, consent, retention and opt-out before remote collection.

## 10. Store submission dependencies

- [ ] Store products/contracts, RevenueCat connections, real purchase/restore and signed builds.
- [ ] AdMob/UMP configuration and disclosures matching actual SDK data behavior.
- [ ] Reviewed Privacy, Terms and Subscription Terms, real prices/trial benefits and reviewer walkthrough.
- [ ] Working share domain/association/store destinations.
- [ ] Required platform testing/access, final screenshots and owner acceptance.

## 11. Architectural decisions before production

- [ ] Approve the 72-hour offline cache cap. Cache is local sandbox state, not a cryptographic guarantee against device tampering; provider refresh remains authority. Premium server resources, if added, require server authorization.
- [ ] Confirm anonymous purchase identity/restore and any future account transfer/deletion policy. Do not couple Free practice to authentication.
- [ ] Define actual advanced benefits before selling them; reserved flags are not completed features.
- [ ] Approve ad/consent/age/region policy and SDK data inventory. No sensitive targeting and no ad during core practice.
- [ ] Select minimal share hosting/storage and privacy/retention model before promising permanent shared URLs.

## Launch gates

- [ ] Core and commercial native builds/flows green on the same accepted candidate.
- [ ] All nine protocols Free; excluded high-intensity practice and unpaywalled safety verified.
- [ ] Real recurring purchase/restore/trial/cancel/grace/expiry/refund/offline cases verified on both stores.
- [ ] Ads/consent and Pro suppression accepted; no protected-flow ads or sensitive targeting.
- [ ] Truthful premium benefits, useful Free Progress, sufficient-data rules and contextual reminder permissions.
- [ ] Share URL → free browser practice → completion → optional native CTA works.
- [ ] Full required event wiring tested; remote collection either approved/verified or explicitly disabled.
- [ ] Settings/account/support/restore/manage/privacy paths accurate and tested.
- [ ] Physical accessibility/audio/haptics/interruption/offline QA passed.
- [ ] Signing, final content/forms, production configuration and owner sign-off complete.

## Exact next Codex task

Finish the new SDK native runtime evidence and exercise configured sandbox billing/UMP as owner setup becomes available. Then complete advanced local Progress/insights and reminders, full event wiring, and the share-ID/browser-reset loop in separate bounded changes. Do not call the commercial launch complete from mock purchases or test banners alone.
