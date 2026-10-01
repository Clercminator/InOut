# IN/OUT — Product context

This document combines the product vision and product/business briefing. [README.md](README.md) owns implementation status, engineering work and verification; [OWNER_SETUP_CHECKLIST.md](OWNER_SETUP_CHECKLIST.md) owns manual decisions, setup and launch actions. Updated September 30, 2026 to reflect current implementation and decisions. Implemented features are not yet an approved store release; research proposals below remain hypotheses.

## Product and positioning

**The mobile application is the product.** IN/OUT is a native iOS/Android breathing protocol app: choose a situation, follow a short practice, optionally reflect on tension before/after, and retain a private practice history. “SmartWOD for breathing” is internal shorthand, not an affiliation. The intended experience is practical, precise and tactile, closer to a training timer than a meditation content library.

Positioning options include “Control your state”, “Breathe for what's next” and “Calm. Focus. Perform. Recover.” Start useful practice in approximately two taps. Describe actual durations accurately: the current quick Physiological Sigh path is 48 seconds; the original “60 SEC RESET” was a concept.

Candidate situations: Calm Now, Focus, Perform, Recover, Sleep and Energize. Today should offer one primary recommendation and at most two alternatives; experienced users can select a protocol directly. Recommendations are not validated medical or personalized guidance.

## Approved launch scope

The September 17 commercial-v1 direction, with subsequent implemented additions through September 30, supersedes earlier free-only launch and deferred-localization/high-intensity assumptions.

| Capability | Free | Pro |
| --- | --- | --- |
| Ten protocols, timer, visuals, cues, haptics, safety | Included; high-intensity cyclic practice requires explicit safety confirmation | Included |
| State Shift, basic History/Progress, favorites and offline practice | Included | Included |
| Custom Patterns and Mixes | One saved pattern and one saved mix initially; unsaved drafts runnable | Unlimited saves |
| Existing routines after downgrade | Read, edit, play and delete; limit only new saves/duplicates | Included |
| Advertising | Conservative browsing placements | No requests or display |
| Shared browser practice | Deployed, short revocable cadence links; excludes high-intensity snapshots | Included |
| Local reminders | One reminder | Up to five; existing reminders preserved after downgrade |
| Progress/insights | Basic Progress retained | Implemented sample-limited insights; device acceptance open |
| Profiles, rituals, themes and EN/ES/PT content | Implemented local experience | Included |

Pro uses monthly/annual store subscriptions with an optional store-configured trial. No native card-entry forms. Central capabilities include `adFree`, `unlimitedCustomPatterns`, `unlimitedMixes`, `unlimitedSavedRoutines`, `advancedProgress`, `advancedInsights`, `advancedReminders`, `advancedGuidance`, `premiumAudioVisuals` and `futureCloudSync`. Reserved flags are not product availability.

Ads never appear during active practice, State Shift, onboarding or safety, or as a post-reset interstitial. Ratings, notes, routine content and inferred wellbeing states are excluded from targeting and analytics. Provider integrations remain isolated; demo purchases and test ads are not production acceptance.

## Native experience and design

React Native, Expo, TypeScript and Expo Router are the canonical client. Native navigation has four main tabs: Today, Protocols, Custom and Progress; Settings/Profile remain secondary. Prioritize portrait orientation, safe areas, one-handed use, readable controls, short paths and unreliable connectivity. No desktop-style dashboard or hover-dependent interactions.

Preserve the owner's selected [Stitch exports](UI/) using native components and bundled Inter/Space Grotesk fonts. Extract reusable cards, buttons, chips, rating scales, spacing, radii and motion from selected screens; do not turn exported HTML/Tailwind into the application architecture. Selected screens guide composition; the updated [design reference](UI/inout/DESIGN.md) and current native tokens describe later refinements. The updated design reference describes current implementation intent, not sensing or clinical claims. Current implementation constants live in [design tokens](packages/design-tokens/src/index.ts).

Light uses white, green, blue and gold; Dark uses deep blue surfaces and vivid phase colors. Support System appearance and preserve active practice when themes change. Each protocol needs a recognizable visual: Box follows a square path; Sigh expands twice then releases; Coherent/Equal expand symmetrically; Extended Exhale emphasizes release; 4-7-8 distinguishes hold; Nadi alternates sides; Bhramari uses ripples. Preserve smooth animation and reduced-motion alternatives without unnecessary battery/GPU load.

