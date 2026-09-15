# PROJECT_CONTEXT.md
# IN/OUT — PRODUCT & IMPLEMENTATION CONTEXT

## 1. PRODUCT DEFINITION

IN/OUT is a MOBILE-FIRST breathing protocol application for iOS and Android.

The simplest description is:

"SmartWOD for breathing."

The canonical product experience is a native mobile application used on a phone.

Users may interact with parts of IN/OUT from a laptop or desktop browser, but desktop/web is secondary.

The mobile application is the product.

The web is primarily used for:

- shared breathing exercises
- shared result/protocol links
- marketing pages
- account/support pages where useful
- legal documents
- potentially web subscription management / checkout

Do NOT architect IN/OUT as a desktop-first or responsive-web-first application.

Do NOT treat mobile as merely one responsive breakpoint.

The phone experience has priority in every product and engineering decision.


## 2. PRODUCT POSITIONING

IN/OUT helps users deliberately change their immediate state through structured breathing protocols.

Core positioning:

- Control your state.
- Breathe for what's next.
- Ready in 60 seconds.
- Calm. Focus. Perform. Recover.
- A breathing protocol for every moment.

IN/OUT is NOT primarily a meditation application.

The product should feel closer to:

- SmartWOD
- WHOOP
- Nike performance products

than to:

- Calm
- Headspace
- spiritual meditation applications

Relevant use cases include:

- nervous before a presentation
- acute stress
- preparing to perform
- focusing before work
- recovering after exercise
- winding down before sleep
- increasing alertness
- everyday emotional regulation

The experience should be fast, tactile, precise and practical.

A user should be able to open IN/OUT on their phone and begin a useful protocol in approximately two taps.


## 3. MOBILE-FIRST PRODUCT PRINCIPLES

All major UX decisions must assume the user is holding a phone.

Optimize for:

- portrait orientation
- one-handed interaction where possible
- large touch targets
- glanceable information
- short interaction sequences
- tactile feedback
- phone speakers/headphones
- screen interruptions
- lock/unlock behavior
- background/foreground transitions
- notification permissions
- unreliable connectivity
- short sessions while moving between activities
- use in gyms, offices, bedrooms, airports and similar environments

Avoid:

- desktop-style dense dashboards
- tiny controls
- hover-dependent interactions
- multi-column desktop layouts inside the mobile app
- excessive text entry
- screens requiring precision clicking
- web-style navigation patterns that feel unnatural on iOS/Android

Respect:

- iOS Safe Areas
- Android system bars
- Dynamic Island / notches
- varying mobile screen heights
- system accessibility font scaling
- reduced-motion settings
- system dark/light mode where appropriate


## 4. PRIMARY CLIENT

Canonical client:

React Native
Expo
TypeScript

Preferred navigation:

Expo Router

The production mobile app targets:

- iOS
- Android

Use native/mobile APIs wherever they materially improve the experience.

Examples:

- Expo Haptics
- Expo Audio / appropriate audio APIs
- Expo Keep Awake
- Expo Notifications
- Expo Linking
- Secure Store
- native App Store / Play Store subscription flows
- platform share sheet
- app deep links / universal links


## 5. STITCH OUTPUT

Google Stitch was used to develop the visual language and screen inventory.

Stitch output is DESIGN INPUT.

It is not automatically the production architecture.

Important:

If the Stitch export is web-oriented HTML/CSS/React, do NOT build the production application as a web app merely to preserve that code.

Instead:

1. inspect the Stitch code
2. identify useful visual assets, layouts and tokens
3. extract:
   - colors
   - typography
   - spacing
   - radii
   - visual hierarchy
   - iconography
   - cards
   - buttons
   - protocol visuals
4. reproduce those faithfully using React Native components

Do not visually redesign the screens unless technically necessary.

Preserve the strongest Stitch versions manually selected by the product owner.

Stitch is intended to reduce frontend design/token cost.

Codex effort should be concentrated on:
- product logic
- breathing engine
- data model
- local persistence
- synchronization
- sharing
- subscriptions
- safety
- backend
- analytics


## 6. SECONDARY WEB PRODUCT

