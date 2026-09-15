import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { LocalStore, type Database } from "../apps/mobile/src/storage";
import { SessionController } from "../apps/mobile/src/session-controller";
import { stateShift } from "../packages/shared-types/src/index";
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
  env.db.exec("PRAGMA user_version=2");
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
