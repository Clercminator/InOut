import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { LocalStore, type Database } from "../apps/mobile/src/storage";
import { SessionController } from "../apps/mobile/src/session-controller";
import { EntitlementService } from "../apps/mobile/src/entitlements";
import { AnalyticsService, type ProductEvent } from "../apps/mobile/src/analytics";
import { dailyResetStats, validateDailyReset, creditDailyReset, emptyDailyReset } from "../apps/mobile/src/daily-reset";
import { dailyResetShareData } from "../apps/mobile/src/challenge-share";
import { fitnessBest, validateFitness, appendFitness, emptyFitness, fitnessChallenges } from "../apps/mobile/src/personal-challenges";
import { fitnessShareData } from "../apps/mobile/src/challenge-share";
import { attemptComparison } from "../apps/mobile/src/challenge-tests";
import { setLanguage, t } from "../apps/mobile/src/i18n";
const start = new Date(2026, 8, 1, 12).getTime();
function fixture() {
  const db = new DatabaseSync(":memory:"); let now = start, id = 0;
  const adapter: Database = { execSync: sql => db.exec(sql), runSync: (sql, ...p) => db.prepare(sql).run(...p), getAllSync: <T>(sql: string, ...p: any[]) => db.prepare(sql).all(...p) as T[], getFirstSync: <T>(sql: string, ...p: any[]) => (db.prepare(sql).get(...p) as T) ?? null, withTransactionSync: action => { db.exec("begin"); try { action(); db.exec("commit"); } catch (e) { db.exec("rollback"); throw e; } } };
  const store = new LocalStore(adapter), entitlement = new EntitlementService(false, () => now), events: ProductEvent[] = [];
  const c = new SessionController(store, () => now, () => `attempt-${++id}`, entitlement, new AnalyticsService({ record: e => events.push(e) }), () => now);
  return { db, adapter, store, c, entitlement, events, advance: (ms: number) => { now += ms; }, now: () => now };
}


