# IN/OUT — Product, features and monetization briefing

**Prepared September 17, 2026 for product/business consultation.** This document explains what the product does, what remains hypothetical, and which decisions would materially change its scope. It includes the approved commercial direction plus research questions; it is not evidence that integrations are complete or a market study. [LAUNCH_PLAN.md](LAUNCH_PLAN.md) now controls engineering scope and launch gates.

## 1. Executive summary

IN/OUT is a native iPhone/Android breathing application: choose a situation, follow a short structured practice, optionally record how tense you feel before and afterward, and keep a private practice history. The intended character is practical and precise, closer to a training timer than a meditation content service. “SmartWOD for breathing” is an internal positioning shorthand, not an affiliation.

The application already includes nine usable protocols, custom routines, multi-protocol mixes, native cues, local history and progress. The owner has selected a **commercial v1: useful Free access, monthly/annual Pro, conservative Free ads, sharing/distribution and product-event measurement**. Core breathing remains offline and usable without an account. Real provider integrations are not live yet. It is not yet submitted to the stores. Native release validation and final screenshots remain unfinished; the [README status tracker](README.md#current-status) records the exact failures and owner dependencies.

The central business question is not which additional screens to build. It is **which user repeatedly needs this experience, why they would choose it over a familiar timer or free exercise, and what additional value they would pay for**. The repository does not establish demand, retention, willingness to pay or acquisition economics.

### What the consultant should deliver

1. A primary audience and use occasion, with reasons for prioritizing it.
2. A clear first-release promise and a list of features to keep, simplify, add or skip.
3. A ranked next-step backlog tied to evidence and user value, not feature count.
4. A monetization recommendation, alternatives, and a proposed free/paid boundary.
5. A small research/launch plan with explicit success and stop criteria.
6. A realistic budget and operating plan, separating one-time development from ongoing support, content and infrastructure.

## 2. How to read the project

| Document/source | Purpose | How to interpret it |
| --- | --- | --- |
| [README](README.md) | Implemented features, architecture, run instructions, dated verification and remaining release tasks | Central factual delivery/status record |
| This briefing | Product alternatives, business questions, proposed priorities and research | Recommendations and hypotheses, not authorized implementation |
| [PROJECT_CONTEXT](PROJECT_CONTEXT.md) | Original comprehensive product vision | Includes future accounts/web sharing and subscription ambitions; current implementation status is below |
| [Store submission guide](release/STORE_SUBMISSION_GUIDE.md) | Store handoff, owner tasks and acceptance requirements | Submission preparation, not evidence of approval |
| [Store listing](release/store-listing.json) | Current proposed public description | Draft requiring commercial integration evidence and final approval |
| [Stitch references](UI/) | Visual language and screen concepts | A paywall/account/reminder mockup does not mean that feature exists |

The previous free-only first launch is superseded. Subscriptions, conservative ads and the shared-browser loop are now launch requirements. Account flows must remain honest about what exists; future cloud sync is not an available benefit. The current build still lacks the production integrations needed to satisfy commercial v1.

## 3. Audience, positioning and jobs to be done

The following are candidate audiences, not validated customer segments:

| Candidate | Moment of need | What IN/OUT could deliver | What to learn before prioritizing |
| --- | --- | --- | --- |
| Busy professionals/students | Before a presentation, meeting or focused work | A quick, low-friction reset without browsing a content library | Does use recur outside the first stressful moment? Which wording and session length help? |
| People building an evening routine | Transition from work or preparation for sleep | Repeatable gentle practice and easy replay | Is a visual, screen-awake experience desirable at bedtime? Are audio-only or reminders necessary? |
| Fitness/performance users | Before activity or during recovery | Practical protocol selection and saved routines | Do existing practices meet their needs without adding high-intensity content or medical claims? |
| Experienced breathwork users | Precisely repeat a familiar routine | Custom phases, Mix Mode and offline reliability | Do they prefer creation tools or curated presets? Is customization worth paying for? |

**Proposed starting focus:** compare quick daytime resets with experienced routine builders in interviews and observed use, then choose one primary audience for store messaging. This is a research starting point, not evidence that either segment wins. Avoid marketing six equally important use cases before learning which one drives repeat use.

Intended differentiation: situation-first entry, protocol-specific visuals, subjective before/after reflection, and flexible routines. None is yet demonstrated to be a defensible market advantage. A consultant should compare the complete experience with direct breathing apps, meditation apps, general interval timers, saved videos and doing nothing. Current competitor prices, positioning and reviews have not been researched for this briefing.

## 4. Feature and option inventory

“Implemented” means present in the app; it does not override the outstanding release/device checks in the README. “Partial” means a narrower useful version exists. “Proposed” means no corresponding complete product capability is available.

| Capability | Current implementation/options | Gap or product decision |
| --- | --- | --- |
| Entry and navigation | Onboarding; Today, Protocols, Custom and Progress tabs; settings/profile destinations | Validate that a first useful session starts quickly; no sign-in gate |
| Situation selection | Calm, focus, performance, recovery, sleep and energize recommendations | Selection is not a validated personalized recommendation system; narrow launch messaging if needed |
| Quick reset | 48-second Physiological Sigh path | Original “60 SEC RESET” language is a concept; describe actual duration accurately |
| Built-in library | Nine available practices: Physiological Sigh, Box, Coherent, Extended Exhale, 4-7-8, Diaphragmatic, Equal, Nadi Shodhana and Bhramari | More protocols are not automatically more value; review comprehension and safe use |
| High-intensity cyclic practice | Tenth definition retained in code but disabled across released execution paths | Excluded from this release; reconsider only as a separate safety/content decision |
| Protocol details/favorites | Discover, filter, read guidance, select and favorite practices | Test whether users understand which practice to choose |
| Session controls | Timed phases/cycles/blocks; pause, resume, restart and end | Background/lock deliberately pauses; continuous locked-screen sessions would require a new behavior decision and testing |
| Visual guidance | Distinct protocol visuals, including a rounded-square Box path | Validate comprehension and comfort, not just visual appeal |
| Audio | Concise voice, sound cues or silent | Bundled guidance, not a long-form coached audio library; additional languages/voices are future scope |
| Haptics/screen | Phase haptics and keep-awake switches | Device quality and interruption acceptance remain open |
| Accessibility | Safe areas, touch targets, labels, font scaling and reduced-motion handling | Physical VoiceOver/TalkBack and large-text acceptance pending; no claim of a completed accessibility audit |
| State Shift | Optional 1–10 pre/post tension, skip support, positive/unchanged/negative change | Tension is only one dimension; it may not measure focus/energy goals well. Do not equate it with efficacy or biometrics |
| Custom patterns | Ordered editable phases, durations, cycles, total time; run/save/edit/duplicate/delete | Free gets one saved pattern initially; Pro removes the save limit. Measure creation and reuse |
| Mix Mode | Ordered built-ins/saved patterns, block cycles, repeat mix, next-block indication; saved mix management | Free gets one saved mix initially; Pro removes the save limit. Assess discoverability and reuse |
| History | Local records, filters, details, replay, deletion | No cloud restore, cross-device continuity or expanded note-taking system |
| Progress | Period views, sessions/time/streaks, activity/usage and paired tension change | Partial fulfillment of the broader personal-insights concept; not a learning/coaching engine |
| Sharing | Native text result share sheet | Partial: no generated image cards, shared exercise URLs, browser reset or install attribution loop |
| Privacy and support | Offline legal/help, support email, local data deletion; public static pages | No support dashboard or established response-time commitment |
| Offline/storage | Protocols, cues, routines, settings and sessions stored/bundled locally; recovery checkpoints | No app-managed backup/export/import or sync; OS backup is not a promised cross-device restore service |
| Accounts | Guest-only; profile is not an authenticated cloud account | Optional account creation and lossless migration are proposed |
| Reminders | Not implemented | Premium reminder foundation is planned; permission remains contextual |
| Web | Published privacy/safety/support pages | Marketing funnel, shared breathing and account/billing experiences are proposed |
| Purchases | Monthly/annual UI, RevenueCat adapter, restore and lifecycle cache implemented | Store products/keys and real sandbox acceptance remain outstanding; dev purchases never charge |
| Language/appearance | Current English experience and designed dark palette | No multilingual product or user-selectable light-theme offering; prioritize only with audience/accessibility evidence |
| Wearables/sensors | No health sensors, watches or biometric integration | New product/privacy/validation scope, not a hidden existing capability |

### Important product boundaries

- Core practice should remain useful offline and without an account.
- State Shift is subjective. Showing a lower score does not establish causation, clinical benefit or guaranteed improvement.
- The application is not a medical service or emergency intervention.
- Safety and access to stopping a session must not depend on payment.
- Phone experience remains primary; a shared browser exercise would support distribution, not require rebuilding the product as a web app.
- Existing data and saved routines should survive future schema, account and commercial changes.

## 5. Approved monetization direction and unresolved decisions

**Approved:** all nine normal protocols remain free; monthly and annual recurring Pro are required, with an optional store-configured trial. Free supports one saved Custom Pattern and one saved Mix initially. Pro removes creation/save limits, removes ads and offers depth/continuity through advanced Progress/insights and recurring practice support. No safety paywall. Existing above-limit routines remain readable, editable, runnable and deletable after downgrade.

Capabilities and limits belong in centralized configuration; do not hard-code plan names throughout screens. The full model and delivery gates are in [LAUNCH_PLAN.md](LAUNCH_PLAN.md). AdMob and RevenueCat are preferred isolated providers, not production-ready integrations. The owner expanded the current task to include subscription and ad development paths. Central entitlements, subscription UI/mock/RevenueCat adapter, native AdMob test slots/UMP code and a local event logger now exist. Real provider acceptance, premium insights/reminders and sharing remain outstanding.

The previous suggestions to launch free-only or choose one-time purchase instead are **superseded by the owner's decision**. Research should now refine the recurring offer, free limits, prices, trial and retention value rather than silently substitute a different business model.

Free ads must sit in conservative browsing/management locations. Pro sees none. Active breathing, State Shift, safety and onboarding are protected; no interstitial immediately after a reset. Advertising inputs and analytics must exclude ratings, private routines/notes and inferred wellbeing states.

Remaining commercial decisions:

1. Monthly/annual prices, countries/currencies and optional trial duration/eligibility.
2. Which advanced benefits are genuinely complete at launch; future sync must not be sold as live.
3. How to present the single saved-pattern/mix limits and preserve existing data on downgrade.
4. Ongoing guidance/content/support responsibilities and operating budget.
5. Purchase identity, restoration, optional account behavior and offline entitlement-cache policy.
6. Consent/advertising region configuration and whether remote analytics is enabled or remains local/dev.

Apple and Google require continuing subscription value: [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/) and [Google subscription policy](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en). Real purchase/grace/expiry/restore acceptance is required; a mock Pro switch is developer tooling only. Store products and public SDK keys are owner setup; private credentials stay in provider consoles.

### Business inputs not yet supplied

Target country/language, audience size, launch budget, acquisition budget, delivery capacity, support capacity, revenue goal, pricing, willingness to pay, conversion, retention and cost per acquired user are **unknown**. Do not fill these with industry averages and present them as project results.

A consultant's financial model should show assumptions and sensitivities. For example: paying users × realized revenue per payer, less applicable store charges, taxes, refunds, infrastructure, content, support and acquisition costs. Separate cash cost from owner time. Current offline operation avoids an application backend but still requires maintenance, builds, support and platform accounts. Exact fees, tax treatment and vendor pricing must be sourced when preparing a financial forecast.

## 6. What to focus on, add later or skip

The commercial sequence in LAUNCH_PLAN.md takes precedence over the earlier research-driven ordering below. These remain product evaluation considerations, not permission to defer launch-required subscriptions, ads or sharing. Relative effort is qualitative, not an estimate or quote.

| Priority | Work/option | Reason | Dependency or evidence to proceed | Relative effort |
| --- | --- | --- | --- | --- |
| P0: close release | Resolve native flow failures, final captures, signed builds and device/accessibility acceptance | A reliable installed app is necessary to test the product | README release checklist and passing evidence | Bounded engineering; device/account dependencies |
| P1: learn core use | Observe first session, protocol choice and return use with target users | Reveals whether the app's main promise is understood and repeated | Recruit relevant testers; agree observation questions | Low technical, meaningful research effort |
| P1: simplify where observed | Remove friction in start, ratings, replay and routine discovery | Can improve existing value without adding another feature | Repeated observed confusion, not preference alone | Low–medium |
| P2 candidate: reminders | Opt-in schedules for an existing practice | May help users who want to return but forget | Repeat users explicitly identify forgetting as a barrier | Medium; scheduling, permissions/timezones |
| P2 candidate: personal insights | Useful summaries by goal, protocol and time | Could make accumulated history more valuable | Enough repeat observations; users can interpret uncertainty | Medium; data quality and explanatory UI |
| P2 candidate: sharing loop | Open a shared protocol in a browser and optionally install/open native app | Tests the intended acquisition loop | Users want to send exercises; choose a small, measurable sharing experiment | High; hosting, links, privacy, browser cues and testing |
| P2 candidate: backup | Export/import or optional account backup | Addresses loss of valued routines/history | Demonstrated demand or unacceptable loss risk | Medium for local transfer; high for reliable cloud sync |
| P2 candidate: localization | Selected language plus guidance/store/support content | Could remove an actual audience barrier | Choose a market and budget for translation/support quality | Medium; ongoing content maintenance |
| P3: monetize validated value | Chosen unlock, packs or recurring service | Commercialization should have a specific benefit to sell | Package, price research, existing-user policy and support plan | Medium–high |
| Defer | More animations, many more protocols, extensive themes | Current breadth is already enough to evaluate the main behavior | Revisit for measured comprehension/accessibility issues or clear demand | Variable |
| Skip for this release | AI coach, health-sensor integration, social feed, wearable/desktop apps, high-intensity practice | Each adds a distinct product/support/validation burden | Separate evidence and explicit scope decision | High/new product scope |

The sharing loop is absent from the current implementation but is now a launch requirement. Scope a small free browser exercise rather than a duplicate web app; use the shared engine and a public snapshot that excludes personal scores by default.

## 7. Research, measurement and acquisition

### Evidence currently available

There is engineering verification and a working feature inventory. No validated customer research, production usage funnel, cohort retention, revenue, acquisition cost, competitor benchmark or clinical-outcome evidence is supplied in this repository. Developer test ratings and store captures must never be used as customer-success data.

### Proposed learning sequence

1. Conduct a small qualitative round with people from the candidate audiences. Observe first use on phones; record where they hesitate, which situation they choose, whether ratings feel useful, and whether they can find/replay a routine.
2. Follow up after a defined use period. Ask when they used it, what they used instead, why they returned or did not, and which capability they actually missed. A small interview round is directional, not statistically representative.
3. Test descriptions of distinct paid benefits and prices without claiming unavailable functionality is live. Prefer evidence of choices and behavior to “would you pay?” enthusiasm alone.
4. Select one next feature or commercial experiment. Agree its primary measure, budget, timeframe, guardrails and stop condition before building it.

### Candidate measures and their limits

| Question | Suggested measure | Important interpretation |
| --- | --- | --- |
| Can newcomers reach value? | Proportion of observed newcomers completing a first session; time/taps to start | Define whether onboarding and optional ratings are included |
| Is practice repeatable? | Return-to-practice among the same installation cohort over a declared interval | Opens are not sessions; account-free cross-device users cannot be reliably deduplicated |
| Do people complete? | Completed sessions divided by started sessions, with interruption/early-end reasons | More completion is not always better; stopping when uncomfortable is appropriate |
| Does State Shift feel useful? | Voluntary paired-rating rate and the distribution of reported changes | Report missing answers and sample size; self-selection and context prevent causal efficacy claims |
| Do advanced tools matter? | Pattern/mix creation followed by reuse | Creation without reuse can indicate novelty or friction |
| Does sharing acquire users? | After implementing links: shared exercise starts/completions and subsequent install/open actions where observable | Text shares alone do not provide this funnel; attribution is incomplete across devices/platforms |
| Will people pay? | After a real offer exists: purchase/restore/refund outcomes and retention of paying cohorts | Separate price, package and audience effects; do not infer from installs |

**A provider-neutral event-name-only service and local/dev logger are implemented; complete trigger wiring and external collection are pending.** These are proposed questions, not available dashboards. Initial learning can use consented observation and voluntary follow-up. Adding telemetry requires a separately agreed data-minimization plan and updated disclosures; avoid collecting raw tension ratings or private routines merely because they are convenient to log. Local progress screens are not a developer-accessible analytics system.

Numeric targets should be chosen after establishing a baseline and available sample size. Do not manufacture retention or conversion thresholds as if they were commitments already agreed by the owner.

### Acquisition options to investigate

- Store presentation focused on the selected use occasion; compare message comprehension before optimizing keywords.
- Small relevant communities or coach partnerships for feedback and early distribution, without building a coach platform first.
- Demonstrations showing the actual short session and offline utility; no promised health result.
- The launch-required shared browser reset as a measurable product-led acquisition experiment.
- Paid acquisition only after defining what conversion means, instrumentation limits and a sustainable budget; no current acquisition economics support scaling it.

## 8. Operating and trust considerations

Publisher/support identity is David Clerc, `davidclerc@imrtech.xyz`. Developer accounts, store records, signing, final forms and submission are owner-dependent. A consultant should also identify who maintains dependencies, handles support, reviews protocol wording, localizes future content and responds to store feedback.

The present privacy proposition is simple: local sessions/routines, no account, no developer analytics/backend, user-initiated sharing/email and possible OS backup. Accounts, cloud recommendations, health integration, advertising or organizational reporting would change that proposition and introduce additional responsibilities. These are product costs as well as engineering costs.

Content/claims review and device acceptance are distinct from adding features. Do not position subjective tension change as a treatment claim, imply sensor measurement, or expose another person's ratings in sharing by default. Do not gamify maximum retention, oxygen deprivation or breath-hold failure. These limits apply regardless of the business model.

## 9. Decisions to leave the consultation with

| Decision | Current state | Required output |
| --- | --- | --- |
| Primary audience/use occasion | Multiple candidates; not validated | One initial focus and evidence needed to challenge it |
| First-launch scope | Commercial native MVP; integrations/acceptance incomplete | Prioritize delivery within the approved Free/Pro/ads/sharing scope |
| Feature priorities | Broad local feature set already implemented | Ordered keep/simplify/add/defer/skip list with user reasons |
| Monetization | Monthly/annual recurring Pro selected; adapter/UI exist, store configuration and acceptance pending | Paid benefits, pricing/trial, downgrade behavior and operating economics |
| Acquisition | Store copy prepared; browser sharing absent | One feasible initial channel/experiment and why |
| Research/measurement | No customer evidence or developer analytics supplied | Recruitment, questions, definitions, consent approach and decision thresholds |
| Market and language | Not specified as a business decision | First geography/language and support implications |
| Budget and operating capacity | Not supplied | Spending/time limits, accountable owner and recurring obligations |
| Next milestone | Close release validation | Concrete deliverable, acceptance evidence, owner and review date |

For each recommendation, ask the consultant to write: **problem → proposed change → expected user/business value → evidence → cost/dependencies → success/stop condition**. A useful outcome is fewer unresolved priorities and a testable commercial hypothesis, not a larger undifferentiated feature list.
