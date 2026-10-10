import { Platform } from "react-native";
import type { CustomerInfo } from "react-native-purchases";
import { revenueCatAdapter, grantFromCustomerInfo } from "../src/subscription-providers/revenuecat";
import { SubscriptionError, defaultPlan } from "../src/subscriptions";
import { subscriptionConfiguration } from "../src/monetization";
const mockSdk = { ENTITLEMENT_VERIFICATION_MODE: { INFORMATIONAL: "INFORMATIONAL" }, configure: jest.fn(), getCustomerInfo: jest.fn(), getOfferings: jest.fn(), purchasePackage: jest.fn(), restorePurchases: jest.fn(), checkTrialOrIntroductoryPriceEligibility: jest.fn(), addCustomerInfoUpdateListener: jest.fn(), removeCustomerInfoUpdateListener: jest.fn(), logIn: jest.fn(), logOut: jest.fn(), isAnonymous: jest.fn() };
jest.mock("react-native-purchases", () => ({ default: mockSdk }));
const info = () => ({ requestDate: new Date(1000).toISOString(), entitlements: { verification: "VERIFIED", all: { in_out_pro: { productIdentifier: "fixture", expirationDate: new Date(10000).toISOString(), isActive: true, willRenew: true, periodType: "NORMAL" } } }, managementURL: "https://apps.apple.com/account/subscriptions" });
const item = (period: string, price: number) => ({ product: { identifier: period, priceString: `${price},00 Kč`, price, currencyCode: "CZK", subscriptionPeriod: period } });
beforeEach(() => { jest.clearAllMocks(); Platform.OS = "ios"; mockSdk.getCustomerInfo.mockResolvedValue(info()); mockSdk.restorePurchases.mockResolvedValue(info()); mockSdk.purchasePackage.mockResolvedValue({ customerInfo: info() }); mockSdk.checkTrialOrIntroductoryPriceEligibility.mockResolvedValue({}); mockSdk.getOfferings.mockResolvedValue({ all: { default: { weekly: item("P1W", 50), monthly: item("P1M", 100), annual: item("P1Y", 900) } } }); });

test("uses exact entitlement/default offering, three store-localized prices and Monthly default", async () => {
  const provider = revenueCatAdapter("appl_fixture");
  expect(mockSdk.configure).toHaveBeenCalledWith({ apiKey: "appl_fixture", entitlementVerificationMode: "INFORMATIONAL" });
  const offers = await provider.offers(); expect(offers.map(o => o.id)).toEqual(["weekly", "monthly", "annual"]);
  expect(offers.map(o => o.price)).toEqual(["50,00 Kč", "100,00 Kč", "900,00 Kč"]);
  expect(defaultPlan(offers)?.id).toBe("monthly"); expect(defaultPlan([offers[0]])).toBeUndefined();
  for (const id of ["weekly", "monthly", "annual"] as const) expect((await provider.purchase(id)).active).toBe(true);
  expect((await provider.restore()).source).toBe("store");
  expect(await provider.managementUrl()).toBe("https://apps.apple.com/account/subscriptions");
});
test("missing offering, unknown duration, missing price or currency never fabricate an offer", async () => {
  const provider = revenueCatAdapter("appl_fixture");
  mockSdk.getOfferings.mockResolvedValueOnce({ current: { monthly: item("P1M", 100) }, all: {} });
  expect(await provider.offers()).toEqual([]);
  mockSdk.getOfferings.mockResolvedValueOnce({ all: { default: { weekly: item("P3M", 50), monthly: { product: { ...item("P1M", 100).product, priceString: "" } }, annual: { product: { ...item("P1Y", 900).product, currencyCode: "" } } } } });
  expect(await provider.offers()).toEqual([]);
  await expect(provider.purchase("monthly")).rejects.toMatchObject({ reason: "unavailable" });
});
test("introductory terms require authoritative eligibility", async () => {
  const monthly = { product: { ...item("P1M", 100).product, introPrice: { price: 0, priceString: "0,00 Kč", cycles: 1, period: "P7D" } } };
  mockSdk.getOfferings.mockResolvedValue({ all: { default: { monthly } } });
  const provider = revenueCatAdapter("appl_fixture");
  expect((await provider.offers())[0].introductoryOffer).toBeUndefined();
  mockSdk.checkTrialOrIntroductoryPriceEligibility.mockResolvedValue({ P1M: { status: 2 } });
  expect((await provider.offers())[0]).toMatchObject({ trialEligible: true, introductoryOffer: { price: "0,00 Kč", period: "P7D", periods: 1 } });
});
test("pending, cancellation and errors cannot manufacture a grant; listener removes access", async () => {
  const provider = revenueCatAdapter("appl_fixture"); await provider.offers();
  mockSdk.purchasePackage.mockRejectedValueOnce({ code: "20" }); await expect(provider.purchase("annual")).rejects.toMatchObject({ reason: "pending" });
  mockSdk.purchasePackage.mockRejectedValueOnce({ userCancelled: true }); await expect(provider.purchase("annual")).rejects.toMatchObject({ reason: "cancelled" });
  mockSdk.purchasePackage.mockRejectedValueOnce({ message: "private" }); await expect(provider.purchase("annual")).rejects.toBeInstanceOf(SubscriptionError);
  const listener = jest.fn(); const cleanup = provider.listen!(listener);
  const update = mockSdk.addCustomerInfoUpdateListener.mock.calls[0][0];
  update({ ...info(), entitlements: { verification: "VERIFIED", all: {} } }); expect(listener).toHaveBeenCalledWith(expect.objectContaining({ active: false, status: "free" }));
  cleanup(); expect(mockSdk.removeCustomerInfoUpdateListener).toHaveBeenCalledWith(update);
});
test("unverified or wrong entitlement is rejected; only debug Test Store returns development grants", async () => {
  for (const verification of ["FAILED", "NOT_REQUESTED", undefined]) expect(grantFromCustomerInfo({ ...info(), entitlements: { ...info().entitlements, verification } } as unknown as CustomerInfo).active).toBe(false);
  expect(grantFromCustomerInfo({ ...info(), entitlements: { verification: "VERIFIED", all: { pro: info().entitlements.all.in_out_pro } } } as unknown as CustomerInfo).active).toBe(false);
  expect(subscriptionConfiguration(false, "ios", { mode: "test-store", testKey: "test_fixture" })).toBeNull();
  expect(subscriptionConfiguration(true, "ios", { iosKey: "sk_secret" })).toBeNull();
  expect(subscriptionConfiguration(true, "ios", { mode: "test-store", testKey: "test_fixture" })).toEqual({ key: "test_fixture", testStore: true });
  expect(() => revenueCatAdapter("test_fixture")).toThrow();
  expect((await revenueCatAdapter("test_fixture", true).refresh()).source).toBe("development");
});
test("SDK guest identity is preserved and future authenticated migration uses logIn/logOut", async () => {
  const provider = revenueCatAdapter("appl_fixture");
  expect(mockSdk.configure.mock.calls[0][0].appUserID).toBeUndefined();
  mockSdk.logIn.mockResolvedValue({ customerInfo: info() }); mockSdk.logOut.mockResolvedValue(info()); mockSdk.isAnonymous.mockResolvedValue(false);
  await provider.identify!("verified-server-id"); expect(mockSdk.logIn).toHaveBeenCalledWith("verified-server-id");
  await provider.identify!(null); expect(mockSdk.logOut).toHaveBeenCalledTimes(1);
  mockSdk.isAnonymous.mockResolvedValue(true); await provider.identify!(null); expect(mockSdk.logOut).toHaveBeenCalledTimes(1);
});
