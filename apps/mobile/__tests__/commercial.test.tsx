import React from "react";
import { AppState } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import Pro from "../app/pro";
import { AdSlot } from "../src/ad-slot";
import { CommercialContext, type CommercialServices } from "../src/commercial-context";
import { EntitlementService } from "../src/entitlements";
import { SubscriptionService } from "../src/subscriptions";
import { DevelopmentSubscriptionProvider } from "../src/subscription-providers/test";
import { AnalyticsService } from "../src/analytics";
import { AdService } from "../src/ads";
import { ReviewerService, ReviewerError } from "../src/reviewer";

let mockPath = "/";
const mockController = { current: null };
const mockConsent = jest.fn();
const mockInitialize = jest.fn();
const mockConfigure = jest.fn();
const mockPrivacyOptions = jest.fn();
const mockConsentInfo = jest.fn();
beforeEach(() => { mockConsent.mockResolvedValue({ canRequestAds: true }); });
jest.mock("react-native-google-mobile-ads", () => ({
  default: () => ({ initialize: mockInitialize, setRequestConfiguration: mockConfigure }),
  AdsConsent: {
    gatherConsent: (...args: unknown[]) => mockConsent(...args),
    showPrivacyOptionsForm: (...args: unknown[]) => mockPrivacyOptions(...args),
    getConsentInfo: (...args: unknown[]) => mockConsentInfo(...args),
  },
  MaxAdContentRating: { G: "G" },
  TestIds: { BANNER: "test-banner" },
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: "adaptive" },
  BannerAd: () => require("react").createElement(require("react-native").View, { testID: "native-banner" }),
}));
jest.mock("expo-router", () => ({ router: { canGoBack: () => false, replace: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => ({}), usePathname: () => mockPath }));
jest.mock("../src/provider", () => ({ useSession: () => mockController }));

function services() {
  const entitlements = new EntitlementService(true);
  const analytics = new AnalyticsService();
  const adapter = new DevelopmentSubscriptionProvider();
  return { entitlements, analytics, subscriptions: new SubscriptionService(adapter, entitlements, analytics), ads: new AdService(entitlements, "preview") };
}
function wrap(s: CommercialServices, child: React.ReactNode) { return <CommercialContext.Provider value={s}>{child}</CommercialContext.Provider>; }

test("reviewer UI handles loading, invalid code, server failure, success and expiry", async () => {
  const s: CommercialServices = services();
  let time = Date.now(), status = 403, finish: ((value: any) => void) | null = null;
  s.entitlements = new EntitlementService(false, () => time);
  s.ads = new AdService(s.entitlements, "preview");
  s.reviewer = new ReviewerService({ read: async () => null, write: async () => {} }, async () => {
    if (status !== 200) throw new ReviewerError(status);
    return new Promise(resolve => { finish = resolve; });
  }, () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", s.entitlements, () => time);
  await s.reviewer.initialize();
  await render(wrap(s, <Pro />));
  await fireEvent.press(screen.getByRole("button", { name: "Reviewer access" }));
  await fireEvent.changeText(screen.getByLabelText("Review code"), "invalid");
  await fireEvent.press(screen.getByRole("button", { name: "Unlock Pro" }));
  expect(screen.getByText("Invalid or unavailable review code.")).toBeTruthy();
  status = 503;
  await fireEvent.changeText(screen.getByLabelText("Review code"), "try-again");
  await fireEvent.press(screen.getByRole("button", { name: "Unlock Pro" }));
  expect(screen.getByText(/Reviewer access could not be verified/)).toBeTruthy();
  status = 200;
  await fireEvent.changeText(screen.getByLabelText("Review code"), "test-code");
  await fireEvent.press(screen.getByRole("button", { name: "Unlock Pro" }));
  expect(screen.getByText("Verifying review code…")).toBeTruthy();
  await act(async () => { finish!({ token: "a".repeat(64), serverTime: time, expiresAt: time + 10000 }); });
  expect(screen.getByText("Reviewer access enabled. Pro features are now available on this device.")).toBeTruthy();
  expect(s.entitlements.has("advancedInsights")).toBe(true);
  expect(s.entitlements.has("advancedReminders")).toBe(true);
  await act(() => { time += 10001; s.entitlements.refresh(); });
  expect(s.entitlements.state.pro).toBe(false);
});

test("Pro screen supports monthly demo purchase, downgrade and restore without charging", async () => {
  const s = services();
  await s.subscriptions.load();
  await render(wrap(s, <Pro />));
  expect(screen.getByText("DEVELOPMENT DEMO")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Simulate Monthly Pro" }));
  expect(s.entitlements.state.pro).toBe(true);
  expect(screen.getByText("Demo Pro activated. No purchase or charge occurred.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Simulate free" }));
  expect(s.entitlements.state.pro).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Restore purchases" }));
  expect(s.entitlements.state.pro).toBe(true);
});

test("annual demo failure/cancellation keep Free; cancelled-active and expired states are distinct", async () => {
  const s = services(); await s.subscriptions.load();
  await render(wrap(s, <Pro />));
  await fireEvent.press(screen.getByRole("button", { name: "Yearly Pro" }));
  await fireEvent.press(screen.getByRole("button", { name: "Next purchase: failure" }));
  await fireEvent.press(screen.getByRole("button", { name: "Simulate Yearly Pro" }));
  expect(s.entitlements.state.pro).toBe(false);
  expect(screen.getByText("Simulated store failure. No charge was made.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Next purchase: cancel" }));
  await fireEvent.press(screen.getByRole("button", { name: "Simulate Yearly Pro" }));
  expect(screen.getByText("Purchase cancelled. Nothing changed.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Simulate cancelled" }));
  expect(s.entitlements.state.pro).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Simulate expired" }));
  expect(s.entitlements.state.pro).toBe(false);
});

