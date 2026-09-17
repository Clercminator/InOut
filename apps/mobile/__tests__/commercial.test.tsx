import React from "react";
import { AppState } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import Pro from "../app/pro";
import { AdSlot } from "../src/ad-slot";
import { CommercialContext, type CommercialServices } from "../src/commercial-context";
import { EntitlementService } from "../src/entitlements";
import { DevelopmentSubscriptionAdapter, SubscriptionService } from "../src/subscriptions";
import { AnalyticsService } from "../src/analytics";
import { AdService } from "../src/ads";

let mockPath = "/";
const mockController = { current: null };
jest.mock("expo-router", () => ({ router: { canGoBack: () => false, replace: jest.fn(), push: jest.fn() }, usePathname: () => mockPath }));
jest.mock("../src/provider", () => ({ useSession: () => mockController }));

function services() {
  const entitlements = new EntitlementService(true);
  const analytics = new AnalyticsService();
  const adapter = new DevelopmentSubscriptionAdapter();
  return { entitlements, analytics, subscriptions: new SubscriptionService(adapter, entitlements, analytics), ads: new AdService(entitlements, "preview") };
}
function wrap(s: CommercialServices, child: React.ReactNode) { return <CommercialContext.Provider value={s}>{child}</CommercialContext.Provider>; }

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
  await fireEvent.press(screen.getByRole("button", { name: "Next purchase: failure" }));
  await fireEvent.press(screen.getByRole("button", { name: "Simulate Annual Pro" }));
  expect(s.entitlements.state.pro).toBe(false);
  expect(screen.getByText("Simulated store failure. No charge was made.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Next purchase: cancel" }));
  await fireEvent.press(screen.getByRole("button", { name: "Simulate Annual Pro" }));
  expect(screen.getByText("Purchase cancelled. Nothing changed.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Simulate cancelled" }));
  expect(s.entitlements.state.pro).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Simulate expired" }));
  expect(s.entitlements.state.pro).toBe(false);
});

test("ad placement unmounts on Pro and cannot appear on State Shift", async () => {
  AppState.currentState = "active";
  const s = services(); mockPath = "/";
  const rendered = await render(wrap(s, <AdSlot placement="today" />));
  expect(screen.getByText("TEST ADVERTISING")).toBeTruthy();
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
