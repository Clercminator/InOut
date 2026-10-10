import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { LocalStore, type Database } from "../apps/mobile/src/storage";
import { SessionController } from "../apps/mobile/src/session-controller";
import { EntitlementService } from "../apps/mobile/src/entitlements";
import { personalBest, attemptComparison, emptyTestStore, selectDaily, testCatalog, validateTestStore, type ChallengeAttempt } from "../apps/mobile/src/challenge-tests";
import { challengeCatalog, definitionForState, enrollChallenge, challengeExpired, reconcileChallenges } from "../apps/mobile/src/challenges";
import { attemptShareData } from "../apps/mobile/src/challenge-share";
import { productConfig } from "../apps/mobile/src/product-config";
import { setLanguage, t } from "../apps/mobile/src/i18n";
import { AnalyticsService, type ProductEvent } from "../apps/mobile/src/analytics";
import { protocols } from "../packages/protocols/src/index";
const start = new Date(2026, 8, 1, 12).getTime();
function fixture() {
  const db = new DatabaseSync(":memory:"); let now = start, id = 0;
  const adapter: Database = { execSync: sql => db.exec(sql), runSync: (sql, ...p) => db.prepare(sql).run(...p), getAllSync: <T>(sql: string, ...p: any[]) => db.prepare(sql).all(...p) as T[], getFirstSync: <T>(sql: string, ...p: any[]) => (db.prepare(sql).get(...p) as T) ?? null, withTransactionSync: action => { db.exec("begin"); try { action(); db.exec("commit"); } catch (e) { db.exec("rollback"); throw e; } } };
  const store = new LocalStore(adapter), entitlement = new EntitlementService(false, () => now), events: ProductEvent[] = [];
  const c = new SessionController(store, () => now, () => `attempt-${++id}`, entitlement, new AnalyticsService({ record: e => events.push(e) }));
  return { db, adapter, store, c, entitlement, events, advance: (ms: number) => { now += ms; }, now: () => now };
}
const attempt = (id: string, value: number, at = start): ChallengeAttempt => ({ id, challengeId: "long-exhale", definitionVersion: 1, value, startedAt: at, finishedAt: at + value * 1000, localDay: "2026-09-01", completed: true });
test("personal best supports both directions, finite values and no false PB on baseline or ties", () => {
  const metric = { metricId: "reaction", unit: "ms", challengeType: "benchmark", direction: "lower_is_better" as const };
  const values = [{ value: 310, timestamp: 1 }, { value: 290, timestamp: 2 }, { value: NaN, timestamp: 3 }];
  assert.equal(personalBest(values, metric)?.value, 290);
  assert.equal(personalBest(values, { ...metric, direction: "higher_is_better" })?.value, 310);
  const first = attempt("a", 20), equal = attempt("b", 20, start + 60000), better = attempt("c", 21, start + 120000);
  assert.equal(attemptComparison(first, [first]).isPersonalBest, false);
  assert.equal(attemptComparison(equal, [first, equal]).isPersonalBest, false);
  const result = attemptComparison(better, [first, equal, better]); assert.equal(result.isPersonalBest, true); assert.equal(result.improvement, 1); assert.equal(result.improvementPercent, 5); assert.equal(result.attemptCount, 3);
});
test("timed attempt persists through restart, saves once and rewards once", () => {
  const f = fixture(); try {
    assert.equal(f.c.beginTest("long-exhale", false), false);
    assert.equal(f.c.beginTest("long-exhale", true), true); f.advance(28400);
    assert.equal(f.c.finishTest(28400), true);
    const reopened = new LocalStore(f.adapter); assert.equal(reopened.testStore().pending?.value, 28.4);
    const id = f.c.saveTest(); assert.ok(id); assert.equal(f.c.saveTest(), null);
    reopened.saveTestAttempt(reopened.testStore().attempts[0]);
    assert.equal(reopened.testStore().attempts.length, 1);
    assert.equal(reopened.rewards().badges.filter(b => b.id === "test-long-exhale").length, 1);
    assert.ok(reopened.rewards().badges.some(b => b.id === "challenge-first"));
    assert.equal(f.events.filter(e => e === "challenge_attempt_completed").length, 1);
  } finally { f.db.close(); }
});
test("failed result write rolls back attempt and badge, then retry commits once", () => {
  const f = fixture(); try {
    f.c.beginTest("long-exhale", true); f.advance(20000); f.c.finishTest(20000);
    const run = f.adapter.runSync; let fail = true;
    f.adapter.runSync = (sql, ...p) => { if (fail && sql.includes("rewards-v1")) throw Error("Disk full"); return run(sql, ...p); };
    assert.equal(f.c.saveTest(), null); assert.equal(f.store.testStore().attempts.length, 0); assert.ok(f.store.testStore().pending);
    fail = false; f.c.retry(); assert.equal(f.store.testStore().attempts.length, 1); assert.equal(f.store.rewards().badges.filter(b => b.id === "challenge-first").length, 1);
  } finally { f.db.close(); }
});
test("reviewer unlocks every premium challenge without leaking into a new guest resolver", () => {
  const f = fixture(); try {
    assert.equal(f.c.beginTest("comfort-hold", true), false);
    f.entitlement.acceptReviewerGrant({ verifiedAt: f.now(), expiresAt: f.now() + 3600000 });
    for (const id of productConfig.proChallengeIds) assert.equal(f.entitlement.challengeAccess(id).allowed, true);
    assert.equal(f.entitlement.has("adFree"), true); assert.equal(new EntitlementService(false, f.now).challengeAccess("comfort-hold").allowed, false);
    assert.equal(f.c.beginTest("comfort-hold", true), true); f.advance(18000); f.c.finishTest(18000);
    f.entitlement.acceptReviewerGrant(null); assert.equal(f.c.saveTest(), null); assert.ok(f.store.testStore().pending);
    f.entitlement.acceptReviewerGrant({ verifiedAt: f.now(), expiresAt: f.now() + 3600000 }); assert.ok(f.c.saveTest());
  } finally { f.db.close(); }
});
test("eligibility, overlap, discard and invalid timing cannot produce a credited attempt", () => {
  const f = fixture(); try {
    f.c.excludeTest("long-exhale", true); assert.equal(f.c.beginTest("long-exhale", true), false);
    f.c.excludeTest("long-exhale", false); f.c.beginTest("long-exhale", true);
    assert.equal(f.c.beginTest("nasal-10", true), false); assert.equal(f.c.finishTest(10000), false);
    assert.equal(f.c.finishTest(NaN), false); f.c.abandonTest(); assert.equal(f.store.testStore().pending, null); assert.equal(f.store.testStore().attempts.length, 0);
  } finally { f.db.close(); }
});
test("Nasal 10 resumes, requires ten minutes and explicit confirmation; unsuccessful attempts earn no badge", () => {
  const f = fixture(); try {
    f.c.beginTest("nasal-10", true); f.advance(600000);
    assert.equal(new LocalStore(f.adapter).testStore().pending?.challengeId, "nasal-10"); f.c.finishTest(600000);
    f.c.saveTest(false); assert.equal(f.store.rewards().badges.length, 0);
    f.c.beginTest("nasal-10", true); f.advance(300000); f.c.finishTest(300000); assert.equal(f.c.saveTest(true), null); f.c.abandonTest();
    f.c.beginTest("nasal-10", true); f.advance(600000); f.c.finishTest(600000); assert.ok(f.c.saveTest(true));
    assert.equal(f.store.rewards().badges.filter(b => b.id === "test-nasal-10").length, 1);
  } finally { f.db.close(); }
});
test("State Shift uses sixty-second existing engine; worsening ratings remain honest and share opt-in", () => {
  const f = fixture(); try {
    f.c.startStateShift(4, true); assert.equal(f.c.current?.challengeTest, "state-shift-60");
    f.advance(60000); f.c.tick(); assert.equal(f.c.current?.stage, "post"); f.c.answer(7, "Worse");
    const a = f.c.testAttempts()[0]; assert.equal(a.value, 3); assert.equal(a.before, 4); assert.equal(a.after, 7);
    assert.equal(attemptComparison(a, [a]).isPersonalBest, false);
    assert.equal(attemptShareData(a, [a], true)?.metric, null);
    assert.equal(attemptShareData(a, [a], false, true)?.metric, "4 → 7");
    assert.equal(attemptShareData(a, [a], true, true)?.height, 1920);
    assert.equal(f.store.history().length, 1); assert.equal(f.c.testAttempts().length, 1);
  } finally { f.db.close(); }
});
test("skipped or interrupted State Shift does not invent paired measurements", () => {
  const f = fixture(); try {
    f.c.startStateShift(4, true); f.advance(60000); f.c.tick(); f.c.answer(null, null); assert.equal(f.c.testAttempts().length, 0);
  } finally { f.db.close(); }
});
test("daily choice survives reload and date changes, avoids recent repeats and excludes locked or unsuitable tests", () => {
  let state = emptyTestStore(); const choices: string[] = [];
  for (let i = 0; i < 10; i++) {
    const now = new Date(2026, 8, 1 + i, 12).getTime(); state = selectDaily(state, false, [], now);
    const chosen = state.daily.at(-1)!; assert.ok(!choices.slice(-2).includes(chosen.id)); choices.push(chosen.id);
    assert.deepEqual(selectDaily(JSON.parse(JSON.stringify(state)), false, [], now), state);
  }
  const lastDay = new Date(2026, 8, 10, 12).getTime();
  state.daily[state.daily.length - 1].id = "long-exhale"; state.excluded = ["long-exhale"];
  assert.notEqual(selectDaily(state, false, [], lastDay).daily.at(-1)?.id, "long-exhale");
  const old = productConfig.proChallengeIds; try { productConfig.proChallengeIds = [...old, "state-shift-60"]; assert.notEqual(selectDaily(emptyTestStore(), false, [], start).daily.at(-1)?.id, "state-shift-60"); } finally { productConfig.proChallengeIds = old; }
});
test("rule versions preserve legacy progress and completion while new enrollments use revised targets", () => {
  const current = challengeCatalog().find(d => d.id === "consistency")!;
  const states = enrollChallenge("consistency", [], true, start); assert.equal(states[0].definitionVersion, 2); assert.equal(current.targetCount, 10);
  const legacy = { ...states[0], definitionVersion: undefined };
  assert.equal(definitionForState(current, legacy).targetCount, 14);
  const day15 = new Date(2026, 8, 15, 12).getTime(); assert.equal(challengeExpired(current, states[0], day15), true); assert.equal(challengeExpired(current, legacy, day15), false);
  assert.throws(() => definitionForState(current, { ...legacy, definitionVersion: 99 }), /newer/);
});
test("new catalog rules express 3x3, five nights, four focus sessions and ten distinct days", () => {
  const catalog = challengeCatalog(); const byId = (id: string) => catalog.find(d => d.id === id)!;
  assert.equal(byId("three-by-three").qualificationRules.minSeconds, 180);
  assert.equal(byId("sleep-reset").targetCount, 5); assert.equal(byId("sleep-reset").qualificationRules.windowDays, 7);
  assert.equal(byId("focus-week").targetCount, 4); assert.equal(byId("focus-week").qualificationRules.windowDays, 7);
  assert.equal(byId("consistency").qualificationRules.mode, "days"); assert.equal(byId("consistency").qualificationRules.windowDays, 14);
});
test("3x3 credits one guided three-minute practice per day and completes durably", () => {
  const f = fixture(); try {
    f.c.enrollChallenge("three-by-three"); const coherent = protocols.find(p => p.id === "coherent")!;
    const practice = (cycles: number) => { f.c.start(null, cycles, coherent); f.advance(cycles * 10000); f.c.tick(); f.c.answer(null, null); };
    practice(6); assert.equal(f.c.challenges()[0].progress, 0);
    practice(18); practice(18); assert.equal(f.c.challenges()[0].progress, 1);
    f.advance(86400000); practice(18); assert.equal(f.c.challenges()[0].progress, 2);
    f.advance(2 * 86400000); practice(18); assert.equal(f.c.challenges()[0].status, "completed");
    assert.equal(new LocalStore(f.adapter).challenges()[0].progress, 3);
    assert.equal(f.store.rewards().badges.filter(b => b.id === "challenge-three-by-three").length, 1);
  } finally { f.db.close(); }
});
test("program windows complete within local deadlines and exclude late practice", () => {
  const f = fixture(); try {
    f.entitlement.acceptStoreGrant({ source: "store", status: "active", active: true, verifiedAt: start, expiresAt: start + 30 * 86400000, graceUntil: null });
    f.c.enrollChallenge("sleep-reset"); f.c.enrollChallenge("focus-week"); f.c.enrollChallenge("consistency");
    const practice = (id: string) => { f.entitlement.acceptReviewerGrant({ verifiedAt: f.now(), expiresAt: f.now() + 3600000 }); f.c.start(null, undefined, protocols.find(p => p.id === id)!); f.advance(300000); f.c.tick(); f.c.answer(null, null); };
    for (let day = 0; day < 5; day++) { if (day) f.advance(86400000); practice("extended-exhale"); practice("box"); }
    assert.equal(f.c.challenges().find(s => s.challengeId === "sleep-reset")?.status, "completed");
    assert.equal(f.c.challenges().find(s => s.challengeId === "focus-week")?.progress, 4);
    assert.equal(f.c.challenges().find(s => s.challengeId === "consistency")?.progress, 5);
    f.advance(15 * 86400000); practice("coherent");
    assert.equal(f.c.challenges().find(s => s.challengeId === "consistency")?.progress, 5);
  } finally { f.db.close(); }
});
test("clearing history removes measurements and personal best inputs but preserves earned badges", () => {
  const f = fixture(); try {
    f.store.saveTestAttempt(attempt("a", 20)); f.store.saveTestAttempt(attempt("b", 21, start + 60000));
    assert.ok(f.store.rewards().badges.some(b => b.id === "challenge-first-pb"));
    f.store.clearHistory(); assert.deepEqual(f.store.testStore().attempts, []);
    assert.ok(f.store.rewards().badges.some(b => b.id === "challenge-first-pb"));
    f.store.reset(); assert.equal(f.store.rewards().badges.length, 0);
  } finally { f.db.close(); }
});
test("removing reviewer access preserves an independent subscription and expiry restores all challenge locks", () => {
  const f = fixture(); try {
    f.entitlement.acceptStoreGrant({ source: "store", status: "active", active: true, verifiedAt: start, expiresAt: start + 60000, graceUntil: null });
    f.entitlement.acceptReviewerGrant({ verifiedAt: start, expiresAt: start + 3600000 });
    f.entitlement.acceptReviewerGrant(null); assert.equal(f.entitlement.state.subscriptionPro, true); assert.equal(f.entitlement.challengeAccess("comfort-hold").allowed, true);
    f.advance(60001); for (const id of productConfig.proChallengeIds) assert.equal(f.entitlement.challengeAccess(id).allowed, false);
  } finally { f.db.close(); }
});
test("new tests localize safety, directions and titles without exposing sensitive fields in cards", () => {
  for (const language of ["es", "pt"] as const) { setLanguage(language); for (const d of testCatalog()) for (const value of [d.title, d.description, d.instructions, d.safety, d.duration]) assert.notEqual(t(value), value, `${language}: ${value}`); }
  setLanguage("en"); const data = attemptShareData(attempt("a", 25), [], false)!;
  assert.equal(data.width, 1080); assert.equal(data.height, 1080); assert.doesNotMatch(JSON.stringify(data), /startedAt|finishedAt|localDay|note|photo/);
  assert.throws(() => validateTestStore({ ...emptyTestStore(), attempts: [attempt("bad", -1)] }));
});
