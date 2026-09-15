import * as engine from "@inout/breathing-engine";
import { sigh, planFor } from "@inout/protocols";
import { validRating } from "@inout/shared-types";
import type {
  EngineState,
  Preferences,
  SessionRecord,
} from "@inout/shared-types";
import type { LocalStore } from "./storage";

export class SessionController {
  current: SessionRecord | null = null;
  preferences: Preferences;
  error: string | null = null;
  private listeners = new Set<() => void>();
  private revision = 0;
  constructor(
    private store: LocalStore,
    private now: () => number,
    private id: () => string,
  ) {
    this.preferences = store.preferences();
    const pending = store.pending();
    if (pending) {
      this.current = {
        ...pending,
        engine: engine.recover(pending.engine, now()),
      };
      this.save();
    }
  }
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getRevision = () => this.revision;
  private emit() {
    this.revision++;
    this.listeners.forEach((fn) => fn());
  }
  private save() {
    try {
      if (this.current) this.store.save(this.current);
      this.error = null;
    } catch {
      this.error =
        "Could not save on this phone. Free some storage, then retry. Your session is paused.";
      if (this.current?.engine.status === "running")
        this.current = {
          ...this.current,
          engine: engine.pause(this.current.engine, this.now()),
        };
    }
    this.emit();
  }
  retry() {
    this.save();
  }
  start(pre: number | null, cycles = sigh.defaultCycles) {
    if (!validRating(pre)) throw new Error("Choose a rating from 1 to 10");
    if (this.current && this.current.stage !== "result") return;
    this.current = {
      id: this.id(),
      protocolId: sigh.id,
      protocolVersion: sigh.version,
      protocolName: sigh.name,
      goal: "Calm",
      engine: engine.start(planFor(sigh, cycles), this.now()),
      pre,
      post: null,
      stage: "active",
      finishedAt: null,
      effect: null,
      endReason: null,
    };
    this.save();
  }
  view() {
    return this.current
      ? engine.snapshot(this.current.engine, this.now())
      : null;
  }
  tick() {
    const c = this.current;
    if (!c || c.stage !== "active" || c.engine.status !== "running") return;
    const now = this.now(),
      view = engine.snapshot(c.engine, now);
    if (view.completed) {
      this.current = {
        ...c,
        engine: engine.checkpoint(c.engine, now),
        stage: "post",
        finishedAt:
          now -
          Math.max(
            0,
            now -
              c.engine.anchorAt +
              c.engine.elapsedAtAnchor -
              engine.totalDuration(c.engine.plan),
          ),
        endReason: "completed",
      };
      this.save();
    } else if (now - c.engine.checkpointAt >= 1000) {
      this.current = { ...c, engine: engine.checkpoint(c.engine, now) };
      this.save();
    } else this.emit();
  }
  pause(reason: EngineState["pauseReason"] = "manual") {
    if (!this.current || this.current.stage !== "active") return;
    this.current = {
      ...this.current,
      engine: engine.pause(this.current.engine, this.now(), reason),
    };
    if (this.current.engine.status === "completed")
      this.current = {
        ...this.current,
        stage: "post",
        finishedAt: this.now(),
        endReason: "completed",
      };
    this.save();
  }
  resume() {
    if (!this.current || this.error || this.current.stage !== "active") return;
    this.current = {
      ...this.current,
      engine: engine.resume(this.current.engine, this.now()),
    };
    this.save();
  }
  restart() {
    if (!this.current || this.error || this.current.stage !== "active") return;
    this.current = {
      ...this.current,
      engine: engine.restart(this.current.engine, this.now()),
    };
    this.save();
  }
  end(reason: "ended" | "unwell") {
    if (
      !this.current ||
      (this.current.stage !== "active" &&
        !(this.current.stage === "post" && reason === "unwell"))
    )
      return;
    this.current = {
      ...this.current,
      engine: engine.end(this.current.engine, this.now()),
      stage: "result",
      finishedAt: this.now(),
      endReason: reason,
    };
    this.save();
  }
  answer(post: number | null, effect: string | null) {
    if (!this.current || this.current.stage !== "post" || !validRating(post))
      return;
    this.current = { ...this.current, post, effect, stage: "result" };
    this.save();
  }
  history() {
    return this.store.history();
  }
  remove(id: string) {
    this.store.remove(id);
    if (this.current?.id === id && this.current.stage === "result")
      this.current = null;
    this.emit();
  }
  setPreferences(preferences: Preferences) {
    try {
      this.store.savePreferences(preferences);
      this.preferences = preferences;
      this.error = null;
    } catch {
      this.error = "Settings could not be saved. Please retry.";
    }
    this.emit();
  }
}
