import { AdService } from "../src/ads";
import { EntitlementService } from "../src/entitlements";
import { secureEntitlementCache } from "../src/entitlement-cache";
const mockConsent = jest.fn(), mockInitialize = jest.fn(), mockConfigure = jest.fn();
const mockFactory = jest.fn();
const mockGet = jest.fn(), mockSet = jest.fn();
jest.mock("expo-secure-store", () => ({ getItem: (...args: unknown[]) => mockGet(...args), setItem: (...args: unknown[]) => mockSet(...args), WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device" }));
jest.mock("react-native-google-mobile-ads", () => ({
  default: () => ({ initialize: mockInitialize, setRequestConfiguration: mockConfigure }),
  AdsConsent: { gatherConsent: (...args: unknown[]) => mockConsent(...args), showPrivacyOptionsForm: async () => {}, getConsentInfo: async () => ({ canRequestAds: false }) },
  MaxAdContentRating: { G: "G" }, TestIds: { BANNER: "test-banner", INTERSTITIAL: "test-interstitial" },
  InterstitialAd: { createForAdRequest: (...args: unknown[]) => mockFactory(...args) }, AdEventType: { LOADED: "loaded", CLOSED: "closed", ERROR: "error" },
}));
const context = { path: "/result", foreground: true, sessionStage: "result" };
function fixture(saved: unknown = null) {
  let now = 1000000, persisted = saved;
  const events = new Map<string, () => void>();
  const load = jest.fn(), show = jest.fn(async () => {});
  mockFactory.mockImplementation(() => ({ load, show, addAdEventListener: (type: string, listener: () => void) => { events.set(type, listener); return () => events.delete(type); } }));
  const entitlements = new EntitlementService(true, () => now);
  const storage = { read: () => persisted, write: (value: unknown) => { persisted = JSON.parse(JSON.stringify(value)); } };
  const ads = new AdService(entitlements, "test", storage, () => now);
  return { ads, entitlements, events, load, show, storage, tick: (ms = 600001) => { now += ms; }, now: () => now };
}
beforeEach(() => { jest.clearAllMocks(); mockConsent.mockResolvedValue({ canRequestAds: true }); mockInitialize.mockResolvedValue([]); mockConfigure.mockResolvedValue(undefined); });

test.each(["subscription", "reviewer"])("%s Pro makes zero SDK initialization, banner eligibility or interstitial load requests", async kind => {
  const f = fixture();
  if (kind === "subscription") f.entitlements.simulate("active"); else f.entitlements.acceptReviewerGrant({ verifiedAt: f.now(), expiresAt: f.now() + 3600000 });
  await f.ads.prepare(); f.ads.setContext(context); f.tick(180001);
  for (const id of ["one", "two", "three"]) f.ads.prepareCompletion(id);
  expect(f.ads.allowed("today", { path: "/", foreground: true, sessionStage: null })).toBe(false);
  expect(mockConsent).not.toHaveBeenCalled(); expect(mockInitialize).not.toHaveBeenCalled(); expect(mockFactory).not.toHaveBeenCalled(); expect(f.load).not.toHaveBeenCalled();
});
test("consent denial and unresolved billing prevent every ad request", async () => {
  const f = fixture(); f.entitlements.billingReady = false; await f.ads.prepare(); expect(mockConsent).not.toHaveBeenCalled();
  f.entitlements.billingReady = true; mockConsent.mockResolvedValue({ canRequestAds: false }); await f.ads.prepare();
  f.ads.setContext(context); f.tick(); for (const id of ["a", "b", "c"]) f.ads.prepareCompletion(id);
  expect(mockInitialize).not.toHaveBeenCalled(); expect(mockFactory).not.toHaveBeenCalled();
});
test("completion ads require consent, app age, third unique completion, Done, interval and daily caps", async () => {
  const f = fixture(); await f.ads.prepare(); f.ads.setContext(context);
  f.ads.prepareCompletion("early"); expect(f.load).not.toHaveBeenCalled(); f.tick(180001);
  f.ads.prepareCompletion("second"); f.ads.prepareCompletion("second"); expect(f.load).not.toHaveBeenCalled();
  f.ads.prepareCompletion("third"); expect(f.load).toHaveBeenCalledTimes(1); expect(f.show).not.toHaveBeenCalled();
  expect(mockFactory).toHaveBeenCalledWith("test-interstitial", { requestNonPersonalizedAdsOnly: true });
  f.events.get("loaded")!(); const done = f.ads.showCompletion("third"); expect(f.show).toHaveBeenCalledTimes(1); f.events.get("closed")!(); await done;
  for (const id of ["four", "five", "six"]) f.ads.prepareCompletion(id); expect(f.load).toHaveBeenCalledTimes(1);
  f.tick(); f.ads.prepareCompletion("seven"); f.events.get("loaded")!(); const next = f.ads.showCompletion("seven"); f.events.get("closed")!(); await next;
  f.tick(); for (const id of ["eight", "nine", "ten"]) f.ads.prepareCompletion(id); expect(f.load).toHaveBeenCalledTimes(2);
  const restarted = new AdService(f.entitlements, "test", f.storage, f.now); await restarted.prepare(); restarted.setContext(context); f.tick(); restarted.prepareCompletion("eleven"); expect(f.load).toHaveBeenCalledTimes(2);
});
test.each(["/session", "/challenge-attempt", "/safety", "/onboarding", "/pre", "/post", "/pro"])("%s blocks interstitial preload and showing", async path => {
  const f = fixture(); await f.ads.prepare(); f.tick(); f.ads.setContext({ ...context, path });
  for (const id of ["one", "two", "three"]) f.ads.prepareCompletion(id);
  await f.ads.showCompletion("three"); expect(mockFactory).not.toHaveBeenCalled(); expect(f.show).not.toHaveBeenCalled();
});
test("a loaded ad is discarded on upgrade, challenge start or background; late delivery cannot show", async () => {
  for (const change of ["upgrade", "reviewer", "background", "challenge"]) {
    const f = fixture(); await f.ads.prepare(); f.tick(); f.ads.setContext(context);
    for (const id of ["one", "two", "three"]) f.ads.prepareCompletion(id);
    const delivered = f.events.get("loaded")!;
    if (change === "upgrade") f.entitlements.simulate("active");
    else if (change === "reviewer") f.entitlements.acceptReviewerGrant({ verifiedAt: f.now(), expiresAt: f.now() + 3600000 });
    else f.ads.setContext({ ...context, foreground: change !== "background", challengeActive: change === "challenge" });
    delivered(); await f.ads.showCompletion("three"); expect(f.show).not.toHaveBeenCalled();
  }
});
test("paywall dismissal prevents preload, and unavailable ads never delay Done", async () => {
  const f = fixture(); await f.ads.prepare(); f.tick(); f.ads.setContext(context);
  const close = f.ads.paywallOpened(); close();
  for (const id of ["one", "two", "three"]) f.ads.prepareCompletion(id); expect(f.load).not.toHaveBeenCalled();
  f.tick(); f.ads.prepareCompletion("four"); expect(f.load).toHaveBeenCalledTimes(1);
  await f.ads.showCompletion("four"); expect(f.show).not.toHaveBeenCalled(); expect(f.events.size).toBe(0);
});
test("malformed persisted caps and clock rollback fail closed", async () => {
  const f = fixture({ seen: "wrong" }); await f.ads.prepare(); f.tick(); f.ads.setContext(context);
  for (const id of ["a", "b", "c"]) f.ads.prepareCompletion(id); expect(mockFactory).not.toHaveBeenCalled();
  const valid = fixture(); await valid.ads.prepare(); valid.tick(); valid.ads.setContext(context); valid.ads.prepareCompletion("a"); valid.tick(-100);
  valid.ads.prepareCompletion("b"); valid.ads.prepareCompletion("c"); expect(mockFactory).not.toHaveBeenCalled();
});
test("secure billing cache is device-bound, namespaced, and refuses a future timestamp", () => {
  const cache = secureEntitlementCache("store"); const grant = { source: "store", status: "active", active: true, verifiedAt: Date.now(), expiresAt: Date.now() + 10000, graceUntil: null } as const;
  cache.write(grant); expect(mockSet).toHaveBeenCalledWith("inout.billing.v2.store", expect.any(String), { keychainAccessible: "device" });
  mockGet.mockReturnValue(JSON.stringify({ savedAt: Date.now() + 100000, grant })); expect(cache.read()).toBeNull();
  mockGet.mockReturnValue(JSON.stringify({ savedAt: Date.now(), grant })); expect(cache.read()).toEqual(grant);
});

test("native load/show exceptions are contained and never prevent leaving a result", async () => {
  const f = fixture(); await f.ads.prepare(); f.tick(); f.ads.setContext(context);
  mockFactory.mockImplementationOnce(() => { throw Error("native unavailable"); });
  for (const id of ["a", "b", "c"]) expect(() => f.ads.prepareCompletion(id)).not.toThrow();
  await f.ads.showCompletion("c");
  f.ads.prepareCompletion("d"); f.events.get("loaded")!(); f.show.mockImplementationOnce(() => { throw Error("no fill"); });
  await expect(f.ads.showCompletion("d")).resolves.toBeUndefined(); expect(f.events.size).toBe(0);
});
