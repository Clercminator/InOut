import type { EngineState, SessionPlan } from "@inout/shared-types";

export function validatePlan(plan: SessionPlan): void {
  if (!plan?.blocks?.length || plan.blocks.length > 100)
    throw new Error("A plan needs 1–100 blocks");
  for (const block of plan.blocks) {
    if (
      !Number.isSafeInteger(block.cycles) ||
      block.cycles < 1 ||
      block.cycles > 10000
    )
      throw new Error("Invalid cycles");
    if (!block.phases.length || block.phases.length > 100)
      throw new Error("Invalid phases");
    for (const phase of block.phases) {
      if (
        !Number.isSafeInteger(phase.durationMs) ||
        phase.durationMs < 0 ||
        phase.durationMs > 3600000
      )
        throw new Error("Invalid phase duration");
    }
    if (cycleDuration(block.phases) === 0)
      throw new Error("A cycle needs a positive duration");
  }
  if (!Number.isSafeInteger(totalDuration(plan)))
    throw new Error("Plan too long");
}
function cycleDuration(phases: SessionPlan["blocks"][number]["phases"]) {
  return phases.reduce((sum, p) => sum + p.durationMs, 0);
}
export function totalDuration(plan: SessionPlan) {
  return plan.blocks.reduce(
    (sum, b) => sum + cycleDuration(b.phases) * b.cycles,
    0,
  );
}
function timestamp(now: number) {
  if (!Number.isFinite(now) || now < 0) throw new Error("Invalid timestamp");
}
export function start(plan: SessionPlan, now: number): EngineState {
  validatePlan(plan);
  timestamp(now);
  const copy = {
    blocks: plan.blocks.map((block) => ({
      ...block,
      phases: block.phases.map((phase) => ({ ...phase })),
    })),
  };
  return {
    version: 1,
    plan: copy,
    startedAt: now,
    anchorAt: now,
    elapsedAtAnchor: 0,
    checkpointAt: now,
    status: "running",
  };
}
export function snapshot(state: EngineState, now: number) {
  timestamp(now);
  const duration = totalDuration(state.plan);
  const elapsed = Math.min(
    duration,
    state.elapsedAtAnchor +
      (state.status === "running" ? Math.max(0, now - state.anchorAt) : 0),
  );
  let offset = Math.min(elapsed, duration - 0.0001);
  let blockIndex = 0,
    completedCycles = 0;
  while (blockIndex < state.plan.blocks.length - 1) {
    const b = state.plan.blocks[blockIndex];
    const length = cycleDuration(b.phases) * b.cycles;
    if (offset < length) break;
    offset -= length;
    completedCycles += b.cycles;
    blockIndex++;
  }
  const block = state.plan.blocks[blockIndex];
  const cycleMs = cycleDuration(block.phases);
  const cycleIndex = Math.floor(offset / cycleMs);
  completedCycles += cycleIndex;
  let phaseOffset = offset - cycleIndex * cycleMs,
    phaseIndex = 0;
  while (
    phaseIndex < block.phases.length - 1 &&
    phaseOffset >= block.phases[phaseIndex].durationMs
  ) {
    phaseOffset -= block.phases[phaseIndex].durationMs;
    phaseIndex++;
  }
  const phase = block.phases[phaseIndex];
  const completed = elapsed >= duration && state.status !== "ended";
  return {
    phase,
    phaseIndex,
    blockIndex,
    currentCycle: cycleIndex + 1,
    totalCycles: block.cycles,
    completedCycles: completed
      ? state.plan.blocks.reduce((sum, b) => sum + b.cycles, 0)
      : completedCycles,
    phaseElapsedMs: completed ? phase.durationMs : phaseOffset,
    phaseRemainingMs: completed ? 0 : phase.durationMs - phaseOffset,
    phaseStartedAt:
      (state.status === "running" ? now : state.anchorAt) - phaseOffset,
    sessionStartedAt: state.startedAt,
    sessionElapsedMs: elapsed,
    sessionRemainingMs: duration - elapsed,
    paused: state.status === "paused",
    completed,
    cueKey: `${blockIndex}:${cycleIndex}:${phaseIndex}`,
  };
}
export function checkpoint(state: EngineState, now: number): EngineState {
  const view = snapshot(state, now);
  return {
    ...state,
    anchorAt: now,
    checkpointAt: now,
    elapsedAtAnchor: view.sessionElapsedMs,
    status: view.completed ? "completed" : state.status,
  };
}
export function pause(
  state: EngineState,
  now: number,
  reason: EngineState["pauseReason"] = "manual",
): EngineState {
  if (state.status !== "running") return state;
  const next = checkpoint(state, now);
  return {
    ...next,
    status: next.status === "completed" ? "completed" : "paused",
    pauseReason: reason,
  };
}
export function resume(state: EngineState, now: number): EngineState {
  timestamp(now);
  return state.status !== "paused"
    ? state
    : {
        ...state,
        anchorAt: now,
        checkpointAt: now,
        status: "running",
        pauseReason: undefined,
      };
}
export function restart(state: EngineState, now: number) {
  return start(state.plan, now);
}
export function end(state: EngineState, now: number): EngineState {
  const next = checkpoint(state, now);
  return {
    ...next,
    status: next.status === "completed" ? "completed" : "ended",
  };
}
// Never count unknown process-death time as guided breathing. Restore the last durable checkpoint.
export function recover(state: EngineState, now: number): EngineState {
  validatePlan(state.plan);
  timestamp(now);
  if (
    state.version !== 1 ||
    !["running", "paused", "completed", "ended"].includes(state.status) ||
    ![
      state.startedAt,
      state.anchorAt,
      state.checkpointAt,
      state.elapsedAtAnchor,
    ].every(Number.isFinite) ||
    state.elapsedAtAnchor < 0 ||
    state.elapsedAtAnchor > totalDuration(state.plan)
  )
    throw new Error("Invalid saved session");
  if (
    state.status === "running" &&
    state.elapsedAtAnchor === totalDuration(state.plan)
  )
    return { ...state, status: "completed" };
  return state.status === "running"
    ? {
        ...state,
        anchorAt: now,
        checkpointAt: now,
        status: "paused",
        pauseReason: "recovery",
      }
    : state;
}
// Anchor wall time to a monotonic clock in a live process: changing the phone clock cannot skip phases.
export function createClock(wallNow: () => number, monotonicNow: () => number) {
  const wallOrigin = wallNow(),
    monoOrigin = monotonicNow();
  return { now: () => wallOrigin + Math.max(0, monotonicNow() - monoOrigin) };
}
