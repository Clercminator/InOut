import { isLanguage, setLanguage } from "./i18n";
import * as engine from "@inout/breathing-engine";
import { sigh, planFor, protocols, cyclic, isCyclic, includesHighIntensity, availableForPractice } from "@inout/protocols";
import type { Protocol, SavedRoutine, Experience, PersonalRitual } from "@inout/shared-types";
import { emptyLedger, experienceFor, reconcileRewards, unlocked, type Badge, type RewardLedger } from "./experience";
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
import { productConfig } from "./product-config";

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
  latestAwards: Badge[] = [];
  dismissAwards() { this.latestAwards = []; this.emit(); }
  guidedAccess() { return this.entitlements.guidedAccess(this.store.guidedUsage?.(this.now()).sessionIds.length ?? 0); }
  private rewardCache: RewardLedger | null = null;
  rewards() {
    return this.rewardCache ??= this.store.rewards?.(this.history()) ?? reconcileRewards(this.history(), emptyLedger(), experienceFor(this.preferences).weeklyGoal, new Date(this.now()));
  }
  private captureRewards(previous: RewardLedger) {
    this.rewardCache = null;
    this.latestAwards = this.rewards().badges.filter(b => !previous.badges.some(old => old.id === b.id));
    for (const _badge of this.latestAwards) this.analytics.track("badge_earned");
  }
  get error(): string | null {
    return this.sessionError ?? this.preferencesError ?? this.libraryError;
  }
  private listeners = new Set<() => void>();
  private revision = 0;
  canResetLocalData?: () => boolean;
  onLocalDataReset?: () => void;
  private measured = new Set<string>();
  private measureSession() {
    const c = this.current;
    if (!c || this.sessionError) return;
    const once = (event: import("./analytics").ProductEvent) => {
      const key = `${c.id}:${event}`;
      if (this.measured.has(key)) return;
      this.measured.add(key); this.analytics.track(event);
    };
    // Recovery does not synthesize starts; completion follows a persisted terminal result.
    if (c.stage === "result") {
      if (c.endReason === "completed") { once("protocol_completed"); if (c.protocol?.plan && c.protocolId !== "shared-practice") once("mix_completed"); }
      else once("protocol_abandoned");
      if (c.post !== null) once("state_shift_post_recorded");
    }
  }
  constructor(
    private store: LocalStore,
    private now: () => number,
    private id: () => string,
    readonly entitlements = new EntitlementService(),
    readonly analytics = new AnalyticsService(),
  ) {
    this.preferences = store.preferences();
    setLanguage(isLanguage(this.preferences.language) ? this.preferences.language : "en");
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
        const previous = this.current.stage === "result" ? this.rewards() : null;
        this.store.save(this.current);
        if (this.current.stage === "result") this.historyCache = null;
        if (previous) this.captureRewards(previous);
      }
      this.sessionError = null;
      this.measureSession();
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
    if (!this.entitlements.protocolAccess(protocol).allowed) { this.analytics.track("premium_lock_tapped"); this.routineNotice = "This protocol requires InOut Pro."; this.emit(); return; }
    if (
      this.error ||
      !availableForPractice(protocol) ||
      (includesHighIntensity(protocol) && !safetyConfirmed) ||
      (this.current && this.current.stage !== "result")
    )
      return;
    const selectedCycles = cycles ?? protocol.defaultCycles;
    if (isCyclic(protocol)) {
      if (!Number.isInteger(selectedCycles) || selectedCycles < 1 || selectedCycles > 3) return;
      protocol = cyclic;
    }
    if (this.preferences.audio === "voice" && !this.guidedAccess().allowed) this.analytics.track("free_quota_exhausted");
    this.measured.clear();
    this.latestAwards = [];
    const plan = planFor(protocol, selectedCycles);
    this.current = {
      id: this.id(),
      guidedQuota: this.preferences.audio === "voice" && productConfig.guidedSessionsPerMonth !== null && !this.entitlements.state.pro && this.guidedAccess().allowed,
      voiceAllowed: productConfig.guidedSessionsPerMonth === null || this.entitlements.state.pro || (this.preferences.audio === "voice" && this.guidedAccess().allowed),
      protocolId: protocol.id,
      protocolVersion: protocol.version,
      protocolName: protocol.name,
      safetyConfirmed: includesHighIntensity(protocol) ? safetyConfirmed : undefined,
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
    this.analytics.track("protocol_started");
    if (pre !== null) this.analytics.track("state_shift_pre_recorded");
    if (protocol.plan && protocol.id !== "shared-practice") this.analytics.track("mix_started");
    else if (protocol.id !== "shared-practice" && !protocols.some(p => p.id === protocol.id)) this.analytics.track("custom_started");
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
    if (!this.current || this.error || this.current.stage !== "active" || this.current.engine.status !== "paused") return;
    if (!this.canContinue()) return;
    const state = this.current.protocol && isCyclic(this.current.protocol)
      ? engine.releaseHold(this.current.engine, this.now()) : this.current.engine;
    this.current = {
      ...this.current,
      engine: engine.resume(state, this.now()),
    };
    this.save();
  }
  restart() {
    if (!this.current || this.error || this.current.stage !== "active") return;
    if (!this.canContinue()) return;
    this.current = {
      ...this.current,
      engine: this.current.protocol && isCyclic(this.current.protocol)
        ? engine.start(planFor(this.current.protocol), this.now()) : engine.restart(this.current.engine, this.now()),
    };
    this.save();
  }
  canContinue() {
    const record = this.current;
    if (!record) return false;
    const intense = record.protocol?.safetyCategory === "highIntensity" || record.engine.plan.blocks.some(b => b.protocolId === cyclic.id);
    return !intense || !!(record.protocol && isCyclic(record.protocol) && record.safetyConfirmed === true);
  }
  releaseHold() {
    if (!this.current || this.error || this.current.stage !== "active" || this.current.engine.status !== "running" || !this.current.protocol || !isCyclic(this.current.protocol) || !this.canContinue()) return;
    this.current = { ...this.current, engine: engine.releaseHold(this.current.engine, this.now()) };
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
    if (this.error) return false;
    return this.mutate(() => { this.historyCache = this.store.history(); });
  }
  addManualSession(input: ManualSessionInput, id = this.id()) {
    if (!productConfig.manualLogging) return null;
    if (this.error) return null;
    const record = manualSession(input, id, this.now());
    this.pendingManualId = id;
    return this.mutate(() => {
      const previous = this.rewards();
      this.store.save(record);
      this.historyCache = null;
      this.captureRewards(previous);
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
    if (this.error) return;
    this.mutate(() => {
      this.store.remove(id);
      this.historyCache = null;
      if (this.current?.id === id && this.current.stage === "result") this.current = null;
    });
  }
  clearHistory() {
    if (this.error) return;
    this.mutate(() => {
      this.store.clearHistory();
      this.historyCache = [];
      if (this.current?.stage === "result") this.current = null;
    });
  }
  setPreferences(preferences: Preferences) {
    try {
      const onboardingCompleted = !this.preferences.onboardingComplete && preferences.onboardingComplete;
      const previous = this.preferences.journey;
      this.store.savePreferences(preferences);
      this.preferences = preferences;
      const journey = preferences.journey;
      if (journey?.primaryGoal && journey.primaryGoal !== previous?.primaryGoal) this.analytics.track("onboarding_goal_selected");
      if (journey?.step === "value" && previous?.step !== "value") this.analytics.track("onboarding_value_viewed");
      if (journey?.safetyAcceptedAt && !previous?.safetyAcceptedAt) this.analytics.track("safety_acknowledged");
      if (onboardingCompleted) this.analytics.track("onboarding_completed");
      setLanguage(isLanguage(preferences.language) ? preferences.language : "en");
      this.pendingPreferences = null;
      this.preferencesError = null;
    } catch {
      this.pendingPreferences = { ...preferences };
      this.preferencesError = "Settings could not be saved. Please retry.";
    }
    this.emit();
  }
  updateExperience(patch: Partial<Experience>) {
    if (this.error) return false;
    const next = { ...experienceFor(this.preferences), ...patch };
    for (const key of ["palette", "texture", "frame", "celebrationStyle"] as const)
      if (!unlocked(this.rewards(), key, next[key])) return false;
    this.setPreferences({ ...this.preferences, experience: next });
    return !this.error;
  }
  saveRitual(name: string, protocol: Protocol, cycles: number, id?: string) {
    const experience = experienceFor(this.preferences);
    if (this.error || !name.trim() || (!id && experience.rituals.length >= 20)) return false;
    if (!protocols.some(p => p.id === protocol.id) && !this.routines().some(r => r.protocol.id === protocol.id) && !experience.rituals.some(r => r.id === id)) return false;
    const { palette, texture, background, breathSound, guidanceVolume } = experience;
    const ritual: PersonalRitual = { id: id ?? this.id(), name: name.trim().slice(0, 40),
      protocol: JSON.parse(JSON.stringify(protocol)), cycles, audio: this.preferences.audio,
      appearance: { palette, texture, background, breathSound, guidanceVolume } };
    return this.updateExperience({ rituals: [...experience.rituals.filter(r => r.id !== ritual.id), ritual], favoriteRitualId: experience.favoriteRitualId ?? ritual.id });
  }
  removeRitual(id: string) {
    const experience = experienceFor(this.preferences);
    return this.updateExperience({ rituals: experience.rituals.filter(r => r.id !== id), favoriteRitualId: experience.favoriteRitualId === id ? undefined : experience.favoriteRitualId });
  }
  startRitual(id: string, safetyConfirmed = false, pre: number | null = null, cycles?: number) {
    if (this.error || (this.current && this.current.stage !== "result")) return false;
    const experience = experienceFor(this.preferences);
    const ritual = experience.rituals.find(r => r.id === id);
    if (!ritual) return false;
    if (includesHighIntensity(ritual.protocol) && !safetyConfirmed) return false;
    this.setPreferences({ ...this.preferences, audio: ritual.audio, experience: { ...experience, ...ritual.appearance } });
    if (this.error) return false;
    this.start(pre, cycles ?? ritual.cycles, ritual.protocol, safetyConfirmed);
    return !this.error && this.current?.stage === "active";
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
    if (this.canResetLocalData && !this.canResetLocalData()) return false;
    this.pause();
    return this.mutate(() => {
      this.store.reset();
      this.onLocalDataReset?.();
      this.current = null;
      this.customProtocol = null;
      this.historyCache = [];
      this.routinesCache = [];
      this.rewardCache = null;
      this.latestAwards = [];
      this.preferences = { ...defaultPreferences };
      setLanguage("en");
      this.pendingPreferences = null;
      this.sessionError = null;
      this.preferencesError = null;
    });
  }
}
