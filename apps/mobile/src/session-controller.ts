import { emptyFitness, fitnessDefinition, appendFitness, isFitnessBest, type FitnessId, type FitnessResult } from "./personal-challenges";
import { dailyResetProtocol, dailyResetStats, emptyDailyReset } from "./daily-reset";
import { audioSettings } from "./audio-preferences";
import { testCatalog, attemptComparison, type TestId, type PendingTest, type ChallengeAttempt } from "./challenge-tests";
import { isLanguage, setLanguage } from "./i18n";
import * as engine from "@inout/breathing-engine";
import { sigh, planFor, protocols, cyclic, isCyclic, includesHighIntensity, availableForPractice } from "@inout/protocols";
import type { Protocol, SavedRoutine, Experience, PersonalRitual } from "@inout/shared-types";
import { emptyLedger, experienceFor, reconcileRewards, unlocked, type Badge, type RewardLedger } from "./experience";
import { languagePreference } from "./language-preference";
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
import { practiceStats, dayKey } from "./progress";
import { productConfig } from "./product-config";
import { challengeCatalog } from "./challenges";
import { emptyCoach, programFor, enrollProgram, programSession, coachProtocol, comfortableCycles, generateWeek, type CoachState, type CoachSession } from "./coach";
import { addDays } from "./progress";
import { earnedPacerThemeIds, pacerThemes, qualifyingPacerPracticeDays, type PacerThemeId, type PacerThemeProgress } from "./pacer-theme";

