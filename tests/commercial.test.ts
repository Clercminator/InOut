import test from "node:test";
import assert from "node:assert/strict";
import { EntitlementService, commercialPolicy, proCapabilities, type EntitlementGrant } from "../apps/mobile/src/entitlements";
import { AnalyticsService } from "../apps/mobile/src/analytics";
import { AdService } from "../apps/mobile/src/ads";
import { DevelopmentSubscriptionAdapter, SubscriptionService, grantFromCustomerInfo, type SubscriptionAdapter } from "../apps/mobile/src/subscriptions";
import { protocols } from "../packages/protocols/src/index";
import type { SavedRoutine } from "../packages/shared-types/src/index";
import type { CustomerInfo } from "react-native-purchases";

const routine = (id: string, kind: "pattern" | "mix"): SavedRoutine => ({ id, kind, protocol: protocols[0], updatedAt: 0 });
const grant = (patch: Partial<EntitlementGrant> = {}): EntitlementGrant => ({ source: "store", status: "active", active: true, verifiedAt: 1000, expiresAt: 10000, graceUntil: null, ...patch });

test("Free quotas distinguish new saves, edits and kind changes; Pro removes limits", () => {
  const e = new EntitlementService(true, () => 1000);
  const items = [routine("p", "pattern"), routine("m", "mix")];
  assert.equal(e.routineAccess("pattern", [], "p").allowed, true);
  assert.equal(e.routineAccess("pattern", items).allowed, false);
  assert.equal(e.routineAccess("mix", items).allowed, false);
  assert.equal(e.routineAccess("pattern", items, "p").allowed, true);
  assert.equal(e.routineAccess("mix", items, "p").allowed, false);
  e.simulate("active");
  for (const capability of proCapabilities) assert.equal(e.has(capability), true);
  assert.equal(e.routineAccess("pattern", items).allowed, true);
  e.simulate("expired");
  assert.equal(e.routineAccess("pattern", [...items, routine("p2", "pattern")], "p2").allowed, true);
});

test("production refuses mock grants and ignores cached mocks or old pro booleans", () => {
  for (const cached of [{ pro: true }, grant({ source: "development" }), { ...grant(), expiresAt: "forever" }]) {
    const e = new EntitlementService(false, () => 1000, { read: () => cached, write: () => {} });
    assert.equal(e.state.pro, false);
    assert.throws(() => e.simulate("active"));
    assert.throws(() => e.acceptDevelopmentGrant(grant({ source: "development" })));
  }
});

test("cancelled access expires at paid-through date; grace is explicit, retry does not invent it", () => {
  let now = 9999;
  const e = new EntitlementService(false, () => now);
  e.acceptStoreGrant(grant({ status: "cancelled" }));
  assert.equal(e.state.pro, true);
  now = 10000; assert.equal(e.state.pro, false);
  e.acceptStoreGrant(grant({ status: "billingRetry" }));
  assert.equal(e.state.pro, false);
  e.acceptStoreGrant(grant({ status: "grace", graceUntil: 20000 }));
  assert.equal(e.state.pro, true);
  now = 20000; assert.equal(e.state.pro, false);
});

test("offline cache is bounded, rejects clock rollback, and never writes dev simulation", () => {
  let now = 1000, saved: unknown = null;
  const cache = { read: () => saved, write: (g: EntitlementGrant) => { saved = g; } };
  const e = new EntitlementService(true, () => now, cache);
  e.simulate("active"); assert.equal(saved, null);
  e.acceptStoreGrant(grant({ expiresAt: 1e12 }));
  assert.equal(new EntitlementService(false, () => now, cache).state.pro, true);
  now = 999; assert.equal(e.state.pro, false);
  now = 1000 + commercialPolicy.maxOfflineAgeMs; assert.equal(e.state.pro, false);
  e.acceptStoreGrant(grant({ verifiedAt: now, active: false, status: "expired" }));
  assert.equal(e.state.pro, false);
});