test("stopwatch pause/resume excludes downtime and saves idempotently without breathing credit",()=>{
 const f=fixture(); try {
  assert.equal(f.c.beginFitness("plank",false),false); assert.equal(f.c.beginFitness("plank",true),true);
  f.advance(12300); f.c.checkpointFitness("paused"); f.advance(500000);
  assert.equal(f.c.fitnessElapsed(),12300); assert.equal(f.c.resumeFitness(),true);
  f.advance(3700); f.c.checkpointFitness("finished"); const id=f.c.saveFitness(); assert.ok(id);
  assert.equal(f.c.saveFitness(),null); const result=f.store.fitness().results[0]; assert.equal(result.value,16);
  f.store.updateFitness(s=>appendFitness(s,result)); assert.equal(f.store.fitness().results.length,1);
  assert.equal(f.store.history().length,0); assert.equal(f.store.testStore().attempts.length,0); assert.equal(f.store.dailyReset().credits.length,0);
  assert.equal(f.events.filter(e=>e==="challenge_personal_best").length,1);
  assert.equal(new LocalStore(f.adapter).fitness().results[0].value,16);
 }finally{f.db.close();}
});
test("restart pauses at last checkpoint; pending attempts block overlapping sessions",()=>{
 const f=fixture();try{
  f.c.beginFitness("wall-sit",true); f.advance(4300); f.c.checkpointFitness(); f.advance(86400000);
  const c=new SessionController(new LocalStore(f.adapter),f.now,()=>"new",undefined,undefined,f.now);
  assert.equal(c.pendingFitness()?.status,"paused"); assert.equal(c.fitnessElapsed(),4300);
  assert.equal(c.beginTest("long-exhale",true),false); c.startDailyReset(); assert.equal(c.current,null);
  assert.equal(c.beginFitness("plank",true),false); c.discardFitness(); assert.equal(f.store.fitness().pending,null);
  c.startDailyReset(); assert.equal(c.current?.stage,"active"); assert.equal(c.beginFitness("plank",true),false);
 }finally{f.db.close();}
});
test("manual repetitions persist, can be edited or deleted, and notes never enter shares",()=>{
 const f=fixture();try{
  f.c.beginFitness("push-ups",true); f.c.editFitnessDraft("private health note",12); f.c.checkpointFitness("finished"); const id=f.c.saveFitness()!;
  assert.equal(f.c.editFitnessResult(id,18,"new private note"),true);
  assert.equal(fitnessBest(f.c.fitnessState().results,"push-ups")?.value,18);
  assert.equal(f.c.editFitnessResult(id,1.5,""),false); assert.equal(f.c.editFitnessResult(id,NaN,""),false);
  const result=f.c.fitnessState().results[0]; const share=JSON.stringify(fitnessShareData(result,[result],false));
  assert.equal(share.includes("private"),false); assert.ok(share.includes(t("Self-reported fitness record")));
  assert.equal(f.c.deleteFitnessResult(id),true); assert.equal(fitnessBest(f.c.fitnessState().results,"push-ups"),null);
 }finally{f.db.close();}
});
test("activity bests remain separate and deletion recalculates from real remaining records",()=>{
 const f=fixture();try{
  for(const [id,ms] of [["plank",10000],["plank",8000],["wall-sit",50000]] as const){f.c.beginFitness(id,true);f.advance(ms);f.c.checkpointFitness("finished");f.c.saveFitness();}
  assert.equal(fitnessBest(f.c.fitnessState().results,"plank")?.value,10);
  f.c.deleteFitnessResult(f.c.fitnessState().results[0].id);
  assert.equal(fitnessBest(f.c.fitnessState().results,"plank")?.value,8);
  assert.equal(fitnessBest(f.c.fitnessState().results,"wall-sit")?.value,50);
 }finally{f.db.close();}
});
test("failed save retries the same record and emits no duplicate success",()=>{
 const f=fixture();try{
  f.c.beginFitness("plank",true);f.advance(12000);f.c.checkpointFitness("finished");
  const run=f.adapter.runSync;let fail=true;
  f.adapter.runSync=(sql,...args)=>{if(fail&&sql.includes("fitness-v1"))throw Error("disk full");return run(sql,...args);};
  assert.equal(f.c.saveFitness(),null);assert.equal(f.store.fitness().results.length,0);assert.ok(f.c.error);
  fail=false;f.c.retry();f.c.retry();assert.equal(f.store.fitness().results.length,1);
  assert.equal(f.events.filter(e=>e==="challenge_personal_best").length,1);
 }finally{f.db.close();}
});
test("unknown versions and invalid measurements preserve existing data by failing closed",()=>{
 assert.throws(()=>validateFitness({...emptyFitness(),version:2}));
 assert.throws(()=>validateFitness({...emptyFitness(),results:[{id:"bad"}]}));
 const f=fixture();try{f.c.beginFitness("push-ups",true);assert.equal(f.c.editFitnessDraft("",-1),false);assert.equal(f.c.editFitnessDraft("x".repeat(501),4),false);}finally{f.db.close();}
});
test("comfort hold never earns a duration personal best",()=>{
 const a={id:"a",challengeId:"comfort-hold" as const,definitionVersion:1,startedAt:0,finishedAt:10000,localDay:"2026-01-01",value:10,completed:true};
 assert.equal(attemptComparison({...a,id:"b",startedAt:20000,finishedAt:40000,value:20},[a]).isPersonalBest,false);
});
test("fitness titles and instructions are localized in all three languages",()=>{
 for(const language of ["en","es","pt"] as const){setLanguage(language);for(const d of fitnessChallenges){assert.ok(t(d.title));assert.ok(t(d.instructions));if(language!=="en"){assert.notEqual(t(d.title),d.title);assert.notEqual(t(d.instructions),d.instructions);}}}setLanguage("en");
});
