# IN/OUT — Design reference

Updated September 30, 2026. This file accompanies the original Stitch exports and records the current native visual direction. It is not another roadmap or launch checklist. [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) owns product intent, [README.md](../../README.md) implementation/evidence, and [OWNER_SETUP_CHECKLIST.md](../../OWNER_SETUP_CHECKLIST.md) all manual acceptance work. Original exported screens remain references, not proof that an account, biometric sensor or cloud feature exists.

## Source of truth

The canonical product is the React Native/Expo mobile app. Use the selected Stitch compositions as visual references and [shared design tokens](../../packages/design-tokens/src/index.ts) for current colors, fonts, spacing and radii. Native components and theme behavior live in [ui.tsx](../../apps/mobile/src/ui.tsx) and [theme.tsx](../../apps/mobile/src/theme.tsx). This supersedes the export's earlier gray-only palette and biometric/physiological claims; do not duplicate a stale token catalog here.

## Visual language

Preserve the athletic timer/instrumentation character: readable numbers, clear hierarchy, compact supporting content and obvious practice controls. Avoid a desktop dashboard, decorative telemetry or clinical claims. Inter supplies body/headline typography; Space Grotesk supplies labels and metrics, bundled for offline use.

- **Light:** white surfaces with green, blue and gold accents, dark readable text and restrained borders.
- **Dark:** deep blue backgrounds and surfaces, vivid blue/green/gold/purple phase colors and readable secondary text. Do not flatten the interface into gray panels.
- **System:** follows OS appearance; switching theme must preserve the active session rather than remount it.
- Use color to reinforce phase/status, always with text or another cue. Colors do not measure metabolic, neurological or biometric state.
- Keep the shared 4-point spacing rhythm, 16-point card radius, 12-point button radius and pill-shaped status chips. Prefer token references to literal duplicates.

## Layout and interaction

Today, Protocols, Custom and Progress are the main tabs. Profile and Settings remain secondary. Favor portrait, safe areas, one-handed interaction and a clear primary action. Keep secondary explanations compact using disclosures when useful; safety, pause and stop must remain obvious.

Native touch targets should be at least 48 logical points where practical. Check narrow screens, larger fonts, keyboard appearance and long Spanish/Portuguese labels without clipping controls. Do not use hover-only interactions. Hide decorative icons from accessible names and label icon-only actions.

Ratings are optional. Skipping is visible and does not invent an answer. Destructive actions explain their scope; loading, empty, denied-permission, offline and retry states must be understandable. Failure to save must not look like success. Private details are excluded from result/exercise sharing by default.

## Practice visuals and cues

Box uses a smooth square path; Sigh expands twice then releases; Coherent/Equal use rhythmic expansion; Extended Exhale emphasizes release; 4-7-8 distinguishes its hold; Nadi alternates sides; Bhramari uses ripples. Other phases must remain identifiable without color alone. Reduced motion preserves timing and phase information.

Use the breathing engine's authoritative elapsed time for animation, audio and haptics. Keep holds quiet in transition guidance, avoid overlapping voice phrases and honor cue settings. Background/interruption pauses require explicit resume. High-intensity practice has explicit safety confirmation; do not reward maximum retention or imply therapeutic/physiological results from animation.

A theme change, notification or navigation return must not silently start/restart breathing. Reminder notifications use neutral text and never auto-start practice. Physical listening/tactile review is required; timing tests cannot establish comfort.

## Shared browser experience

The browser player is a focused exercise experience, not a second full app. Preserve readable phase/timer guidance and reachable start/pause/resume/stop controls at 320-pixel width. Respect light/dark appearance and reduced motion; pause on backgrounding. Practice comes before an optional installed-app action. Missing, revoked or expired links show a clear unavailable state, with no active start control or fabricated store destination.

## Acceptance boundary

VoiceOver/TalkBack, large text, contrast, small-screen layouts, localized speech, sound/haptics and real notification behavior still need acceptance on the signed physical-device candidate. Record outcomes once in the existing owner checklist. Exported designs, browser screenshots and unit tests do not close native acceptance.
