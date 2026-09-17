# IN/OUT — Owner setup checklist

The v1 target is now Free + recurring Pro + conservative ads + browser sharing + product-event measurement. **Do not submit the old free-only metadata.** Setup does not mean an integration or its acceptance tests are complete. Engineering progress and launch gates live in [LAUNCH_PLAN.md](LAUNCH_PLAN.md).

## Storage and security key

Each row specifies the exact return value/location and these flags: **Secret / .env / EAS Secrets / Native config / Never commit**. `No` for EAS Secrets means do not store it as a secret build variable; public build configuration can use EAS environment variables with plaintext visibility. `N/A` means no configuration value is needed.

- Public SDK keys and app/unit/product IDs are identifiers, not private credentials. Public mobile values will be visible in the compiled app. RevenueCat and AdMob names are consumed by the current adapters/native config; share-origin and analytics-provider names remain reserved. See `apps/mobile/.env.example`.
- Local development values belong in ignored `apps/mobile/.env.local`, using a separate test environment. Never paste private keys into chat or place them in `EXPO_PUBLIC_*` variables.
- Private store/service credentials belong in the provider's secure console or EAS credential management. Use secret build variables only if a future server/build task actually needs them. They do not belong in the JS bundle, native config, repository or public pages.
- “Value Codex needs” means a non-secret identifier or confirmation/access arrangement. Upload private files directly to the indicated console; report completion rather than disclosing their contents.

## NOW

| Done | Exact console/service and action | Value needed afterward and where to store it | Secret / .env / EAS Secrets / Native config / Never commit |
| --- | --- | --- | --- |
| [ ] | Apple Developer → enroll/verify publisher; accept agreements | Team ID and enrollment confirmation. Team ID in release configuration when signing is configured; private account access via invitation | No / No / No / Later team config / No |
| [ ] | Google Play Console → create/verify developer account | Developer account ID and confirmation; retain in owner release records | No / No / No / No / No |
| [ ] | Expo dashboard → create/link IN/OUT project and grant build access | Expo owner/slug and project UUID; `extra.eas.projectId` in mobile app config after linking | No / No / No / Yes / No |
| [ ] | Product decision, no console: choose first countries, pricing currencies, monthly/annual price candidates and whether to offer a trial | Written choices in launch plan; no invented defaults or trial eligibility promises | No / No / No / No / No |
| [ ] | Publisher operations: confirm `davidclerc@imrtech.xyz` receives mail and who handles support | Confirmation, not mailbox password; shared publisher JSON already contains address | No / No / No / No / No |

## BEFORE BILLING TEST

| Done | Exact console/service and action | Value needed afterward and where to store it | Secret / .env / EAS Secrets / Native config / Never commit |
| --- | --- | --- | --- |
| [ ] | Apple Developer → Certificates, Identifiers & Profiles → App ID; App Store Connect → My Apps → IN/OUT | Reserve `com.imrtech.inout`; return numeric App Store app ID and bundle ID. Bundle ID already in `apps/mobile/app.json`; numeric ID later in submission config | No / No / No / Yes, bundle ID / No |
| [ ] | App Store Connect → Business → agreements, tax and banking | Completion confirmation only; tax/bank details remain in Apple's console | Yes for financial details / No / No / No / Yes |
| [ ] | App Store Connect → IN/OUT → Monetization → Subscriptions | Create Pro subscription group, monthly and annual products, prices/localizations and optional introductory offer. Return group/product IDs, durations and approved trial details; later centralized product mapping | No / No / No / No / No |
| [ ] | Play Console → All apps → IN/OUT; Monetize → Products → Subscriptions | App record `com.imrtech.inout`; monthly/annual base plans and optional offers. Return subscription/base-plan/offer IDs, prices and trial rules; later centralized mapping | No / No / No / Package already configured / No |
| [ ] | Play Console/Google payments → agreements/payment profile | Completion confirmation only; bank/tax data remain in console | Yes for financial details / No / No / No / Yes |
| [ ] | RevenueCat → new project → iOS and Android apps | Project ID, app IDs and public SDK keys. Reserve `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` in ignored mobile `.env.local` and matching EAS environment | No / Yes / No, plaintext environment / No / Keep local env files uncommitted |
| [ ] | RevenueCat → connect App Store app using the credentials its current setup requires | Upload Apple private `.p8` key/any requested shared secret directly to RevenueCat; return connection-validation status. Key ID/issuer ID are identifiers, private key is secret | Yes for key/secret / No / No / No / Yes |
| [ ] | Google Cloud + Play Console → scoped service account/access; RevenueCat → Android app → service credentials | Upload service-account JSON directly to RevenueCat; return validation status. Do not bundle the JSON or share its private key | Yes / No / No / No / Yes |
| [ ] | RevenueCat → Entitlements and Offerings | Create entitlement `pro`; an offering with monthly/annual packages attached to real store products. Return offering ID and package mapping; later central commercial config | No / No / No / No / No |
| [ ] | App Store Connect sandbox testers; Play Console license testing + internal testers | Confirm test users/devices invited and test purchase access. Credentials stay with testers; no passwords needed by code | Yes for tester passwords / No / No / No / Yes |

