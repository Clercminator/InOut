import { AnalyticsService, type ProductEvent } from "../apps/mobile/src/analytics";
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { LocalStore, type Database } from "../apps/mobile/src/storage";
import { SessionController } from "../apps/mobile/src/session-controller";
import { EntitlementService, commercialPolicy } from "../apps/mobile/src/entitlements";
import { emptyCoach, programs, discoverPrograms, programDuration, coachProtocol, dailyRecommendation, comfortableCycles, validateCoach, generateWeek, type CoachSession } from "../apps/mobile/src/coach";
import { createCoachAiAdapter, validateCoachAiOutput, type CoachAiDependencies } from "../apps/mobile/src/coach-ai";
import { totalDuration } from "../packages/breathing-engine/src/index";
import { dayKey } from "../apps/mobile/src/progress";

function setup() {
  const db = new DatabaseSync(":memory:");
  let now = new Date("2026-10-13T12:00:00").getTime(), serial = 0, fail = false;
  const adapter: Database = {
    execSync: sql => db.exec(sql),
    runSync: (sql, ...params) => { if (fail && sql.includes("coach-v1")) throw Error("disk full"); return db.prepare(sql).run(...params); },
    getAllSync: <T>(sql: string, ...params: (string | number | null)[]) => db.prepare(sql).all(...params) as T[],
    getFirstSync: <T>(sql: string, ...params: (string | number | null)[]) => db.prepare(sql).get(...params) as T ?? null,
    withTransactionSync: fn => { db.exec("BEGIN"); try { fn(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } },
  };
  const store = new LocalStore(adapter);
  const entitlements = new EntitlementService(false, () => now, { read: () => store.readEntitlementCache(), write: g => store.writeEntitlementCache(g) });
  const events: ProductEvent[] = [];
  const controller = () => new SessionController(store, () => now, () => `id-${++serial}`, entitlements, new AnalyticsService({ record: event => events.push(event) }));
  return { db, store, entitlements, controller, events, now: () => now, advance: (ms: number) => { now += ms; }, fail: (value: boolean) => { fail = value; },
    grant: () => entitlements.acceptStoreGrant({ source: "store", status: "active", active: true, verifiedAt: now, expiresAt: now + 30 * 86400000, graceUntil: null }),
    complete: (c: SessionController, tag: CoachSession, repeat = false) => {
      const choice = c.coachSession(tag, repeat); assert.ok(choice);
      c.start(null, choice.cycles, coachProtocol(choice.protocolId)!, false, undefined, { tag, repeat });
      assert.equal(c.current?.stage, "active");
      now += totalDuration(c.current!.engine.plan); c.tick(); assert.equal(c.current?.stage, "post"); c.answer(null, null);
    },
  };
}

test("guest can complete seven introductory days offline; missed days, repeats and cold launch preserve progress", () => {
  const env = setup();
  try {
    let c = env.controller(); assert.equal(c.enrollProgram("find-your-rhythm"), true);
    const run = c.coachState().activeEnrollmentId!;
    for (let step = 0; step < 7; step++) {
      env.complete(c, { enrollmentId: run, step });
      assert.equal(c.coachState().enrollments[0].completed.length, step + 1);
      if (step < 6) assert.equal(c.coachSession({ enrollmentId: run, step: step + 1 }), null);
      env.complete(c, { enrollmentId: run, step }, true);
      assert.equal(c.coachState().enrollments[0].completed.length, step + 1);
      env.advance((step === 2 ? 4 : 1) * 86400000);
      c = env.controller();
    }
    assert.equal(c.coachState().enrollments[0].status, "completed");
    assert.equal(c.history().length, 14);
    assert.equal(c.enrollProgram("find-your-rhythm"), true);
    assert.equal(c.coachState().enrollments.length, 2);
    assert.equal(c.coachState().enrollments[0].completed.length, 7);
  } finally { env.db.close(); }
});
test("pause, skip and resume do not erase progress or queue catch-up practices", () => {
  const env = setup(); try {
    const c = env.controller(); c.enrollProgram("find-your-rhythm"); const tag = { enrollmentId: c.coachState().activeEnrollmentId!, step: 0 };
    c.pauseProgram(true); assert.equal(c.coachSession(tag), null);
    c.pauseProgram(false); c.skipProgramDay(); assert.equal(c.coachSession(tag), null);
    env.advance(86400000 * 5); assert.ok(c.coachSession(tag));
    env.complete(c, tag); c.pauseProgram(true); c.pauseProgram(false);
    assert.equal(c.coachState().enrollments[0].completed.length, 1);
  } finally { env.db.close(); }
});
test("result and program progress commit atomically and retry is idempotent", () => {
  const env = setup(); try {
    const c = env.controller(); c.enrollProgram("find-your-rhythm");
    env.fail(true); env.complete(c, { enrollmentId: c.coachState().activeEnrollmentId!, step: 0 });
    assert.ok(c.error); assert.equal(env.store.history().length, 0); assert.equal(c.coachState().enrollments[0].completed.length, 0);
    env.fail(false); c.retry(); assert.equal(c.error, null); assert.equal(c.coachState().enrollments[0].completed.length, 1);
    env.store.save(c.current!); assert.equal(c.coachState().enrollments[0].completed.length, 1);
  } finally { env.db.close(); }
});
test("early end, unrelated practice and unfinished reflection cannot advance a program", () => {
  const env = setup(); try {
    const c = env.controller(); c.enrollProgram("find-your-rhythm");
    const tag = { enrollmentId: c.coachState().activeEnrollmentId!, step: 0 }, choice = c.coachSession(tag)!;
    c.start(null, choice.cycles, coachProtocol(choice.protocolId)!, false, undefined, { tag, repeat: false });
    env.advance(10000); c.end("unwell"); assert.equal(c.coachState().enrollments[0].completed.length, 0);
    c.start(null, choice.cycles, coachProtocol(choice.protocolId)!); env.advance(choice.seconds * 1000); c.tick(); c.answer(null, null);
    assert.equal(c.coachState().enrollments[0].completed.length, 0);
    c.start(null, choice.cycles, coachProtocol(choice.protocolId)!, false, undefined, { tag, repeat: false });
    env.advance(choice.seconds * 1000); c.tick();
    assert.equal(c.coachState().enrollments[0].completed.length, 0);
    const cold = env.controller(); cold.answer(null, null); assert.equal(cold.coachState().enrollments[0].completed.length, 1);
  } finally { env.db.close(); }
});
test("premium programs and plans use existing expiry and bounded offline cache; Free protocols remain open", () => {
  const env = setup(); try {
    const c = env.controller(); assert.equal(c.enrollProgram("evening-wind-down"), false); assert.equal(c.createCoachWeek(), false);
    env.grant(); assert.equal(c.enrollProgram("evening-wind-down"), true); assert.equal(c.createCoachWeek(), true);
    const tag = { enrollmentId: c.coachState().activeEnrollmentId!, step: 0 };
    assert.ok(c.coachSession(tag)); env.advance(commercialPolicy.maxOfflineAgeMs); assert.equal(c.coachSession(tag), null);
    assert.equal(c.createCoachWeek(), false); assert.ok(c.entitlements.protocolAccess(coachProtocol("coherent")!).allowed);
    env.grant(); assert.ok(c.coachSession(tag));
    env.entitlements.acceptStoreGrant({ source: "store", status: "expired", active: false, verifiedAt: env.now(), expiresAt: env.now(), graceUntil: null });
    assert.equal(c.coachSession(tag), null);
    assert.equal(c.coachState().enrollments.length, 1);
  } finally { env.db.close(); }
});
test("weekly schedule honors frequency, survives edits, skip, pause and completion without replacing the week", () => {
  const env = setup(); try {
    const c = env.controller(); env.grant(); c.updateExperience({ weeklyGoal: 3 }); c.createCoachWeek();
    const week = c.coachState().week!; assert.equal(week.entries.filter(e => e.status === "planned").length, 3);
    const date = dayKey(new Date(env.now())); c.editCoachDay(date, "equal", 2);
    const tag = { week: week.start, date }; assert.equal(c.coachSession(tag)?.protocolId, "equal");
    c.pauseCoachWeek(true); assert.equal(c.coachSession(tag), null); c.pauseCoachWeek(false);
    c.editCoachDay(date, undefined, undefined, true); assert.equal(c.coachSession(tag), null);
    c.editCoachDay(date, "coherent", 2); env.complete(c, tag);
    c.createCoachWeek(); assert.equal(c.coachState().week!.entries[0].status, "completed");
    env.complete(c, tag, true); assert.equal(c.coachState().week!.entries.filter(e => e.status === "completed").length, 1);
    assert.deepEqual(env.controller().coachState().week, c.coachState().week);
  } finally { env.db.close(); }
});
test("recommendations are deterministic, approved and bounded; no intensity or phase changes", () => {
  const env = setup(); try {
    const c = env.controller();
    for (const goal of ["stress", "sleep", "focus", "performance", "energy", "pressure", "learn"] as const) {
      for (const availableMinutes of [1, 3, 10]) {
        const state = { ...emptyCoach(), availableMinutes };
        const a = dailyRecommendation(c.preferences, [], state, env.now(), goal);
        assert.deepEqual(a, dailyRecommendation(c.preferences, [], state, env.now(), goal));
        assert.ok(coachProtocol(a.protocolId)); assert.ok(a.seconds <= availableMinutes * 60 && a.seconds >= 44);
      }
    }
    for (const program of programs) { assert.equal(program.steps.length, program.days); program.steps.forEach(s => assert.ok(coachProtocol(s.protocolId))); }
    assert.equal(comfortableCycles("coherent", Infinity), 6);
    assert.equal(comfortableCycles("coherent", -200), 6);
    assert.equal(comfortableCycles("coherent", 1e9), 60);
    assert.throws(() => validateCoach({ ...emptyCoach(), availableMinutes: 999 }));
    assert.throws(() => validateCoach({ ...emptyCoach(), week: { start: "2026-10-13", paused: false, entries: [] } }));
    assert.equal(generateWeek(c.preferences, [], emptyCoach(), env.now()).entries.length, 7);
  } finally { env.db.close(); }
});

test("a weekly practice spanning midnight credits its scheduled day", () => {
  const env = setup(); try {
    const c = env.controller(); env.grant(); c.createCoachWeek();
    env.advance(new Date("2026-10-13T23:59:00").getTime() - env.now());
    const date = dayKey(new Date(env.now()));
    c.editCoachDay(date, "coherent", 2);
    env.complete(c, { week: c.coachState().week!.start, date });
    assert.notEqual(dayKey(new Date(env.now())), date);
    assert.equal(c.coachState().week!.entries.find(e => e.date === date)?.status, "completed");
  } finally { env.db.close(); }
});

const recommendation = { protocolId: "coherent" as const, cycles: 12, seconds: 120, reason: "local", goal: "sleep" as const };
const output = { goal: "sleep", protocolId: "coherent", explanationCode: "goal", summaryCode: "continue" };
test("AI schema rejects unknown protocols, parameters, medical prose and malformed output", () => {
  assert.ok(validateCoachAiOutput(output, recommendation));
  for (const bad of [null, "text", {}, { ...output, protocolId: "cyclic-breathwork" }, { ...output, holdSeconds: 60 }, { ...output, explanationCode: "Cures insomnia" }, { ...output, goal: "treat" }]) assert.equal(validateCoachAiOutput(bad, recommendation), null);
});
test("AI missing configuration, absent consent and expired access always return local fallback without network", async () => {
  let calls = 0;
  const dependencies: CoachAiDependencies = { enabled: () => false, hasAccess: () => true, quota: { read: () => ({ day: "", requests: 0 }), write: () => {} }, transport: async () => { calls++; return { status: 200, body: output }; } };
  const request = { recommendation, purpose: "explain" as const, locale: "en" as const, consent: { ai: true, checkIns: false } };
  assert.equal((await createCoachAiAdapter(dependencies)(request)).reason, "disabled");
  assert.equal((await createCoachAiAdapter({ ...dependencies, enabled: () => true, transport: undefined })(request)).reason, "disabled");
  assert.equal((await createCoachAiAdapter({ ...dependencies, enabled: () => true })( { ...request, consent: { ai: false, checkIns: false } })).reason, "consent");
  assert.equal((await createCoachAiAdapter({ ...dependencies, enabled: () => true, hasAccess: () => false })(request)).reason, "access");
  assert.equal(calls, 0);
});
test("AI minimizes data, enforces caps, and falls back on network failures, rate limits and bad output", async () => {
  let quota = { day: "", requests: 0 };
  const deps: CoachAiDependencies = { enabled: () => true, hasAccess: () => true, quota: { read: () => quota, write: v => { quota = v; } }, now: () => Date.UTC(2026, 9, 13),
    transport: async request => { assert.equal(request.checkIn, undefined); assert.equal(request.goalText, undefined); return { status: 200, body: output }; } };
  const request = { recommendation, purpose: "explain" as const, locale: "en" as const, consent: { ai: true, checkIns: false }, checkIn: "shorter-preferred" as const, goalText: "private text" };
  const adapter = createCoachAiAdapter(deps);
  for (let i = 0; i < 3; i++) assert.equal((await adapter(request)).source, "ai");
  assert.equal((await adapter(request)).reason, "limit");
  quota = { day: "", requests: 0 };
  assert.equal((await createCoachAiAdapter({ ...deps, transport: async () => { throw Error("offline"); } })(request)).source, "local");
  assert.equal((await createCoachAiAdapter({ ...deps, transport: async () => ({ status: 429, body: {} }) })(request)).reason, "limit");
  assert.equal((await createCoachAiAdapter({ ...deps, transport: async () => ({ status: 200, body: {} }) })(request)).reason, "invalid-output");
});

for (const program of programs.filter(p => p.id !== "find-your-rhythm")) test(`${program.title} completes its approved sequence without escalating holds`, () => {
  const env = setup(); try {
    const c = env.controller(); env.grant(); c.enrollProgram(program.id);
    const run = c.coachState().activeEnrollmentId!;
    for (let step = 0; step < program.days; step++) {
      env.grant(); env.complete(c, { enrollmentId: run, step });
      assert.deepEqual(c.current!.engine.plan.blocks[0].phases, coachProtocol(program.steps[step].protocolId)!.phases);
      env.advance(86400000);
    }
    assert.equal(c.coachState().enrollments[0].status, "completed");
    assert.equal(c.coachState().enrollments[0].completed.length, program.days);
  } finally { env.db.close(); }
});
test("local feedback only shortens recommendations after opt-in and reset clears the coach cache", () => {
  const env = setup(); try {
    const c = env.controller(); c.start(3, 18, coachProtocol("coherent")!); env.advance(180000); c.tick(); c.answer(8, null);
    const before = dailyRecommendation(c.preferences, c.history(), emptyCoach(), env.now());
    const after = dailyRecommendation(c.preferences, c.history(), { ...emptyCoach(), useFeedback: true }, env.now());
    assert.ok(before.seconds > after.seconds); assert.equal(after.protocolId, "diaphragmatic"); assert.equal(after.seconds, 60);
    c.enrollProgram("find-your-rhythm"); assert.equal(c.coachState().enrollments.length, 1);
    c.resetLocalData(); assert.deepEqual(c.coachState(), emptyCoach());
  } finally { env.db.close(); }
});
test("AI timeouts abort without replacing the deterministic recommendation", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal: AbortSignal | undefined;
  const adapter = createCoachAiAdapter({ enabled: () => true, hasAccess: () => true,
    quota: { read: () => ({ day: "", requests: 0 }), write: () => {} },
    transport: async (_request, abortSignal) => { signal = abortSignal; return new Promise(() => {}); },
  });
  const pending = adapter({ recommendation, purpose: "explain", locale: "en", consent: { ai: true, checkIns: true } });
  t.mock.timers.tick(5001);
  const result = await pending;
  assert.equal(result.source, "local"); assert.equal(result.value.protocolId, recommendation.protocolId); assert.equal(signal?.aborted, true);
});

