jest.mock("expo-audio", () => ({}));
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { CustomerInfo, PurchasesOffering } from "react-native-purchases";
import { Paywall } from "../src/paywall";
import { CommercialContext, type CommercialServices } from "../src/commercial-context";
import { EntitlementService } from "../src/entitlements";
import { SubscriptionService, SubscriptionError, unavailableSubscriptions } from "../src/subscriptions";
import { grantFromCustomerInfo } from "../src/subscription-providers/revenuecat";
import { AnalyticsService } from "../src/analytics";
import { AdService } from "../src/ads";
import { ThemeSurface } from "../src/theme";
import { setLanguage } from "../src/i18n";

let mockPaywall: any;
jest.mock("react-native-purchases-ui", () => ({ default: { Paywall: (props: any) => {
  mockPaywall = props;
  return require("react").createElement(require("react-native").View, { testID: "remote-paywall" });
} } }));
jest.mock("expo-router", () => ({ router: { canGoBack: () => false, replace: jest.fn() } }));
const offering = { identifier: "default", availablePackages: [{ identifier: "$rc_weekly" }, { identifier: "$rc_monthly" }, { identifier: "$rc_annual" }] } as PurchasesOffering;
function info(verification = "VERIFIED", expiration = Date.now() + 86400000, willRenew = true) {
  return { requestDate: new Date().toISOString(), entitlements: { verification, all: { in_out_pro: {
    productIdentifier: "inout_pro", expirationDate: new Date(expiration).toISOString(), isActive: true, willRenew, periodType: "NORMAL",
  } } } } as unknown as CustomerInfo;
}
function services(): CommercialServices {
  const entitlements = new EntitlementService(false), analytics = new AnalyticsService();
  return { entitlements, analytics, ads: new AdService(entitlements, "preview"), subscriptions: new SubscriptionService({
    ...unavailableSubscriptions, mode: "store",
    offers: async () => [
      { id: "weekly", title: "Weekly Pro", price: "$1.23", period: "week" },
      { id: "monthly", title: "Monthly Pro", price: "$4.56", period: "month" },
      { id: "annual", title: "Annual Pro", price: "$45.67", period: "year" },
    ],
    refresh: async () => ({ source: "store", active: false, status: "free", verifiedAt: Date.now(), expiresAt: 0, graceUntil: null }),
    purchase: jest.fn(async () => grantFromCustomerInfo(info())),
    restore: jest.fn(async () => grantFromCustomerInfo(info())),
    remotePaywall: { offering: jest.fn().mockResolvedValue(offering), verify: value => grantFromCustomerInfo(value as CustomerInfo) },
  }, entitlements, analytics) };
}
async function mount(s: CommercialServices, close = jest.fn()) {
  await render(<CommercialContext.Provider value={s}><Paywall entry="onboarding" onClose={close} /></CommercialContext.Provider>);
  return close;
}

test.each(["onboarding", "profile", "theme", "coach", "quota", "protocol"])("%s always uses the branded native offer with one free exit", async entry => {
  const s = services(); setLanguage("en");
  await render(<ThemeSurface mode="light"><CommercialContext.Provider value={s}><Paywall entry={entry} /></CommercialContext.Provider></ThemeSurface>);
  expect(screen.queryByTestId("remote-paywall")).toBeNull();
  expect(s.subscriptions.adapter.remotePaywall!.offering).not.toHaveBeenCalled();
  expect(screen.getAllByRole("button", { name: "Continue for free" })).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Monthly Pro" }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByText("$4.56")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Annual Pro" }));
  await fireEvent.press(screen.getByRole("button", { name: "Continue with Annual Pro" }));
  expect(s.subscriptions.adapter.purchase).toHaveBeenCalledWith("annual");
});

test.each(["purchase", "restore"] as const)("verified %s unlocks immediately and completes onboarding once", async operation => {
  setLanguage("en");
  const s = services(), close = await mount(s);
  await fireEvent.press(screen.getByRole("button", { name: operation === "purchase" ? "Continue with Monthly Pro" : "Restore purchases" }));
  expect(s.entitlements.state.subscriptionPro).toBe(true);
  expect(s.entitlements.has("adFree")).toBe(true);
  expect(s.subscriptions.busy).toBe(false);
  if (operation === "purchase") {
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByText("Welcome to InOut Pro!")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Start practicing" }));
  }
  expect(close).toHaveBeenCalledTimes(1);
});

