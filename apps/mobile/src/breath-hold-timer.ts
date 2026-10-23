import type { ProductEvent } from "./analytics";

export interface BreathHoldAttempt { id: string; completedAt: number; elapsedMs: number; }
export type BreathHoldStatus = "ready" | "running" | "stopped" | "saved" | "interrupted";

export function validateBreathHoldHistory(value: unknown): asserts value is BreathHoldAttempt[] {
  if (!Array.isArray(value) || value.some(a => !a || typeof a.id !== "string" || !a.id ||
    !Number.isFinite(a.completedAt) || a.completedAt <= 0 || !Number.isFinite(a.elapsedMs) || a.elapsedMs < 0) ||
    new Set(value.map(a => a.id)).size !== value.length) throw Error("Saved timer history could not be read. Your data has been preserved.");
}

export function formatHoldTime(ms: number) {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  return `${String(Math.floor(tenths / 600)).padStart(2, "0")}:${String(Math.floor(tenths / 10) % 60).padStart(2, "0")}.${tenths % 10}`;
}

/** Monotonic stopwatch; render ticks only refresh the display. Interrupted holds cannot be saved. */
export class BreathHoldTimer {
  status: BreathHoldStatus = "ready";
  elapsedMs = 0;
  attempt: BreathHoldAttempt | null = null;
  private anchor = 0;
  private lastSample = 0;
  constructor(private clock: () => number, private now: () => number, private id: () => string,
    private track: (event: ProductEvent) => void) {}
  start() {
    if (this.status === "running") return;
    this.anchor = this.lastSample = this.clock();
    this.elapsedMs = 0;
    this.attempt = null;
    this.status = "running";
    this.track("breath_hold_started");
  }
  sample() {
    if (this.status !== "running") return;
    const now = this.clock();
    // Conservatively discard an attempt if JS was suspended or unable to observe lifecycle events.
    if (now < this.lastSample || now - this.lastSample > 1500) { this.interrupt(); return; }
    this.lastSample = now;
    this.elapsedMs = Math.max(0, now - this.anchor);
  }
  stop() {
    if (this.status !== "running") return;
    this.sample();
    if (this.status !== "running") return;
    this.status = "stopped";
    this.attempt = { id: this.id(), completedAt: this.now(), elapsedMs: this.elapsedMs };
    this.track("breath_hold_stopped");
  }
  save(write: (attempt: BreathHoldAttempt) => boolean) {
    if (this.status !== "stopped" || !this.attempt || !write(this.attempt)) return false;
    this.status = "saved";
    this.track("breath_hold_saved");
    return true;
  }
  interrupt() {
    if (this.status !== "running") return;
    this.status = "interrupted";
    this.elapsedMs = 0;
    this.attempt = null;
    this.track("breath_hold_abandoned");
  }
  reset() {
    this.interrupt();
    this.status = "ready";
    this.elapsedMs = 0;
    this.attempt = null;
  }
}