IN/OUT needs a web application, but it is secondary.

Recommended:

Next.js
React
TypeScript

Primary web responsibilities:

### A. Shared breathing experience

Example:

inout.app/reset/<share-id>

Recipient opens link on:
- iPhone browser
- Android browser
- laptop
- desktop

The protocol runs directly in the browser.

No installation is required.

### B. Marketing

Basic public website.

### C. Account/support

Potentially:
- account management
- support
- legal documents

### D. Subscription

Web checkout / subscription management if commercially useful and compliant.

The web application should be responsive, but do NOT duplicate the entire native mobile app on the web during MVP.


## 7. DO NOT BUILD A DESKTOP APP

There is no dedicated desktop client in MVP.

Do not create:

- Electron app
- macOS desktop app
- Windows desktop app

unless explicitly requested later.

Laptop users interact through the web surface.


## 8. CORE PRODUCT HYPOTHESIS

The breathing timer itself is not sufficient differentiation.

IN/OUT differentiates through:

1. situation-first recommendations
2. protocol-specific breathing visualizations
3. Before/After State Shift tracking
4. learning which protocols work best for each user
5. Custom breathing patterns
6. Mix Mode
7. beautiful progress/history
8. shareable breathing experiences
9. browser-accessible shared protocols


## 9. CORE ACQUISITION LOOP

user completes protocol on phone
→ creates useful/shareable protocol or result
→ invokes native mobile share sheet
→ sends link through WhatsApp / Messages / Instagram / etc.
→ recipient opens link
→ recipient breathes inside mobile browser
→ recipient experiences value
→ recipient may install IN/OUT
→ loop repeats

This loop is strategically important.

The shared browser experience must remain useful without installation.


## 10. MVP NAVIGATION

Native mobile bottom navigation:

1. Today
2. Protocols
3. Custom
4. Progress

Profile and Settings are secondary destinations.

Do not add more primary tabs unless product requirements change.


## 11. TODAY

Headline:

"Breathe for what's next."

Situations:

- Calm Now
- Focus
- Perform
- Recover
- Sleep
- Energize

The system recommends:

- ONE primary protocol
- maximum TWO alternatives

Expert users may bypass recommendations and manually choose protocols.

Include a rapid pathway such as:

60 SEC RESET


## 12. CORE PROTOCOLS

Initial library:

1. Physiological Sigh
2. Box Breathing
3. Coherent Breathing
4. Extended Exhale
5. 4-7-8 Breathing
6. Diaphragmatic Breathing
7. Equal Breathing
8. Nadi Shodhana
9. Bhramari
10. High-Intensity Cyclic Breathing

Built-in protocol definitions should be versioned application data.

Avoid requiring network access to load the core protocol library.


## 13. BREATHING ENGINE

This is one of the most important engineering components.

Do NOT implement independent timers for each protocol.

Create a deterministic generic breathing engine.

Conceptual model:

Protocol
- id
- name
- goalTags
- phases[]
- defaultCycles
- defaultDuration
- durationPresets
- intensity
- safetyCategory
- animationType
- audioConfig
- hapticConfig

Phase
- type
- durationMs
- label
- nostril if applicable
- audioCue
- hapticCue
- animationInstruction

Possible phases:

- inhale
- inhaleTopUp
- hold
- exhale
- hum
- retention
- recovery
- freeBreathing

Engine state:

- currentPhase
- phaseStartedAt
- phaseElapsedMs
- phaseRemainingMs
- currentCycle
- totalCycles
- sessionStartedAt
- sessionElapsedMs
- sessionRemainingMs
- paused
- completed


## 14. MOBILE TIMER REQUIREMENTS

Mobile execution makes timer correctness particularly important.

The timer must survive:

- rendering delays
- temporary JS thread delays
- screen lock if supported by configuration
- foreground → background → foreground
- incoming phone calls
- notification interruptions
- app switching

Do NOT derive authoritative time from repeated decrementing UI intervals.

Use timestamp-based timing.

Example principle:

remaining =
configuredDuration
-
(now - phaseStartedAt - pausedDuration)

The UI may refresh frequently, but timestamps are authoritative.

