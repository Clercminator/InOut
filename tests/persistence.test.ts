import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { LocalStore, type Database } from "../apps/mobile/src/storage";
import { SessionController } from "../apps/mobile/src/session-controller";
import { stateShift } from "../packages/shared-types/src/index";
import * as engine from "../packages/breathing-engine/src/index";
import { makeMixProtocol } from "../apps/mobile/src/custom-protocol";
import { protocols, planFor } from "../packages/protocols/src/index";
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
    controller: () =>
      new SessionController(
        store,
        () => now,
        () => String(++id),
      ),
  };
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
  const reloaded = env.controller();
  assert.equal(reloaded.routines().length, 2);
  const saved = reloaded.routines().find((r) => r.id === id)!;
  reloaded.start(null, 1, saved.protocol);
  reloaded.saveRoutine({ ...saved.protocol, name: "Edited name" }, "pattern", id);
  assert.notEqual(reloaded.current?.protocolName, "Edited name");
  reloaded.duplicateRoutine(saved);
  reloaded.removeRoutine(id);
  assert.equal(env.controller().routines().length, 2);
  assert.equal(env.controller().current?.protocolId, id);
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
  assert.equal(reads, 2);
  c.remove(c.history()[0].id);
  assert.equal(c.history().length, 0);
  assert.equal(reads, 3);
  env.db.close();
});
