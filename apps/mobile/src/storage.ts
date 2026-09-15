import type { Preferences, SessionRecord } from "@inout/shared-types";
import { recover } from "@inout/breathing-engine";
import { validRating } from "@inout/shared-types";

export interface Database {
  execSync(sql: string): void;
  runSync(sql: string, ...params: (string | number | null)[]): unknown;
  getAllSync<T>(sql: string, ...params: (string | number | null)[]): T[];
  getFirstSync<T>(sql: string, ...params: (string | number | null)[]): T | null;
  withTransactionSync(action: () => void): void;
}
export const defaultPreferences: Preferences = {
  audio: "tones",
  haptics: true,
  keepAwake: true,
};
export class LocalStore {
  constructor(private db: Database) {
    const version =
      db.getFirstSync<{ user_version: number }>("PRAGMA user_version")
        ?.user_version ?? 0;
    if (version > 1)
      throw new Error("This data needs a newer version of IN/OUT.");
    db.execSync("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
    db.withTransactionSync(() =>
      db.execSync(`
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, stage TEXT NOT NULL, started_at REAL NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS one_pending_session ON sessions((1)) WHERE stage IN ('active','post');
      PRAGMA user_version = 1;
    `),
    );
  }
  save(record: SessionRecord) {
    if (!validRating(record.pre) || !validRating(record.post))
      throw new Error("Invalid tension rating");
    this.db.runSync(
      "INSERT INTO sessions(id, stage, started_at, payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET stage=excluded.stage, payload=excluded.payload",
      record.id,
      record.stage,
      record.engine.startedAt,
      JSON.stringify(record),
    );
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
      }>("SELECT payload FROM sessions WHERE stage='result' ORDER BY started_at DESC")
      .map((row) => this.decode(row.payload));
  }
  remove(id: string) {
    this.db.runSync("DELETE FROM sessions WHERE id=? AND stage='result'", id);
  }
  preferences(): Preferences {
    const row = this.db.getFirstSync<{ payload: string }>(
      "SELECT payload FROM settings WHERE key='preferences'",
    );
    if (!row) return defaultPreferences;
    const p = JSON.parse(row.payload);
    if (
      !["voice", "tones", "silent"].includes(p.audio) ||
      typeof p.haptics !== "boolean" ||
      typeof p.keepAwake !== "boolean"
    )
      throw new Error("Saved settings could not be read.");
    return p;
  }
  savePreferences(p: Preferences) {
    this.db.runSync(
      "INSERT INTO settings(key,payload) VALUES('preferences',?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload",
      JSON.stringify(p),
    );
  }
}