On app return:

- reconstruct correct phase
- determine whether phases elapsed while backgrounded
- apply the defined session/background policy
- never silently drift several seconds


## 15. HAPTICS

Haptics are a first-class mobile feature.

Provide optional tactile signals for:

- inhale
- hold
- exhale
- cycle completion
- protocol completion

Haptics should allow someone to breathe with minimal visual attention.

Respect device capabilities and user settings.


## 16. AUDIO

Support:

- concise voice guidance
- sound cues
- silent mode

Examples:

"Inhale."
"Hold."
"Exhale."

Audio behavior must correctly handle:

- silent mode decisions
- headphones
- interruptions
- audio focus
- other audio playing on the device

Avoid assuming desktop speakers.


## 17. SCREEN BEHAVIOR

During an active session:

Keep the screen awake by default or according to preference.

Minimize navigation.

Primary active screen contains:

- protocol
- protocol-specific visual
- current phase
- time
- cycles
- pause
- end

Do not show bottom navigation during the most immersive active-session state unless there is a strong UX reason.


## 18. SIGNATURE VISUALIZATION

Do not use the same expanding circle for every protocol.

Box Breathing:
square / rectangle path

Physiological Sigh:
expansion
second top-up expansion
long release

Coherent / Equal:
smooth symmetrical expansion and contraction

Extended Exhale:
shorter expansion
longer contraction

4-7-8:
expand
hold
long release

Nadi Shodhana:
left/right airflow

Bhramari:
wave/ripple/vibration

High-Intensity Cyclic:
rhythmic pulses
separate retention state

Animations must remain performant on typical modern Android/iOS devices.

Avoid unnecessary GPU/CPU load.


## 19. STATE SHIFT

State Shift is self-reported.

Before:

"How tense are you right now?"

Example:
7 / 10

After the protocol:

"How tense are you now?"

Example:
3 / 10

Only reveal comparison AFTER the second rating.

Result:

7 → 3

Tension down 4 points.

Support:

- positive shift
- no change
- negative shift
- skip

Do not represent subjective data as sensor-measured biometrics.


## 20. LOCAL-FIRST MOBILE ARCHITECTURE

The native app must remain useful without internet.

Core functionality that must work offline:

- built-in protocols
- breathing engine
- State Shift
- Custom Patterns
- Mix Mode
- local History
- Progress calculations where possible
- Favorites
- settings

Cloud connectivity enhances the app but is not required to breathe.


## 21. LOCAL DATA

Store locally:

- onboarding status
- preferences
- sessions
- State Shift results
- presets
- mixes
- favorites
- reminders
- pending synchronization operations
- cached entitlement state
- interrupted-session metadata

Do not store the product exclusively in remote database state.


## 22. GUEST MODE

Guest mode is first-class.

No registration required for initial use.

Account benefits:

- cloud backup
- cross-device synchronization
- restore history
- restore custom presets

Guest → account conversion must preserve local data.


## 23. BACKEND

Recommended:

Supabase

Use:

- Supabase Auth
- PostgreSQL
- Row Level Security
- Edge Functions only when necessary
- Storage only when necessary

Potential tables:

profiles
user_preferences
sessions
protocol_presets
mixes
mix_blocks
favorites
reminders
shared_exercises
subscription_entitlements
devices

Static built-in protocol definitions remain in shared application configuration.


## 24. SHARED DOMAIN PACKAGES

Prefer a monorepo or shared package architecture:

apps/
  mobile/
  web/

packages/
  breathing-engine/
  protocols/
  shared-types/
  design-tokens/

Potential later packages:

  analytics/
  subscriptions/

The breathing engine must NOT depend on React Native.

Protocol definitions must NOT depend on React Native.

Mobile and web should execute identical breathing logic where possible.


## 25. CUSTOM PATTERN

Users can create arbitrary phase sequences.

Example:

inhale 4
hold 2
exhale 6
hold 0

cycles 10

Must support:

- add
- remove
- reorder
- duration
- cycle count
- visual calculation of total time
- audio preference
- haptic preference
- run immediately
- save
- edit
- duplicate
- delete


