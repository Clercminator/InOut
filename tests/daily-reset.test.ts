import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { LocalStore, type Database } from "../apps/mobile/src/storage";
import { SessionController } from "../apps/mobile/src/session-controller";
import { EntitlementService } from "../apps/mobile/src/entitlements";
import { AnalyticsService, type ProductEvent } from "../apps/mobile/src/analytics";
import { dailyResetStats, validateDailyReset, creditDailyReset, emptyDailyReset } from "../apps/mobile/src/daily-reset";
import { dailyResetShareData } from "../apps/mobile/src/challenge-share";
const start = new Date(2026, 8, 1, 12).getTime();
function fixture() {
  const db = new DatabaseSync(":memory:"); let now = start, id = 0;
  const adapter: Database = { execSync: sql => db.exec(sql), runSync: (sql, ...p) => db.prepare(sql).run(...p), getAllSync: <T>(sql: string, ...p: any[]) => db.prepare(sql).all(...p) as T[], getFirstSync: <T>(sql: string, ...p: any[]) => (db.prepare(sql).get(...p) as T) ?? null, withTransactionSync: action => { db.exec("begin"); try { action(); db.exec("commit"); } catch (e) { db.exec("rollback"); throw e; } } };
  const store = new LocalStore(adapter), entitlement = new EntitlementService(false, () => now), events: ProductEvent[] = [];
  const c = new SessionController(store, () => now, () => `attempt-${++id}`, entitlement, new AnalyticsService({ record: e => events.push(e) }));
  return { db, adapter, store, c, entitlement, events, advance: (ms: number) => { now += ms; }, now: () => now };
}

test("daily reset persists once per local day; repeat sessions and events remain honest", () => {
 const f=fixture(); try {
  f.c.startDailyReset(); assert.equal(f.c.current?.protocolId,"coherent");
  f.advance(60000); f.c.tick(); f.c.answer(null,null);
  assert.equal(f.store.dailyReset().credits.length,1);
  f.store.save(f.c.current!); f.c.retry();
  f.c.startDailyReset(); f.advance(60000); f.c.tick(); f.c.answer(null,null);
  assert.equal(f.store.dailyReset().credits.length,1); assert.equal(f.store.history().length,2);
  assert.equal(f.events.filter(e=>e==="daily_reset_awarded").length,1);
  assert.equal(f.events.filter(e=>e==="daily_reset_completed").length,2);
  assert.equal(f.events.filter(e=>e==="daily_reset_repeat").length,1);
  assert.ok(dailyResetShareData(f.store.dailyReset(),f.c.current!.id,false,f.c.current!));
  f.advance(86400000); f.c.startDailyReset(); f.advance(60000); f.c.tick(); f.c.answer(null,null);
  assert.equal(dailyResetStats(new LocalStore(f.adapter).dailyReset(),"2026-09-02").current,2);
  assert.equal(f.events.filter(e=>e==="daily_reset_returned").length,1);
 } finally { f.db.close(); }
});
test("interruption and recovery do not manufacture daily credit or count downtime",()=>{
 const f=fixture(); try {
  f.c.startDailyReset(); f.advance(20000); f.c.tick();
  const recovered=new SessionController(new LocalStore(f.adapter),()=>f.now()+3600000,()=>"next");
  assert.equal(recovered.current?.engine.status,"paused"); assert.equal(f.store.dailyReset().credits.length,0);
  const r={...f.c.current!,stage:"result" as const,endReason:"ended" as const,finishedAt:f.now()};
  assert.deepEqual(creditDailyReset(emptyDailyReset(),r),emptyDailyReset());
  assert.equal(dailyResetShareData(emptyDailyReset(),r.id,false,r),null);
 } finally { f.db.close(); }
});
test("calendar streaks preserve completion dates across gaps and timezone changes",()=>{
 const state={version:1 as const,credits:["2026-10-16","2026-10-17","2026-10-18","2026-10-20"].map((localDay,i)=>({localDay,sessionId:String(i),finishedAt:i}))};
 assert.deepEqual(dailyResetStats(state,"2026-10-18"),{current:3,best:3,total:3,week:3,todayComplete:true});
 assert.equal(dailyResetStats(state,"2026-10-19").current,3); assert.equal(dailyResetStats(state,"2026-10-22").current,0);
 assert.equal(dailyResetStats(state,"2026-10-17").current,2);
 assert.throws(()=>validateDailyReset({...state,credits:[...state.credits,state.credits[0]]}));
 assert.throws(()=>validateDailyReset({version:1,credits:[{localDay:"2026-02-30",sessionId:"bad",finishedAt:1}]}));
});
test("daily award and session roll back together on failed write, then retry once",()=>{
 const f=fixture(); try {
  f.c.startDailyReset(); f.advance(60000); f.c.tick();
  const run=f.adapter.runSync; let fail=true;
  f.adapter.runSync=(sql,...args)=>{if(fail&&sql.includes("daily-reset-v1"))throw Error("disk full");return run(sql,...args);};
  f.c.answer(null,null); assert.ok(f.c.error); assert.equal(f.store.history().length,0); assert.equal(f.store.dailyReset().credits.length,0);
  fail=false; f.c.retry(); assert.equal(f.store.history().length,1); assert.equal(f.store.dailyReset().credits.length,1);
  assert.equal(f.events.filter(e=>e==="daily_reset_awarded").length,1);
 } finally { f.db.close(); }
});

test("a reset crossing midnight retains its completion day when reflection is saved after restart",()=>{
 const f=fixture();try{
  f.advance(12*3600000-30000); f.c.startDailyReset();f.advance(60000);f.c.tick();
  assert.equal(f.c.current?.completionLocalDay,"2026-09-02");assert.equal(f.store.dailyReset().credits.length,0);
  f.advance(2*86400000);const recovered=new SessionController(new LocalStore(f.adapter),f.now,()=>"restart");
  recovered.answer(null,null);assert.equal(f.store.dailyReset().credits[0].localDay,"2026-09-02");
  assert.equal(dailyResetStats(f.store.dailyReset(),"2026-09-04").current,0);
  assert.deepEqual(creditDailyReset(emptyDailyReset(),{...recovered.current!,source:"manual"}),emptyDailyReset());
 }finally{f.db.close();}
});
