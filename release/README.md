# IN/OUT 1.0 submission kit

**Release status: not submitted.** The [root README](../README.md#current-status) is the central tracker for completed work, unresolved engineering tasks, owner steps and dated verification evidence. This file is the store submission handoff, not a declaration that release acceptance has passed.

Publisher: **David Clerc** · Support: **davidclerc@imrtech.xyz**

- Privacy: https://clercminator.github.io/InOut/privacy.html
- Support: https://clercminator.github.io/InOut/support.html
- Safety: https://clercminator.github.io/InOut/safety.html
- Store copy, keywords and reviewer walkthrough: [store-listing.json](store-listing.json).
- Google Play icon (512 × 512) and feature graphic (1024 × 500): [assets](assets/).
- Apple icon (1024 × 1024): [icon.png](../apps/mobile/assets/icon.png).
- Application identifier on both platforms: `com.imrtech.inout`.

## Release scope

Free, offline, guest-only practice: nine built-in protocols, custom patterns and mixes, saved routines, optional self-reported State Shift, history, sharing, settings, safety and support. No purchases, subscription, account, ads, tracking or health-sensor integration. The tenth protocol remains in the domain model but high-intensity breathing is unavailable throughout this release.

## Console information to review

The current app stores sessions, ratings, routines and preferences locally. There is no developer backend, analytics SDK or automatic data upload. OS backups may include app data. Sharing is explicitly initiated by the user. Email support receives whatever the user sends; the GitHub-hosted public website receives ordinary web requests.

Use these facts when completing Apple's App Privacy and Google's Data safety forms. Review the forms' current definitions and exceptions for optional support, user-directed sharing, diagnostics and platform backups; do not treat this document as a pre-submitted declaration. There is no account to delete; Settings provides deletion of all local data. Do not enable advertising or health-platform entitlements.

Declare the breathing/wellbeing functionality in Google's Health apps declaration. Store copy and in-app safety explain that IN/OUT is not a medical device and does not diagnose, treat, cure or prevent conditions. Complete both stores' age/content questionnaires truthfully; no age rating has been assigned yet.

References: [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en), [Google health-content requirements](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en-GB).

## Build and acceptance

`npm run verify` checks types, engine, persistence, migrations and mobile flows. `npm run release:check` checks local release metadata. GitHub Actions builds an internally signed Android APK, exercises the offline flow on an emulator, and builds/launches an unsigned iPhone simulator app. Successful capture jobs can provide actual screenshots; a build artifact alone does not prove that the runtime flow or screenshot capture passed. These are not store-signed uploads. See the [verification evidence](../README.md#verification-evidence-and-limits) for the latest Android navigation and iPhone capture failures, earlier passing runs and physical-device limits.

From `apps/mobile`, EAS profiles provide internal Android preview, iOS simulator, and production AAB/iOS builds. Production runs a metadata preflight and increments build numbers. Production builds still require the owner's Expo project setup and store signing credentials. Reserve `com.imrtech.inout` in the developer consoles before the first upload.

Before submission, install signed builds through Google Play internal testing and TestFlight. On physical iPhone and Android, check first launch and offline use, audible cues and haptics, silent mode, phone/audio interruptions, lock/unlock, forced closure recovery, saved routines, deletion, large text, screen readers and reduced motion. Capture final store screenshots from those builds in the dimensions each console requests. Simulator evidence cannot establish physical haptic/audio quality or replace these acceptance checks.

Owner steps: developer enrollment and identity verification, store records, signing access, current console disclosures, age/content ratings, distribution countries and free pricing, any required tester cohort, then submission. Do not add a subscription or billing configuration for this release.