## 26. MIX MODE

Mix Mode chains protocols.

Example:

Physiological Sigh — 3 cycles
Coherent — 3 min
Box — 2 min

Must support:

- add block
- remove
- reorder
- duplicate
- repeat
- save
- edit
- execute
- next-block indication

Reuse the generic breathing engine.


## 27. PROGRESS

Periods:

- 7D
- 30D
- 3M
- 1Y

Metrics:

- sessions
- total time
- streak
- average State Shift

Personal insights:

- Best for Calm
- Fastest Reset
- Most Used
- Evening Favorite

These are derived from the user's own records.


## 28. HISTORY

Chronological mobile list.

Filters:

- All
- Calm
- Focus
- Perform
- Recover
- Sleep
- Energize

Session details:

- protocol
- time
- duration
- cycles
- State Shift
- reported effect
- note

Actions:

- Do Again
- Share
- Delete


## 29. SHARING

Native sharing should use the platform share APIs.

Users can share:

- protocol
- result
- generated image/card
- browser link

Support common phone workflows:

- WhatsApp
- Messages
- Instagram / Stories where technically practical
- copy link
- system share sheet

Do not build separate integrations unless necessary when the OS share sheet is sufficient.


## 30. SHARED WEB EXPERIENCE

Example:

https://inout.app/reset/<share-id>

Required flow:

mobile browser landing
→ Start Reset
→ full browser breathing experience
→ completion
→ optional feedback
→ Do Again
→ Get/Open IN/OUT

No account required.

No install required.

Do not show an app-install gate before the breathing session.


## 31. DEEP LINKS

Support:

- Universal Links on iOS
- App Links on Android

If IN/OUT is installed:

shared URL
→ open appropriate protocol inside native app

If not installed:

shared URL
→ web breathing experience

Design the link system early because it affects sharing architecture.


## 32. SUBSCRIPTIONS

Native app subscription infrastructure must account for:

- Apple App Store
- Google Play

Do not create custom card payment forms inside the native mobile app.

Use an abstraction layer.

RevenueCat is a reasonable option.

Central entitlements should include concepts such as:

allProtocols
customPatterns
mixMode
unlimitedPresets
advancedProgress
extendedHistory
advancedGuidance
advancedReminders

UI queries entitlement state.

Do not scatter plan-name conditions throughout components.


## 33. FREE / PRO CONCEPT

FREE:

- recommendations
- State Shift
- core timer
- approximately 3 protocols
- basic history
- share links
- browser exercises
- safety functionality

PRO:

- all protocols
- Custom Pattern
- Mix Mode
- unlimited presets
- full insights
- longer history
- advanced guidance
- advanced reminders

Exact commercial configuration may change.


## 34. NOTIFICATIONS

Mobile notifications support reminders.

Ask for permission contextually.

Do NOT request notification permission immediately upon first app launch.

Ask when the user creates/enables their first reminder.

Possible reminders:

- morning focus
- midday reset
- pre-performance
- post-work recovery
- wind down


## 35. SAFETY

General:

- breathe comfortably
- do not force breathing
- stop if dizzy, faint or unwell

High-intensity cyclic breathing requires dedicated safety UX.

Never practice high-intensity breathing:

- driving
- operating machinery
- standing where fainting could cause injury
- swimming
- bathing
- in or near water

Never gamify:
- longest retention
- oxygen deprivation
- hold-to-failure
- global retention leaderboards

Provide an easily accessible:

"I feel unwell"

action during active sessions.


## 36. ACCESSIBILITY

Mobile accessibility is required.

Support:

- VoiceOver
- TalkBack
- Dynamic Type / system font scaling
- reduced motion
- contrast
- non-color-only indicators
- haptic-first guidance
- voice-first guidance
- adequate mobile touch target sizes

Animations must provide a reduced-motion alternative.


## 37. ORIENTATION

MVP native app is optimized for portrait orientation.

Do not spend MVP engineering effort creating specialized landscape layouts.

If the device rotates, either:

- preserve a usable responsive state
or
- lock active breathing experiences to portrait

Choose whichever provides the best reliable implementation.


