import { emptyTestStore, validateTestStore, appendAttempt, stateShiftAttempt, selectDaily, type TestStore, type ChallengeAttempt, type PendingTest, type TestId } from "./challenge-tests";
import { validateManagedShares, type ManagedShare } from "./share-links";
import type { Preferences, SessionRecord, SavedRoutine } from "@inout/shared-types";
import { planFor } from "@inout/protocols";
import { validatePlan } from "@inout/breathing-engine";
import { recover } from "@inout/breathing-engine";
import { validRating } from "@inout/shared-types";
import { emptyLedger, experienceFor, reconcileRewards, type RewardLedger } from "./experience";
import { validateExperience } from "./experience-validation";
import { validateReminders, type Reminder } from "./reminders";
import { validateJourney } from "./personalization";
import { currentUsage, reserveGuidance, type GuidedUsage } from "./guided-quota";
import { productConfig } from "./product-config";
import { validEmail } from "./welcome-email";
import { dayKey } from "./progress";
import { enrollChallenge, reconcileChallenges, validateChallenges, type UserChallenge } from "./challenges";

export interface Database {
  execSync(sql: string): void;
  runSync(sql: string, ...params: (string | number | null)[]): unknown;
  getAllSync<T>(sql: string, ...params: (string | number | null)[]): T[];
  getFirstSync<T>(sql: string, ...params: (string | number | null)[]): T | null;
  withTransactionSync(action: () => void): void;
}
export const defaultPreferences: Preferences = {
  theme: "system",
  language: "en",
  audio: "tones",
  haptics: true,
  keepAwake: true,
  onboardingComplete: false,
  pro: false,
};
export class LocalStore {
  constructor(private db: Database) {
    const version =
      db.getFirstSync<{ user_version: number }>("PRAGMA user_version")
        ?.user_version ?? 0;
    if (version > 2)
      throw new Error("This data needs a newer version of IN/OUT.");
    db.execSync("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
    db.withTransactionSync(() =>
      db.execSync(`
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, stage TEXT NOT NULL, started_at REAL NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS routines (id TEXT PRIMARY KEY, updated_at REAL NOT NULL, payload TEXT NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS one_pending_session ON sessions((1)) WHERE stage IN ('active','post');
      PRAGMA user_version = 2;
    `),
    );
  }
  save(record: SessionRecord, pro = false) {
    if (!validRating(record.pre) || !validRating(record.post))
      throw new Error("Invalid tension rating");
    this.db.withTransactionSync(() => {
    if (record.guidedQuota && productConfig.guidedSessionsPerMonth !== null && !this.db.getFirstSync("SELECT id FROM sessions WHERE id=?", record.id)) {
      const usage = reserveGuidance(this.guidedUsage(record.engine.startedAt), record.id, record.engine.startedAt, productConfig.guidedSessionsPerMonth);
      this.db.runSync("INSERT INTO settings(key,payload) VALUES('guided-usage-v1',?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload", JSON.stringify(usage));
    }
    this.db.runSync(
      "INSERT INTO sessions(id, stage, started_at, payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET stage=excluded.stage, started_at=excluded.started_at, payload=excluded.payload",
      record.id,
      record.stage,
      record.engine.startedAt,
      JSON.stringify(record),
    );
    if (record.stage === "result") {
      const attempt = stateShiftAttempt(record);
      if (attempt) this.writeTestStore(appendAttempt(this.testStore(), attempt));
      this.writeChallenges(reconcileChallenges(this.challenges(), [record], pro));
      const history = this.history();
      this.writeRewards(reconcileRewards(history, this.rewards(history), experienceFor(this.preferences()).weeklyGoal));
    }
    });
  }
  guidedUsage(now: number): GuidedUsage {
    const row = this.db.getFirstSync<{ payload: string }>("SELECT payload FROM settings WHERE key='guided-usage-v1'");
    return currentUsage(row ? JSON.parse(row.payload) : null, now);
  }
  rewards(records?: SessionRecord[]): RewardLedger {
    const row = this.db.getFirstSync<{ payload: string }>("SELECT payload FROM settings WHERE key='rewards-v1'");
    if (row) {
      const value = JSON.parse(row.payload) as RewardLedger;
      if (value.version !== 1 || !Array.isArray(value.badges) || !value.weekGoals ||
        value.badges.some(b => typeof b.id !== "string" || typeof b.label !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) ||
        Object.values(value.weekGoals).some(g => !Number.isInteger(g) || g < 2 || g > 7)) throw new Error("Saved rewards could not be read. Your data has been preserved.");
      const reconciled = reconcileRewards(records ?? this.history(), value, experienceFor(this.preferences()).weeklyGoal, new Date(), this.challenges(), this.testStore().attempts);
      if (JSON.stringify(reconciled) !== JSON.stringify(value)) this.writeRewards(reconciled);
      return reconciled;
    }
    return reconcileRewards(records ?? this.history(), emptyLedger(), experienceFor(this.preferences()).weeklyGoal, new Date(), this.challenges(), this.testStore().attempts);
  }
  challenges(): UserChallenge[] {
    const row = this.db.getFirstSync<{ payload: string }>("SELECT payload FROM settings WHERE key='challenges-v1'");
    const value: unknown = row ? JSON.parse(row.payload) : [];
    validateChallenges(value); return value;
  }
  private writeChallenges(value: UserChallenge[]) {
    validateChallenges(value);
    this.db.runSync("INSERT INTO settings(key,payload) VALUES('challenges-v1',?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload", JSON.stringify(value));
  }
  enrollChallenge(id: string, pro: boolean, now: number) {
    this.db.withTransactionSync(() => this.writeChallenges(enrollChallenge(id, this.challenges(), pro, now)));
  }
  acknowledgeChallenge(id: string) {
    this.writeChallenges(this.challenges().map(s => s.challengeId === id && s.status === "completed" ? { ...s, celebrationSeen: true } : s));
  }
  testStore(): TestStore {
    const row = this.db.getFirstSync<{ payload: string }>("SELECT payload FROM settings WHERE key='challenge-tests-v1'");
    const value = row ? JSON.parse(row.payload) : emptyTestStore(); validateTestStore(value); return value;
  }
  private writeTestStore(value: TestStore) {
    validateTestStore(value);
    this.db.runSync("INSERT INTO settings(key,payload) VALUES('challenge-tests-v1',?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload", JSON.stringify(value));
  }
  setPendingTest(pending: PendingTest | null) { this.writeTestStore({ ...this.testStore(), pending }); }
  saveTestAttempt(attempt: ChallengeAttempt) {
    this.db.withTransactionSync(() => {
      this.writeTestStore({ ...appendAttempt(this.testStore(), attempt), pending: null });
      this.writeRewards(this.rewards());
    });
  }
  excludeTest(id: TestId, excluded: boolean) {
    const state = this.testStore(); this.writeTestStore({ ...state, excluded: [...state.excluded.filter(v => v !== id), ...(excluded ? [id] : [])] });
  }
  dailyChallenge(pro: boolean, now: number) {
    const state = this.testStore(), next = selectDaily(state, pro, this.challenges(), now);
    if (next !== state) this.writeTestStore(next);
    return next.daily.find(d => d.day === dayKey(new Date(now)))?.id ?? null;
  }
  private writeRewards(value: RewardLedger) {
    this.db.runSync("INSERT INTO settings(key,payload) VALUES('rewards-v1',?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload", JSON.stringify(value));
  }
  private decode(payload: string): SessionRecord {
    const value = JSON.parse(payload) as SessionRecord;
    if (
      !value.id ||
      !["active", "post", "result"].includes(value.stage) ||
      !validRating(value.pre) ||
      !validRating(value.post)
    )
      throw new Error(
        "Saved session could not be read. Your data has been preserved.",
      );
    recover(value.engine, Date.now()); // Validate without changing historical records.
    return value;
  }
  pending() {
    const row = this.db.getFirstSync<{ payload: string }>(
      "SELECT payload FROM sessions WHERE stage IN ('active','post') LIMIT 1",
    );
    return row ? this.decode(row.payload) : null;
  }
  history() {
    return this.db
      .getAllSync<{
        payload: string;
      }>(
        "SELECT payload FROM sessions WHERE stage='result' ORDER BY started_at DESC",
      )
      .map((row) => this.decode(row.payload));
  }
  remove(id: string) {
    this.db.withTransactionSync(() => {
      this.writeRewards(this.rewards());
      this.db.runSync("DELETE FROM sessions WHERE id=? AND stage='result'", id);
    });
  }
  clearHistory() {
    this.db.withTransactionSync(() => {
      this.writeRewards(this.rewards());
      this.db.runSync("DELETE FROM sessions WHERE stage='result'");
      this.writeTestStore({ ...this.testStore(), attempts: [] });
    });
  }
  routines(): SavedRoutine[] {
    return this.db.getAllSync<{ payload: string }>("SELECT payload FROM routines ORDER BY updated_at DESC").map(({ payload }) => {
      const routine = JSON.parse(payload) as SavedRoutine;
      this.validateRoutine(routine);
      return routine;
    });
  }
  private validateRoutine(routine: SavedRoutine) {
    if (!routine.id || !["pattern", "mix"].includes(routine.kind) ||
      !routine.protocol?.name?.trim() || routine.protocol.name.length > 60 || !Number.isFinite(routine.updatedAt))
      throw new Error("Saved routine could not be read. Your data has been preserved.");
    validatePlan(planFor(routine.protocol));
  }
  saveRoutine(routine: SavedRoutine) {
    this.validateRoutine(routine);
    this.db.runSync("INSERT INTO routines(id,updated_at,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at,payload=excluded.payload", routine.id, routine.updatedAt, JSON.stringify(routine));
  }
  removeRoutine(id: string) { this.db.runSync("DELETE FROM routines WHERE id=?", id); }
  reset() {
    this.db.withTransactionSync(() => this.db.execSync("DELETE FROM sessions; DELETE FROM routines; DELETE FROM settings;"));
  }
  preferences(): Preferences {
    const row = this.db.getFirstSync<{ payload: string }>(
      "SELECT payload FROM settings WHERE key='preferences'",
    );
    if (!row) return this.db.getFirstSync("SELECT id FROM sessions LIMIT 1") ? { ...defaultPreferences, onboardingComplete: true } : defaultPreferences;
    const p = JSON.parse(row.payload);
    if (p.journey !== undefined) validateJourney(p.journey);
    this.validateWelcomeEmail(p);
    if (p.experience !== undefined) validateExperience(p.experience);
    if (
      !["voice", "tones", "silent"].includes(p.audio) ||
      typeof p.haptics !== "boolean" ||
      (p.hapticMode !== undefined && !["transitions", "rhythm"].includes(p.hapticMode)) ||
      typeof p.keepAwake !== "boolean" ||
      (p.favoriteProtocolIds !== undefined &&
        (!Array.isArray(p.favoriteProtocolIds) ||
          p.favoriteProtocolIds.some((id: unknown) => typeof id !== "string"))) ||
      (p.onboardingComplete !== undefined && typeof p.onboardingComplete !== "boolean") ||
      (p.pro !== undefined && typeof p.pro !== "boolean")
    )
      throw new Error("Saved settings could not be read.");
    return {
      ...p,
      theme: ["system", "light", "dark"].includes(p.theme) ? p.theme : "system",
      language: ["en", "es", "pt"].includes(p.language) ? p.language : "en",
      favoriteProtocolIds: p.favoriteProtocolIds ?? [],
      // A pre-funnel installation with saved preferences is not forced through onboarding again.
      onboardingComplete: p.onboardingComplete ?? !p.journey,
      pro: p.pro ?? false,
    };
  }
  savePreferences(p: Preferences) {
    this.validateWelcomeEmail(p);
    if (p.journey !== undefined) validateJourney(p.journey);
    if (p.experience !== undefined) validateExperience(p.experience);
    this.db.withTransactionSync(() => {
    // Freeze existing goals before changing preferences on an older installation.
    if (!this.db.getFirstSync("SELECT payload FROM settings WHERE key='rewards-v1'")) this.writeRewards(this.rewards());
    this.db.runSync(
      "INSERT INTO settings(key,payload) VALUES('preferences',?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload",
      JSON.stringify(p),
    );
    });
  }
  private validateWelcomeEmail(p: Preferences) {
    const value = p.welcomeEmail;
    if (value !== undefined && (!validEmail(value.email) || !Number.isFinite(value.consentAt) || value.consentAt <= 0 || !["pending", "sent", "review"].includes(value.status))) throw Error("Saved email preferences could not be read.");
  }
  readEntitlementCache(): unknown {
    const row = this.db.getFirstSync<{ payload: string }>("SELECT payload FROM settings WHERE key='entitlement-cache-v1'");
    return row ? JSON.parse(row.payload) : null;
  }
  readAdFrequency(): unknown {
    const row = this.db.getFirstSync<{ payload: string }>("SELECT payload FROM settings WHERE key='ad-frequency-v1'");
    return row ? JSON.parse(row.payload) : null;
  }
  writeAdFrequency(value: unknown) {
    this.db.runSync("INSERT INTO settings(key,payload) VALUES('ad-frequency-v1',?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload", JSON.stringify(value));
  }
  readShareLinks(): ManagedShare[] {
    const row = this.db.getFirstSync<{ payload: string }>("SELECT payload FROM settings WHERE key='share-links-v1'");
    const items: unknown = row ? JSON.parse(row.payload) : []; validateManagedShares(items); return items;
  }
  writeShareLinks(items: ManagedShare[]) {
    validateManagedShares(items);
    this.db.runSync("INSERT INTO settings(key,payload) VALUES('share-links-v1',?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload", JSON.stringify(items));
  }
  readReminders(): Reminder[] {
    const row = this.db.getFirstSync<{ payload: string }>("SELECT payload FROM settings WHERE key='reminders-v1'");
    const items: unknown = row ? JSON.parse(row.payload) : [];
    validateReminders(items);
    return items;
  }
  writeReminders(items: Reminder[]) {
    validateReminders(items);
    this.db.runSync("INSERT INTO settings(key,payload) VALUES('reminders-v1',?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload", JSON.stringify(items));
  }
  writeEntitlementCache(value: unknown) {
    this.db.runSync("INSERT INTO settings(key,payload) VALUES('entitlement-cache-v1',?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload", JSON.stringify(value));
  }
}
