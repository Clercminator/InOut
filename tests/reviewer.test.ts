import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { reviewerHandler, sha256, type ReviewerConfig } from "../supabase/functions/inout-reviewer/handler";
import { ReviewerService, ReviewerError, reviewerOfflineMs } from "../apps/mobile/src/reviewer";
import { EntitlementService, proCapabilities } from "../apps/mobile/src/entitlements";
import { AdService } from "../apps/mobile/src/ads";

const installationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
test("reviewer backend uses real SQL for access, expiry, revocation, rotation, limits and role isolation", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    await db.exec(readFileSync(new URL("../supabase/migrations/20261001184153_inout_reviewer_access.sql", import.meta.url), "utf8"));
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select * from inout_private.reviewer_grants"), /permission denied/);
      await assert.rejects(db.query("select public.inout_reviewer_rate('x', 'redeem')"), /permission denied/);
      await assert.rejects(db.query("select public.inout_reviewer_issue('x','x','x',now())"), /permission denied/);
      await assert.rejects(db.query("select public.inout_reviewer_validate('x','x','x')"), /permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    const time = Date.now();
    const config: ReviewerConfig = { enabled: true, codeHash: await sha256("test-only-code"), codeExpiresAt: time + 86400000, generation: "1" };
    const handler = reviewerHandler(async (name, args) => {
      assert.ok(["inout_reviewer_rate", "inout_reviewer_issue", "inout_reviewer_validate"].includes(name));
      const result = await db.query<{ value: unknown }>(`select public.${name}(${Object.keys(args).map((key, i) => `${key} => $${i + 1}`).join(",")}) as value`, Object.values(args));
      return result.rows[0]?.value;
    }, () => config, () => time);
    const call = (body: object) => handler(new Request("https://example.test/inout-reviewer", { method: "POST", body: JSON.stringify({ installationId, ...body }) }));
    assert.equal((await call({ action: "redeem", code: "wrong" })).status, 403);
    const response = await call({ action: "redeem", code: "test-only-code" });
    assert.equal(response.status, 200); assert.match(response.headers.get("cache-control")!, /no-store/);
    const grant = await response.json();
    assert.equal(grant.expiresAt, config.codeExpiresAt);
    const validate = { action: "validate", token: grant.token };
    assert.equal((await call(validate)).status, 200);
    assert.equal((await call({ ...validate, installationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })).status, 403);
    config.enabled = false; assert.equal((await call(validate)).status, 403);
    assert.equal((await call({ action: "redeem", code: "test-only-code" })).status, 403);
    config.enabled = true; config.codeExpiresAt = time - 1;
    assert.equal((await call({ action: "redeem", code: "test-only-code" })).status, 403);
    config.codeExpiresAt = time + 86400000; config.generation = "2";
    assert.equal((await call(validate)).status, 403); config.generation = "1";
    await db.exec("update inout_private.reviewer_grants set revoked=true");
    assert.equal((await call(validate)).status, 403);
    await db.exec("update inout_private.reviewer_grants set revoked=false, expires_at=now()-interval '1 second'");
    assert.equal((await call(validate)).status, 403);
    await db.exec("update inout_private.reviewer_limits set used=10 where key like 'redeem:%'");
    assert.equal((await call({ action: "redeem", code: "wrong" })).status, 429);
    await db.exec("update inout_private.reviewer_limits set used=300 where key='redeem'");
    assert.equal((await call({ action: "redeem", code: "wrong", installationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" })).status, 429);
    assert.equal((await call({ action: "redeem", code: "x".repeat(2100) })).status, 413);
    const broken = reviewerHandler(async () => { throw Error("private DB failure"); }, () => config);
    const failure = await broken(new Request("https://example.test", { method: "POST", body: JSON.stringify({ action: "redeem", installationId }) }));
    assert.equal(failure.status, 503); assert.doesNotMatch(await failure.text(), /private/);
  } finally { await db.close(); }
});

function fixture() {
  let time = 1000000, disk: string | null = null, status = 200;
  const entitlements = new EntitlementService(false, () => time);
  const storage = { read: async () => disk, write: async (value: string) => { disk = value; } };
  const request = async () => { if (status !== 200) throw new ReviewerError(status); return { token: "a".repeat(64), serverTime: time, expiresAt: time + 86400000 }; };
  const service = new ReviewerService(storage, request, () => installationId, entitlements, () => time);
  return { service, storage, request, entitlements, now: () => time, time: (v: number) => { time = v; }, status: (v: number) => { status = v; }, disk: () => disk };
}
test("secure reviewer grants suppress ads, unlock implemented capabilities, expire offline and never unlock future flags", async () => {
  const f = fixture(), ads = new AdService(f.entitlements, "preview");
  const context = { path: "/", foreground: true, sessionStage: null };
  assert.equal(ads.allowed("today", context), false);
  await f.service.initialize(); assert.equal(ads.allowed("today", context), true);
  await f.service.activate("never-persist-this-code");
  assert.equal(f.entitlements.state.source, "reviewer");
  assert.doesNotMatch(f.disk()!, /never-persist/);
  for (const capability of proCapabilities) assert.equal(f.entitlements.has(capability), true);
  assert.equal(f.entitlements.has("futureCloudSync" as any), false);
  assert.equal(ads.allowed("today", context), false);
  await ads.prepare(); assert.equal(ads.ready, false);
  f.status(503); f.time(1000000 + reviewerOfflineMs - 1); await f.service.refresh();
  assert.equal(f.entitlements.state.pro, true);
  f.time(1000000 + reviewerOfflineMs); assert.equal(f.entitlements.state.pro, false);
  const restarted = new EntitlementService(false, f.now);
  await new ReviewerService(f.storage, f.request, () => installationId, restarted, f.now).initialize();
  assert.equal(restarted.state.pro, false);
});
test("invalid/revoked grant removes only reviewer access; failure and rate-limit never fabricate access", async () => {
  const f = fixture(); f.status(403); await f.service.activate("bad"); assert.equal(f.entitlements.state.pro, false);
  f.status(429); await f.service.activate("bad"); assert.match(f.service.message, /Too many/);
  f.status(503); await f.service.activate("bad"); assert.equal(f.entitlements.state.pro, false);
  f.status(200); await f.service.activate("test"); assert.equal(f.entitlements.state.pro, true);
  f.status(403); await f.service.refresh(); assert.equal(f.entitlements.state.pro, false);
  f.entitlements.acceptStoreGrant({ source: "store", status: "active", active: true, verifiedAt: f.now(), expiresAt: f.now()+86400000, graceUntil: null });
  await f.service.refresh(); assert.equal(f.entitlements.state.pro, true);
});
test("clock rollback is rejected across restart; secure storage failure and reset race fail closed", async () => {
  const f = fixture(); await f.service.activate("test"); f.time(1100000); await f.service.checkpoint(); f.time(1050000);
  const e = new EntitlementService(false, f.now);
  await new ReviewerService(f.storage, f.request, () => installationId, e, f.now).initialize(); assert.equal(e.state.pro, false);
  const unavailable = new ReviewerService({ read: async () => { throw Error(); }, write: async () => {} }, f.request, () => installationId, e, f.now);
  await unavailable.activate("test"); assert.equal(e.state.pro, false); assert.equal(e.accessReady, true);
  let finish!: (value: any) => void;
  const race = new ReviewerService(f.storage, () => new Promise(resolve => { finish = resolve; }), () => installationId, e, f.now);
  await race.initialize(); const pending = race.activate("test");
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  await race.clear(); finish({ token: "a".repeat(64), serverTime: f.now(), expiresAt: f.now()+10000 }); await pending;
  assert.equal(e.state.pro, false);
});