Support optional phase/cycle/completion haptics, concise voice/tone/silent guidance, headphones and user-controlled screen-awake behavior. Real devices must establish quality. VoiceOver/TalkBack, font scaling, contrast, adequate touch targets and non-color-only guidance are required. Notification permission is contextual to enabling a reminder, never the first-launch default. Implemented reminders use local weekday/time choices, a neutral notification and a quick practice or saved ritual destination. A tap navigates without auto-starting practice; native delivery must be accepted on each platform.

## Domain, timing and persistence

Built-ins are versioned bundled data: Physiological Sigh, Box, Coherent, Extended Exhale, 4-7-8, Diaphragmatic, Equal, Nadi Shodhana and Bhramari. The tenth, high-intensity cyclic protocol (Wim Hof Method), is available in native practice with explicit safety confirmation; public exercise sharing excludes it.

Use one deterministic, platform-independent breathing engine for arbitrary ordered phases, cycles and blocks. Phases may include inhale, top-up, hold, exhale, hum, retention, recovery and free breathing. Protocol data describes durations, goals, intensity/safety, animation and cue settings. React Native must not be a dependency of protocol definitions or the engine.

Authoritative timestamps drive elapsed/remaining time; UI intervals only refresh the display. The chosen mobile policy pauses on background/lock/interruption and requires explicit resume. Preserve durable checkpoints and pending post-session responses across process death. Do not claim unknown time after the last checkpoint as practice. Save failures expose recovery rather than silently losing data; migrations and account changes must preserve history and routines.

Local-first data includes sessions, preferences, favorites, patterns, mixes, interrupted state, profile/photo, rituals/rewards, reminders and local share-management controls. Cloud synchronization is not implemented. Core practice cannot depend on network, billing or authentication. OS backup is not an app-managed backup/sync guarantee.

Custom patterns support arbitrary phase creation, ordering, duration/cycles, total-time preview, immediate execution and save/edit/duplicate/delete. Mixes chain built-ins and saved patterns, with ordered blocks, block cycles, whole-mix repeats and next-block indication. Executed snapshots remain independent of later edits.

History supports chronological records, situation filters, detail, replay, sharing and deletion. Progress covers 7D/30D/3M/1Y, sessions, time, streaks, activity, usage and paired tension change. Implemented Pro insights compare this week with the preceding week, show a most-used completed pattern only after three completions in 30 days, and require five paired completed sessions across three days per unchanged protocol/version/plan for median tension change. Manual/early-ended sessions do not establish tension patterns. Best for Calm, Fastest Reset and Evening Favorite are not additional implemented claims. Tension cannot establish improved Focus or clinical efficacy.

## State Shift and safety

State Shift is voluntary self-report on a 1–10 tension scale. Store raw pre/post answers and reveal comparison only after the second answer. Support improvement, no change, increased tension and skipping; never invent skipped values. This is not a biometric measurement, causal result or medical treatment.

Make stop/end and safety guidance easy to reach. Breathe comfortably without forcing; provide an “I feel unwell” path. High-intensity entry requires explicit safety confirmation and appropriate warnings; never promote it as the default quick reset or include it in public sharing. Never gamify maximum retention, oxygen deprivation, hold-to-failure or retention leaderboards. Safety must remain offline and unpaywalled. Content must not encourage practice while driving, operating machinery or in circumstances where fainting could cause injury, including water.

## Sharing and secondary web

The acquisition hypothesis is: native practice → shared exercise URL → useful browser practice → completion → optional native open/install → repeat. The browser reset must work without account, payment or installation. Use the shared engine and validate versioned public snapshots, excluding personal scores/notes by default. Preserve the executed routine independently of later edits.

Use the OS share sheet/copy link; avoid separate messaging integrations where unnecessary. Generated cards and richer result sharing are optional extensions. Universal Links/App Links require domain association and correct signing; custom schemes alone do not establish verified links. Handle missing app, malformed/deleted records and network failure honestly. Store destinations must be real; no guaranteed post-install restoration claim.

The current web surface includes public content and a deployed EN/ES/PT shared exercise player backed by Supabase. Short opaque links expire after 30 days and can be revoked from the originating installation; lost local controls do not revoke them, and already loaded copies cannot be recalled. Expired rows are cleaned on subsequent creation, not an exact deletion timer. Browser practice and public pages are secondary; do not reproduce the entire mobile product or build Electron/macOS/Windows clients. `inout.app/reset/<share-id>` was an illustrative URL, not evidence of domain ownership. Next.js was a suggested web framework, not a required migration of current pages.