No RevenueCat administrative secret API key is needed in the mobile app. The provider adapter and bounded cache are implemented. Real billing still requires configured products/offerings and sandbox/device verification. Current mock Pro is not a purchase.

## BEFORE AD TEST

| Done | Exact console/service and action | Value needed afterward and where to store it | Secret / .env / EAS Secrets / Native config / Never commit |
| --- | --- | --- | --- |
| [ ] | AdMob → Apps → register separate iOS and Android IN/OUT apps | App IDs (`ca-app-pub-…~…`); later `ADMOB_IOS_APP_ID` / `ADMOB_ANDROID_APP_ID` build config and native plugin settings | No / Yes for local config / No, plaintext environment / Yes / No; env file stays ignored |
| [ ] | AdMob → each app → Ad units → conservative banner placements | Unit IDs (`ca-app-pub-…/…`); later `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` / `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` | No / Yes / No, plaintext environment / No / No; env file stays ignored |
| [ ] | AdMob → Privacy & messaging → configure applicable consent/privacy messages | Confirmation, selected regions/options, linked app IDs and privacy URL; UMP configuration stays in AdMob | No / No / No / App ID only / No |
| [ ] | AdMob/test device setup → register test devices when using own units | Test-device identifiers via ignored local/test environment; use Google's demo units first and never click live ads in tests | Device identifiers private / Only test environment if needed / No / No / Yes for device identifiers |
| [ ] | AdMob + publisher website → verification/app-ads.txt requirements | If requested, publish AdMob-provided publisher record on controlled domain; return HTTPS URL and verification result | No / No / No / No / No |

Production IDs are not necessary for initial demo-ad development. Native config defaults to official Google demo app IDs; EXPO_PUBLIC_ADS_MODE=test uses demo banner units after an explicit load action. Live mode requires explicit IDs and UMP eligibility. A test banner is not evidence of production consent acceptance. Consent behavior, test units, ad-free Pro and placement exclusions must be verified before enabling real inventory. No tension values, routines, notes or inferred wellbeing state may become targeting inputs.

## BEFORE WEB SHARING TEST

| Done | Exact console/service and action | Value needed afterward and where to store it | Secret / .env / EAS Secrets / Native config / Never commit |
| --- | --- | --- | --- |
| [ ] | Chosen registrar/DNS and hosting console → authorize a production host | Domain and HTTPS origin; later `EXPO_PUBLIC_SHARE_ORIGIN` in local/EAS public environment. Hosting access through invitation; no domain is assumed purchased | No for origin; access tokens secret / Yes for origin / No for origin / Yes, association domains later / Yes for tokens |
| [ ] | Hosting → choose share-record persistence/service and deployment access | Non-secret project ID/origin; any service database credential in hosting server secrets only, never mobile `.env` | Yes for server credential / Server-only env if needed / No / No / Yes |
| [ ] | Apple Team/App ID + hosting → publish `/.well-known/apple-app-site-association` | Team ID + `com.imrtech.inout`, URL/path rules; association file public, `ios.associatedDomains` in native config | No / No / No / Yes / No |
| [ ] | Play Console → App integrity → App signing; hosting → `/.well-known/assetlinks.json` | Production app-signing certificate SHA-256 fingerprint (not upload-key fingerprint), package ID and test-build fingerprints separately; public association file and native intent filters | No / No / No / Yes / No |
| [ ] | App Store Connect / Play Console → public listing destinations | Actual store URLs once available; central public config. Use explicit unavailable state before then, not invented links | No / No / No / No / No |