test("ads are denied outside explicit surfaces, during practice/post, in background and for Pro", () => {
  const e = new EntitlementService(true);
  const ads = new AdService(e, "test");
  assert.equal(ads.allowed("today", { path: "/", foreground: true, sessionStage: null }), true);
  for (const path of ["/session", "/pre", "/post", "/result", "/safety", "/onboarding", "/pro"]) {
    assert.equal(ads.allowed("today", { path, foreground: true, sessionStage: null }), false);
  }
  for (const sessionStage of ["active", "post"]) assert.equal(ads.allowed("today", { path: "/", foreground: true, sessionStage }), false);
  assert.equal(ads.allowed("today", { path: "/", foreground: false, sessionStage: null }), false);
  e.simulate("active"); assert.equal(ads.allowed("progress", { path: "/progress", foreground: true, sessionStage: null }), false);
});

test("analytics sends allowlisted names only, ignoring extra runtime payloads and sink failures", () => {
  const received: unknown[] = [];
  const a = new AnalyticsService({ record: (...args) => { received.push(args); } });
  (a.track as Function)("state_shift_pre_recorded", { rating: 7, note: "private" });
  (a.track as Function)("secret_routine");
  assert.deepEqual(received, [["state_shift_pre_recorded"]]);
  assert.doesNotThrow(() => new AnalyticsService({ record: () => { throw Error(); } }).track("app_open"));
});

test("demo purchase/restore/cancel/failure work without producing real conversion events", async () => {
  let now = 1000;
  const e = new EntitlementService(true, () => now);
  const adapter = new DevelopmentSubscriptionAdapter(() => now);
  const events: string[] = [];
  const s = new SubscriptionService(adapter, e, new AnalyticsService({ record: (event) => events.push(event) }));
  await s.load(); assert.equal(s.offers.length, 2); assert.equal(e.state.pro, false);
  adapter.outcome = "cancel"; await s.purchase("monthly"); assert.equal(e.state.pro, false); assert.match(s.message, /cancelled/);
  adapter.outcome = "failure"; await s.purchase("annual"); assert.equal(e.state.pro, false);
  adapter.outcome = "success"; adapter.trial = true; await s.purchase("monthly"); assert.equal(e.state.status, "trial");
  e.simulate("free"); await s.restore(); assert.equal(e.state.pro, true);
  now += 8 * 86400000; await s.restore(); assert.equal(e.state.pro, false);
  assert.deepEqual(events, []);
});

test("store refresh failure preserves unexpired cached access; repeated purchase is serialized", async () => {
  const e = new EntitlementService(false, () => 1000); e.acceptStoreGrant(grant());
  let release!: (g: EntitlementGrant) => void, calls = 0;
  const adapter: SubscriptionAdapter = {
    mode: "store", offers: async () => [], refresh: async () => { throw Error("offline"); },
    purchase: () => { calls++; return new Promise((resolve) => { release = resolve; }); },
    restore: async () => grant(), managementUrl: async () => null,
  };
  const s = new SubscriptionService(adapter, e, new AnalyticsService());
  await s.load(); assert.equal(e.state.pro, true);
  s.offers = [{ id: "monthly", price: "$test", title: "test", period: "month" }];
  const pending = s.purchase("monthly"); await s.purchase("monthly"); assert.equal(calls, 1);
  release(grant()); await pending; assert.equal(s.busy, false);
});

test("RevenueCat mapping preserves expiry, grace and cancelled-active states", () => {
  const info = { requestDate: new Date(1000).toISOString(), entitlements: { all: { pro: {
    productIdentifier: "monthly", isActive: true, expirationDate: new Date(10000).toISOString(),
    willRenew: false, periodType: "NORMAL", billingIssueDetectedAt: null,
  } } }, subscriptionsByProductIdentifier: {} } as unknown as CustomerInfo;
  assert.equal(grantFromCustomerInfo(info).status, "cancelled");
  const withGrace = { ...info, entitlements: { all: { pro: { ...info.entitlements.all.pro, billingIssueDetectedAt: "date" } } },
    subscriptionsByProductIdentifier: { monthly: { gracePeriodExpiresDate: new Date(20000).toISOString() } } } as unknown as CustomerInfo;
  assert.equal(grantFromCustomerInfo(withGrace).status, "grace");
  assert.equal(grantFromCustomerInfo(withGrace).graceUntil, 20000);
});
