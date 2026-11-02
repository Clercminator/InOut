import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { founderHandler, type FounderConfig } from "../supabase/functions/inout-founders/handler";
import { FounderService } from "../apps/mobile/src/founders";
import { EntitlementService, type EntitlementGrant } from "../apps/mobile/src/entitlements";
import { AnalyticsService } from "../apps/mobile/src/analytics";
import { SubscriptionError, SubscriptionService, type SubscriptionProvider } from "../apps/mobile/src/subscriptions";
import { AdService } from "../apps/mobile/src/ads";
import { grantFromCustomerInfo } from "../apps/mobile/src/subscription-providers/revenuecat";
import type { CustomerInfo } from "react-native-purchases";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const product = "inout_pro_lifetime";
const migration = new URL("../supabase/migrations/20261028181752_inout_founders.sql", import.meta.url);
const purchaseTime = new Date(Date.now()-10000).toISOString();
const event = (id: string, extra = {}) => ({ environment: "production", store: "PLAY_STORE", transactionId: id, productId: product,
  customerId: `customer-${id}`, purchasedAt: purchaseTime, eventAt: purchaseTime, eventId: `event-${id}`, state: "purchased", ...extra });

test("founder inventory: real SQL isolation, disabled states, atomic capacity, expiry, late purchases, replay, refund and sandbox", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    await db.exec(readFileSync(migration,"utf8"));
    const rpc = async (action: string, data: object = {}) => (await db.query<{value: any}>("select public.inout_founders($1,$2::jsonb) value", [action, JSON.stringify({environment:"production",...data})])).rows[0].value;
    for (const role of ["anon","authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(rpc("status"), /permission denied/);
      await assert.rejects(db.query("select * from inout_private.founder_purchases"), /permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    assert.deepEqual(await rpc("status"), {status:"inactive",ready:false,allocation:1000,confirmed:0,reservations:0,available:990,safetyBuffer:10,allowed:false});
    const reserve = (id: string) => rpc("reserve", { customerId:id,tokenHash:sha(id),platform:"android" });
    assert.equal((await reserve("a")).allowed,false);
    await assert.rejects(rpc("control",{status:"active"}),/not ready/);
    await rpc("control",{status:"active",ready:true});
    assert.equal((await reserve("a")).allowed,true);
    assert.equal((await reserve("a")).allowed,true);
    assert.equal((await rpc("reserve",{customerId:"a",tokenHash:sha("stolen"),platform:"ios"})).allowed,false);
    assert.equal((await rpc("status")).reservations,1);
    await rpc("cancel",{customerId:"a",tokenHash:sha("wrong")});
    assert.equal((await rpc("status")).reservations,1);
    await rpc("cancel",{customerId:"a",tokenHash:sha("a")});
    assert.equal((await rpc("status")).reservations,0);
    await reserve("expire");
    await db.exec("update inout_private.founder_reservations set expires_at=now()-interval '1 second'");
    assert.equal((await rpc("status")).reservations,0);
    assert.equal((await reserve("expire")).allowed,false);
    await rpc("event",event("late",{customerId:"expire"}));
    await rpc("event",event("late",{customerId:"restored-alias"}));
    assert.equal((await rpc("status")).confirmed,1);
    const lookup = () => rpc("lookup",{purchases:[{store:"PLAY_STORE",transactionId:"late"}]});
    assert.equal((await lookup()).founder,true);
    const refundAt = new Date(Date.parse(purchaseTime)+1000).toISOString();
    await rpc("event",event("late",{state:"refunded",eventAt:refundAt}));
    await rpc("event",event("late"));
    assert.equal((await lookup()).founder,false);
    assert.equal((await rpc("status")).confirmed,1);
    await rpc("event",event("late",{environment:"sandbox"}));
    assert.equal((await rpc("status",{environment:"sandbox"})).confirmed,1);
    assert.equal((await rpc("status")).confirmed,1);
    for (const status of ["inactive","paused"]) { await rpc("control",{status}); assert.equal((await reserve(status)).allowed,false); }
    await rpc("control",{status:"active"});
    // Seed 989 genuine-shaped rows, leaving exactly one reservable slot before the safety buffer.
    await db.exec(`insert into inout_private.founder_purchases select 'production','APP_STORE','seed-'||i,'com.imrtech.inout.pro.lifetime','seed-'||i,now(),now(),'purchased',true,now(),'seed-'||i from generate_series(1,988) i`);
    const last = await Promise.all([reserve("last-android"),rpc("reserve",{customerId:"last-ios",tokenHash:sha("last-ios"),platform:"ios"})]);
    assert.equal(last.filter(r=>r.allowed).length,1);
    assert.equal((await reserve("last-android")).allowed,true);
    assert.equal((await rpc("status")).available,0);
    await rpc("event",event("990",{customerId:"last-android"}));
    assert.equal((await rpc("status")).status,"paused");
    for (let i=991;i<=999;i++) await rpc("event",event(String(i)));
    assert.equal((await rpc("status")).confirmed,999);
    assert.equal((await reserve("at999")).allowed,false);
    await rpc("event",event("1000"));
    assert.equal((await rpc("status")).status,"sold_out");
    assert.equal((await rpc("status")).confirmed,1000);
    await rpc("event",event("overflow"));
    assert.equal((await rpc("lookup",{purchases:[{store:"PLAY_STORE",transactionId:"overflow"}]})).founder,false);
    assert.equal((await rpc("status")).confirmed,1001); // Recorded honestly; never revokes store access.
    await rpc("control",{status:"closed"});
    await assert.rejects(rpc("control",{status:"active",ready:true}),/Closed is permanent/);
    assert.equal((await reserve("closed")).allowed,false);
    assert.equal((await rpc("lookup",{environment:"sandbox",purchases:[{store:"PLAY_STORE",transactionId:"late"}]})).founder,true);
  } finally { await db.close(); }
});

test("founder endpoint trusts authenticated provider evidence only; refunds, restores, sandbox and checkout guards", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    await db.exec(readFileSync(migration,"utf8"));
    const rpc = async (action: string,data: object) => (await db.query<{value:any}>("select public.inout_founders($1,$2::jsonb) value",[action,JSON.stringify(data)])).rows[0].value;
    const config: FounderConfig = {apiKey:"server-key",projectId:"proj_inout",webhookToken:"w".repeat(40),adminToken:"a".repeat(40),sandboxCodeHash:sha("private-test-code")};
    const purchase: any = {object:"purchase",id:"purchase-1",customer_id:"rc-customer",product_id:"rc-product",purchased_at:Date.parse(purchaseTime),
      status:"refunded",environment:"production",store:"play_store",store_purchase_identifier:"store-tx",ownership:"purchased",
      entitlements:{object:"list",items:[{state:"active",lookup_key:"in_out_pro",products:{object:"list",items:[{state:"active",store_identifier:product}]}}]}};
    const subscriptions: any[] = [];
    let apiStatus = 200;
    const fetcher: typeof fetch = async (url,init) => {
      assert.match(String(url),/^https:\/\/api.revenuecat.com\/v2\/projects\/proj_inout\/customers/);
      assert.equal((init!.headers as any).Authorization,"Bearer server-key");
      if (apiStatus !== 200) return Response.json({error:"unavailable"},{status:apiStatus});
      const path = new URL(String(url)).pathname;
      if (path.endsWith("/aliases")) return Response.json({object:"list",items:[{object:"customer.alias",id:"customer"},{object:"customer.alias",id:"restored-alias"}],next_page:null});
      if (path.endsWith("/purchases")) return Response.json({object:"list",items:[purchase],next_page:null});
      if (path.endsWith("/subscriptions")) return Response.json({object:"list",items:subscriptions,next_page:null});
      return Response.json({object:"list",items:[{object:"customer",id:"rc-customer"}],next_page:null});
    };
    const handler = founderHandler(rpc,()=>config,fetcher);
    const call = (body: object,path="",authorization="") => handler(new Request(`https://example.test/inout-founders${path}`,{method:"POST",headers:{Authorization:authorization,"x-forwarded-for":"203.0.113.1"},body:JSON.stringify({customerId:"customer",...body})}));
    const admin = (body: object) => call({environment:"production",...body},"/admin",`Bearer ${config.adminToken}`);
    assert.equal((await call({action:"control",environment:"production",status:"active"},"/admin")).status,401);
    assert.equal((await admin({action:"control",status:"active",ready:true})).status,200);
    assert.equal((await call({action:"reserve",token:"b".repeat(64),platform:"android"})).status,200);
    assert.equal((await call({action:"status",environment:"sandbox",code:"wrong"})).status,403);
    purchase.status="owned";
    const webhook: any = { id:"hook-1",type:"NON_RENEWING_PURCHASE",environment:"PRODUCTION",store:"PLAY_STORE",product_id:product,
      transaction_id:"store-tx",app_user_id:"customer",purchased_at_ms:Date.parse(purchaseTime),event_timestamp_ms:Date.parse(purchaseTime)+100,entitlement_ids:["in_out_pro"] };
    assert.equal((await call({event:webhook},"/webhook")).status,401);
    const send = () => call({event:webhook},"/webhook",`Bearer ${config.webhookToken}`);
    assert.equal((await send()).status,200);
    assert.equal((await send()).status,200);
    assert.equal((await (await admin({action:"status"})).json()).confirmed,1);
    // Client purchase claims cannot create allocations or premium grants.
    assert.equal((await call({action:"event",transactionId:"fake"})).status,400);
    assert.equal((await (await call({action:"reconcile"})).json()).founder,true);
    assert.equal((await (await call({action:"reconcile",customerId:"restored-alias"})).json()).founder,true);
    assert.equal((await (await admin({action:"status"})).json()).confirmed,1);
    // REST recovery of a missed hook uses the exact canonical store transaction, idempotently.
    purchase.store_purchase_identifier="late-hook";
    assert.equal((await (await call({action:"reconcile"})).json()).founder,true);
    assert.equal((await (await admin({action:"status"})).json()).confirmed,2);
    assert.equal((await call({action:"reserve",token:"c".repeat(64),platform:"ios"})).status,409);
    purchase.store_purchase_identifier="store-tx";
    webhook.id="refund";webhook.type="CANCELLATION";webhook.event_timestamp_ms+=1000;
    assert.equal((await send()).status,200);
    assert.equal((await (await call({action:"reconcile"})).json()).founder,false); // stale REST cannot undo refund
    assert.equal((await (await admin({action:"status"})).json()).confirmed,2);
    purchase.environment="sandbox";
    assert.deepEqual(await (await call({action:"reconcile"})).json(),{founder:true,environment:"sandbox"});
    assert.equal((await (await admin({action:"status"})).json()).confirmed,2);
    purchase.status="refunded";
    subscriptions.push({object:"subscription",id:"subscription-1",gives_access:true});
    const blocked = await call({action:"reserve",token:"d".repeat(64),platform:"android"});
    assert.equal((await blocked.json()).error,"active_subscription");
    apiStatus=500;
    assert.equal((await call({action:"reconcile"})).status,503);
    config.apiKey="";
    assert.equal((await (await call({action:"status"})).json()).allowed,false);
    assert.equal((await call({action:"status",filler:"x".repeat(70000)})).status,503);
  } finally { await db.close(); }
});

