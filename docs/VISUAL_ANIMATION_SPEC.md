# Approved breathing visuals

The engine snapshot is the only timing authority. `src/session-visual.tsx` selects geometry from protocol identity/compatible phases; pacer themes never select geometry. Paths below are relative to `apps/mobile`.

| Renderer ID | Protocols | Component / artwork | Behavior and expected appearance |
| --- | --- | --- | --- |
| box | Box (`box`), Box 2 (`box-2`); explicit box custom cadences only when inhale/hold/exhale/hold | `src/box-visual.tsx`, `src/box-path.ts`; restored existing renderer from `7e6519f` | Visibly square rounded track. Clockwise light traces top/right/bottom/left for the four phases using each actual duration. Active edge and phase label agree. No Orb behind the square. |
| pulse | Other approved protocols, triangle (no previously approved triangle renderer found), custom routines by default | `src/pulse-orb.tsx`, `src/pulse-session-visual.tsx`; **`assets/pulse-orb.png`** is the visual reference | Original transparent purple/pink/blue swirled Orb; expand on inhale, contract on exhale, retain size on holds. Never tint the artwork or replace it with procedural gradients. Home uses the same untinted asset in Light and Dark. |
| sigh | Physiological Sigh | Existing `src/sigh-visual.tsx` | Preserve two-stage inhale/top-up and existing core treatment. |
| alternating | Nadi Shodhana | Existing `src/sigh-visual.tsx` | Preserve distinct left/right nostril channels and accessible nostril instruction. |
| ripple | Bhramari | Existing `src/sigh-visual.tsx` | Preserve hum ripples and phase-aligned breathing scale. |

Themes change surfaces, labels, track/glow colors. Pulse's internal artwork colors are immutable. All ten theme IDs and existing earned/Pro policy remain independent of renderer selection.

Native animations use the remaining phase duration, resynchronize at phase boundaries/pause/resume, and do not restart on ordinary timer ticks. Box has a closed continuous path, including the fourth-to-first edge. Custom durations change speed, never shape. Visuals do not intercept touch controls.

Reduced motion: stop continuous movement, retain static phase cues and accessible text/countdown. Box shows a fixed active-edge marker; Pulse remains a stable branded Orb. No screen-reader announcement on every animation frame.

Regression references: `__tests__/session-visual.test.tsx` enforces routing, every theme, custom timing and the exact untinted artwork. `box-visual.test.tsx`, `breathing-visual.test.tsx`, `pulse-orb.test.tsx`, and the domain box-path/guidance tests cover pause/resume, holds, path continuity and reduced motion. The existing asset itself is the deterministic brand reference; mocked component tests do not establish phone smoothness or touch responsiveness.

Device acceptance: review Box through all four customized phases and a full cycle boundary, pause mid-edge/resume, all theme surfaces, original Orb colors in Light/Dark, large text and reduced motion before approving a new release.
