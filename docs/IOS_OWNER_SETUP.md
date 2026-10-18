# iOS owner setup: IMR Tech SpA

Prepared source is **1.2.0 (iOS build 1)**; Android versionCode 5 is independent. Both EAS environments already contain the iOS public SDK variable; its Apple product mapping still needs acceptance. No iOS Firebase plist is configured.

This runbook is for after Apple completes IMR Tech SpA's Developer Program organization enrollment. It does not create credentials, products, prices, store records, or submissions. Do not share Apple private keys, certificates, RevenueCat secret keys, or account passwords in this repository.

## 1. Finish Apple organization enrollment

1. The Account Holder signs in at [Apple Developer](https://developer.apple.com/account/) and completes any pending organization verification, membership agreement, and legal-entity details for IMR Tech SpA.
2. Record the Apple Team ID shown in the membership account. Confirm the legal seller name and team membership before creating signing assets.
3. Open **Certificates, Identifiers & Profiles → Identifiers → App IDs**. Register an explicit iOS App ID with bundle ID **`com.imrtech.inout`**. This exact identifier is already configured in `apps/mobile/app.json`; do not create a second bundle ID.
4. Do not enable camera, microphone, push notification, background audio, or other capabilities without a product requirement. The app uses local notifications, not remote push. If universal links are desired, enable **Associated Domains** and associate `applinks:inout.imrtech.xyz` only after the website's Apple App Site Association file and routing are ready.
5. Put the verified Team ID in `release/links.json` as `appleTeamId`. Set `iosStoreUrl` only after App Store Connect provides the actual listing URL. Re-resolve Expo config and verify the resulting `ios.associatedDomains`; never use a placeholder Team ID.

## 2. Create the App Store Connect record and agreements

1. In [App Store Connect](https://appstoreconnect.apple.com/), create an iOS app for the registered bundle ID `com.imrtech.inout`. Use the approved `IN/OUT` product name and choose an owner-controlled unique SKU; the SKU is not supplied by code and should not be guessed.
2. Complete the **Paid Apps Agreement** and all required business, tax and banking sections for IMR Tech SpA. Confirm legal entity, bank beneficiary, tax residency and Chilean tax documentation directly with the Account Holder/accountant. Do not use an individual's details unless the organization explicitly authorizes them.
3. Complete app information, age rating, content rights, export compliance, support/contact details, privacy policy, terms and review information using the approved public pages in `release/public-info.json`. Ensure the listed contact can respond to Apple.
4. Complete **App Privacy** from the app's actual behavior and the current SDK privacy disclosures: local session/profile data, optional email, purchases/entitlements, ad/UMP processing and any analytics enabled in the submitted build. Do not mark data as not collected just because it is not uploaded to IN/OUT servers.

## 3. Configure existing auto-renewable products

1. In RevenueCat, inspect the existing `default` offering and `in_out_pro` entitlement. Retrieve the canonical product identifiers already mapped to its weekly, monthly and annual packages. Those identifiers are not in the repository; if they are not already present, stop and ask the product owner rather than inventing identifiers.
2. In App Store Connect, create or select the subscription group and create products using those exact identifiers and approved durations. Match the existing offering's weekly/monthly/annual package mapping. Configure approved localizations, subscription descriptions and review screenshots.
3. Keep the existing products and approved prices. Do not change prices, trial eligibility, introductory offers, product identifiers, offering `default`, or entitlement `in_out_pro` as part of this setup. Confirm price, territories, tax category and availability with the owner before saving.
4. Complete Apple's subscription review metadata. The submitted paywall must display store-returned localized prices, billing period, renewal/cancellation terms, terms and privacy links, and a working restore control.

## 4. Connect RevenueCat securely

1. In RevenueCat, select the existing project (or obtain owner approval before creating one) and configure its iOS app with bundle ID `com.imrtech.inout`.
2. Connect App Store Connect using an Apple API key created for the RevenueCat integration. Upload the `.p8` key directly to RevenueCat with its Key ID and Issuer ID. Store the private key in the approved owner password manager; never commit it or place it in an Expo public variable.
3. Confirm each existing App Store product maps to its weekly/monthly/annual package in offering `default`, and that the `in_out_pro` entitlement contains the intended products. Configure RevenueCat's Apple server notifications and App Store Server API integration using the URL/keys shown by the RevenueCat dashboard. Validate notification delivery from App Store Connect.
4. Copy only the RevenueCat **public iOS SDK key** (`appl_…`) into the EAS `production` environment variable `EXPO_PUBLIC_REVENUECAT_IOS_KEY`. This key is compiled into the app and is not a secret. Set the same production-mode provider variables already specified by `apps/mobile/eas.json`; never add a RevenueCat secret key or Apple `.p8` key to the app build.
5. Set the public iOS SDK key in the EAS `preview` environment as well for the `store-test` profile. That profile selects Store mode and Apple's sandbox/TestFlight purchase flow; it does not use the RevenueCat Test Store. Confirm the selected EAS project is `imr-tech/inout` with UUID `81b6e532-9ba4-4124-b0b0-e1ed7cc3b601`.

## 5. Verify AdMob, UMP, ATT and privacy manifests

1. In AdMob, confirm the existing iOS app is registered for this exact app and that these configured values match the console; do not create replacements without owner approval:
   - App: `ca-app-pub-5826774665710369~9511611168`
   - Banner: `ca-app-pub-5826774665710369/2020133955`
   - Interstitial: `ca-app-pub-5826774665710369/4858970154`
2. Confirm the correct App Store listing is linked in AdMob after it exists. Publish region-appropriate UMP messages and privacy-options entry using the approved privacy URL. Test consent, refusal, withdrawal/revisit, no-fill and Pro/protected-screen suppression on a registered test device. Keep test inventory enabled during testing and never click live ads.
3. The current source uses UMP eligibility checks and non-personalized ad requests; it has no ATT prompt or `NSUserTrackingUsageDescription`. Review AdMob's actual mediation, ad-personalization and IDFA settings. Do not enable cross-app tracking or personalized IDFA access without product/privacy approval; if tracking is actually used, add ATT consent and its accurate usage description before release and revise App Privacy.
4. Build an iOS archive and inspect the app bundle plus embedded frameworks for `PrivacyInfo.xcprivacy`. Confirm every linked SDK's required-reason API declarations and privacy manifest against the exact versions in the archive. The current workspace has no committed app-owned manifest or generated iOS archive, so this must not be treated as verified.

## 6. EAS signing, TestFlight and App Review

1. Sign in to the owner EAS account and verify project `imr-tech/inout` and UUID `81b6e532-9ba4-4124-b0b0-e1ed7cc3b601`. Keep iOS distribution credentials under EAS remote credential management (`credentialsSource: "remote"`); do not export or commit certificates, provisioning profiles or signing keys.
2. With enrollment active, create the first iOS internal store candidate using `npx eas-cli build --platform ios --profile store-test` from `apps/mobile`. EAS will need authorized Apple access to create/use a distribution certificate and App Store provisioning profile. Keep this profile's test ads and use the preview EAS environment with the valid public `appl_` key.
3. The first store-test build uses source build number `1`. Before each additional TestFlight upload, increment only `ios.buildNumber` in `apps/mobile/app.json` (leave Android `versionCode` unchanged), then build again. `store-test` does not auto-increment. The production profile has auto-increment enabled; verify the final EAS version/build values before upload.
4. Upload the internal candidate to App Store Connect TestFlight using the owner-authorized upload path. This is a separate step from EAS build; **do not submit it for App Review until the owner authorizes submission**. Add internal testers first, then external testers only if needed and after Apple's beta review. Use Sandbox/TestFlight accounts to test new purchase, cancellation, pending approval, restore on a fresh install, expiry/renewal and subscription management.
5. Resolve every open readiness gate in `release/readiness.json`, obtain approved metadata in `release/store-listing.json`, pass `npm run release:check`, and complete the iOS acceptance list in `docs/CROSS_PLATFORM_RELEASE_READINESS.md`. Rebuild with `--profile production` only after the release gate passes. Review the exact archived build, privacy declarations, subscriptions, screenshots, support contact and reviewer instructions before the Account Holder submits it.

## First action after enrollment

The Account Holder should finish the pending organization enrollment and retrieve the verified Apple Team ID. Then register the explicit `com.imrtech.inout` App ID and provide that Team ID to the owner who maintains `release/links.json`. No App Store Connect app, subscription, payment agreement, signing credential, TestFlight build or submission can be completed before that access is granted.