test("cancel, error, unverified and expired responses cannot grant Pro or close onboarding", async () => {
  const s = services(), close = await mount(s);
  for (const error of [new SubscriptionError("cancelled", "cancelled"), new Error("offline")]) {
    (s.subscriptions.adapter.purchase as jest.Mock).mockRejectedValueOnce(error);
    await fireEvent.press(screen.getByRole("button", { name: "Continue with Monthly Pro" }));
    expect(s.subscriptions.busy).toBe(false);
    expect(s.subscriptions.message).toBeTruthy();
  }
  for (const customerInfo of [info("FAILED"), info("NOT_REQUESTED"), info("VERIFIED", Date.now() - 1)]) {
    (s.subscriptions.adapter.purchase as jest.Mock).mockImplementationOnce(async () => grantFromCustomerInfo(customerInfo));
    await fireEvent.press(screen.getByRole("button", { name: "Continue with Monthly Pro" }));
    expect(s.entitlements.state.pro).toBe(false);
  }
  expect(close).not.toHaveBeenCalled();
});

test("cancelled renewal retains paid access only until expiry; stale offline grants expire", () => {
  const s = services();
  expect(s.subscriptions.remoteCompleted(info("VERIFIED", Date.now() + 86400000, false), "restore")).toBe(true);
  expect(s.entitlements.state.status).toBe("cancelled");
  const stale = { ...info(), requestDate: new Date(Date.now() - 73 * 3600000).toISOString() };
  expect(s.subscriptions.remoteCompleted(stale, "restore")).toBe(false);
  expect(s.entitlements.state.pro).toBe(false);
});
test("offline offering failure keeps a free exit available", async () => {
  const s = services(); s.subscriptions.adapter.offers = jest.fn().mockRejectedValue(new Error("offline"));
  const close = await mount(s);
  expect(screen.queryByTestId("remote-paywall")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: /Continue (for free|to Home)/ }));
  expect(close).toHaveBeenCalledTimes(1);
  expect(s.entitlements.state.pro).toBe(false);
});
test("existing verified Pro bypasses the onboarding offer entirely", async () => {
  const s = services(); s.entitlements.acceptStoreGrant(grantFromCustomerInfo(info()));
  const close = await mount(s);
  expect(screen.queryByTestId("remote-paywall")).toBeNull();
  expect(s.subscriptions.adapter.remotePaywall!.offering).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(1);
});

test("unresolved startup billing never flashes the onboarding offer to an existing subscriber", async () => {
  const s = services(); s.entitlements.billingReady = false;
  const close = await mount(s);
  expect(s.subscriptions.adapter.remotePaywall!.offering).not.toHaveBeenCalled();
  await act(async () => { s.subscriptions.remoteCompleted(info(), "restore"); });
  expect(screen.queryByTestId("remote-paywall")).toBeNull();
  expect(close).toHaveBeenCalledTimes(1);
});


test("confirmation is never repeated by duplicate callbacks, restores or store updates", () => {
  const s = services(), purchase = info();
  s.subscriptions.remoteCompleted(purchase, "purchase");
  expect(s.subscriptions.purchaseConfirmation).toBeTruthy();
  s.subscriptions.dismissPurchaseConfirmation();
  s.subscriptions.remoteCompleted(purchase, "purchase");
  expect(s.subscriptions.purchaseConfirmation).toBeNull();
  s.subscriptions.remoteCompleted(info("VERIFIED", Date.now() + 86400000 * 2), "restore");
  expect(s.subscriptions.purchaseConfirmation).toBeNull();
});

test("an active subscription never invokes a second purchase", async () => {
  const s = services(); s.entitlements.acceptStoreGrant(grantFromCustomerInfo(info()));
  s.subscriptions.adapter.purchase = jest.fn();
  await s.subscriptions.purchase("monthly");
  expect(s.subscriptions.adapter.purchase).not.toHaveBeenCalled();
});
