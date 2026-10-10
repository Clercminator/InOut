import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { protocols, planFor } from "../packages/protocols/src/index";
import * as engine from "../packages/breathing-engine/src/index";
import type { SessionRecord } from "../packages/shared-types/src/index";
import { challengeCatalog, enrollChallenge, reconcileChallenges, challengeExpired, validateChallenges } from "../apps/mobile/src/challenges";
import { challengeShareData } from "../apps/mobile/src/challenge-share";
import { LocalStore, type Database } from "../apps/mobile/src/storage";
import { SessionController } from "../apps/mobile/src/session-controller";
import { EntitlementService } from "../apps/mobile/src/entitlements";
import { AnalyticsService, type ProductEvent } from "../apps/mobile/src/analytics";
import { productConfig } from "../apps/mobile/src/product-config";
import { setLanguage, t } from "../apps/mobile/src/i18n";
process.env.TZ = "America/Santiago";
const start = new Date(2026, 8, 1, 12).getTime();
function record(id: string, protocolId: string, at: number, overrides: Partial<SessionRecord> = {}): SessionRecord {
  const protocol = protocols.find(p => p.id === protocolId)!;
  const plan = planFor(protocol), elapsed = engine.totalDuration(plan);
  return { id, protocolId, protocolName: protocol.name, protocolVersion: protocol.version, protocol, goal: protocol.goalTags[0], engine: engine.checkpoint(engine.start(plan, at), at + elapsed), stage: "result", finishedAt: at + elapsed, endReason: "completed", pre: null, post: null, effect: null, ...overrides };
}
function fixture() {
  const db = new DatabaseSync(":memory:");
  const adapter: Database = { execSync: sql => db.exec(sql), runSync: (sql, ...p) => db.prepare(sql).run(...p), getAllSync: <T>(sql: string, ...p: any[]) => db.prepare(sql).all(...p) as T[], getFirstSync: <T>(sql: string, ...p: any[]) => (db.prepare(sql).get(...p) as T) ?? null, withTransactionSync: action => { db.exec("begin"); try { action(); db.exec("commit"); } catch (e) { db.exec("rollback"); throw e; } } };
  return { db, adapter, store: new LocalStore(adapter) };
}
test("enrollment is idempotent, starts empty and ignores pre-enrollment sessions", () => {
  let states = enrollChallenge("first-breath", [], false, start);
  assert.deepEqual(enrollChallenge("first-breath", states, false, start + 100), states);
  states = reconcileChallenges(states, [record("old", "diaphragmatic", start - 1000)], false, start + 1e6);
  assert.equal(states[0].progress, 0);
  assert.throws(() => enrollChallenge("missing", [], false, start));
});
test("sequence, session deduplication, completion and badges are persisted atomically", () => {
  const f = fixture(); try {
    f.store.enrollChallenge("first-breath", false, start);
    f.store.save(record("wrong", "coherent", start + 1000));
    assert.equal(f.store.challenges()[0].progress, 0);
    ["diaphragmatic", "extended-exhale", "coherent"].forEach((p, i) => { const r = record(`p${i}`, p, start + (i + 1) * 600000); f.store.save(r); f.store.save(r); });
    const state = f.store.challenges()[0]; assert.equal(state.progress, 3); assert.equal(state.status, "completed");
    assert.equal(f.store.rewards().badges.filter(b => b.id === "challenge-first-breath").length, 1);
    f.store.acknowledgeChallenge("first-breath");
    f.store.clearHistory(); const reopened = new LocalStore(f.adapter);
    assert.equal(reopened.challenges()[0].celebrationSeen, true); assert.equal(reopened.challenges()[0].progress, 3);
    assert.ok(reopened.rewards().badges.some(b => b.id === "challenge-first-breath"));
    reopened.reset(); assert.deepEqual(reopened.challenges(), []);
  } finally { f.db.close(); }
});
test("calendar-day credit follows local completion, deduplicates days, and freezes dates across timezone changes", () => {
  const timezone = process.env.TZ;
  try {
    process.env.TZ = "America/Santiago";
    const at = new Date("2026-09-02T03:57:00Z").getTime(); // 23:57 local before September DST switch
    let states = enrollChallenge("seven-day-calm", [], false, at - 1000);
    const a = record("a", "extended-exhale", at), b = record("b", "extended-exhale", at + 180000);
    states = reconcileChallenges(states, [a, b, record("same-day", "coherent", at + 600000)], false, at + 1e6);
    assert.equal(states[0].progress, 2);
    assert.deepEqual(states[0].completedSteps.map(s => s.localDay), ["2026-09-01", "2026-09-02"]);
    process.env.TZ = "Asia/Tokyo";
    assert.deepEqual(reconcileChallenges(states, [a, b], false, at + 1e6), states);
  } finally { if (timezone === undefined) delete process.env.TZ; else process.env.TZ = timezone; }
});
test("daily challenges allow rest days; explorer requires unique built-in gentle protocols", () => {
  let days = enrollChallenge("seven-day-calm", [], false, start);
  const sessions = Array.from({ length: 7 }, (_, i) => record(`day-${i}`, "extended-exhale", new Date(2026, 8, 1 + i * 2, 13).getTime()));
  days = reconcileChallenges(days, sessions, false, start + 20 * 86400000); assert.equal(days[0].status, "completed");
  let explorer = enrollChallenge("breath-explorer", [], false, start);
  explorer = reconcileChallenges(explorer, [record("a", "coherent", start), record("b", "coherent", start + 600000), record("manual", "box", start + 1200000, { source: "manual" }), record("high", "high-intensity-cyclic", start + 1800000)], false, start + 1e7);
  assert.equal(explorer[0].progress, 1);
  explorer = reconcileChallenges(explorer, ["diaphragmatic", "extended-exhale", "box", "equal"].map((p, i) => record(p, p, start + (i + 5) * 600000)), false, start + 1e7);
  assert.equal(explorer[0].status, "completed");
});
test("partial, unwell, too short, future and overlapping sessions cannot generate challenge credit", () => {
  const states = enrollChallenge("breath-explorer", [], false, start);
  const a = record("a", "coherent", start);
  const short = record("short", "box", start + 600000); short.engine.elapsedAtAnchor = 500;
  const result = reconcileChallenges(states, [a, record("overlap", "box", start + 1000), short, record("partial", "equal", start + 1200000, { endReason: "ended" }), record("unwell", "equal", start + 1800000, { endReason: "unwell" }), record("future", "equal", start + 1e8)], false, start + 1e7);
  assert.equal(result[0].progress, 1);
});
test("Consistency uses local dates including DST and permits a fresh attempt after its window", () => {
  const zone = process.env.TZ; process.env.TZ = "America/Santiago";
  try {
    const at = new Date(2026, 8, 1, 23).getTime(); let states = enrollChallenge("consistency", [], true, at); states[0].definitionVersion = 1;
    const last = new Date(2026, 8, 21, 23).getTime(), expired = new Date(2026, 8, 22, 0).getTime();
    assert.equal(challengeExpired(challengeCatalog().find(d => d.id === "consistency")!, states[0], last), false);
    states = reconcileChallenges(states, [record("last", "coherent", last - 600000), record("late", "coherent", expired)], true, expired + 600000);
    assert.equal(states[0].progress, 1);
    assert.equal(challengeExpired(challengeCatalog().find(d => d.id === "consistency")!, states[0], expired), true);
    assert.equal(enrollChallenge("consistency", states, true, expired)[0].progress, 0);
  } finally { if (zone === undefined) delete process.env.TZ; else process.env.TZ = zone; }
});
test("central reviewer entitlement and configurable Pro gates govern enrollment and progress", () => {
  const f = fixture(); try {
    const entitlement = new EntitlementService(false, () => start);
    const events: ProductEvent[] = [];
    const c = new SessionController(f.store, () => start, () => "id", entitlement, new AnalyticsService({ record: e => events.push(e) }));
    assert.equal(c.enrollChallenge("focus-week"), false);
    entitlement.acceptReviewerGrant({ verifiedAt: start, expiresAt: start + 3600000 });
    assert.equal(c.enrollChallenge("focus-week"), true);
    assert.ok(events.includes("challenge_started"));
    const locked = reconcileChallenges(c.challenges(), [record("no-pro", "box", start)], false, start + 1e6); assert.equal(locked[0].progress, 0);
    assert.equal(reconcileChallenges(locked, [record("no-pro", "box", start)], true, start + 1e6)[0].progress, 0);
    f.store.save(record("pro", "box", start), true); assert.equal(f.store.challenges()[0].progress, 1);
    const previous = productConfig.proChallengeIds;
    try { productConfig.proChallengeIds = []; assert.equal(enrollChallenge("sleep-reset", [], false, start).length, 1); } finally { productConfig.proChallengeIds = previous; }
  } finally { f.db.close(); }
});
test("upgrade preserves existing sessions and preferences while challenge state starts empty", () => {
  const f = fixture(); try {
    f.store.save(record("old", "coherent", start)); f.store.savePreferences({ ...f.store.preferences(), language: "es" });
    const upgraded = new LocalStore(f.adapter); assert.deepEqual(upgraded.challenges(), []); assert.equal(upgraded.history().length, 1); assert.equal(upgraded.preferences().language, "es");
    f.db.prepare("INSERT OR REPLACE INTO settings VALUES('challenges-v1',?)").run('{"broken":true}');
    assert.throws(() => upgraded.challenges(), /preserved/); assert.equal(upgraded.history().length, 1);
  } finally { f.db.close(); }
});
test("challenge share formats expose only earned summary data and localize catalog content", () => {
  const d = challengeCatalog().find(d => d.id === "first-breath")!;
  let states = enrollChallenge(d.id, [], false, start);
  assert.equal(challengeShareData(d, states[0], true), null);
  states = reconcileChallenges(states, d.recommendedProtocolIds.map((id, i) => record(id, id, start + i * 600000, { note: "PRIVATE", pre: 8, post: 3 })), false, start + 1e7);
  const card = challengeShareData(d, states[0], true)!;
  assert.equal(card.width, 1080); assert.equal(card.height, 1920); assert.equal(challengeShareData(d, states[0], false)!.height, 1080);
  assert.doesNotMatch(JSON.stringify(card), /PRIVATE|pre|post|photo|name/);
  for (const language of ["es", "pt"] as const) {
    setLanguage(language);
    for (const definition of challengeCatalog()) for (const text of [definition.title, definition.description, definition.time, definition.whatCounts]) assert.notEqual(t(text), text, `${language}: ${text}`);
  }
  setLanguage("en"); validateChallenges(states); assert.throws(() => validateChallenges([{ ...states[0], progress: 99 }]));
});

