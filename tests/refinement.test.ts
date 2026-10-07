import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { LocalStore, type Database, defaultPreferences } from "../apps/mobile/src/storage";
import { SessionController } from "../apps/mobile/src/session-controller";
import { completeJourney, journeyFor, recommendPractice, practiceGoals } from "../apps/mobile/src/personalization";
import { productConfig } from "../apps/mobile/src/product-config";
import { EntitlementService } from "../apps/mobile/src/entitlements";
import { achievementProgress } from "../apps/mobile/src/achievements";
import { emptyLedger, reconcileRewards } from "../apps/mobile/src/experience";
import { manualSession } from "../apps/mobile/src/manual-session";
import { currentUsage, reserveGuidance } from "../apps/mobile/src/guided-quota";
import { practiceStats } from "../apps/mobile/src/progress";
import { annualIsBetterValue, SubscriptionError, SubscriptionService } from "../apps/mobile/src/subscriptions";
import { AnalyticsService, type ProductEvent } from "../apps/mobile/src/analytics";
import { welcomeRequest } from "../apps/mobile/src/welcome-email";
import { welcomeHandler, welcomeTemplate, validateWelcome } from "../supabase/functions/inout-welcome/handler";
import { protocols } from "../packages/protocols/src/index";

function fixture() {
  const db = new DatabaseSync(":memory:");
  const adapter: Database = { execSync: sql => db.exec(sql), runSync: (sql, ...p) => db.prepare(sql).run(...p),
    getAllSync: <T>(sql: string, ...p: any[]) => db.prepare(sql).all(...p) as T[], getFirstSync: <T>(sql: string, ...p: any[]) => (db.prepare(sql).get(...p) as T) ?? null,
    withTransactionSync: action => { db.exec("begin"); try { action(); db.exec("commit"); } catch(e) { db.exec("rollback"); throw e; } } };
  const store = new LocalStore(adapter); let id = 0;
  const controller = () => new SessionController(store, () => Date.UTC(2026, 9, 6, 12), () => `practice-${++id}`);
  return { db, store, controller };
}
test("onboarding checkpoints, goals and safety survive restart; completion is idempotent", () => {
  const f = fixture(); try {
    const c = f.controller(); assert.equal(journeyFor(c.preferences).step,"welcome");
    c.setPreferences({ ...c.preferences, journey: { version: 1, step: "value", primaryGoal: "sleep", secondaryGoals: [] } });
    const resumed = f.controller(); assert.equal(resumed.preferences.journey?.step, "value");
    resumed.setPreferences({ ...resumed.preferences, journey: { ...resumed.preferences.journey!, step: "offer", safetyAcceptedAt: 100 } });
    resumed.setPreferences(completeJourney(resumed.preferences, 200));
    resumed.setPreferences(completeJourney(resumed.preferences, 300));
    assert.equal(f.controller().preferences.journey?.completedAt, 200);
    assert.equal(f.controller().preferences.journey?.safetyAcceptedAt, 100);
    assert.equal(f.controller().preferences.onboardingComplete,true);
  } finally { f.db.close(); }
});
test("existing preferences and completed onboarding are not reset by new journey fields", () => {
  const f = fixture(); try {
    f.store.savePreferences({ audio:"silent", haptics:false, keepAwake:false });
    assert.equal(f.store.preferences().onboardingComplete,true);
    f.store.savePreferences({ ...defaultPreferences, onboardingComplete:true });
    assert.equal(journeyFor(f.store.preferences()).step,"complete");
  } finally { f.db.close(); }
});
test("every goal has a safe first recommendation and repeated compatible sessions can inform it", () => {
  for (const goal of practiceGoals) assert.notEqual(recommendPractice(goal).intensity,"high");
  assert.equal(recommendPractice("sleep").id,"coherent"); assert.equal(recommendPractice("focus").id,"box");
  assert.notEqual(recommendPractice("focus", [], id => id !== "box").id,"box");
});
test("streaks require completion; badges are dated, idempotent and retained after history deletion", () => {
  const now = new Date(2026,9,6,12);
  const records = Array.from({length:7},(_,i) => manualSession({goal:"Sleep",startedAt:new Date(2026,8,30+i,8).getTime(),durationMs:600000},String(i),now.getTime()));
  const incomplete = {...records[0],id:"ended",endReason:"ended" as const};
  assert.equal(practiceStats([incomplete],now).current,0);
  assert.equal(practiceStats(records,now).current,7);
  const earned=achievementProgress(records,now); assert.ok(earned.find(b=>b.id==="minutes-60")?.earnedAt); assert.equal(earned.find(b=>b.id==="explorer")?.progress,0);
  const ledger=reconcileRewards(records,emptyLedger(),3,now);
  assert.deepEqual(reconcileRewards(records,ledger,3,now),ledger);
  assert.deepEqual(reconcileRewards([],ledger,3,now).badges,ledger.badges);
});
test("monthly quota uses UTC, deduplicates reservations and rejects rollback resets", () => {
  const jan=Date.parse("2026-01-31T23:59:59Z"), feb=jan+1000;
  const used=reserveGuidance(null,"one",jan,1);
  assert.deepEqual(reserveGuidance(used,"one",jan,1),used);
  assert.throws(()=>reserveGuidance(used,"two",jan,1));
  assert.equal(currentUsage(used,feb).sessionIds.length,0);
  const next=reserveGuidance(used,"two",feb,1); assert.equal(currentUsage(next,jan).sessionIds.length,1);
});
test("central protocol/voice gates preserve defaults and bypass for store Pro and reviewer Pro", () => {
  const previous=productConfig.guidedSessionsPerMonth;
  try {
    const e=new EntitlementService(false,()=>1000);
    assert.ok(protocols.every(p=>e.protocolAccess(p).allowed));
    productConfig.proProtocolIds.push("box"); productConfig.guidedSessionsPerMonth=1;
    assert.equal(e.protocolAccess({id:"box"}).allowed,false); assert.equal(e.guidedAccess(1).allowed,false);
    e.acceptReviewerGrant({verifiedAt:1000,expiresAt:10000}); assert.ok(e.protocolAccess({id:"box"}).allowed); assert.ok(e.guidedAccess(500).allowed);
    e.acceptReviewerGrant(null); e.acceptStoreGrant({source:"store",status:"active",active:true,verifiedAt:1000,expiresAt:10000,graceUntil:null}); assert.ok(e.guidedAccess(500).allowed);
  } finally { productConfig.proProtocolIds.length=0; productConfig.guidedSessionsPerMonth=previous; }
});
test("quota receipt survives deleted history and records voice fallback without blocking practice", () => {
  const f=fixture(); const previous=productConfig.guidedSessionsPerMonth;
  try {
    productConfig.guidedSessionsPerMonth=1; const c=f.controller(); c.setPreferences({...c.preferences,audio:"voice"});
    c.start(null); assert.equal(c.current?.voiceAllowed,true); assert.equal(c.guidedAccess().remaining,0);
    c.end("ended"); c.clearHistory(); assert.equal(c.guidedAccess().remaining,0);
    c.start(null); assert.equal(c.current?.stage,"active"); assert.equal(c.current?.voiceAllowed,false);
  } finally { productConfig.guidedSessionsPerMonth=previous; f.db.close(); }
});
test("real pricing comparison rejects unknown currencies; restore and cancellation emit honest events", async () => {
  assert.equal(annualIsBetterValue([{id:"annual",title:"Annual",price:"x",period:"year"}]),false);
  assert.equal(annualIsBetterValue([{id:"annual",title:"Annual",price:"60",priceAmount:60,currency:"USD",period:"year"},{id:"monthly",title:"Monthly",price:"10",priceAmount:10,currency:"USD",period:"month"}]),true);
  const events:ProductEvent[]=[]; const grant={source:"store" as const,status:"active" as const,active:true,verifiedAt:1000,expiresAt:10000,graceUntil:null};
  const svc=new SubscriptionService({mode:"store",offers:async()=>[{id:"monthly",title:"Monthly",price:"x",period:"month"}],refresh:async()=>grant,purchase:async()=>{throw new SubscriptionError("cancelled","cancelled");},restore:async()=>grant,managementUrl:async()=>null},new EntitlementService(false,()=>1000),new AnalyticsService({record:e=>events.push(e)}));
  await svc.load(); await svc.purchase("monthly"); await svc.restore();
  assert.ok(events.includes("purchase_cancelled")); assert.ok(events.includes("restore_started")); assert.ok(events.includes("restore_success")); assert.ok(!events.includes("purchase_success"));
});
test("welcome requires consent and completed onboarding, and templates escape user content", () => {
  const p={...defaultPreferences,welcomeEmail:{email:"a@example.test",consentAt:1,status:"pending" as const}};
  assert.equal(welcomeRequest(p,"id"),null); assert.ok(welcomeRequest({...p,onboardingComplete:true},"id"));
  const input=validateWelcome({email:"a@example.test",name:"<script>",goal:"sleep",language:"en",consent:true,installation:crypto.randomUUID()});
  const email=welcomeTemplate(input,"InOut <hello@example.test>"); assert.doesNotMatch(email.html,/<script>/); assert.match(email.html,/inout:\/\/pre\?id=coherent/);
  assert.throws(()=>validateWelcome({...input,consent:false}));
});
test("welcome rejects oversized streams before storage or provider access", async () => {
  let calls = 0;
  const handler = welcomeHandler(async () => { calls++; }, { send: async () => { calls++; return "unused"; } }, () => ({ enabled: true, from: "a@example.test", hashSalt: "fixture" }));
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(1024)); c.enqueue(new Uint8Array(1025)); c.close(); } });
  const request = new Request("https://example.test", { method: "POST", body, duplex: "half" } as RequestInit);
  assert.equal((await handler(request)).status, 413);
  assert.equal(calls, 0);
});
test("paywall source analytics accepts only finite values without private context", () => {
  const calls: unknown[] = [];
  const analytics = new AnalyticsService({ record: (...args) => calls.push(args) });
  analytics.paywallSource("profile"); analytics.paywallSource("private free text");
  assert.deepEqual(calls, [["paywall_source", { source: "profile" }], ["paywall_source", { source: "other" }]]);
});
test("welcome delivery SQL deduplicates, restricts roles, leases retries and bounds uncertain delivery", async () => {
  const db=new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);");
    await db.exec(readFileSync(new URL("../supabase/migrations/20261007031007_inout_lifecycle_and_allowance.sql",import.meta.url),"utf8"));
    for (const role of ["anon","authenticated"]) { await db.exec(`set role ${role}`); await assert.rejects(db.query("select * from inout_private.welcome_delivery"),/permission denied/); await assert.rejects(db.query("select public.inout_guided_allowance(null,null,5,false)"),/permission denied/); await db.exec("reset role"); }
    await db.exec("set role service_role");
    const rpc=async(name:string,args:Record<string,unknown>)=>(await db.query<{value:any}>(`select public.${name}(${Object.keys(args).map((k,i)=>`${k} => $${i+1}`).join(",")}) as value`,Object.values(args))).rows[0]?.value;
    let sends=0; const handler=welcomeHandler(rpc,{send:async()=>{sends++; return "provider-fixture";}},()=>({enabled:true,from:"hello@example.test",hashSalt:"test-salt"}));
    const input={email:"a@example.test",name:"Alex",goal:"sleep",language:"en",consent:true,installation:crypto.randomUUID()};
    const call=()=>handler(new Request("https://test.example",{method:"POST",body:JSON.stringify(input)}));
    assert.equal((await (await call()).json()).status,"sent"); assert.equal((await (await call()).json()).status,"sent"); assert.equal(sends,1);
    assert.equal((await db.query<{payload:any}>("select payload from inout_private.welcome_delivery")).rows[0].payload,null);
    input.email="b@example.test";
    const failed=welcomeHandler(rpc,{send:async()=>{throw Error("timeout");}},()=>({enabled:true,from:"hello@example.test",hashSalt:"test-salt"}));
    assert.equal((await failed(new Request("https://test.example",{method:"POST",body:JSON.stringify(input)}))).status,503);
    assert.equal((await (await call()).json()).status,"busy");
    await db.exec("update inout_private.welcome_delivery set first_attempt=now()-interval '24 hours' where status='retry'");
    assert.equal((await (await call()).json()).status,"review"); assert.equal(sends,1);
    await db.exec("reset role"); const user=crypto.randomUUID(); await db.query("insert into auth.users values($1)",[user]); await db.exec("set role service_role");
    const one=crypto.randomUUID(), two=crypto.randomUUID();
    assert.equal((await rpc("inout_guided_allowance",{p_user:user,p_session:one,p_limit:1,p_consume:true})).remaining,0);
    assert.equal((await rpc("inout_guided_allowance",{p_user:user,p_session:one,p_limit:1,p_consume:true})).allowed,true);
    assert.equal((await rpc("inout_guided_allowance",{p_user:user,p_session:two,p_limit:1,p_consume:true})).allowed,false);
  } finally { await db.close(); }
});
