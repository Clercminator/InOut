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
  InterstitialAd: { createForAdRequest: (...args: unknown[]) => mockFactory(...args) }, AdEventType: { LOADED: "loaded", OPENED: "opened", CLOSED: "closed", ERROR: "error" },
}));
const context = { path: "/result", foreground: true, sessionStage: "result" };
function fixture(saved: unknown = null, priorCompletions = 2) {
  let now = 1000000, persisted = saved ?? { seen: [], count: priorCompletions, day: "", shown: 0, lastAd: 0, lastPaywall: 0, highWater: 1000000 };
  const events = new Map<string, () => void>();
  const load = jest.fn(), show = jest.fn(async () => {});
  const track = jest.fn();
  mockFactory.mockImplementation(() => ({ load, show, addAdEventListener: (type: string, listener: () => void) => { events.set(type, listener); return () => events.delete(type); } }));
  const entitlements = new EntitlementService(true, () => now);
  const storage = { read: () => persisted, write: (value: unknown) => { persisted = JSON.parse(JSON.stringify(value)); } };
  const ads = new AdService(entitlements, "test", storage, () => now, track);
  return { ads, entitlements, events, load, show, storage, track, tick: (ms = 600001) => { now += ms; }, now: () => now };
}
beforeEach(() => { jest.clearAllMocks(); mockConsent.mockResolvedValue({ canRequestAds: true }); mockInitialize.mockResolvedValue([]); mockConfigure.mockResolvedValue(undefined); });

test("eligible tab changes notify subscribers and safety never allows a request", async () => {
  const f = fixture(), update = jest.fn();
  f.ads.subscribe(update);
  f.ads.setContext({ ...context, path: "/challenges", sessionStage: null });
  expect(update).toHaveBeenCalled();
  expect(f.ads.allowed("challenges", { ...context, path: "/challenges", sessionStage: null })).toBe(true);
  f.ads.setContext({ ...context, path: "/practice-safety", sessionStage: null });
  await f.ads.prepare();
  expect(mockConsent).not.toHaveBeenCalled();
  expect(mockInitialize).not.toHaveBeenCalled();
});

test("consent is cached across eligible surfaces, refreshed hourly, and failures retry after a minute", async () => {
  const f = fixture(); await f.ads.prepare(); await f.ads.prepare();
  expect(mockConsent).toHaveBeenCalledTimes(1); expect(mockInitialize).toHaveBeenCalledTimes(1);
  f.tick(3600001); mockConsent.mockRejectedValueOnce(Error("offline"));
  await expect(f.ads.prepare()).rejects.toThrow("offline"); expect(f.ads.ready).toBe(false);
  await f.ads.prepare(); expect(mockConsent).toHaveBeenCalledTimes(2);
  f.tick(60001); await f.ads.prepare(); expect(f.ads.ready).toBe(true);
  expect(mockConsent).toHaveBeenCalledTimes(3); expect(mockInitialize).toHaveBeenCalledTimes(1);
});

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
test("completion ads require consent, app age, unique completion, dismissal, interval and daily caps", async () => {
  const f = fixture(null, 0); await f.ads.prepare(); f.ads.setContext(context);
  f.ads.prepareCompletion("early"); expect(f.load).not.toHaveBeenCalled(); f.tick(180001);
  f.ads.prepareCompletion("second"); expect(f.load).not.toHaveBeenCalled();
  f.ads.prepareCompletion("third"); f.ads.prepareCompletion("third"); expect(f.load).toHaveBeenCalledTimes(1); expect(f.show).not.toHaveBeenCalled();
  expect(f.track).toHaveBeenCalledWith("ad_requested");
  expect(mockFactory).toHaveBeenCalledWith("test-interstitial", { requestNonPersonalizedAdsOnly: true });
  f.events.get("loaded")!(); const done = f.ads.showCompletion("third"); expect(f.show).toHaveBeenCalledTimes(1);
  f.events.get("opened")!(); f.events.get("closed")!(); await done;
  expect(f.track.mock.calls.map(call => call[0])).toEqual(["ad_requested", "ad_loaded", "ad_impression", "ad_dismissed"]);
  for (const id of ["four", "five", "six"]) f.ads.prepareCompletion(id); expect(f.load).toHaveBeenCalledTimes(1);
  f.tick(); f.ads.prepareCompletion("seven"); f.events.get("loaded")!(); const next = f.ads.showCompletion("seven"); f.events.get("closed")!(); await next;
  f.tick(); for (const id of ["eight", "nine", "ten"]) f.ads.prepareCompletion(id); expect(f.load).toHaveBeenCalledTimes(2);
  const restarted = new AdService(f.entitlements, "test", f.storage, f.now); await restarted.prepare(); restarted.setContext(context); f.tick(); restarted.prepareCompletion("eleven"); expect(f.load).toHaveBeenCalledTimes(2);
});
test("Done records unavailable inventory without delaying navigation", async () => {
  const f = fixture(); await f.ads.prepare(); f.ads.setContext(context); f.tick();
  for (const id of ["one", "two", "three"]) f.ads.prepareCompletion(id);
  await f.ads.showCompletion("three");
  expect(f.track).toHaveBeenCalledWith("ad_unavailable", { outcome: "unavailable" });
  expect(f.show).not.toHaveBeenCalled();
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
  const valid = fixture(); await valid.ads.prepare(); valid.tick(); valid.ads.setContext(context); valid.tick(-1000000);
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
  await expect(f.ads.showCompletion("d")).resolves.toBe(false); expect(f.events.size).toBe(0);
});

test("a saved completion presents automatically and reports thanks only after an impression", async () => {
  const f = fixture(); f.tick(); f.ads.setContext(context);
  const shown = f.ads.presentCompletion("saved");
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(f.load).toHaveBeenCalledTimes(1);
  f.events.get("loaded")!();
  for (let i = 0; i < 5; i++) await Promise.resolve();
  expect(f.show).toHaveBeenCalledTimes(1);
  f.events.get("opened")!(); f.events.get("closed")!();
  await expect(shown).resolves.toBe(true);
  await expect(f.ads.presentCompletion("saved")).resolves.toBe(false);
  expect(f.show).toHaveBeenCalledTimes(1);
});

test("automatic completion loading expires and cannot show a late ad", async () => {
  jest.useFakeTimers();
  try {
    const f = fixture(); f.tick(); f.ads.setContext(context);
    const shown = f.ads.presentCompletion("saved");
    for (let i = 0; i < 10; i++) await Promise.resolve();
    const lateLoad = f.events.get("loaded")!;
    await jest.advanceTimersByTimeAsync(3001);
    await expect(shown).resolves.toBe(false);
    lateLoad();
    expect(f.show).not.toHaveBeenCalled(); expect(f.events.size).toBe(0);
  } finally { jest.useRealTimers(); }
});

test("leaving the result during consent or loading cancels automatic presentation", async () => {
  const f = fixture(); f.tick(); f.ads.setContext(context);
  let consent!: (value: { canRequestAds: boolean }) => void;
  mockConsent.mockReturnValueOnce(new Promise(resolve => { consent = resolve; }));
  let focused = true;
  const beforeLoad = f.ads.presentCompletion("saved", () => focused);
  focused = false; consent({ canRequestAds: true });
  await expect(beforeLoad).resolves.toBe(false);
  expect(f.load).not.toHaveBeenCalled();
  focused = true;
  const loading = f.ads.presentCompletion("saved", () => focused);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  focused = false; f.ads.cancelCompletion();
  await expect(loading).resolves.toBe(false);
  expect(f.show).not.toHaveBeenCalled();
});