test("program discovery considers all selected goals with stable ties and bounded durations", () => {
 const preferences = { theme: "system", audio: "silent", haptics: false, keepAwake: false, onboardingComplete: true, pro: false, journey: { version: 1, step: "complete", primaryGoal: "sleep", secondaryGoals: ["focus", "pressure"] } } as const;
 const discovery = discoverPrograms({ ...preferences, journey: { ...preferences.journey, secondaryGoals: [...preferences.journey.secondaryGoals] } });
 assert.equal(discovery[0].id, "focus-on-demand");
 assert.ok(discovery.find(p => p.id === "evening-wind-down")!.matchedGoals.includes("sleep"));
 for (const p of programs) { const duration = programDuration(p, 1); assert.ok(duration.min > 0); assert.ok(duration.max <= 60); }
 const entitlements = new EntitlementService();
 assert.equal(entitlements.programAccess("find-your-rhythm").requiresPro, false);
 assert.equal(entitlements.programAccess("focus-on-demand").requiresPro, true);
});

test("program completion is emitted for the final credited session only, never for optional repeats",()=>{
 const env=setup();try{
  const c=env.controller();c.enrollProgram("find-your-rhythm");const enrollmentId=c.coachState().activeEnrollmentId!;
  for(let step=0;step<7;step++){env.complete(c,{enrollmentId,step});env.advance(86400000);}
  assert.equal(env.events.filter(e=>e==="guided_program_completed").length,1);
  env.complete(c,{enrollmentId,step:6},true);c.retry();
  assert.equal(env.events.filter(e=>e==="guided_program_completed").length,1);
  assert.equal(env.events.filter(e=>e==="guided_program_returned").length,7);
 }finally{env.db.close();}
});
