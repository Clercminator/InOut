# IN/OUT 1.0 — Apple App Store and Google Play submission guide

**Commercial v1 is the launch target. Not ready for submission.** The former free-only release is superseded. [LAUNCH_PLAN.md](../LAUNCH_PLAN.md) is the scope/QA/gate authority; [OWNER_SETUP_CHECKLIST.md](../OWNER_SETUP_CHECKLIST.md) gives console tasks and safe configuration storage. [README.md](../README.md) records implemented behavior and verification evidence.

Publisher: **David Clerc** · Support: **davidclerc@imrtech.xyz** · Both bundle/package IDs: `com.imrtech.inout`.

## Launch product

- All nine normal protocols, core timer/visuals/cues/haptics, State Shift, basic History/Progress, favorites, offline practice, sharing and safety are Free.
- Free initially supports one saved Custom Pattern and one saved Mix; Pro removes save limits and advertising, with deeper Progress and recurring-practice benefits as actually implemented.
- Monthly/annual recurring subscriptions, optional store-configured trial, purchase restoration and management must work on both platforms.
- Conservative Free ads only in browsing/management surfaces. Never sessions, State Shift, onboarding or safety; no post-reset interstitial. Pro has no ads.
- A share URL must deliver a browser exercise before offering installation. High-intensity cyclic breathing remains excluded.

## Current implementation versus launch

The current development build has native local practice/routines/history and entitlement foundation work. RevenueCat purchase/restore and AdMob/UMP adapters plus a dev-only analytics logger are implemented. Production provider configuration, real purchase/consent acceptance, browser resets and cloud accounts remain incomplete. Development Free/Pro simulation is not a purchase or store entitlement. Do not list reserved future sync/guidance capabilities as available benefits.

Store metadata in [store-listing.json](store-listing.json) is explicitly a commercial draft. [readiness.json](readiness.json) keeps production gates closed. `npm run release:check` validates local draft integrity; with `INOUT_RELEASE=1`, preflight also rejects unapproved metadata/open launch gates. Passing the normal check is not submission approval.

## Public content and presentation

- Published [Privacy](https://clercminator.github.io/InOut/privacy.html), [Support](https://clercminator.github.io/InOut/support.html) and [Safety](https://clercminator.github.io/InOut/safety.html) describe the current build, not completed commercial integrations.
- Shared [content.json](content.json) feeds native help/privacy and generated public pages. Update and review it when provider behavior changes; do not falsely state either that planned SDKs are active or that commercial v1 has no ads/purchases.
- Privacy Policy, Terms and Subscription Terms for the final candidate need owner/legal review. Final subscription duration, localized prices, trial/renewal terms, restore/manage behavior and premium benefits must match store offerings.
- [Release artwork](assets/) and [native icons](../apps/mobile/assets/) exist. Final screenshots must come from the actual accepted commercial candidate. Older free-build captures are not final store evidence.

## Billing, ads, analytics and data safety

Record the actual SDK versions, automatic data collection, consent behavior, identifiers, sharing storage and any server retention before completing Apple App Privacy and Google Data safety. A local/dev analytics logger does not imply a remote analytics service is configured. An analytics event may record that an answer was entered, never its raw value or resulting shift. No routine content, notes or wellbeing inferences go to targeting/analytics.

UMP consent and any applicable platform tracking permission need a deliberate implementation and verification. Do not assume non-personalized ads mean no collection or that an ATT decision replaces consent. Pro must suppress ad requests, not merely hide an already-loaded view.

State Shift remains subjective, not biometric or clinical evidence. Complete health/age/content declarations truthfully; do not add health-sensor entitlements. If authenticated accounts become part of v1, add working account deletion and lossless guest migration before claiming them complete. Local deletion alone is not cloud account deletion.

Official references: [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/), [Google subscriptions](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en), [Google UMP](https://developers.google.com/admob/ios/privacy), [Google Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en).

## Build and acceptance

Run `npm run verify` and `npm run release:check`. CI provides a development-signed Android APK and unsigned iOS simulator app; these do not replace store-signed distribution builds, sandbox purchase tests or physical devices. See README for dated native flow results.

From `apps/mobile`, EAS profiles support preview APK, simulator and production AAB/iOS builds. Real project/signing configuration is owner-dependent. Production preflight stays closed until the commercial gates are backed by evidence.

Before submission, install the candidate through TestFlight and Play Internal Testing. Verify the full core QA matrix plus purchase/restore, cancellation/expiry/grace, offline entitlement cache, Free quotas/downgrade, consent and protected ad placements, browser sharing/verified links, and accurate settings/support. Physical audio/haptics, interruptions, accessibility and offline recovery still require acceptance.

Owner steps and required return values are listed by stage in OWNER_SETUP_CHECKLIST.md. Reserve product IDs and configure prices/offers now; no credentials are fabricated. Submit only after the launch plan's gates are complete and the owner approves the accepted candidate.