## Future accounts and deferred scope

Guest use is first-class. Current store purchases use anonymous provider identity and store restoration. Cloud backup/sync and cross-device account history remain future scope. If accounts are added, implement lossless guest migration, cloud deletion, authorization and explicit purchase-transfer behavior before advertising them.

Supabase InOut in IMR TECH, São Paulo, currently serves only public exercise sharing with private tables and server-mediated access. It is not a cloud profile/history database or a dependency for offline breathing. Extending hosted storage to profiles, sessions, routines or accounts would require a separate product/privacy decision and authorization design.

English, Spanish/Brazilian Portuguese, localized voices, selectable themes and native high-intensity content have now been implemented. Defer cloud backup/sync, additional languages/content beyond the implemented catalog and richer image sharing unless separately prioritized. AI coaching, health sensors, microphone breath detection, wearables, social feeds and desktop clients remain outside scope. No major visual redesign is planned.

## Audience and business hypotheses

No validated demand, production retention, revenue, willingness-to-pay, acquisition economics, competitor benchmark or clinical-outcome evidence is established by the repository. Test ratings and screenshots are not customer outcomes.

| Candidate audience | Moment/value to test | Unresolved question |
| --- | --- | --- |
| Professionals/students | Quick reset before meetings or focused work | Does use recur beyond the initial stressful moment? |
| Evening-routine users | Gentle repeatable wind-down | Is screen-awake guidance appropriate; are audio/reminders needed? |
| Fitness/performance users | Preparation or recovery routines | Can current safe protocols meet their needs without new claims/content? |
| Experienced breathwork users | Precise custom routines and mixes | Do creation tools drive repeat use and payment? |

A proposed research starting point is to compare daytime resets with experienced routine builders, then choose one primary audience for store messaging. Compare the whole experience with breathing/meditation apps, timers, videos and doing nothing. Current competitor prices/reviews need fresh research.

Research should refine the approved recurring offer, price, trial and retention value; earlier one-time/unlock/pack/free-only alternatives are not the approved plan. Budget, geography/language, operating capacity, revenue goals and acquisition assumptions remain unknown. Model realized revenue less applicable store charges, taxes, refunds, infrastructure, content, support and acquisition; separate cash spending from owner time and source actual fees when budgeting.

## Research and measurement

Observe a small relevant group using the first session and finding/replaying routines; follow up over a declared period to learn when/why they returned, what they used instead and what they missed. Test paid-benefit descriptions without claiming unfinished functionality exists. Select a bounded next experiment with a measure, budget, timeframe and stop condition; small interviews are directional, not population evidence.

| Question | Candidate measure | Interpretation limit |
| --- | --- | --- |
| First value | First-session completion and time/taps to start | Define onboarding/ratings inclusion |
| Repeated practice | Same-installation cohort return-to-practice | Opens are not sessions; cross-device identity is incomplete |
| Completion | Completed/started sessions and observed interruptions | Stopping when uncomfortable is appropriate |
| Reflection | Voluntary paired answers and reported change distribution | Missingness, sample size and self-selection prevent efficacy claims |
| Routine value | Pattern/mix creation followed by reuse | Creation alone can reflect novelty |
| Sharing | Browser starts/completions and observable open/install actions | Text sharing does not establish this funnel; attribution is incomplete |
| Payment | Real purchase/restore/refund and paying-cohort retention | Separate audience, package and price effects |

The event API accepts names only. Exact events and engineering wiring live in the [README event map](README.md#analytics-event-map); these measures are not currently available developer dashboards. Core event wiring exists, but production/browser collection remains disabled; clipboard and store-install event names are reserved, not measured conversions. Remote collection requires a provider/retention/consent decision. Observation and voluntary feedback can precede it; numeric targets need a baseline, not invented thresholds.

Initial acquisition options are clear store messaging, relevant communities/coach feedback, demonstrations of actual offline practice and the required shared-browser loop. Paid acquisition needs defined conversion and a sustainable budget before scaling. Do not build a coach platform just to test partnerships.

A useful consultation outcome is one audience, an honest release promise, ordered keep/simplify/add/defer decisions, recurring offer/pricing, a small research plan, and an operating budget with responsibility for support, maintenance and content review. Each recommendation should specify the problem, proposed change, expected value, evidence, dependencies and success/stop condition. Manual decisions are recorded in the owner checklist rather than a second task list here.