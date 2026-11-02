import { AppState, Platform, type AppStateStatus } from "react-native";
import { watchSubscriptionAccess } from "../src/subscription-lifecycle";
import { EntitlementService, type EntitlementGrant } from "../src/entitlements";
import { SubscriptionService, type SubscriptionProvider } from "../src/subscriptions";
import { AnalyticsService } from "../src/analytics";

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(100000); AppState.currentState = "active"; });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test.each(["ios", "android"] as const)("%s reconciles launch, foreground, in-place expiry and listener updates", async platform => {
  jest.replaceProperty(Platform, "OS", platform);
  let current: EntitlementGrant = { source: "store", status: "active", active: true, verifiedAt: Date.now(), expiresAt: Date.now() + 3000, graceUntil: null };
  let onState!: (state: AppStateStatus) => void, onInfo!: (grant: EntitlementGrant) => void;
  const remove = jest.fn(), unlisten = jest.fn();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener) => { onState = listener; return { remove }; });
  const refresh = jest.fn(async () => current);
  const adapter: SubscriptionProvider = { mode: "store", refresh, offers: async () => [], purchase: async () => current,
    restore: async () => current, managementUrl: async () => null, listen: callback => { onInfo = callback; return unlisten; } };
  const e = new EntitlementService(), s = new SubscriptionService(adapter, e, new AnalyticsService());
  const stop = watchSubscriptionAccess(s, e);
  await jest.advanceTimersByTimeAsync(1000);
  expect(e.state.pro).toBe(true); expect(refresh).toHaveBeenCalledTimes(1);
  current = { ...current, active: false, status: "expired", verifiedAt: Date.now() };
  await jest.advanceTimersByTimeAsync(2000);
  expect(refresh).toHaveBeenCalledTimes(2); expect(e.state.pro).toBe(false); expect(e.billingReady).toBe(true);
  current = { ...current, active: true, status: "active", verifiedAt: Date.now(), expiresAt: Date.now() + 600000 };
  await s.restore(); expect(e.state.pro).toBe(true);
  current = { ...current, active: false, status: "free" };
  AppState.currentState = "background"; onState("background");
  await jest.advanceTimersByTimeAsync(5 * 60000); expect(refresh).toHaveBeenCalledTimes(2);
  AppState.currentState = "active"; onState("active"); await jest.advanceTimersByTimeAsync(0);
  expect(e.state.pro).toBe(false); expect(refresh).toHaveBeenCalledTimes(3);
  onInfo({ ...current, active: true, status: "cancelled", verifiedAt: Date.now(), expiresAt: Date.now() + 600000 });
  expect(e.state.pro).toBe(true); // Cancellation preserves paid-through access.
  onInfo({ ...current, verifiedAt: Date.now() }); expect(e.state.pro).toBe(false);
  stop(); expect(remove).toHaveBeenCalledTimes(1); expect(unlisten).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(10 * 60000); expect(refresh).toHaveBeenCalledTimes(3);
});