Browser resets can be developed on a staging host before the final domain. Automatic verified app opening requires real domain association and correctly signed builds; a custom scheme alone is insufficient.

## BEFORE TESTFLIGHT

| Done | Exact console/service and action | Value needed afterward and where to store it | Secret / .env / EAS Secrets / Native config / Never commit |
| --- | --- | --- | --- |
| [ ] | Apple Developer + EAS credential management → authorize distribution signing | EAS-managed certificate/profile access; return team/project confirmation. Do not commit `.p12`, private keys or provisioning credentials | Yes for signing key/password / No / Use EAS credentials, not JS env / Bundle/team identifiers only / Yes for private files |
| [ ] | App Store Connect → TestFlight → test groups, build/compliance information | Group names, tester invitation confirmation and accepted build number; owner release records | Tester contacts private / No / No / No / Yes for contact lists |
| [ ] | Physical iPhone → install actual TestFlight candidate | Device/OS/build and QA outcomes in launch evidence; no device account password | No for anonymized results / No / No / No / No |

## BEFORE PLAY INTERNAL TEST

| Done | Exact console/service and action | Value needed afterward and where to store it | Secret / .env / EAS Secrets / Native config / Never commit |
| --- | --- | --- | --- |
| [ ] | Play Console → App integrity + EAS credentials → Play App Signing and upload key | Signing enrollment confirmation; upload keystore/password in EAS credential management, certificate fingerprint public | Yes for keystore/password / No / EAS credentials / Package only / Yes for private files |
| [ ] | Play Console → Testing → Internal testing → testers/release | Test list/group, opt-in URL and build number; private contacts stay in console | No for URL; tester contacts private / No / No / No / Yes for contacts |
| [ ] | Physical Android → install from internal testing | Device/OS/build and QA outcomes, including billing via Play installation | No for anonymized results / No / No / No / No |

## BEFORE STORE SUBMISSION

| Done | Exact console/service and action | Value needed afterward and where to store it | Secret / .env / EAS Secrets / Native config / Never commit |
| --- | --- | --- | --- |
| [ ] | Legal/content review → Privacy Policy, Terms, Subscription Terms, wellness disclaimer | Approved text/URLs covering actual billing, ads, consent, sharing and analytics behavior; release content/public pages | No / No / No / No / No |
| [ ] | App Store Connect → App Privacy, age rating, review and subscription metadata | Completed answers based on final SDK inventory; reviewer instructions, real prices/trial terms and signed build | No / No / No / No / No |
| [ ] | Play Console → App content → Data safety, ads, health, age/content and applicable declarations | Completed answers matching actual SDK behavior and consent; owner confirmation and release record | No / No / No / No / No |
| [ ] | Both store consoles → territories, pricing, current testing/access requirements and final assets | Countries, final native screenshots, listing copy and acceptance evidence | No / No / No / No / No |
| [ ] | Optional analytics provider → decide provider/project or explicitly retain local-only logger | If chosen: public client project key/endpoint in future public environment; administrative/server secrets only in provider/server vault. Return collection/retention decision | Public client key no; admin secret yes / Client public only / No client secrets / No / Yes for admin secrets |
| [ ] | Owner final release review | Sign-off against every [launch gate](LAUNCH_PLAN.md#launch-gates); no submission while production integration evidence is missing | No / No / No / No / No |

### Official setup references

- Public versus private keys: [RevenueCat API keys](https://www.revenuecat.com/docs/projects/authentication); [Apple service credentials](https://www.revenuecat.com/docs/store-configuration/app-store/service-credentials-index).
- Build environment handling: [Expo environment variables](https://docs.expo.dev/guides/environment-variables/) and [EAS environment usage](https://docs.expo.dev/eas/environment-variables/usage/).
- Consent: [Google UMP for iOS](https://developers.google.com/admob/ios/privacy).
- Verified links: [Expo iOS Universal Links](https://docs.expo.dev/linking/ios-universal-links/) and [linking overview](https://docs.expo.dev/linking/overview/).

Console labels and requirements may evolve; verify provider guidance at configuration time. Setup values above are a handoff contract, not credentials already created.
