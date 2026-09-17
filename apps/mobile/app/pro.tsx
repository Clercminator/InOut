import { useEffect, useState } from "react";
import { Linking, Switch, View } from "react-native";
import { router } from "expo-router";
import { useCommercial } from "../src/commercial-context";
import { DevelopmentSubscriptionAdapter } from "../src/subscriptions";
import { BackScreen, Title, Label, Card, Copy, Button } from "../src/ui";

export default function Pro() {
  const services = useCommercial();
  const [notice, setNotice] = useState("");
  const [trial, setTrial] = useState(false);
  useEffect(() => {
    services?.analytics.track("paywall_viewed");
    if (services && !services.subscriptions.offers.length && !services.subscriptions.busy) void services.subscriptions.load();
  }, [services]);
  if (!services) return <BackScreen title="IN/OUT PRO"><Copy>Subscription services are unavailable.</Copy></BackScreen>;
  const { entitlements, subscriptions } = services;
  const state = entitlements.state;
  const demo = subscriptions.adapter.mode === "development";
  return <BackScreen title="IN/OUT PRO">
    <Title>More room for your practice.</Title>
    <Copy>All nine breathing protocols, cues, State Shift and safety remain Free. Pro removes ads and saved-routine limits.</Copy>
    <Card><Label>YOUR ACCESS</Label><Copy>{state.pro ? "Pro" : "Free"} · {state.status}</Copy>
      {state.expiresAt && <Copy>{state.status === "cancelled" ? "Access until" : "Access boundary"}: {new Date(state.expiresAt).toLocaleDateString()}</Copy>}
      {state.status === "cancelled" && <Copy>Renewal is cancelled. Pro remains active until the paid period ends.</Copy>}
      {state.status === "billingRetry" && <Copy>The store reported a payment issue. Check your payment method.</Copy>}
      {state.status === "grace" && <Copy>Pro remains available during the store's grace period. Update your payment method.</Copy>}
      {state.needsRefresh && <Copy>Connect to refresh your store access. Basic breathing stays available offline.</Copy>}
    </Card>
    {demo && <Card><Label>DEVELOPMENT DEMO</Label><Copy>No money is charged. These plans and optional trial simulate store behavior; they are not real offers.</Copy></Card>}
    {subscriptions.adapter.mode === "unavailable" && <Copy>Billing is not configured for this build. Core breathing is available without a purchase.</Copy>}
    {subscriptions.offers.map((offer) => <Card key={offer.id}>
      <Title>{offer.title}</Title><Copy>{offer.price}{!demo ? ` / ${offer.period}` : ""}</Copy>
      <Button title={`${demo ? "Simulate" : "Continue with"} ${offer.title}`} disabled={subscriptions.busy} onPress={() => { void subscriptions.purchase(offer.id); }} />
    </Card>)}
    {!demo && subscriptions.offers.length > 0 && <Copy>Subscriptions renew automatically unless cancelled through your store. Review the store confirmation for final price, any eligible introductory offer, and renewal terms. Advanced guidance and cloud sync are not available in this build.</Copy>}
    {subscriptions.busy && <Copy accessibilityRole="alert">Contacting the store…</Copy>}
    {!!subscriptions.message && <Copy accessibilityRole="alert">{subscriptions.message}</Copy>}
    <Button title="Restore purchases" secondary disabled={subscriptions.busy} onPress={() => { void subscriptions.restore(); }} />
    <Button title="Refresh plans & status" secondary disabled={subscriptions.busy} onPress={() => { void subscriptions.load(); }} />
    <Button title="Manage subscription" secondary disabled={subscriptions.busy} onPress={() => {
      setNotice("");
      void subscriptions.adapter.managementUrl().then(async (url) => {
        if (!url) { setNotice(demo ? "Demo subscriptions have no store billing to manage." : "No store management link is available. Check subscriptions in your App Store or Google Play account."); return; }
        if (!url.startsWith("https://")) throw new Error("Invalid management link");
        await Linking.openURL(url);
      }).catch(() => setNotice("Could not open subscription management. Try your store account."));
    }} />
    {!!notice && <Copy accessibilityRole="alert">{notice}</Copy>}
    <Button title="Privacy policy" secondary onPress={() => router.push("/privacy")} />
    <Button title="Subscription terms (development draft)" secondary onPress={() => router.push("/subscription-terms")} />
    {__DEV__ && entitlements.development && <Card><Label>DEVELOPER CONTROLS · NO PURCHASE</Label>
      {(["free", "active", "trial", "cancelled", "billingRetry", "grace", "expired"] as const).map((status) => <Button key={status} title={`Simulate ${status === "active" ? "Pro" : status}`} secondary onPress={() => entitlements.simulate(status)} />)}
      {subscriptions.adapter instanceof DevelopmentSubscriptionAdapter && <>
        <View><Copy>Simulate optional trial</Copy><Switch accessibilityLabel="Simulate optional trial" value={trial} onValueChange={(value) => { setTrial(value); (subscriptions.adapter as DevelopmentSubscriptionAdapter).trial = value; }} /></View>
        {(["success", "cancel", "failure"] as const).map((outcome) => <Button key={outcome} title={`Next purchase: ${outcome}`} secondary onPress={() => { (subscriptions.adapter as DevelopmentSubscriptionAdapter).outcome = outcome; setNotice(`Next demo purchase: ${outcome}`); }} />)}
      </>}
    </Card>}
  </BackScreen>;
}