test("real session completion updates challenges, awards once and emits only allowlisted lifecycle events", () => {
  const f = fixture(); let at = start, id = 0; const events: ProductEvent[] = [];
  try {
    const c = new SessionController(f.store, () => at, () => `real-${++id}`, new EntitlementService(false, () => at), new AnalyticsService({ record: e => events.push(e) }));
    assert.equal(c.enrollChallenge("first-breath"), true);
    for (const pid of ["diaphragmatic", "extended-exhale", "coherent"]) {
      const p = protocols.find(p => p.id === pid)!;
      c.start(null, undefined, p); at += engine.totalDuration(planFor(p)); c.tick();
      assert.equal(c.current?.stage, "post"); c.answer(null, null); assert.equal(c.error, null); at += 1000;
    }
    assert.equal(c.challenges()[0].status, "completed");
    assert.equal(c.rewards().badges.filter(b => b.id === "challenge-first-breath").length, 1);
    assert.equal(events.filter(e => e === "challenge_progressed").length, 3);
    assert.equal(events.filter(e => e === "challenge_completed").length, 1);
    c.retry(); c.answer(null, null);
    assert.equal(events.filter(e => e === "challenge_completed").length, 1);
  } finally { f.db.close(); }
});

test("completion day survives a restart and timezone change before the optional reflection", () => {
  const f = fixture(); const timezone = process.env.TZ; let at = new Date("2026-09-02T03:55:00Z").getTime();
  try {
    process.env.TZ = "America/Santiago";
    const c = new SessionController(f.store, () => at, () => "travel"); c.enrollChallenge("seven-day-calm");
    const p = protocols.find(p => p.id === "extended-exhale")!;
    c.start(null, undefined, p); at += p.defaultDuration; c.tick();
    assert.equal(c.current?.completionLocalDay, "2026-09-01");
    process.env.TZ = "Asia/Tokyo";
    const reopened = new SessionController(f.store, () => at, () => "next"); reopened.answer(null, null);
    assert.equal(reopened.challenges()[0].completedSteps[0].localDay, "2026-09-01");
  } finally { f.db.close(); process.env.TZ = timezone; }
});

test("failed completion writes roll back session, challenge credit and badge together before retry", () => {
  const f = fixture(); try {
    f.store.enrollChallenge("first-breath", false, start);
    f.store.save(record("one", "diaphragmatic", start)); f.store.save(record("two", "extended-exhale", start + 600000));
    const run = f.adapter.runSync; let fail = true;
    f.adapter.runSync = (sql, ...params) => { if (fail && sql.includes("'rewards-v1'") && String(params[0]).includes("challenge-first-breath")) { fail = false; throw Error("disk full"); } return run(sql, ...params); };
    const last = record("three", "coherent", start + 1200000);
    assert.throws(() => f.store.save(last), /disk full/);
    assert.equal(f.store.challenges()[0].progress, 2); assert.equal(f.store.history().length, 2);
    assert.equal(f.store.rewards().badges.some(b => b.id === "challenge-first-breath"), false);
    f.store.save(last); assert.equal(f.store.challenges()[0].status, "completed");
    assert.equal(f.store.rewards().badges.filter(b => b.id === "challenge-first-breath").length, 1);
  } finally { f.db.close(); }
});
