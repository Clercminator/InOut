import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { BreathHoldTimer, formatHoldTime, validateBreathHoldHistory } from "../apps/mobile/src/breath-hold-timer";
import { AnalyticsService, type ProductEvent } from "../apps/mobile/src/analytics";
import { TelemetrySink } from "../apps/mobile/src/telemetry";
import { LocalStore, type Database } from "../apps/mobile/src/storage";
import { migrateAudioPreferences, audioSettings } from "../apps/mobile/src/audio-preferences";
import { defaultExperience } from "../apps/mobile/src/experience";
import { selectedGoals, goalForDay, journeyFor, toggleGoal } from "../apps/mobile/src/personalization";

function fixture() {
  let monotonic = 0, wall = 10000, ids = 0;
  const events: ProductEvent[] = [];
  const timer = new BreathHoldTimer(() => monotonic, () => wall, () => String(++ids), event => events.push(event));
  return { timer, events, advance: (ms: number) => { monotonic += ms; }, wall: (ms: number) => { wall = ms; } };
}

test("stopwatch uses monotonic elapsed time across delayed renders, wall-clock changes and rapid taps", () => {
  const f = fixture();
  f.timer.start(); f.advance(713); f.timer.start(); f.timer.sample();
  f.wall(999999); f.advance(843); f.timer.stop(); f.timer.stop();
  assert.equal(f.timer.elapsedMs, 1556);
  assert.equal(formatHoldTime(f.timer.elapsedMs), "00:01.5");
  assert.equal(formatHoldTime(61234), "01:01.2");
  let writes = 0;
  assert.equal(f.timer.save(() => false), false);
  assert.equal(f.timer.status, "stopped");
  assert.equal(f.timer.save(() => { writes++; return true; }), true);
  assert.equal(f.timer.save(() => { writes++; return true; }), false);
  assert.equal(writes, 1);
  assert.deepEqual(f.events, ["breath_hold_started", "breath_hold_stopped", "breath_hold_saved"]);
  f.timer.reset(); assert.equal(f.timer.status, "ready"); assert.equal(f.timer.elapsedMs, 0);
  f.timer.start(); f.advance(100); f.timer.stop(); assert.equal(f.timer.elapsedMs, 100);
  assert.equal(f.timer.attempt?.id, "2");
});

test("background, navigation and unobserved suspension discard attempts without credit", () => {
  for (const explicit of [true, false]) {
    const f = fixture(); f.timer.start(); f.advance(100); f.timer.sample();
    if (explicit) f.timer.interrupt();
    f.advance(60000); f.timer.stop(); f.timer.sample(); f.timer.interrupt();
    assert.equal(f.timer.status, "interrupted");
    assert.equal(f.timer.elapsedMs, 0); assert.equal(f.timer.attempt, null);
    assert.equal(f.timer.save(() => { throw Error("must not save"); }), false);
    assert.deepEqual(f.events, ["breath_hold_started", "breath_hold_abandoned"]);
    f.timer.reset(); f.timer.start(); f.advance(1000); f.timer.stop();
    assert.equal(f.timer.elapsedMs, 1000);
  }
});

test("local timer history survives reopening, deduplicates saves and cannot change practice statistics", () => {
  const db = new DatabaseSync(":memory:");
  const adapter: Database = {
    execSync: sql => db.exec(sql), runSync: (sql, ...args) => db.prepare(sql).run(...args),
    getFirstSync: (sql, ...args) => db.prepare(sql).get(...args) as never ?? null,
    getAllSync: (sql, ...args) => db.prepare(sql).all(...args) as never,
    withTransactionSync: action => { db.exec("BEGIN"); try { action(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } },
  };
  const store = new LocalStore(adapter);
  const before = { history: store.history(), coach: store.coachState(), tests: store.testStore(), rewards: store.rewards(), challenges: store.challenges() };
  const attempt = { id: "attempt-1", elapsedMs: 12345, completedAt: 10000 };
  store.saveBreathHold(attempt); store.saveBreathHold(attempt);
  const reopened = new LocalStore(adapter);
  assert.deepEqual(reopened.breathHoldHistory(), [attempt]);
  assert.deepEqual({ history: reopened.history(), coach: reopened.coachState(), tests: reopened.testStore(), rewards: reopened.rewards(), challenges: reopened.challenges() }, before);
  assert.throws(() => store.saveBreathHold({ ...attempt, id: "bad", elapsedMs: NaN }));
  assert.deepEqual(reopened.breathHoldHistory(), [attempt]);
  assert.throws(() => validateBreathHoldHistory([{ ...attempt, elapsedMs: -1 }]));
  store.reset(); assert.deepEqual(store.breathHoldHistory(), []);
  db.close();
});

test("retired settings migrate without resetting multiple goals, journey, voices or music", () => {
  const legacy = { audio: "voice" as const, haptics: true, keepAwake: true,
    guidance: { nature: true, natureVolume: .8, voice: true, music: true, musicVolume: .25, language: "pt" as const, voiceId: "female" as const },
    experience: { ...defaultExperience, breathSound: "ocean" },
    journey: { version: 1 as const, step: "personalize" as const, primaryGoal: "sleep" as const, secondaryGoals: ["focus" as const] } };
  const migrated = migrateAudioPreferences(legacy);
  assert.equal(JSON.stringify(migrated).includes("nature"), false);
  assert.equal(JSON.stringify(migrated).includes("breathSound"), false);
  assert.equal(legacy.guidance.nature, true);
  assert.equal(audioSettings(migrated).musicVolume, .25);
  assert.equal(audioSettings(migrated).voiceId, "female");
  assert.deepEqual(selectedGoals(migrated), ["sleep", "focus"]);
  assert.equal(journeyFor(migrated).step, "personalize");
  const goals = new Set(Array.from({ length: 7 }, (_, i) => goalForDay(migrated, Date.UTC(2026, 9, 20 + i))));
  assert.deepEqual(goals, new Set(["sleep", "focus"]));
  assert.deepEqual(selectedGoals({ ...migrated, journey: toggleGoal(migrated, "energy") }), ["sleep", "focus", "energy"]);
});

test("timer Firebase events require consent and exclude performance and State Shift data", async () => {
  const remote: unknown[][] = [];
  const sink = new TelemetrySink({ consent: async () => {}, record: async (...args) => { remote.push(args); } });
  const analytics = new AnalyticsService(sink);
  analytics.track("breath_hold_timer_opened"); assert.deepEqual(remote, []);
  await analytics.setConsent(true);
  for (const event of ["breath_hold_timer_opened", "breath_hold_started", "breath_hold_stopped", "breath_hold_saved", "breath_hold_abandoned"] as const) {
    analytics.track(event, { elapsedMs: 1234, rating: 7 } as never);
  }
  analytics.track("state_before_logged"); analytics.track("state_after_logged");
  assert.equal(remote.length, 6); // app_open plus five timer events
  assert.ok(remote.every(args => args[1] === undefined));
  await analytics.setConsent(false); analytics.track("breath_hold_started");
  assert.equal(remote.length, 6);
});
