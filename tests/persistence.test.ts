import test from "node:test";
import { AnalyticsService, type ProductEvent } from "../apps/mobile/src/analytics";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { LocalStore, type Database } from "../apps/mobile/src/storage";
import { SessionController } from "../apps/mobile/src/session-controller";
import { stateShift } from "../packages/shared-types/src/index";
import * as engine from "../packages/breathing-engine/src/index";
import { makeMixProtocol } from "../apps/mobile/src/custom-protocol";
import { protocols, planFor } from "../packages/protocols/src/index";
import { EntitlementService } from "../apps/mobile/src/entitlements";
import { experienceFor, weeklyPractice } from "../apps/mobile/src/experience";
function setup() {
  const db = new DatabaseSync(":memory:");
  const adapter: Database = {
    execSync: (sql) => db.exec(sql),
    runSync: (sql, ...params) => db.prepare(sql).run(...params),
    getAllSync: <T>(sql: string, ...params: (string | number | null)[]) =>
      db.prepare(sql).all(...params) as T[],
    getFirstSync: <T>(sql: string, ...params: (string | number | null)[]) =>
      (db.prepare(sql).get(...params) as T) ?? null,
    withTransactionSync: (action) => {
      db.exec("BEGIN");
      try {
        action();
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    },
  };
  let now = 1000,
    id = 0;
  const store = new LocalStore(adapter);
  return {
    db,
    store,
    adapter,
    now: (value: number) => {
      now = value;
    },
    controller: (entitlements?: EntitlementService) =>
      new SessionController(
        store,
        () => now,
        () => String(++id),
        entitlements,
      ),
  };
}

test("personal profiles, weekly goals, audio choices and one-tap rituals survive cold launch", () => {
  const env = setup();
  try {
    const c = env.controller();
    assert.equal(c.updateExperience({ name: "Sam", bio: "Making time for myself", weeklyGoal: 4, breathSound: "warm", guidanceVolume: 0.25, celebration: "quiet" }), true);
    const box = protocols.find(p => p.id === "box")!;
    assert.equal(c.saveRitual("Before sleep", box, 2), true);
    const reopened = env.controller();
    const e = experienceFor(reopened.preferences);
    assert.equal(e.name, "Sam"); assert.equal(e.weeklyGoal, 4); assert.equal(e.rituals.length, 1);
    assert.equal(reopened.startRitual(e.rituals[0].id), true);
    assert.equal(reopened.current?.pre, null); assert.equal(reopened.current?.protocolId, "box");
    assert.equal(reopened.current?.engine.plan.blocks[0].cycles, 2);
    assert.equal(experienceFor(reopened.preferences).breathSound, "warm");
    assert.equal(reopened.startRitual(e.rituals[0].id), false);
  } finally { env.db.close(); }
});

test("badges and cosmetic unlocks are durable, idempotent and independent of tension ratings", () => {
  const env = setup();
  try {
    const c = env.controller();
    assert.equal(c.updateExperience({ palette: "mint" }), false);
    c.start(1); env.now(49000); c.tick(); c.answer(10, "Worse");
    assert.ok(c.rewards().badges.some(b => b.id === "sessions-1"));
    assert.ok(c.latestAwards.some(b => b.id === "sessions-1"));
    assert.equal(c.updateExperience({ palette: "mint" }), true);
    const count = c.rewards().badges.length;
    env.store.save(c.current!);
    assert.equal(env.controller().rewards().badges.length, count);
    c.clearHistory();
    const reopened = env.controller();
    assert.equal(reopened.history().length, 0);
    assert.equal(reopened.rewards().badges.length, count);
    assert.equal(experienceFor(reopened.preferences).palette, "mint");
    reopened.resetLocalData();
    assert.equal(env.controller().rewards().badges.length, 0);
    assert.equal(experienceFor(env.controller().preferences).palette, "sky");
  } finally { env.db.close(); }
});

test("result and rewards commit together; failed reward write retries without duplicate badges", () => {
  const env = setup();
  try {
    const c = env.controller(); c.start(null); env.now(49000); c.tick();
    const run = env.adapter.runSync;
    env.adapter.runSync = (sql, ...params) => { if (sql.includes("rewards-v1")) throw new Error("disk full"); return run(sql, ...params); };
    c.answer(null, null);
    assert.ok(c.error); assert.equal(c.history().length, 0); assert.equal(c.latestAwards.length, 0);
    assert.equal(env.store.pending()?.stage, "post");
    env.adapter.runSync = run; c.retry();
    assert.equal(c.error, null); assert.equal(c.history().length, 1);
    assert.equal(c.rewards().badges.filter(b => b.id === "sessions-1").length, 1);
  } finally { env.db.close(); }
});

test("weekly goals count distinct local days and freeze the target for an active week", () => {
  const env = setup();
  try {
    const c = env.controller(); c.updateExperience({ weeklyGoal: 2 });
    const monday = new Date(2026, 8, 14, 12).getTime();
    env.now(monday + 60000);
    c.addManualSession({ goal: "Calm", startedAt: monday, durationMs: 1000 });
    c.addManualSession({ goal: "Calm", startedAt: monday + 10000, durationMs: 1000 });
    let weekly = weeklyPractice(c.history(), c.rewards(), 2, new Date(monday));
    assert.equal(weekly.count, 1); assert.equal(weekly.goal, 2);
    c.updateExperience({ weeklyGoal: 7 });
    const tuesday = new Date(2026, 8, 15, 12).getTime(); env.now(tuesday + 60000);
    c.addManualSession({ goal: "Focus", startedAt: tuesday, durationMs: 1000 });
    weekly = weeklyPractice(c.history(), c.rewards(), 7, new Date(tuesday + 60000));
    assert.equal(weekly.count, 2); assert.equal(weekly.goal, 2);
    assert.ok(c.latestAwards.some(b => b.id.startsWith("week-")));
    const nextMonday = new Date(2026, 8, 21, 12).getTime(); env.now(nextMonday + 60000);
    c.addManualSession({ goal: "Calm", startedAt: nextMonday, durationMs: 1000 });
    assert.equal(weeklyPractice(c.history(), c.rewards(), 7, new Date(nextMonday + 60000)).goal, 7);
  } finally { env.db.close(); }
});

test("manual logs persist across controllers without replacing an active session and refresh/delete correctly", () => {
  const env = setup();
  try {
    env.now(10000000);
    const c = env.controller(); c.start(7);
    const active = c.current?.id;
    assert.deepEqual(c.history(), []);
    const id = c.addManualSession({ goal: "Focus", durationMs: 7200000, startedAt: 1000 });
    assert.ok(id); assert.equal(c.current?.id, active);
    const other = env.controller();
    assert.equal(other.history()[0].source, "manual"); assert.equal(other.history()[0].engine.elapsedAtAnchor, 7200000);
    assert.equal(other.current?.id, active);
    assert.equal(c.history().length, 1);
    other.remove(id); assert.equal(c.history().length, 1);
    c.refreshHistory(); assert.equal(c.history().length, 0);
  } finally { env.db.close(); }
});

test("failed manual writes can retry and resubmit without duplicating a log", () => {
  const env = setup();
  try {
    env.now(100000);
    const c = env.controller();
    const run = env.adapter.runSync;
    env.adapter.runSync = () => { throw new Error("disk full"); };
    const input = { goal: "Calm" as const, startedAt: 1000, durationMs: 60000 };
    assert.equal(c.addManualSession(input, "manual-draft"), null);
    assert.ok(c.error); assert.equal(c.history().length, 0);
    env.adapter.runSync = run;
    c.retry(); assert.equal(c.error, null);
    assert.equal(c.addManualSession(input, "manual-draft"), "manual-draft");
    assert.equal(env.controller().history().length, 1);
  } finally { env.db.close(); }
});

test("failed history deletion retains its retry even when another delete, clear or refresh is requested", () => {
  const env = setup();
  try {
    env.now(100000);
    const c = env.controller();
    const first = c.addManualSession({ goal: "Calm", startedAt: 1000, durationMs: 1000 })!;
    const second = c.addManualSession({ goal: "Focus", startedAt: 3000, durationMs: 1000 })!;
    const run = env.adapter.runSync;
    env.adapter.runSync = () => { throw new Error("disk full"); };
    c.remove(first);
    assert.ok(c.error);
    assert.equal(c.history().length, 2);
    c.remove(second);
    c.clearHistory();
    assert.equal(c.refreshHistory(), false);
    assert.ok(c.error);
    env.adapter.runSync = run;
    c.retry();
    assert.equal(c.error, null);
    assert.deepEqual(env.controller().history().map(r => r.id), [second]);
  } finally { env.db.close(); }
});

test("cyclic rituals require fresh confirmation and shortened holds persist through a cold launch", () => {
  const env = setup();
  try {
    const p = protocols.find(p => p.id === "high-intensity-cyclic")!;
    const c = env.controller();
    assert.equal(c.saveRitual("My breathing rounds", p, 1), true);
    const reopened = env.controller();
    const id = experienceFor(reopened.preferences).rituals[0].id;
    assert.equal(reopened.startRitual(id), false);
    assert.equal(reopened.startRitual(id, true), true);
    env.now(131000);
    reopened.releaseHold();
    assert.equal(reopened.view()?.sessionElapsedMs, 130000);
    const resumed = env.controller();
    assert.equal(resumed.current?.safetyConfirmed, true);
    assert.equal(resumed.view()?.phase.type, "inhale");
    resumed.resume();
    env.now(167000);
    resumed.tick();
    assert.equal(resumed.current?.stage, "post");
    resumed.answer(null, null);
    assert.equal(env.controller().history()[0].engine.elapsedAtAnchor, 166000);
    const replay = env.controller();
    replay.start(null, 1, replay.history()[0].protocol!);
    assert.equal(replay.current, null);
    replay.start(null, 1, replay.history()[0].protocol!, true);
    assert.equal(replay.view()?.sessionRemainingMs, 216000);
  } finally { env.db.close(); }
});

test("vibration style survives a cold launch and legacy preferences remain usable", () => {
  const env = setup();
  try {
    const c = env.controller();
    assert.equal(c.preferences.hapticMode, undefined);
    c.setPreferences({ ...c.preferences, haptics: true, hapticMode: "rhythm" });
    assert.equal(env.controller().preferences.hapticMode, "rhythm");
    c.setPreferences({ ...c.preferences, haptics: false, hapticMode: "transitions" });
    const reopened = env.controller();
    assert.equal(reopened.preferences.hapticMode, "transitions");
    assert.equal(reopened.preferences.haptics, false);
  } finally { env.db.close(); }
});

for (const protocol of protocols.filter((p) => p.availability === "enabled")) {
  test(`${protocol.name}: offline completion, post recovery and durable history`, () => {
    const env = setup();
    try {
      const c = env.controller();
      c.start(7, protocol.defaultCycles, protocol, protocol.safetyCategory === "highIntensity");
      assert.equal(c.current?.protocolId, protocol.id);
      env.now(1000 + engine.totalDuration(planFor(protocol)));
      c.tick();
      assert.equal(c.current?.stage, "post");
      const recovered = env.controller();
      assert.equal(recovered.current?.stage, "post");
      recovered.answer(3, null);
      const saved = env.controller().history()[0];
      assert.equal(saved.protocolId, protocol.id);
      assert.equal(stateShift(saved.pre, saved.post), 4);
      assert.equal(saved.engine.elapsedAtAnchor, engine.totalDuration(planFor(protocol)));
    } finally { env.db.close(); }
  });
}
test("custom mix history preserves replay data after a cold launch", () => {
  const env = setup();
  const mix = makeMixProtocol([protocols[2], protocols[0]]);
  const c = env.controller();
  c.start(null, 2, mix);
  env.now(2000);
  c.end("ended");
  const saved = env.controller().history()[0];
  assert.equal(saved.protocol?.defaultCycles, 2);
  assert.deepEqual(planFor(saved.protocol!), saved.engine.plan);
  env.db.close();
});

test("version 1 upgrades preserve history, settings and an interrupted session", () => {
  const env = setup(), c = env.controller();
  c.start(7); c.end("ended"); c.start(3);
  c.toggleFavorite("box");
  env.db.exec("DROP TABLE routines; PRAGMA user_version=1");
  const migrated = new LocalStore(env.adapter);
  assert.equal(migrated.history().length, 1);
  assert.equal(migrated.pending()?.pre, 3);
  assert.deepEqual(migrated.preferences().favoriteProtocolIds, ["box"]);
  assert.deepEqual(migrated.routines(), []);
  assert.equal(env.db.prepare("PRAGMA user_version").get()?.user_version, 2);
  env.db.close();
});

test("saved routines survive reload, edit, duplicate and delete independently of sessions", () => {
  const env = setup(), c = env.controller();
  const id = c.saveRoutine(protocols[0], "pattern")!;
  const mix = makeMixProtocol([protocols[2], protocols[0]]);
  c.saveRoutine(mix, "mix");
  const entitlements = new EntitlementService(true);
  const reloaded = env.controller(entitlements);
  assert.equal(reloaded.routines().length, 2);
  const saved = reloaded.routines().find((r) => r.id === id)!;
  reloaded.start(null, 1, saved.protocol);
  reloaded.saveRoutine({ ...saved.protocol, name: "Edited name" }, "pattern", id);
  assert.notEqual(reloaded.current?.protocolName, "Edited name");
  assert.equal(reloaded.duplicateRoutine(saved), null);
  entitlements.simulate("active");
  assert.ok(reloaded.duplicateRoutine(saved));
  reloaded.removeRoutine(id);
  assert.equal(env.controller().routines().length, 2);
  assert.equal(env.controller().current?.protocolId, id);
  env.db.close();
});

test("downgrade preserves over-limit routines and a failed write retry cannot bypass Free quota", () => {
  const env = setup();
  const e = new EntitlementService(true);
  e.simulate("active");
  const c = env.controller(e);
  c.saveRoutine(protocols[0], "pattern", "one");
  c.saveRoutine(protocols[1], "pattern", "two");
  const original = env.adapter.runSync;
  env.adapter.runSync = () => { throw new Error("disk full"); };
  c.saveRoutine(protocols[2], "pattern", "three");
  e.simulate("free");
  env.adapter.runSync = original;
  c.retry();
  assert.equal(c.routines().length, 2);
  assert.equal(c.error, null);
  assert.match(c.routineNotice!, /Free includes/);
  assert.equal(c.saveRoutine(protocols[2], "pattern", "one"), "one");
  c.start(null, 1, c.routines()[0].protocol);
  assert.equal(c.current?.stage, "active");
  assert.equal(c.removeRoutine("two"), true);
  assert.equal(c.routines().length, 1);
  env.db.close();
});

test("failed routine writes retry without duplicate records", () => {
  const env = setup(), c = env.controller();
  const original = env.adapter.runSync;
  env.adapter.runSync = () => { throw new Error("disk full"); };
  assert.equal(c.saveRoutine(protocols[0], "pattern", "stable-id"), null);
  assert.ok(c.error);
  env.adapter.runSync = original;
  c.retry(); c.retry();
  assert.equal(c.error, null);
  assert.equal(c.routines().length, 1);
  env.db.close();
});

test("full local reset removes history, active session, settings and routines", () => {
  const env = setup(), c = env.controller();
  c.start(7); c.end("ended"); c.start(3);
  c.saveRoutine(protocols[0], "pattern"); c.toggleFavorite("box");
  assert.equal(c.resetLocalData(), true);
  const fresh = env.controller();
  assert.equal(fresh.current, null);
  assert.deepEqual(fresh.routines(), []);
  assert.deepEqual(fresh.history(), []);
  assert.equal(fresh.isFavorite("box"), false);
  assert.equal(fresh.preferences.onboardingComplete, false);
  env.db.close();
});

test("offline slice survives relaunch at active, post and result stages", () => {
  const env = setup();
  let c = env.controller();
  c.start(7);
  env.now(11000);
  c.tick();
  c = env.controller();
  assert.equal(c.current?.engine.status, "paused");
  assert.equal(c.view()?.sessionElapsedMs, 10000);
  env.now(100000);
  c.resume();
  env.now(138000);
  c.tick();
  assert.equal(c.current?.stage, "post");
  assert.equal(c.current?.post, null);
  assert.equal(c.history().length, 0);
  c = env.controller();
  assert.equal(c.current?.stage, "post");
  c.answer(3, "Calmer");
  c.answer(1, null);
  assert.equal(c.history().length, 1);
  assert.equal(c.history()[0].pre, 7);
  assert.equal(c.history()[0].post, 3);
  assert.equal(stateShift(c.history()[0].pre, c.history()[0].post), 4);
  c = env.controller();
  assert.equal(c.current, null);
  assert.equal(c.history().length, 1);
  env.db.close();
});
test("skip, negative shift, unchanged and early ends never invent ratings", () => {
  for (const [pre, post, shift] of [
    [null, 3, null],
    [7, null, null],
    [null, null, null],
    [3, 7, -4],
    [5, 5, 0],
  ] as const) {
    const env = setup();
    const c = env.controller();
    c.start(pre);
    env.now(49000);
    c.tick();
    c.answer(post, null);
    assert.equal(stateShift(c.history()[0].pre, c.history()[0].post), shift);
    env.db.close();
  }
  const env = setup();
  const c = env.controller();
  c.start(5);
  env.now(2100);
  c.end("unwell");
  assert.equal(c.history()[0].post, null);
  assert.equal(c.history()[0].engine.status, "ended");
  env.db.close();
});
test("double taps and repeated completion do not duplicate history", () => {
  const env = setup();
  const c = env.controller();
  c.start(5);
  c.start(7);
  assert.equal(c.current?.pre, 5);
  env.now(49000);
  for (let n = 0; n < 10; n++) c.tick();
  c.answer(2, null);
  for (let n = 0; n < 10; n++) c.tick();
  assert.equal(c.history().length, 1);
  env.db.close();
});
test("preferences/deletion persist; only one pending record is allowed", () => {
  const env = setup();
  const c = env.controller();
  c.setPreferences({ audio: "silent", haptics: false, keepAwake: false });
  assert.equal(env.controller().preferences.audio, "silent");
  c.start(1);
  assert.throws(() => env.store.save({ ...c.current!, id: "another" }));
  c.end("ended");
  c.remove(c.history()[0].id);
  assert.equal(env.controller().history().length, 0);
  assert.equal(c.current, null);
  env.db.close();
});
test("disk failure pauses safely and retry preserves timing", () => {
  const env = setup();
  const c = env.controller();
  c.start(7);
  const original = env.adapter.runSync;
  env.adapter.runSync = () => {
    throw new Error("disk full");
  };
  env.now(2500);
  c.tick();
  assert.equal(c.current?.engine.status, "paused");
  assert.ok(c.error);
  c.resume();
  assert.equal(c.current?.engine.status, "paused");
  env.adapter.runSync = original;
  c.retry();
  assert.equal(c.error, null);
  c.resume();
  assert.equal(c.current?.engine.status, "running");
  env.db.close();
});
test("newer schemas and malformed records are preserved", () => {
  const env = setup();
  env.db.exec("PRAGMA user_version=3");
  assert.throws(() => new LocalStore(env.adapter));
  env.db.exec("PRAGMA user_version=1");
  env.db
    .prepare("INSERT INTO sessions VALUES ('bad','active',0,?)")
    .run("{bad-json");
  assert.throws(() => env.controller());
  assert.equal(
    env.db.prepare("SELECT COUNT(*) AS n FROM sessions").get()?.n,
    1,
  );
  env.db.close();
});

test("settings cannot dismiss a failed result save or replace the pending result", () => {
  const env = setup();
  const c = env.controller();
  c.start(7);
  env.now(49000);
  c.tick();
  const run = env.adapter.runSync;
  env.adapter.runSync = (sql, ...args) => {
    if (sql.startsWith("INSERT INTO sessions")) throw new Error("disk full");
    return run(sql, ...args);
  };
  c.answer(3, "Calmer");
  const id = c.current!.id;
  c.setPreferences({ audio: "silent", haptics: false, keepAwake: false });
  assert.ok(c.error);
  c.start(null);
  c.remove(id);
  assert.equal(c.current?.id, id);
  assert.equal(c.current?.post, 3);
  env.adapter.runSync = run;
  c.retry();
  assert.equal(c.error, null);
  assert.equal(env.controller().history()[0].post, 3);
  env.db.close();
});

test("retry settings saves the user's attempted preference, not the previous value", () => {
  const env = setup();
  const c = env.controller();
  const run = env.adapter.runSync;
  env.adapter.runSync = () => {
    throw new Error("disk full");
  };
  c.setPreferences({ audio: "voice", haptics: false, keepAwake: false });
  assert.ok(c.error);
  assert.equal(c.preferences.audio, "tones");
  env.adapter.runSync = run;
  c.retry();
  assert.equal(c.error, null);
  assert.equal(env.controller().preferences.audio, "voice");
  env.db.close();
});

test("completion time is identical for a late tick and a late interruption", () => {
  for (const finish of ["tick", "pause"] as const) {
    const env = setup();
    const c = env.controller();
    c.start(null);
    env.now(100000);
    c[finish]();
    assert.equal(c.current?.finishedAt, 49000);
    assert.equal(c.current?.stage, "post");
    env.db.close();
  }
});

test("recovering a durable completed engine opens the unanswered post rating", () => {
  const env = setup();
  const c = env.controller();
  c.start(7);
  const saved = {
    ...c.current!,
    engine: engine.checkpoint(c.current!.engine, 49000),
  };
  env.store.save(saved);
  env.now(100000);
  const recovered = env.controller();
  assert.equal(recovered.current?.stage, "post");
  assert.equal(recovered.current?.finishedAt, 49000);
  assert.equal(recovered.current?.post, null);
  env.db.close();
});

test("history is not reread on every timer render and invalidates after new results", () => {
  const env = setup();
  const c = env.controller();
  let reads = 0;
  const read = env.store.history.bind(env.store);
  env.store.history = () => {
    reads++;
    return read();
  };
  c.start(null);
  for (let i = 0; i < 10; i++) {
    env.now(1000 + i * 100);
    c.tick();
    c.history();
  }
  assert.equal(reads, 1);
  c.end("ended");
  assert.equal(c.history().length, 1);
  assert.equal(reads, 3); // Result persistence also reconciles earned rewards once.
  for (let i = 0; i < 10; i++) { c.history(); c.rewards(); }
  assert.equal(reads, 3);
  c.remove(c.history()[0].id);
  assert.equal(c.history().length, 0);
  assert.equal(reads, 4);
  env.db.close();
});


test("language choice survives cold launch without changing practice data; legacy preferences default to English", () => {
  const env = setup();
  try {
    const c = env.controller();
    assert.equal(c.preferences.language, "en");
    c.updateExperience({ name: "Focus", bio: "Sleep", intention: "A moment for myself" });
    c.start(7); env.now(48000 + 1000); c.tick(); c.answer(4, null);
    const history = JSON.stringify(c.history());
    for (const language of ["es", "pt", "en"] as const) {
      c.setPreferences({ ...c.preferences, language });
      const reopened = env.controller();
      assert.equal(reopened.preferences.language, language);
      assert.equal(experienceFor(reopened.preferences).name, "Focus");
      assert.equal(JSON.stringify(reopened.history()), history);
    }
    const { language, ...legacy } = c.preferences;
    env.store.savePreferences(legacy);
    assert.equal(env.controller().preferences.language, "en");
  } finally { env.db.close(); }
});


test("failed language saves keep the current choice and retry persists the requested language", () => {
  const env = setup();
  try {
    const c = env.controller();
    const save = env.store.savePreferences.bind(env.store);
    env.store.savePreferences = () => { throw new Error("disk full"); };
    c.setPreferences({ ...c.preferences, language: "pt" });
    assert.equal(c.preferences.language, "en");
    assert.ok(c.error);
    env.store.savePreferences = save;
    c.retry();
    assert.equal(c.preferences.language, "pt");
    assert.equal(env.controller().preferences.language, "pt");
    c.setPreferences({ ...c.preferences, language: "en" });
  } finally { env.db.close(); }
});

test("theme choices survive reload, default to system for old settings, and preserve an active practice", () => {
  const env = setup();
  try {
    const c = env.controller();
    assert.equal(c.preferences.theme, "system");
    c.start(5);
    const activeId = c.current!.id;
    for (const theme of ["light", "dark", "system"] as const) {
      c.setPreferences({ ...c.preferences, theme });
      assert.equal(env.store.preferences().theme, theme);
      assert.equal(c.current!.id, activeId);
      assert.equal(c.current!.engine.status, "running");
    }
    assert.equal(env.controller().preferences.theme, "system");
    const { theme, ...legacy } = c.preferences;
    env.store.savePreferences(legacy);
    assert.equal(env.store.preferences().theme, "system");
    env.db.prepare("UPDATE settings SET payload=? WHERE key='preferences'").run(JSON.stringify({ ...legacy, theme: "invalid" }));
    assert.equal(env.store.preferences().theme, "system");
  } finally { env.db.close(); }
});

test("failed theme persistence retains the visible choice and can retry", () => {
  const env = setup();
  try {
    const c = env.controller();
    const save = env.store.savePreferences.bind(env.store);
    env.store.savePreferences = () => { throw new Error("disk full"); };
    c.setPreferences({ ...c.preferences, theme: "light" });
    assert.equal(c.preferences.theme, "system");
    assert.ok(c.error);
    env.store.savePreferences = save;
    c.retry();
    assert.equal(c.preferences.theme, "light");
    assert.equal(env.controller().preferences.theme, "light");
  } finally { env.db.close(); }
});


test("measurement emits event names once after durable results and never includes personal values", () => {
  const env = setup(); const events: ProductEvent[] = [];
  try {
    let now = 1000;
    const controller = new SessionController(env.store, () => now, () => "private-id", undefined, new AnalyticsService({ record: event => events.push(event) }));
    controller.setPreferences({ ...controller.preferences, onboardingComplete: true });
    controller.setPreferences({ ...controller.preferences, onboardingComplete: true });
    controller.start(7, 1);
    now += engine.totalDuration(controller.current!.engine.plan); controller.tick(); controller.tick();
    assert.equal(events.includes("protocol_completed"), false);
    const save = env.store.save.bind(env.store); env.store.save = () => { throw Error("Disk full"); };
    controller.answer(4, "private report");
    assert.equal(events.includes("protocol_completed"), false);
    env.store.save = save; controller.retry(); controller.retry();
    assert.deepEqual(events, ["onboarding_completed", "protocol_started", "state_shift_pre_recorded", "protocol_completed", "state_shift_post_recorded"]);
    assert.equal(JSON.stringify(events).includes("private"), false);
  } finally { env.db.close(); }
});

test("reminder settings survive a cold launch and are removed by full local reset", () => {
  const env = setup();
  try {
    env.store.writeReminders([{ id: "a", label: "Quiet moment", hour: 22, minute: 15, weekdays: [1, 3], enabled: true }]);
    assert.equal(new LocalStore(env.adapter).readReminders()[0].hour, 22);
    const controller = env.controller(); let invalidated = false;
    controller.onLocalDataReset = () => { invalidated = true; };
    assert.equal(controller.resetLocalData(), true); assert.equal(invalidated, true);
    assert.deepEqual(env.store.readReminders(), []);
  } finally { env.db.close(); }
});
