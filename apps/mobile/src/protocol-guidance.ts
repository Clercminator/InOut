export interface ProtocolGuidance { purpose: string; why: string; when: string; who?: string; expectation?: string; }

/** Practical context for the existing presets; timings are not efficacy claims. */
export const protocolGuidance: Readonly<Record<string, ProtocolGuidance>> = {
  "physiological-sigh": {
    "purpose": "A short pause when tension builds.",
    "why": "The two-part inhale and unhurried exhale give your attention a clear sequence to follow.",
    "when": "Between tasks or after a stressful moment, seated. Keep the top-up small and comfortable."
  },
  "box": {
    "purpose": "A structured pause to gather your attention.",
    "why": "Four equal phases make a predictable counting pattern, which can make it easier to stay with one task.",
    "when": "Before a meeting, focused work or speaking. Practice seated; choose a no-hold rhythm if pauses feel strained."
  },
  "coherent": {
    "purpose": "Find an even rhythm during a busy day.",
    "why": "Equal inhales and exhales offer a simple pace without breath holds, leaving less to keep track of.",
    "when": "During a quiet break or at the start of recovery, once breathing is comfortable."
  },
  "extended-exhale": {
    "purpose": "Ease into a quieter moment.",
    "why": "Spending a little longer breathing out can make the pace feel less hurried.",
    "when": "After a tense conversation or before bed. Let the air out gently rather than emptying your lungs by force."
  },
  "4-7-8": {
    "purpose": "A counting ritual for winding down.",
    "why": "Following the count can give a busy mind a simple focus; this exact timing is not a guarantee of sleep.",
    "when": "Before bed, seated or lying down. If the seven-second hold feels difficult, choose Sleep Wind Down instead."
  },
  "diaphragmatic": {
    "purpose": "Notice comfortable movement around your lower ribs and belly.",
    "why": "Using these movements as a focus can help you notice unnecessary effort in your shoulders and chest.",
    "when": "While resting in a supported seat or lying down. Let the belly move naturally; do not push it out."
  },
  "equal": {
    "purpose": "A simple starting point for steady attention.",
    "why": "Matching inhale and exhale lengths creates a repeatable pattern with no pauses to manage.",
    "when": "Before studying, reading or a short work session, seated comfortably."
  },
  "nadi-shodhana": {
    "purpose": "Bring attention to one side of the breath at a time.",
    "why": "Alternating nostrils adds a gentle coordination task that can anchor attention.",
    "when": "During a seated pause with clean hands. If your nose is blocked, use an unrestricted breathing pattern."
  },
  "bhramari": {
    "purpose": "A quiet humming practice to settle your attention.",
    "why": "The sound and vibration of a soft hum give you something tangible to notice through the exhale.",
    "when": "In a private, quiet place before rest. Hum softly at a comfortable pitch; do not force the sound or length."
  },
  "meditation-breathing": {
    "purpose": "A counted entry into a quiet sitting practice.",
    "why": "The repeating rhythm and short pauses offer landmarks for returning attention when it wanders.",
    "when": "At the beginning of meditation, seated. Return to natural breathing if the slow count feels demanding."
  },
  "traditional-yogic": {
    "purpose": "Explore a traditional pattern with a long pause.",
    "why": "Counting a retention and release is an attention exercise, not a measure of fitness or oxygen capacity.",
    "when": "Only at rest, seated on dry land, if holds are already comfortable. The 16-second pause is optional; never push through air hunger."
  },
  "three-stage-breath": {
    "purpose": "A brief transition from activity to a quieter focus.",
    "why": "A shorter inhale, longer exhale and brief pauses give the practice a distinct, easy-to-follow sequence.",
    "when": "Between tasks or before focused work. Keep the one-second pauses light and unforced."
  },
  "runner-rhythm": {
    who: "For runners and anyone preparing for easy cardio.",
    expectation: "A 3-second inhale and 3-second exhale, without holds. Rehearse at rest; let breathing follow your effort once you move.",
    "purpose": "Rehearse a steady rhythm before easy exercise.",
    "why": "The even, no-hold pattern lets you practice pacing without adding pauses. It does not prescribe a stride rhythm.",
    "when": "Before a run or during a stationary break. During running, let breathing follow your effort instead of this timer."
  },
  "high-intensity-cyclic": {
    "purpose": "Explore a more stimulating, structured breathing session.",
    "why": "Active breathing alternates with retention and recovery. Sensations may be intense; stronger sensations do not mean greater benefit.",
    "when": "Only seated or lying down in a safe, dry place after the safety check. Never in or near water, while driving or during exercise."
  },
  "box-2": {
    "purpose": "A three-part counting pattern for a quiet pause.",
    "why": "Inhale, exhale and a resting pause make a simple loop that can help organize attention.",
    "when": "Seated between tasks. The pause after exhaling should stay comfortable; skip it if you need air."
  },
  "measured": {
    "purpose": "Slow the pace of a brief breathing break.",
    "why": "A longer exhale gives each cycle an unhurried finish; the short pause keeps the sequence distinct.",
    "when": "After a demanding task or before quiet work. Let the exhale end early if seven seconds feels too long."
  },
  "athletic": {
    who: "For gym users, BJJ and martial arts practitioners before training.",
    expectation: "A 3-second inhale, 3-second pause, 6-second exhale and 3-second pause. Choose Runner's Rhythm if you prefer no holds.",
    "purpose": "Gather your attention before training.",
    "why": "The counted phases provide a mental preparation ritual; they are not a physical warm-up or a proven performance boost.",
    "when": "Before your warm-up, while seated and at rest. Do not use the breath holds during exercise or lifting."
  },
  "endurance": {
    "purpose": "Explore calm attention during a comfortable breath hold.",
    "why": "The inhale, pause and release offer a counting exercise. This preset has not been shown to increase endurance.",
    "when": "At rest on dry land, before a separate training session. Not while walking, running, swimming or recovering from breathlessness; never force the eight-second hold."
  },
  "swimmer": {
    "purpose": "A dry-land exercise in noticing breath pauses.",
    "why": "Following the pause and release can build familiarity with the pattern. It does not teach underwater breath control.",
    "when": "Only seated on dry land, away from water. Never use this timer while swimming, diving or preparing for an underwater hold."
  },
  "high-intensity-cyclic-alt": {
    "purpose": "An alternative entry to the same stimulating breathing sequence.",
    "why": "This preset uses the same active breathing, retention and recovery phases as Stimulating Breath; it is not a stronger workout.",
    "when": "Only seated or lying down in a safe, dry place after the safety check. Never in or near water, while driving or during exercise."
  },
  "sleep-wind-down": {
    "purpose": "Make space for rest at the end of the day.",
    "why": "The gentle, longer exhale and lack of holds make a simple wind-down ritual. Sleep may take time.",
    "when": "Before bed, seated or lying comfortably. Let natural breathing take over whenever you prefer."
  },
  "post-workout-reset": {
    who: "For runners, gym users and BJJ or martial arts practitioners after training.",
    expectation: "A gentle 4-second inhale and 6-second exhale with no holds, seated after your cool-down.",
    "purpose": "Move from your cool-down into rest.",
    "why": "A gentle rhythm offers a focus for settling after activity; it does not replace your body's recovery needs.",
    "when": "After cooling down and once breathlessness has settled. Keep breathing naturally if the timer feels too slow."
  },
  "intimacy-calm": {
    "purpose": "Take a private pause before an intimate moment.",
    "why": "An easy rhythm can give you space to notice tension and what feels comfortable, without a performance target.",
    "when": "Before intimacy, while resting. During sexual activity, breathe naturally; this is not a treatment for sexual difficulties."
  }
};
