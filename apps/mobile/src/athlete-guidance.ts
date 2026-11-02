export const exerciseStages = ["before", "during", "after"] as const;
export type ExerciseStage = typeof exerciseStages[number];
export const athleteGuidance = {
  before: {
    title: "Before exercise",
    purpose: "A short pause before your warm-up",
    who: "For runners, gym users and BJJ or martial arts practitioners.",
    description: "Practice at rest to gather your attention, then start your usual warm-up. These rhythms are preparation rituals, not performance guarantees.",
    expectation: "Choose Runner's Rhythm for an even breath without holds, or Athletic Preparation if gentle pauses already feel comfortable.",
    protocolIds: ["runner-rhythm", "athletic"],
  },
  during: {
    title: "During exercise",
    purpose: "Let your breathing follow your effort",
    who: "For running, easy cardio, gym sessions and BJJ or martial arts training.",
    description: "While moving, breathe freely and let the rhythm change with your effort. There is no single seconds-per-breath or steps-per-breath target for every pace.",
    expectation: "On an easy run or walk, use a pace where you can talk comfortably. If talking becomes difficult, ease off. Do not force a slow breathing timer to match your strides.",
    protocolIds: [],
  },
  after: {
    title: "After exercise",
    purpose: "From cool-down to a quiet pause",
    who: "After a run, gym session or BJJ round; also for a quiet recovery day.",
    description: "Finish your cool-down and wait until breathing is comfortable. A gentle rhythm can give your attention a focus as you settle into rest.",
    expectation: "Post-Workout Reset guides a 4-second inhale and 6-second exhale without holds. For a recovery day, explore comfortable belly and lower-rib movement with Diaphragmatic Breathing.",
    protocolIds: ["post-workout-reset", "diaphragmatic"],
  },
} satisfies Record<ExerciseStage, { title: string; purpose: string; who: string; description: string; expectation: string; protocolIds: string[] }>;
