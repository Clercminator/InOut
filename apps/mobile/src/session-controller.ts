import * as engine from "@inout/breathing-engine";
import { sigh, planFor } from "@inout/protocols";
import type { Protocol, SavedRoutine } from "@inout/shared-types";
import { defaultPreferences } from "./storage";
import { validRating } from "@inout/shared-types";
import type {
  EngineState,
  Preferences,
  SessionRecord,
} from "@inout/shared-types";
import type { LocalStore } from "./storage";
import { EntitlementService } from "./entitlements";
import { AnalyticsService } from "./analytics";
import { manualSession, type ManualSessionInput } from "./manual-session";

export class SessionController {
  current: SessionRecord | null = null;
  customProtocol: Protocol | null = null;
  preferences: Preferences;
  private sessionError: string | null = null;
  private preferencesError: string | null = null;
  private pendingPreferences: Preferences | null = null;
  private historyCache: SessionRecord[] | null = null;
  private routinesCache: SavedRoutine[] | null = null;
  private libraryError: string | null = null;
  private pendingMutation: (() => void) | null = null;
  private pendingManualId: string | null = null;
  routineNotice: string | null = null;
  get error(): string | null {
    return this.sessionError ?? this.preferencesError ?? this.libraryError;
  }
  private listeners = new Set<() => void>();
  private revision = 0;
  constructor(
    private store: LocalStore,
    private now: () => number,
    private id: () => string,
    readonly entitlements = new EntitlementService(),
    readonly analytics = new AnalyticsService(),
  ) {
    this.preferences = store.preferences();
    const pending = store.pending();
    if (pending) {
      this.current = {
        ...pending,
        engine: engine.recover(pending.engine, now()),
      };
      if (
        this.current.stage === "active" &&
        this.current.engine.status === "completed"
      ) {
        this.current = {
          ...this.current,
          stage: "post",
          endReason: "completed",
          finishedAt: this.current.engine.checkpointAt,
        };
      }
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
  entitlementsChanged = () => { this.routineNotice = null; this.emit(); };
  private emit() {
    this.revision++;
    this.listeners.forEach((fn) => fn());
  }
  private save() {
    try {
      if (this.current) {
        this.store.save(this.current);
        if (this.current.stage === "result") this.historyCache = null;
      }
      this.sessionError = null;
    } catch {
      this.sessionError =
        this.current?.stage === "active"
          ? "Could not save on this phone. Your session is paused. Free some storage, then retry."
          : "Your result has not been saved yet. Free some storage, then retry before starting another session.";
      if (this.current?.engine.status === "running")
        this.current = {
          ...this.current,
          engine: engine.pause(this.current.engine, this.now()),
        };
    }
    this.emit();
  }
  retry() {
    if (this.sessionError) this.save();
    if (this.pendingPreferences) this.setPreferences(this.pendingPreferences);
    if (this.pendingMutation) this.mutate(this.pendingMutation);
  }
  start(
    pre: number | null,
    cycles: number | undefined = undefined,
    protocol: Protocol = sigh,
    safetyConfirmed = false,
  ) {
    if (!validRating(pre)) throw new Error("Choose a rating from 1 to 10");
    if (
      this.error ||
      protocol.availability !== "enabled" ||
      protocol.safetyCategory === "highIntensity" ||
      protocol.plan?.blocks.some((b) => b.protocolId === "high-intensity-cyclic") ||
      (this.current && this.current.stage !== "result")
    )
      return;
    const selectedCycles = cycles ?? protocol.defaultCycles;
    const plan = planFor(protocol, selectedCycles);
    this.current = {
      id: this.id(),
      protocolId: protocol.id,
      protocolVersion: protocol.version,
      protocolName: protocol.name,
      protocol: JSON.parse(JSON.stringify({ ...protocol, defaultCycles: selectedCycles, defaultDuration: engine.totalDuration(plan) })),
      goal: protocol.goalTags[0],
      engine: engine.start(plan, this.now()),
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
    const before = this.current.engine;
    if (before.status !== "running") return;
    const now = this.now();
    this.current = {
      ...this.current,
      engine: engine.pause(before, now, reason),
    };
    if (this.current.engine.status === "completed")
      this.current = {
        ...this.current,
        stage: "post",
        finishedAt:
          before.anchorAt +
          engine.totalDuration(before.plan) -
          before.elapsedAtAnchor,
        endReason: "completed",
      };
    this.save();
  }
  resume() {
    if (!this.current || this.error || this.current.stage !== "active") return;
    if (this.current.protocol?.safetyCategory === "highIntensity" || this.current.engine.plan.blocks.some((b) => b.protocolId === "high-intensity-cyclic")) return;
    this.current = {
      ...this.current,
      engine: engine.resume(this.current.engine, this.now()),
    };
    this.save();
  }
  restart() {
    if (!this.current || this.error || this.current.stage !== "active") return;
    if (this.current.protocol?.safetyCategory === "highIntensity" || this.current.engine.plan.blocks.some((b) => b.protocolId === "high-intensity-cyclic")) return;
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
    return (this.historyCache ??= this.store.history());
  }
  refreshHistory() {
    return this.mutate(() => { this.historyCache = this.store.history(); });
  }
  addManualSession(input: ManualSessionInput, id = this.id()) {
    if (this.error) return null;
    const record = manualSession(input, id, this.now());
    this.pendingManualId = id;
    return this.mutate(() => {
      this.store.save(record);
      this.historyCache = null;
      this.pendingManualId = null;
    }) ? record.id : null;
  }
  cancelManualSave(id: string) {
    if (this.pendingManualId !== id) return;
    this.pendingMutation = null;
    this.pendingManualId = null;
    this.libraryError = null;
    this.emit();
  }
  remove(id: string) {
    if (this.sessionError && this.current?.id === id) return;
    this.mutate(() => {
      this.store.remove(id);
      this.historyCache = null;
      if (this.current?.id === id && this.current.stage === "result") this.current = null;
    });
  }
  clearHistory() {
    if (this.sessionError) return;
    this.mutate(() => {
      this.store.clearHistory();
      this.historyCache = [];
      if (this.current?.stage === "result") this.current = null;
    });
  }
  setPreferences(preferences: Preferences) {
    try {
      this.store.savePreferences(preferences);
      this.preferences = preferences;
      this.pendingPreferences = null;
      this.preferencesError = null;
    } catch {
      this.pendingPreferences = { ...preferences };
      this.preferencesError = "Settings could not be saved. Please retry.";
    }
    this.emit();
  }
  isFavorite(protocolId: string) {
    return this.preferences.favoriteProtocolIds?.includes(protocolId) ?? false;
  }
  toggleFavorite(protocolId: string) {
    const favorites = new Set(this.preferences.favoriteProtocolIds ?? []);
    if (favorites.has(protocolId)) favorites.delete(protocolId);
    else favorites.add(protocolId);
    this.setPreferences({
      ...this.preferences,
      favoriteProtocolIds: [...favorites],
    });
  }
  setCustomProtocol(protocol: Protocol) {
    this.customProtocol = protocol;
    this.emit();
  }
  routines() { return (this.routinesCache ??= this.store.routines()); }
  private mutate(action: () => void): boolean {
    try {
      action();
      this.pendingMutation = null;
      this.libraryError = null;
      this.emit();
      return true;
    } catch {
      this.pendingMutation = action;
      this.libraryError = "Your changes could not be saved. Free some storage, then retry.";
      this.emit();
      return false;
    }
  }
  saveRoutine(protocol: Protocol, kind: SavedRoutine["kind"], id?: string) {
    if (this.error) return null;
    const access = this.entitlements.routineAccess(kind, this.routines(), id);
    this.routineNotice = access.allowed ? null : access.message;
    if (!access.allowed) { this.emit(); return null; }
    const key = id ?? this.id();
    const routine: SavedRoutine = { id: key, kind, protocol: JSON.parse(JSON.stringify({ ...protocol, id: key })), updatedAt: this.now() };
    return this.mutate(() => {
      // Re-evaluate at retry time: a failed write must not bypass a later downgrade.
      const decision = this.entitlements.routineAccess(kind, this.routines(), key);
      if (!decision.allowed) { this.routineNotice = decision.message; return; }
      const created = !this.routines().some((r) => r.id === key);
      this.store.saveRoutine(routine); this.routinesCache = null;
      if (created) this.analytics.track(kind === "pattern" ? "custom_created" : "mix_created");
    }) && !this.routineNotice ? key : null;
  }
  duplicateRoutine(routine: SavedRoutine) {
    return this.saveRoutine({ ...routine.protocol, name: `${routine.protocol.name.slice(0, 53)} copy` }, routine.kind);
  }
  removeRoutine(id: string) {
    if (this.error) return false;
    return this.mutate(() => { this.store.removeRoutine(id); this.routinesCache = null; });
  }
  resetLocalData() {
    this.pause();
    return this.mutate(() => {
      this.store.reset();
      this.current = null;
      this.customProtocol = null;
      this.historyCache = [];
      this.routinesCache = [];
      this.preferences = { ...defaultPreferences };
      this.pendingPreferences = null;
      this.sessionError = null;
      this.preferencesError = null;
    });
  }
}