test("Expo Go hides technical ad placeholders, including during Pro and State Shift", async () => {
  AppState.currentState = "active";
  const s = services(); mockPath = "/";
  const rendered = await render(wrap(s, <AdSlot placement="today" />));
  expect(screen.queryByText("TEST ADVERTISING")).toBeNull();
  await act(() => s.entitlements.simulate("active"));
  expect(screen.queryByText("TEST ADVERTISING")).toBeNull();
  await act(() => s.entitlements.simulate("free"));
  mockPath = "/post";
  await rendered.rerender(wrap(s, <AdSlot placement="today" />));
  expect(screen.queryByText("TEST ADVERTISING")).toBeNull();
});

test("production entitlement service offers no developer override controls", async () => {
  const s = services();
  const prod = { ...s, entitlements: new EntitlementService(false) };
  await render(wrap(prod, <Pro />));
  expect(screen.queryByRole("button", { name: "Simulate Pro" })).toBeNull();
});

test("live ads cannot initialize before consent or after becoming Pro during consent", async () => {
  mockInitialize.mockClear(); mockConfigure.mockResolvedValue(undefined);
  const e = new EntitlementService(true);
  const ads = new AdService(e, "live");
  mockConsent.mockResolvedValueOnce({ canRequestAds: false });
  await ads.prepare();
  expect(mockInitialize).not.toHaveBeenCalled(); expect(ads.ready).toBe(false);
  let finish!: (info: { canRequestAds: boolean }) => void;
  mockConsent.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const preparing = ads.prepare();
  e.simulate("active"); finish({ canRequestAds: true }); await preparing;
  expect(mockInitialize).not.toHaveBeenCalled(); expect(ads.ready).toBe(false);
});

test("native test ads initialize demo SDK only while the placement stays eligible", async () => {
  mockInitialize.mockClear(); mockInitialize.mockResolvedValue([]);
  mockConfigure.mockResolvedValue(undefined);
  const ads = new AdService(new EntitlementService(), "test");
  await ads.prepare(() => false); expect(mockInitialize).not.toHaveBeenCalled();
  await ads.prepare(() => true); expect(mockInitialize).toHaveBeenCalledTimes(1); expect(ads.ready).toBe(true);
});

