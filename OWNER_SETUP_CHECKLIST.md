# InOut — owner acceptance and submission

Updated October 7, 2026. Only account, credential, legal, store and physical-device actions remain here. Engineering evidence belongs in README. Record acceptance with date, candidate commit/build, device/OS, result and approver. Private keys, reviewer codes and identity documents stay in the relevant secure service.

## Required before store submission

### 1. Publisher accounts and signing access

- [ ] [Apple Developer](https://developer.apple.com/account/) → Membership: finish enrollment, verification and agreements. Certificates, Identifiers & Profiles → Identifiers: register **`com.imrtech.inout`**. [App Store Connect](https://appstoreconnect.apple.com/) → My Apps → + → New App: choose that bundle ID and enter the approved app name/internal SKU. Business → Agreements: complete paid-app, tax and banking requirements. **Needed for:** signed distribution and paid subscriptions. **Success:** active membership/agreements, Team ID and numeric app ID.
- [ ] [Play Console](https://play.google.com/console/) → All apps → Create app: create InOut with the approved language/audience; the uploaded package is **`com.imrtech.inout`**. Complete requested developer identity/device/payment verification. App integrity → App signing: accept Play App Signing and retain upload credentials privately. **Success:** internal-test AAB accepted. If Production access requires closed testing, recruit and retain the testers specified for your account; [Google's current account-specific requirements](https://support.google.com/googleplay/android-developer/answer/14151465) apply.
- [ ] [Expo](https://expo.dev/) → organization → Projects: create/select InOut; Project settings → General: copy project UUID. Complete interactive `npx eas-cli@latest login` from `apps/mobile` and authorize signing/build access. Project → Environment variables: save the table below in **preview** and **production**. **Success:** `npx eas-cli@latest whoami` identifies your account and the project is accessible. The prepared `store-test` profile builds signed acceptance candidates; `production` remains gated until approval. [EAS setup](https://docs.expo.dev/build/setup/).

| EAS variable | Owner value |
| --- | --- |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Expo project UUID |
| `EXPO_PUBLIC_SUBSCRIPTION_PROVIDER` | `revenuecat` |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | Public platform SDK keys, `appl_…` and `goog_…` |
| `ADMOB_IOS_APP_ID`, `ADMOB_ANDROID_APP_ID` | Real platform app IDs, `ca-app-pub-…~…` |
| `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID`, `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` | Real platform banner IDs, `ca-app-pub-…/…` |
| `EXPO_PUBLIC_ADS_MODE` | `test` for initial acceptance; `live` for accepted production configuration |

These are public client/build identifiers. Apple/Google signing credentials belong in EAS; store-connection keys belong in RevenueCat. Service-role and email-provider keys never belong in the app.

### 2. Products and real store acceptance

- [ ] App Store Connect → InOut → Monetization → Subscriptions: create a subscription group with monthly and annual products; enter real product IDs, localized benefits, territories, prices and any chosen trial. Play Console → InOut → Monetize with Play → Products → Subscriptions: create and activate corresponding monthly/annual base plans and offers. **Success:** products available to the intended test track/accounts.
- [ ] [RevenueCat](https://app.revenuecat.com/) → project → Apps & providers: connect both stores using the private credentials requested there. Product catalog → Products: import products; Entitlements: attach both to **`pro`**; Offerings: mark an offering current and populate its standard **Monthly** and **Annual** packages on both platforms. Copy public SDK keys into EAS. **Success:** connection checks pass and the candidate shows real localized prices. [Offering setup](https://www.revenuecat.com/docs/offerings/overview).
- [ ] App Store Connect → Users and Access → Sandbox: create a tester if needed and install through TestFlight. Play Console → Settings → License testing and InOut → Testing → Internal testing → Testers: authorize accounts and install from the opt-in link. On each phone: **Settings → Plan & privacy → Pro & subscriptions** → Monthly → cancel store sheet (remain Free) → purchase using sandbox (become Pro) → restart → Restore purchases. Test Annual with an eligible account. Check displayed price/trial against store confirmation. Cancel renewal (Pro lasts until paid expiry); use store controls to test expiry/refund/payment retry/grace where available. **Success:** RevenueCat events and app access agree; Pro suppresses ads and unlocks additional routines/reminders/insights; saved routines survive downgrade. Offline access ends at store expiry or 72 hours since verification, whichever comes first; reconnect refreshes it. Simulator/mock purchases do not close this item.

### 3. Private reviewer credential

- [ ] Run `pwsh -File scripts/new-reviewer-code.ps1 -Days 14` locally. Save the clipboard code in a password manager and private review fields, then clear the clipboard. [Supabase InOut](https://supabase.com/dashboard/project/jvmrsoxknaidcbqoasst) → Edge Functions → Secrets: save the script's **`REVIEWER_ENABLED`**, **`REVIEWER_CODE_SHA256`**, **`REVIEWER_CODE_EXPIRES_AT`**, **`REVIEWER_GENERATION`** values. **Needed for:** review without purchasing. **Success:** Settings → Plan & privacy → Pro & subscriptions → Reviewer access → code → Unlock Pro grants access; wrong code fails. Restart and confirm access, then rotate generation and confirm next online validation removes the old grant. Grants last at most seven days; offline reviewer access is limited to one hour. Refresh the private code/expiry before submission if needed. No code is embedded in the binary.

### 4. Advertising and consent

- [ ] [AdMob](https://admob.google.com/) → Apps → Add app: register both platforms and create Banner units; copy IDs into EAS. Privacy & messaging: publish applicable messages using the approved privacy URL. Settings → Test devices: register phones before exercising your own units; confirm **Test Ad** labels and never click live ads. **Success:** banners only on Today/Progress; consent refusal/revisit works; no banner for Pro, active practice or post check-in; no-fill/offline does not block practice. [UMP guidance](https://developers.google.com/admob/ios/privacy).
- [ ] AdMob → Apps → app-ads.txt: provide the exact publisher record and a domain you control for the store developer website if requested; authorize publishing that record. **Success:** AdMob reports the file authorized. Attest to actual provider data/tracking in store forms; non-personalized ads alone do not settle those declarations.

### 5. Physical-phone acceptance

- [ ] Install matching signed candidates on a real Android phone and iPhone; record model/OS/build. Complete a calm session and review the separately gated high-intensity route only if personally appropriate. Judge EN/ES/PT cues, speaker/headphones/silent mode and vibration comfort with haptics on/off. Pause/resume, lock/background, receive a call/alarm and reopen. **Success:** comfortable coordinated cues, safe interruption pause, explicit resume and durable history. These sensory checks require a person and hardware.
- [ ] Use TalkBack/VoiceOver, enlarged text and reduced motion. Complete onboarding, edit profile with keyboard open, inspect Progress/Calendar/Badges and share both card ratios to an actual destination. Save a reminder with permission granted/denied and verify delivery opens the intended practice without starting it. Open/start an exercise link in the phone browser/app; revoke and confirm a fresh browser request refuses it. **Success:** reachable/readable controls, useful announcements, no private notes/ratings in default milestone images and correct permissions/links. Approve final design and audio/haptic feel.

### 6. Business/legal approval and submission

- [ ] Approve publisher **David Clerc**, support **davidclerc@imrtech.xyz**, launch countries/languages/audience, prices and any trial. Confirm support-mail delivery. Approve final Privacy, Safety, subscription terms and store copy against actual provider behavior and content rights. Public URLs: [Privacy](https://clercminator.github.io/InOut/privacy.html), [Support](https://clercminator.github.io/InOut/support.html). **Success:** explicit approval of business facts, precautions, rights and copy without medical-efficacy or affiliation claims.
- [ ] App Store Connect → InOut: complete App Privacy, age rating, content rights, export compliance and applicable publisher/trader declarations; App Review Information: reachable contact and private reviewer instructions/code. Play Console → InOut → Policy and programs → App content: complete Data safety, Ads, App access, audience, content rating and health-app declarations plus account-specific prompts. Use README's actual data inventory, including optional email, RevenueCat and AdMob. **Success:** no outstanding required console forms.
- [ ] Approve exact signed builds/screenshots/listings and the six `release/readiness.json` gates. App Store Connect: select accepted build/subscriptions and submit. Play Console: create the authorized production release after testing requirements. Choose rollout timing and a support/operator contact. **Success:** submission receipts, then approved listings and successful installations. Credential-dependent builds, packaging and evidence-backed gate updates are mechanical follow-up after access/sign-off; this checklist does not assign implementation work to the owner.

## Optional / business decisions

### Welcome email — required only when enabling delivery

- [ ] [Resend](https://resend.com/domains) → Domains → Add Domain: enter a domain/subdomain you control, copy DNS records to your DNS provider and wait for **Verified**. API Keys → Create API Key: select sending permission scoped to that domain. Choose a real From address; keep open/click tracking disabled. [Domain verification](https://resend.com/docs/dashboard/domains/introduction).
- [ ] Supabase InOut → Edge Functions → Secrets: set **`WELCOME_RESEND_API_KEY`** (private sending key), **`WELCOME_EMAIL_FROM`** (`InOut <actual-address@verified-domain>`), **`WELCOME_HASH_SALT`** (stable password-manager-generated secret, at least 32 random bytes), then **`WELCOME_EMAIL_ENABLED=true`**. Preserve the salt: changing it changes deduplication identity. **Success:** next opted-in request can send; no app rebuild. Set enabled to `false` to stop sending.
- [ ] In the candidate, enter an address you control in onboarding/Profile, explicitly request the email, choose a goal and finish onboarding. Resend → Emails and inbox: confirm one localized personalized message and its CTA opens the recommended practice. Restart/retry and confirm no duplicate. **Success:** provider receipt plus real inbox/link acceptance. A `review` receipt requires checking provider delivery before resetting it; never blindly resend an uncertain delivery.

### Verified HTTPS links and measurement

- [ ] If desired, supply a domain you control, Apple Team ID, Play Console → App integrity → app-signing certificate SHA-256, and real store URLs. Authorize hosting root `.well-known/apple-app-site-association` and `.well-known/assetlinks.json`. Prepared configuration/scripts consume those values. **Success:** HTTPS links open the signed app with browser/store fallback. Existing custom-scheme/browser sharing does not require this optional domain setup.
- [ ] Confirm the existing **no remote product analytics for v1** decision. No analytics account/key is needed. Future remote collection is a separate business/privacy decision; current events accept no private free text, goals, ratings or user identifiers.