export class SessionController {
  pendingSafety: { protocol?: Protocol; warning?: string; begin: () => void } | null = null;
  requestSafety(begin: () => void, protocol?: Protocol, warning?: string) {
    this.pendingSafety = { begin, protocol, warning };
    this.emit();
  }
  confirmSafety() {
    const pending = this.pendingSafety;
    this.pendingSafety = null;
    if (pending) pending.begin();
    this.emit();
  }
  cancelSafety() { this.pendingSafety = null; this.emit(); }
  private coachCache: CoachState | null = null;
  coachState() { return this.coachCache ??= this.store.coachState?.() ?? emptyCoach(); }
  private changeCoach(change: (state: CoachState) => CoachState) {
    if (this.error || (this.current && this.current.stage !== "result")) return false;
    return this.mutate(() => { this.store.writeCoachState(change(this.coachState())); this.coachCache = null; });
  }
  enrollProgram(id: string) {
    if (!programFor(id) || !this.entitlements.programAccess(id).allowed) return false;
    const before = this.coachState().activeEnrollmentId;
    const changed = this.changeCoach(state => enrollProgram(state, id, this.id(), this.now()));
    if (changed && this.coachState().activeEnrollmentId !== before) this.analytics.track("guided_program_started");
    return changed;
  }
  configureCoach(patch: Partial<Pick<CoachState, "availableMinutes" | "useFeedback">>) {
    return this.changeCoach(state => ({ ...state, ...patch }));
  }
  pauseProgram(paused: boolean) {
    return this.changeCoach(state => ({ ...state, enrollments: state.enrollments.map(e => e.id === state.activeEnrollmentId && e.status !== "completed" ? { ...e, status: paused ? "paused" : "active" } : e) }));
  }
  skipProgramDay() {
    return this.changeCoach(state => ({ ...state, enrollments: state.enrollments.map(e => e.id === state.activeEnrollmentId && e.status === "active" ? { ...e, deferUntil: dayKey(addDays(new Date(this.now()), 1)) } : e) }));
  }
  createCoachWeek() {
    if (!this.entitlements.has("continuingPlans")) return false;
    return this.changeCoach(state => {
      // Do not erase completed or edited sessions when returning to the current plan.
      if (state.week && state.week.entries[6].date >= dayKey(new Date(this.now()))) return state;
      return { ...state, week: generateWeek(this.preferences, this.history(), state, this.now()) };
    });
  }
  pauseCoachWeek(paused: boolean) {
    if (!this.entitlements.has("continuingPlans")) return false;
    return this.changeCoach(state => state.week ? { ...state, week: { ...state.week, paused } } : state);
  }
  editCoachDay(date: string, protocolId?: string, minutes?: number, skip = false) {
    if (!this.entitlements.has("continuingPlans")) return false;
    return this.changeCoach(state => {
      if (!state.week || date < dayKey(new Date(this.now())) || (protocolId !== undefined && !coachProtocol(protocolId))) return state;
      return { ...state, week: { ...state.week, entries: state.week.entries.map(e => {
        if (e.date !== date || e.status === "completed") return e;
        const id = (protocolId ?? e.protocolId) as typeof e.protocolId;
        return { ...e, protocolId: id, cycles: minutes === undefined && protocolId === undefined ? e.cycles : comfortableCycles(id, (minutes ?? state.availableMinutes) * 60), status: skip ? "skipped" : "planned" };
      }) } };
    });
  }
  coachSession(tag: CoachSession, repeat = false) {
    const state = this.coachState(), today = dayKey(new Date(this.now()));
    if ("enrollmentId" in tag) {
      const enrollment = state.enrollments.find(e => e.id === tag.enrollmentId);
      if (!enrollment || !this.entitlements.programAccess(enrollment.programId).allowed) return null;
      return programSession(state, tag.enrollmentId, tag.step, repeat, today);
    }
    if (!this.entitlements.has("continuingPlans") || !state.week || state.week.paused || tag.week !== state.week.start || tag.date !== today) return null;
    const entry = state.week.entries.find(e => e.date === tag.date);
    if (!entry || (repeat ? entry.status !== "completed" : entry.status !== "planned")) return null;
    return { protocolId: entry.protocolId, cycles: entry.cycles, seconds: entry.cycles * coachProtocol(entry.protocolId)!.phases.reduce((sum, p) => sum + p.durationMs, 0) / 1000, explanation: "Your weekly plan, adjusted to your available time." };
  }
  current: SessionRecord | null = null;
  customProtocol: Protocol | null = null;
  preferences: Preferences;
  private sessionError: string | null = null;
  private preferencesError: string | null = null;
  private pendingPreferences: Preferences | null = null;
  private historyCache: SessionRecord[] | null = null;
  private pacerThemeProgressCache: PacerThemeProgress | null = null;
  private routinesCache: SavedRoutine[] | null = null;
  private libraryError: string | null = null;
  private pendingMutation: (() => void) | null = null;
  private pendingManualId: string | null = null;
  routineNotice: string | null = null;
  latestAwards: Badge[] = [];
  private revealed = new Set<string>();
  claimSessionReveal(id: string) {
    if (this.error || this.revealed.has(id) || this.current?.id !== id || this.current.stage !== "result" || this.current.endReason !== "completed" || this.current.source === "manual") return false;
    try {
      if (this.store.claimSessionReveal && !this.store.claimSessionReveal(id)) return false;
      this.revealed.add(id);
      this.analytics.track("session_reveal_viewed");
      return true;
    } catch { return false; }
  }
  audioFailure = false;
  sessionSilent = false;
  reportAudioFailure() {
    if (this.current?.engine.status !== "running") return;
    this.audioFailure = true;
    this.analytics.track("audio_playback_failed", { outcome: "failed", errorCategory: "playback" });
    this.pause("interruption");
  }
  recoverAudio(silent = false) {
    this.sessionSilent = silent;
    this.audioFailure = false;
    this.resume();
  }
  pacerThemeNotice: PacerThemeId[] = [];
  challenges() { return this.store.challenges?.() ?? []; }
  enrollChallenge(id: string) {
    const d = challengeCatalog().find(d => d.id === id);
    if (this.error || !d || (d.requiresPro && !this.entitlements.state.pro)) return false;
    return this.mutate(() => {
      const before = this.challenges().find(s => s.challengeId === id);
      this.store.enrollChallenge(id, this.entitlements.state.pro, this.now());
      if (!before || before.startedAt !== this.challenges().find(s => s.challengeId === id)?.startedAt) { this.analytics.track("challenge_started"); this.analytics.track("challenge_program_joined"); }
    });
  }
  private fitnessAnchor: number | null = null;
  private fitnessCache: ReturnType<typeof emptyFitness> | null = null;
  fitnessState() { return this.fitnessCache ??= this.store.fitness?.() ?? emptyFitness(); }
  pendingFitness() { return this.fitnessState().pending; }
  hasActiveChallenge() { return !!this.pendingTest() || !!this.pendingFitness(); }
  beginFitness(id: FitnessId, confirmed: boolean) {
    if (!confirmed || !fitnessDefinition(id) || this.error || this.hasActiveChallenge() || (this.current && this.current.stage !== "result")) return false;
    const pending = { id: this.id(), challengeId: id, startedAt: this.now(), elapsedMs: 0, status: id === "push-ups" ? "paused" as const : "running" as const };
    return this.mutate(() => {
      this.store.updateFitness(s => s.pending ? s : { ...s, pending });
      this.fitnessAnchor = pending.status === "running" ? this.monotonic() : null;
      this.analytics.track("challenge_started", { challengeType: id });
    });
  }
  fitnessElapsed() {
    const p = this.pendingFitness();
    return p ? p.elapsedMs + (p.status === "running" && this.fitnessAnchor !== null ? Math.max(0, this.monotonic() - this.fitnessAnchor) : 0) : 0;
  }
  checkpointFitness(status?: "paused" | "finished") {
    const p = this.pendingFitness(); if (!p || p.status === "finished" || this.error) return false;
    const elapsedMs = this.fitnessElapsed(), now = this.now();
    const next = { ...p, elapsedMs, status: status ?? p.status, ...(status === "finished" ? { finishedAt: now, localDay: dayKey(new Date(now)), localTime: `${String(new Date(now).getHours()).padStart(2, "0")}:${String(new Date(now).getMinutes()).padStart(2, "0")}` } : {}) };
    // Freeze the measured interval before IO; a retry never counts time spent resolving storage errors.
    this.fitnessAnchor = null;
    const saved = this.mutate(() => this.store.updateFitness(s => s.pending?.id === p.id ? { ...s, pending: next } : s));
    if (saved && next.status === "running") this.fitnessAnchor = this.monotonic();
    if (!saved) next.status = "paused";
    return saved;
  }
  resumeFitness() {
    const p = this.pendingFitness(); if (!p || p.status !== "paused" || p.challengeId === "push-ups" || this.error) return false;
    return this.mutate(() => { this.store.updateFitness(s => ({ ...s, pending: { ...p, status: "running" } })); this.fitnessAnchor = this.monotonic(); });
  }
  editFitnessDraft(note: string, repetitions?: number) {
    const p = this.pendingFitness(); if (!p || this.error || note.length > 500 || (repetitions !== undefined && (!Number.isSafeInteger(repetitions) || repetitions < 0 || repetitions > 99999))) return false;
    return this.mutate(() => this.store.updateFitness(s => s.pending?.id === p.id ? { ...s, pending: { ...s.pending, note, repetitions } } : s));
  }
  discardFitness() {
    if (this.error) return false;
    this.fitnessAnchor = null;
    return this.mutate(() => { this.store.updateFitness(s => ({ ...s, pending: null })); this.analytics.track("challenge_abandoned"); });
  }
  saveFitness() {
    const p = this.pendingFitness(); if (!p || this.error || p.status !== "finished") return null;
    const unit = fitnessDefinition(p.challengeId)!.unit;
    const value = unit === "seconds" ? Math.floor(p.elapsedMs / 100) / 10 : p.repetitions ?? 0;
    if (value <= 0) return null;
    const result: FitnessResult = { id: p.id, challengeId: p.challengeId, startedAt: p.startedAt, finishedAt: p.finishedAt!, localDay: p.localDay!, localTime: p.localTime, value, unit, note: p.note?.trim() || undefined, source: "self-reported" };
    return this.mutate(() => {
      const before = this.fitnessState();
      this.store.updateFitness(s => appendFitness(s, result));
      if (!before.results.some(r => r.id === result.id)) {
        this.analytics.track("challenge_attempt_completed", { challengeType: p.challengeId });
        if (isFitnessBest(result, before.results)) this.analytics.track("challenge_personal_best", { challengeType: p.challengeId });
      }
    }) ? result.id : null;
  }
  editFitnessResult(id: string, value: number, note: string) {
    const result = this.fitnessState().results.find(r => r.id === id);
    if (!result || this.error || result.unit !== "repetitions" || !Number.isSafeInteger(value) || value <= 0 || value > 99999 || note.length > 500) return false;
    return this.mutate(() => this.store.updateFitness(s => ({ ...s, results: s.results.map(r => r.id === id ? { ...r, value, note: note.trim() || undefined } : r) })));
  }
  deleteFitnessResult(id: string) {
    if (this.error) return false;
    return this.mutate(() => this.store.updateFitness(s => ({ ...s, results: s.results.filter(r => r.id !== id) })));
  }
  dailyReset() { return this.store.dailyReset?.() ?? emptyDailyReset(); }
  startDailyReset() {
    const previous = this.current?.id;
    this.start(null, 6, dailyResetProtocol(), true, undefined, undefined, true);
    if (this.current?.id !== previous && this.current?.dailyReset && !this.error) {
      this.analytics.track("daily_reset_started");
      const stats = dailyResetStats(this.dailyReset(), dayKey(new Date(this.now())));
      if (stats.todayComplete) this.analytics.track("daily_reset_repeat");
      else if (stats.total > 0) this.analytics.track("daily_reset_returned");
    }
  }
  pendingTest() { return this.store.testStore?.().pending ?? null; }
  testState() { return this.store.testStore(); }
  testAttempts() { return this.store.testStore?.().attempts ?? []; }
  dailyChallenge() { try { return this.store.dailyChallenge(this.entitlements.state.pro, this.now()); } catch { return null; } }
  excludeTest(id: TestId, excluded: boolean) { return this.mutate(() => this.store.excludeTest(id, excluded)); }
  beginTest(id: PendingTest["challengeId"], confirmed: boolean) {
    if (!confirmed || this.error || !this.entitlements.challengeAccess(id).allowed || this.testState().excluded.includes(id) || this.hasActiveChallenge() || (this.current && this.current.stage !== "result")) return false;
    return this.mutate(() => { if (!this.entitlements.challengeAccess(id).allowed || this.testState().pending) throw Error("Challenge access changed"); this.store.setPendingTest({ id: this.id(), challengeId: id, startedAt: this.now() }); this.analytics.track("challenge_started"); });
  }
  finishTest(elapsedMs: number) {
    const p = this.testState().pending, now = this.now();
    if (!p || p.finishedAt !== undefined || !Number.isFinite(elapsedMs) || elapsedMs < 100 || elapsedMs > now - p.startedAt + 1000) return false;
    return this.mutate(() => this.store.setPendingTest({ ...p, finishedAt: now, localDay: dayKey(new Date(now)), value: p.challengeId === "nasal-10" ? Math.min(10, elapsedMs / 60000) : Math.floor(elapsedMs / 100) / 10 }));
  }
  abandonTest() { return this.mutate(() => { this.store.setPendingTest(null); this.analytics.track("challenge_abandoned"); }); }
  saveTest(completed = true) {
    const p = this.testState().pending;
    if (!p || p.finishedAt === undefined || p.value === undefined || !p.localDay || !this.entitlements.challengeAccess(p.challengeId).allowed || (completed && p.challengeId === "nasal-10" && p.value < 10)) return null;
    const attempt: ChallengeAttempt = { id: p.id, challengeId: p.challengeId, definitionVersion: 1, startedAt: p.startedAt, finishedAt: p.finishedAt, localDay: p.localDay, value: p.value, completed };
    const previous = this.rewards(), before = this.testAttempts();
    return this.mutate(() => {
      if (!this.entitlements.challengeAccess(attempt.challengeId).allowed) throw Error("Challenge access changed");
      this.store.saveTestAttempt(attempt); this.captureRewards(previous);
      if (!before.some(a => a.id === attempt.id)) {
        this.analytics.track("challenge_attempt_completed");
        if (completed) this.analytics.track("challenge_completed");
        if (attemptComparison(attempt, before).isPersonalBest) this.analytics.track("challenge_personal_best");
        if (this.latestAwards.length) this.analytics.track("challenge_badge_earned");
      }
    }) ? attempt.id : null;
  }
  startStateShift(rating: number, confirmed: boolean) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 10 || !confirmed || this.testState().pending || this.testState().excluded.includes("state-shift-60") || !this.entitlements.challengeAccess("state-shift-60").allowed) return;
    const protocol = protocols.find(p => p.id === "coherent")!;
    this.start(rating, 6, protocol, false, "state-shift-60");
    if (this.current?.stage === "active" && this.current.challengeTest) this.analytics.track("challenge_started");
  }
  acknowledgeChallenge(id: string) { return this.mutate(() => this.store.acknowledgeChallenge(id)); }
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
  private firstSession(kind: "started" | "completed") {
    if (!this.analytics.remoteReady || this.preferences.telemetryEnabled !== true) return;
    try {
      if (kind === "completed") {
        const completed = this.history().filter(r => r.endReason === "completed" && r.source !== "manual")
          .sort((a, b) => (a.finishedAt ?? a.engine.startedAt) - (b.finishedAt ?? b.engine.startedAt));
        if (completed[1]?.id === this.current?.id && completed[0].finishedAt !== null && completed[1].finishedAt !== null &&
            completed[1].finishedAt - completed[0].finishedAt >= 0 && completed[1].finishedAt - completed[0].finishedAt <= 7 * 86400000 &&
            this.store.claimSecondSessionMilestone?.()) this.analytics.track("second_session_within_seven_days");
        if (completed[0]?.id !== this.current?.id) return;
      }
      if (this.store.claimSessionMilestone?.(kind)) this.analytics.track(kind === "started" ? "first_session_started" : "first_session_completed");
    } catch { /* Measurement must not affect saved practice. */ }
  }
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
      if (c.endReason === "completed") { once("session_completed"); this.firstSession("completed"); if (c.protocol?.plan && c.protocolId !== "shared-practice") once("mix_completed"); }
      else once("session_abandoned");
      if (c.dailyReset && c.endReason === "completed") once("daily_reset_completed");
      if (c.post !== null) once("state_after_logged");
      const coach = c.coach;
      if (coach && "enrollmentId" in coach && this.store.coachState().enrollments.some(e => e.id === coach.enrollmentId && e.status === "completed" && e.completed.at(-1)?.sessionId === c.id)) once("guided_program_completed");
      if (c.challengeTest && this.testAttempts().some(a => a.id === c.id)) { once("challenge_attempt_completed"); once("challenge_completed"); }
    }
  }
  constructor(
    private store: LocalStore,
    private now: () => number,
    private id: () => string,
    readonly entitlements = new EntitlementService(),
    readonly analytics = new AnalyticsService(),
    private monotonic: () => number = () => performance.now(),
  ) {
    const savedPreferences = store.preferences();
    this.preferences = { ...savedPreferences, ...languagePreference(savedPreferences) };
    setLanguage(isLanguage(this.preferences.language) ? this.preferences.language : "en");
    if (typeof store.pacerThemeProgress === "function") this.pacerThemeProgress();
    if (this.pendingFitness()?.status === "running") this.store.updateFitness(s => ({ ...s, pending: { ...s.pending!, status: "paused" } }));
    this.fitnessCache = null;
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
        if (this.current.endReason === "completed" && this.current.finishedAt !== null && !this.current.completionLocalDay) this.current = { ...this.current, completionLocalDay: dayKey(new Date(this.current.finishedAt)) };
        const pacerThemesBefore = this.current.stage === "result" && typeof this.store.pacerThemeUnlocks === "function"
          ? this.store.pacerThemeUnlocks()
          : null;
        const previous = this.current.stage === "result" ? this.rewards() : null;
        const streakBefore = previous ? practiceStats(this.history(), new Date(this.now())).current : null;
        const challengesBefore = this.challenges();
        const dailyBefore = this.dailyReset().credits.length;
        this.store.save(this.current, this.entitlements.state.pro, this.now());
        if (pacerThemesBefore && typeof this.store.pacerThemeProgress === "function") {
          this.historyCache = null;
          const progress = this.store.pacerThemeProgress(this.history(), this.now());
          this.capturePacerThemeUnlocks(pacerThemesBefore, progress.earnedThemeIds);
          this.pacerThemeProgressCache = progress;
        }
        if (this.current.stage === "result" && this.current.coach) this.coachCache = null;
        for (const state of this.challenges()) {
          const old = challengesBefore.find(s => s.challengeId === state.challengeId);
          if (state.progress > (old?.progress ?? 0)) { this.analytics.track("challenge_progressed"); this.analytics.track("challenge_program_progress"); }
          if (state.status === "completed" && old?.status !== "completed") this.analytics.track("challenge_completed");
        }
        if (this.current.stage === "result") this.historyCache = null;
        if (previous) this.captureRewards(previous);
        if (this.dailyReset().credits.length > dailyBefore) {
          this.analytics.track("daily_reset_awarded");
          this.latestAwards = [...this.latestAwards, { id: `daily-reset-${this.current.completionLocalDay}`, label: "The 60-Second Reset", date: this.current.completionLocalDay! }];
        }
        if (streakBefore !== null && practiceStats(this.history(), new Date(this.now())).current > streakBefore) this.analytics.track("streak_extended");
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
    challengeTest?: "state-shift-60",
    coaching?: { tag: CoachSession; repeat: boolean },
    dailyReset?: true,
  ) {
    if (!validRating(pre)) throw new Error("Choose a rating from 1 to 10");
    if (!this.entitlements.protocolAccess(protocol).allowed) { this.analytics.track("premium_lock_tapped"); this.routineNotice = "This protocol requires InOut Pro."; this.emit(); return; }
    if (
      this.error ||
      this.hasActiveChallenge() ||
      !availableForPractice(protocol) ||
      (includesHighIntensity(protocol) && !safetyConfirmed) ||
      (this.current && this.current.stage !== "result")
    )
      return;
    const selectedCycles = cycles ?? protocol.defaultCycles;
    if (coaching) {
      const choice = this.coachSession(coaching.tag, coaching.repeat);
      if (!choice || choice.protocolId !== protocol.id || !Number.isInteger(selectedCycles) || selectedCycles < comfortableCycles(choice.protocolId, 60) || selectedCycles > choice.cycles) return;
    }
    if (isCyclic(protocol)) {
      if (!Number.isInteger(selectedCycles) || selectedCycles < 1 || selectedCycles > 3) return;
      protocol = cyclic;
    }
    if (audioSettings(this.preferences).voice && !this.guidedAccess().allowed) this.analytics.track("free_quota_exhausted");
    this.measured.clear();
    this.latestAwards = [];
    this.audioFailure = false;
    this.sessionSilent = false;
    const plan = planFor(protocol, selectedCycles);
    this.current = {
      id: this.id(),
      coach: coaching?.tag,
      challengeTest,
      dailyReset,
      guidedQuota: audioSettings(this.preferences).voice && productConfig.guidedSessionsPerMonth !== null && !this.entitlements.state.pro && this.guidedAccess().allowed,
      voiceAllowed: productConfig.guidedSessionsPerMonth === null || this.entitlements.state.pro || (audioSettings(this.preferences).voice && this.guidedAccess().allowed),
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
    if (this.error) return;
    this.analytics.track("protocol_selected");
    this.analytics.track("session_started");
    this.firstSession("started");
    if (!this.error && coaching && "enrollmentId" in coaching.tag && this.coachState().enrollments.some(e => e.id === (coaching.tag as { enrollmentId: string }).enrollmentId && e.completed.length > 0)) this.analytics.track("guided_program_returned");
    if (pre !== null) this.analytics.track("state_before_logged");
    if (protocol.plan && protocol.id !== "shared-practice") this.analytics.track("mix_started");
    else if (protocol.id !== "shared-practice" && !protocols.some(p => p.id === protocol.id)) this.analytics.track("custom_started");
  }
  view() {
    return this.current
      ? engine.snapshot(this.current.engine, this.now())
      : null;
  }
  private displayKey = "";
  tick() {
    const c = this.current;
    if (!c || c.stage !== "active" || c.engine.status !== "running") return;
    const now = this.now(),
      view = engine.snapshot(c.engine, now);
    const displayKey = `${c.id}:${view.cueKey}:${Math.ceil(view.phaseRemainingMs / 1000)}:${Math.ceil(view.sessionRemainingMs / 1000)}`;
    const displayChanged = displayKey !== this.displayKey;
    this.displayKey = displayKey;
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
    } else if (displayChanged) this.emit();
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
    if (reason !== "manual") this.analytics.track("session_interrupted");
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
    const intense = record.protocol?.safetyCategory === "highIntensity" || record.engine.plan.blocks.some(b => b.protocolId === cyclic.id || b.protocolId === "high-intensity-cyclic-alt");
    return !intense || record.safetyConfirmed === true;
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
  pacerThemeProgress(): PacerThemeProgress {
    if (this.pacerThemeProgressCache) return this.pacerThemeProgressCache;
    const before = typeof this.store.pacerThemeUnlocks === "function" ? this.store.pacerThemeUnlocks() : [];
    const records = this.history();
    const now = this.now();
    const practiceDays = qualifyingPacerPracticeDays(records, now).length;
    const progress = typeof this.store.pacerThemeProgress === "function"
      ? this.store.pacerThemeProgress(records, now)
      : { practiceDays, earnedThemeIds: earnedPacerThemeIds(practiceDays) };
    this.capturePacerThemeUnlocks(before, progress.earnedThemeIds);
    this.pacerThemeProgressCache = progress;
    return progress;
  }
  private capturePacerThemeUnlocks(before: readonly PacerThemeId[], after: readonly PacerThemeId[]) {
    const previous = new Set(before);
    const newlyEarned = after.filter(id => !previous.has(id));
    if (!newlyEarned.length) return;
    for (const _theme of newlyEarned) this.analytics.track("theme_earned");
    this.pacerThemeNotice = [...new Set([...this.pacerThemeNotice, ...newlyEarned])];
  }
  isPacerThemeAvailable(themeId: PacerThemeId) {
    const theme = pacerThemes.find(item => item.id === themeId);
    if (!theme) return false;
    const earned = this.pacerThemeProgressCache?.earnedThemeIds ??
      (typeof this.store.pacerThemeUnlocks === "function" ? this.store.pacerThemeUnlocks() : []);
    return this.entitlements.state.pro || theme.unlockDays === 0 || earned.includes(themeId);
  }
  effectivePacerTheme(): PacerThemeId {
    const selected = this.preferences.pacerTheme ?? "default";
    return this.isPacerThemeAvailable(selected) ? selected : "default";
  }
  applyPacerTheme(themeId: PacerThemeId) {
    if (!this.isPacerThemeAvailable(themeId)) {
      this.analytics.track("theme_locked_tapped");
      return false;
    }
    if (this.preferences.pacerTheme === themeId) return true;
    this.setPreferences({ ...this.preferences, pacerTheme: themeId });
    if (this.preferences.pacerTheme !== themeId || this.preferencesError) return false;
    this.analytics.track("theme_applied");
    return true;
  }
  dismissPacerThemeNotice() {
    this.pacerThemeNotice = [];
    this.emit();
  }
  refreshHistory() {
    if (this.error) return false;
    return this.mutate(() => {
      this.historyCache = this.store.history();
      this.pacerThemeProgressCache = null;
      this.pacerThemeProgress();
    });
  }
  addManualSession(input: ManualSessionInput, id = this.id()) {
    if (!productConfig.manualLogging) return null;
    if (this.error) return null;
    const record = manualSession(input, id, this.now());
    this.pendingManualId = id;
    return this.mutate(() => {
      const previous = this.rewards();
      const streakBefore = practiceStats(this.history(), new Date(this.now())).current;
      this.store.save(record);
      this.historyCache = null;
      this.captureRewards(previous);
      if (practiceStats(this.history(), new Date(this.now())).current > streakBefore) this.analytics.track("streak_extended");
      this.analytics.track("external_practice_logged");
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
      this.pacerThemeProgressCache = null;
      this.pacerThemeProgress();
      if (this.current?.id === id && this.current.stage === "result") this.current = null;
    });
  }
  clearHistory() {
    if (this.error) return;
    this.mutate(() => {
      this.store.clearHistory();
      this.historyCache = [];
      this.pacerThemeProgressCache = null;
      this.pacerThemeProgress();
      if (this.current?.stage === "result") this.current = null;
    });
  }
  preferencesSaved = false;
  setPreferences(preferences: Preferences) {
    this.preferencesSaved = false;
    preferences = { ...preferences, ...languagePreference(preferences) };
    try {
      const onboardingCompleted = !this.preferences.onboardingComplete && preferences.onboardingComplete;
      const previous = this.preferences.journey;
      this.store.savePreferences(preferences);
      this.preferences = preferences;
      void this.analytics.setConsent(preferences.telemetryEnabled === true).then(() => {
        if (preferences.telemetryEnabled === true && this.analytics.remoteReady && this.store.claimFirstOpen()) this.analytics.track("app_first_open");
      }).catch(() => { /* Consent transport never blocks local preference saves. */ });
      const journey = preferences.journey;
      if (journey?.primaryGoal && journey.primaryGoal !== previous?.primaryGoal) this.analytics.track("onboarding_goal_selected");
      if (journey?.step === "value" && previous?.step !== "value") this.analytics.track("onboarding_value_viewed");
      if (journey?.safetyAcceptedAt && !previous?.safetyAcceptedAt) this.analytics.track("safety_acknowledged");
      if (onboardingCompleted) this.analytics.track("onboarding_completed");
      setLanguage(isLanguage(preferences.language) ? preferences.language : "en");
      this.pendingPreferences = null;
      this.preferencesError = null;
      this.preferencesSaved = true;
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
      this.fitnessCache = null;
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
      this.fitnessAnchor = null;
      this.coachCache = null;
      this.onLocalDataReset?.();
      this.current = null;
      this.customProtocol = null;
      this.historyCache = [];
      this.routinesCache = [];
      this.rewardCache = null;
      this.pacerThemeProgressCache = null;
      this.pacerThemeNotice = [];
      this.latestAwards = [];
      this.preferences = { ...defaultPreferences, ...languagePreference(defaultPreferences) };
      this.analytics.setConsent(false);
      setLanguage(this.preferences.language ?? "en");
      this.pendingPreferences = null;
      this.sessionError = null;
      this.preferencesError = null;
    });
  }
}