test("mounted banners disappear immediately when privacy choices are reopened and stay hidden after revocation", async () => {
  AppState.currentState = "active";
  mockPath = "/";
  mockInitialize.mockResolvedValue([]);
  mockConfigure.mockResolvedValue(undefined);
  const s = services();
  s.ads = new AdService(s.entitlements, "test");
  await render(wrap(s, <AdSlot placement="today" />));
  await fireEvent.press(screen.getByRole("button", { name: "Load native test ad" }));
  expect(screen.getByTestId("native-banner")).toBeTruthy();
  let closeForm!: () => void;
  mockPrivacyOptions.mockImplementationOnce(() => new Promise<void>(resolve => { closeForm = resolve; }));
  mockConsentInfo.mockResolvedValueOnce({ canRequestAds: false });
  let updating!: Promise<void>;
  await act(() => { updating = s.ads.privacyOptions(); });
  expect(screen.queryByTestId("native-banner")).toBeNull();
  await act(async () => { closeForm(); await updating; });
  expect(screen.queryByTestId("native-banner")).toBeNull();
  expect(s.ads.ready).toBe(false);
});

test("leaving the placement during SDK initialization cannot mark ads ready", async () => {
  const ads = new AdService(new EntitlementService(), "test");
  let eligible = true;
  mockConfigure.mockResolvedValue(undefined);
  mockInitialize.mockImplementationOnce(async () => { eligible = false; return []; });
  await ads.prepare(() => eligible);
  expect(ads.ready).toBe(false);
});

test("reviewer removal returns to Free while leaving normal purchasing available", async () => {
  const s: CommercialServices = services(); const now = Date.now();
  s.reviewer = new ReviewerService({ read: async () => null, write: async () => {} }, async () => ({ token: "a".repeat(64), serverTime: now, expiresAt: now + 86400000 }), () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", s.entitlements, () => now);
  await s.reviewer.activate("test-only-code"); await s.subscriptions.load();
  await render(wrap(s, <Pro />));
  await fireEvent.press(screen.getByRole("button", { name: "Reviewer access" }));
  await fireEvent.press(screen.getByRole("button", { name: "Remove reviewer access" }));
  expect(s.entitlements.state.reviewerPro).toBe(false);
  expect(s.entitlements.state.pro).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Simulate Monthly Pro" }));
  expect(s.entitlements.state.pro).toBe(true);
});

test("the three-plan paywall selects Monthly even when Yearly is best value; Weekly requires a tap", async () => {
  const s = services(); await s.subscriptions.load();
  s.subscriptions.offers = [
    { id: "weekly", title: "Weekly Pro", price: "3.000 CLP", period: "week", priceAmount: 3000, currency: "CLP" },
    { id: "monthly", title: "Monthly Pro", price: "8.000 CLP", period: "month", priceAmount: 8000, currency: "CLP" },
    { id: "annual", title: "Yearly Pro", price: "60.000 CLP", period: "year", priceAmount: 60000, currency: "CLP" },
  ];
  await render(wrap(s, <Pro />));
  expect(screen.getByText("BEST VALUE")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Monthly Pro" }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole("button", { name: "Weekly Pro" }).props.accessibilityState.selected).toBe(false);
  expect(screen.getByText("8.000 CLP")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Weekly Pro" }));
  expect(screen.getByRole("button", { name: "Weekly Pro" }).props.accessibilityState.selected).toBe(true);
});

test("reopening privacy choices invalidates consent already in flight", async () => {
  const ads = new AdService(new EntitlementService(), "live");
  mockInitialize.mockClear(); let consent!: (value: unknown) => void;
  mockConsent.mockImplementationOnce(() => new Promise(resolve => { consent = resolve; }));
  mockPrivacyOptions.mockResolvedValue(undefined); mockConsentInfo.mockResolvedValue({ canRequestAds: false });
  const pending = ads.prepare(); await ads.privacyOptions(); consent({ canRequestAds: true }); await pending;
  expect(ads.ready).toBe(false); expect(mockInitialize).not.toHaveBeenCalled();
});