function mobile() {
  let time=100000, disk="{}", calls=0, restored=0, reserveCalls=0, offerMissing=false, backendDown=false, recognized=true;
  let evidence: EntitlementGrant = {source:"store",status:"free",active:false,verifiedAt:time,expiresAt:0,graceUntil:null};
  const lifetime = (): EntitlementGrant => ({source:"store",status:"active",active:true,lifetime:true,productId:product,verifiedAt:time,expiresAt:0,graceUntil:null});
  let outcome="success";
  const events: string[]=[];
  const analytics=new AnalyticsService({record:e=>events.push(e)});
  const entitlements=new EntitlementService(false,()=>time);
  const adapter: SubscriptionProvider={mode:"store",offers:async()=>[],managementUrl:async()=>null,refresh:async()=>evidence,purchase:async()=>evidence,
    restore:async()=>{restored++;return evidence;},lifetime:{customerId:async()=>"customer",offer:async()=>{if(offerMissing) throw Error("missing");return {productId:product,price:"CLP 24.990"};},
      purchase:async()=>{calls++;if(outcome!=="success") throw new SubscriptionError(outcome as any,"error");evidence=lifetime();return evidence;}}};
  const subscriptions=new SubscriptionService(adapter,entitlements,analytics);
  const storage={read:()=>disk,write:(s:string)=>{disk=s;}};
  const request=async (b:Record<string,unknown>)=>{
    if(backendDown) throw Error("offline");
    if(b.action==="status")return {status:"active",allowed:true};
    if(b.action==="reserve"){reserveCalls++;return {allowed:true};}
    if(b.action==="reconcile")return {founder:recognized,environment:"production",pending:!recognized};
    return {};
  };
  const make=()=>new FounderService(subscriptions,entitlements,analytics,request,storage,()=>"a".repeat(64),"android",()=>time);
  const service=make();
  return {service,make,entitlements,subscriptions,events,lifetime,adapter,storage,calls:()=>calls,restored:()=>restored,reserves:()=>reserveCalls,
    setOutcome:(v:string)=>{outcome=v;},setEvidence:(v:EntitlementGrant)=>{evidence=v;},missing:()=>{offerMissing=true;},offline:()=>{backendDown=true;},unrecognized:()=>{recognized=false;},time:(v:number)=>{time=v;}};
}
test("Lifetime purchase shares verified entitlement/ad suppression, blocks duplicate taps, recognizes and restores idempotently", async()=>{
  const f=mobile();await f.service.load();
  await Promise.all([f.service.purchase(),f.service.purchase()]);
  assert.equal(f.calls(),1);assert.equal(f.reserves(),1);assert.equal(f.entitlements.state.lifetimePro,true);
  assert.equal(f.entitlements.state.expiresAt,null);assert.equal(f.service.member,true);
  const ads=new AdService(f.entitlements,"preview");
  assert.equal(ads.allowed("today",{path:"/",foreground:true,sessionStage:null}),false);
  await f.service.purchase();assert.equal(f.calls(),1);
  await f.service.restore();await f.service.restore();assert.equal(f.restored(),2);
  assert.equal(f.events.filter(e=>e==="founder_purchase_completed").length,1);
  assert.equal(f.events.filter(e=>e==="founder_purchase_restored").length,1);
  const restarted=f.make();await restarted.reconcile();assert.equal(restarted.member,true);
  f.setEvidence({...f.lifetime(),active:false,status:"expired",verifiedAt:100001});f.time(100001);
  await f.subscriptions.refreshAccess();await restarted.reconcile();
  assert.equal(restarted.member,false);assert.equal(f.entitlements.state.pro,false);
  assert.equal(ads.allowed("today",{path:"/",foreground:true,sessionStage:null}),true);
});
test("Lifetime guardrails: pending/failure survive restart; cancellation releases; missing products/offline/subscribers never launch",async()=>{
  for(const outcome of ["pending","failed","network","cancelled"]){
    const f=mobile();f.setOutcome(outcome);await f.service.load();await f.service.purchase();
    assert.equal(f.entitlements.state.pro,false);assert.equal(f.service.member,false);
    assert.equal(f.service.pending,outcome!=="cancelled");
    const restarted=f.make();await restarted.load();await restarted.purchase();
    assert.equal(f.calls(),outcome==="cancelled"?2:1);
    assert.ok(!f.events.includes("founder_purchase_completed"));
  }
  const missing=mobile();missing.missing();await missing.service.load();await missing.service.purchase();assert.equal(missing.calls(),0);
  const offline=mobile();await offline.service.load();offline.offline();await offline.service.purchase();assert.equal(offline.calls(),0);
  const subscriber=mobile();subscriber.setEvidence({...subscriber.lifetime(),lifetime:false,productId:"monthly",expiresAt:200000});
  await subscriber.service.load();await subscriber.service.purchase();assert.equal(subscriber.calls(),0);assert.equal(subscriber.reserves(),0);
  assert.match(subscriber.service.message,/overlapping charges/);
});
test("backend outage/delayed accounting never removes a legitimate store-backed Lifetime grant",async()=>{
  const f=mobile();f.unrecognized();await f.service.load();await f.service.purchase();
  assert.equal(f.entitlements.state.pro,true);assert.equal(f.service.member,false);assert.equal(f.service.pending,true);
  assert.equal(f.events.includes("founder_purchase_completed"),false);
  f.offline();await f.service.reconcile();assert.equal(f.entitlements.state.pro,true);
});
test("non-expiring access requires known lifetime product and verified RC evidence; subscriptions and reviewer remain distinct",()=>{
  const info=(id:string,active=true): CustomerInfo => ({requestDate:new Date(1000).toISOString(),entitlements:{verification:"VERIFIED",all:{in_out_pro:{productIdentifier:id,expirationDate:null,isActive:active,willRenew:false,periodType:"NORMAL"}}}} as unknown as CustomerInfo);
  for(const id of [product,"com.imrtech.inout.pro.lifetime"]){
    const e=new EntitlementService(false,()=>2000);e.acceptStoreGrant(grantFromCustomerInfo(info(id)));
    assert.equal(e.state.lifetimePro,true);assert.equal(e.state.status,"active");
    e.acceptStoreGrant(grantFromCustomerInfo(info(id,false)));assert.equal(e.state.pro,false);
  }
  const e=new EntitlementService(false,()=>2000);e.acceptStoreGrant(grantFromCustomerInfo(info("monthly")));assert.equal(e.state.pro,false);
  e.acceptReviewerGrant({verifiedAt:1000,expiresAt:5000});assert.equal(e.state.pro,true);assert.equal(e.state.lifetimePro,false);
});
test("verified Lifetime remains Pro beyond the subscription offline window while rollback and revocation fail closed",()=>{
  let now=1_000_000;
  const cache={value:"",read(){return this.value;},write(value:string){this.value=value;}};
  const first=new EntitlementService(false,()=>now,cache);
  first.acceptStoreGrant({source:"store",status:"active",active:true,lifetime:true,productId:product,verifiedAt:now,expiresAt:0,graceUntil:null});
  now += 30 * 86400000;
  const restarted=new EntitlementService(false,()=>now,cache);
  assert.equal(restarted.state.lifetimePro,true);
  assert.equal(restarted.state.needsRefresh,true);
  restarted.acceptStoreGrant({source:"store",status:"expired",active:false,lifetime:true,productId:product,verifiedAt:now,expiresAt:0,graceUntil:null});
  assert.equal(restarted.state.pro,false);
  now -= 31 * 86400000;
  assert.equal(restarted.state.pro,false);
});