## 38. PHONE INTERRUPTION BEHAVIOR

Explicitly support:

- incoming phone calls
- alarm interruptions
- app switch
- screen lock
- notification interruption
- audio interruption

Active session state must never be corrupted.

Possible behavior:

interrupt
→ pause safely
→ store exact timing state
→ show resume/restart/end when returning


## 39. PERFORMANCE

The app should feel immediate.

Prioritize:

- fast cold launch
- quick Today rendering
- no network dependency before beginning a protocol
- smooth 60 FPS breathing animation where hardware allows
- minimal battery usage
- no unnecessary background processing

Do not over-fetch data.


## 40. MOBILE ANALYTICS

Important events:

app_open
onboarding_started
onboarding_completed

situation_selected
recommendation_shown

protocol_opened
protocol_started
protocol_completed
protocol_abandoned

state_shift_pre_recorded
state_shift_post_recorded

custom_created
custom_started

mix_created
mix_started
mix_completed

share_created
share_link_copied

web_reset_opened
web_reset_started
web_reset_completed
web_reset_app_cta_clicked

paywall_viewed
trial_started
subscription_started
subscription_cancelled

Avoid personally sensitive free-text analytics.


## 41. UI IMPLEMENTATION

The visual design already exists through Stitch.

Codex should NOT spend significant tokens reinventing layouts.

Create reusable mobile primitives:

Screen
Header
PrimaryButton
SecondaryButton
Card
Chip
SegmentedControl
BottomTabs
Metric
StateScale
ProtocolCard
Modal
BottomSheet

Extract design tokens:

colors
spacing
typography
radii
shadows
opacity
animation timing

Use React Native styling appropriate to the selected implementation.

Do not blindly convert desktop CSS patterns.


## 42. FIRST IMPLEMENTATION PRIORITY

Build a COMPLETE MOBILE VERTICAL SLICE first:

Launch
→ Today
→ Calm Now
→ Physiological Sigh
→ optional Before State Shift
→ Active Session
→ After State Shift
→ Result
→ History

This must:

- work on a physical phone
- work offline
- use real haptics
- use real audio cues
- use timestamp-correct timer logic
- survive app backgrounding
- locally persist session data

Only after this vertical slice works well should implementation expand horizontally.


## 43. SECOND IMPLEMENTATION PRIORITY

Generalize the breathing engine to all 10 protocols.

Then:

- Protocol Library
- Protocol Detail
- Favorites
- Custom Pattern
- Mix Mode


## 44. THIRD IMPLEMENTATION PRIORITY

Progress / History:

- aggregations
- insights
- heatmap
- streaks


## 45. FOURTH IMPLEMENTATION PRIORITY

Sharing:

native result
→ share URL
→ browser reset
→ deep-link back to native app

This is the MVP growth loop.


## 46. FIFTH IMPLEMENTATION PRIORITY

Backend:

- optional authentication
- guest migration
- Supabase
- synchronization
- cloud backups


## 47. SIXTH IMPLEMENTATION PRIORITY

Commercial infrastructure:

- Pro entitlements
- App Store subscription
- Play Store subscription
- restore purchase
- subscription states
- paywalls


## 48. PRODUCT SUCCESS CRITERIA

The MVP is externally testable when someone can use an actual iPhone or Android phone to:

- install IN/OUT
- skip account creation
- select a need
- get a recommendation
- start within seconds
- follow visual guidance
- follow audio/haptic guidance
- finish reliably
- record State Shift
- see History
- use all core protocols
- create Custom Patterns
- create Mixes
- use Progress
- share a reset
- let another person perform that reset in their phone browser
- use core breathing functionality offline
- create an account without losing existing data
- subscribe and restore purchases
- safely handle interruptions and discomfort


## 49. FINAL ENGINEERING PRINCIPLE

IN/OUT is:

NATIVE MOBILE FIRST
WEB SECOND

The implementation hierarchy is:

PHONE EXPERIENCE
↓
SHARED DOMAIN LOGIC
↓
SUPPORTING WEB EXPERIENCE
↓
BACKEND SERVICES

Never invert this hierarchy because a generated design export happens to use web technologies.