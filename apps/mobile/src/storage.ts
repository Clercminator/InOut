import { validateManagedShares, type ManagedShare } from "./share-links";
import type { Preferences, SessionRecord, SavedRoutine } from "@inout/shared-types";
import { planFor } from "@inout/protocols";
import { validatePlan } from "@inout/breathing-engine";
import { recover } from "@inout/breathing-engine";
import { validRating } from "@inout/shared-types";
import { emptyLedger, experienceFor, reconcileRewards, type RewardLedger } from "./experience";
import { validateExperience } from "./experience-validation";
import { validateReminders, type Reminder } from "./reminders";

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
  save(record: SessionRecord) {
    if (!validRating(record.pre) || !validRating(record.post))
      throw new Error("Invalid tension rating");
    this.db.withTransactionSync(() => {
    this.db.runSync(
      "INSERT INTO sessions(id, stage, started_at, payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET stage=excluded.stage, started_at=excluded.started_at, payload=excluded.payload",
      record.id,
      record.stage,
      record.engine.startedAt,
      JSON.stringify(record),
    );
    if (record.stage === "result") {
      const history = this.history();
      this.writeRewards(reconcileRewards(history, this.rewards(history), experienceFor(this.preferences()).weeklyGoal));
    }
    });
  }
  rewards(records?: SessionRecord[]): RewardLedger {
    const row = this.db.getFirstSync<{ payload: string }>("SELECT payload FROM settings WHERE key='rewards-v1'");
    if (row) {
      const value = JSON.parse(row.payload) as RewardLedger;
      if (value.version !== 1 || !Array.isArray(value.badges) || !value.weekGoals ||
        value.badges.some(b => typeof b.id !== "string" || typeof b.label !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) ||
        Object.values(value.weekGoals).some(g => !Number.isInteger(g) || g < 2 || g > 7)) throw new Error("Saved rewards could not be read. Your data has been preserved.");
      return value;
    }
    return reconcileRewards(records ?? this.history(), emptyLedger(), experienceFor(this.preferences()).weeklyGoal);
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
    if (!row) return defaultPreferences;
    const p = JSON.parse(row.payload);
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
      onboardingComplete: p.onboardingComplete ?? false,
      pro: p.pro ?? false,
    };
  }
  savePreferences(p: Preferences) {
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
  readEntitlementCache(): unknown {
    const row = this.db.getFirstSync<{ payload: string }>("SELECT payload FROM settings WHERE key='entitlement-cache-v1'");
    return row ? JSON.parse(row.payload) : null;
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
