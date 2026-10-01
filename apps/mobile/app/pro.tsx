import { t, locale } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { Switch, TextInput } from "../src/localized-native";
import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { router } from "expo-router";
import { useCommercial } from "../src/commercial-context";
import type { DevelopmentSubscriptionProvider } from "../src/subscription-providers/test";
import { BackScreen, Title, Label, Card, Copy, Button } from "../src/ui";

export default function Pro() {
  useLanguage();
  const services = useCommercial();
  const [notice, setNotice] = useState("");
  const [trial, setTrial] = useState(false);
  const [reviewerOpen, setReviewerOpen] = useState(false);
  const [reviewCode, setReviewCode] = useState("");
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
    <Copy>All ten breathing protocols, cues, State Shift and safety remain Free. Pro removes ads and saved-routine limits.</Copy>
    <Card><Label>INCLUDED WITH PRO</Label><Copy>Unlimited saved patterns and mixes, no ads, private practice insights, and up to five reminders. Free keeps basic Progress and one reminder.</Copy></Card>
    <Card><Label>YOUR ACCESS</Label><Copy>{state.pro ? "Pro" : "Free"} · {state.status}</Copy>
      {state.expiresAt && <Copy>{state.status === "cancelled" ? "Access until" : "Access boundary"}: {new Date(state.expiresAt).toLocaleDateString(locale())}</Copy>}
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
    <Button title="Reviewer access" secondary onPress={() => setReviewerOpen(value => !value)} />
    {reviewerOpen && <Card><Label>Reviewer access</Label>
      <TextInput accessibilityLabel="Review code" placeholder="Review code" secureTextEntry autoCapitalize="none" autoCorrect={false}
        maxLength={128} value={reviewCode} editable={!services.reviewer?.busy} onChangeText={setReviewCode} style={{ padding: 12 }} />
      <Button title="Unlock Pro" secondary disabled={!reviewCode.trim() || !services.reviewer || services.reviewer.busy} onPress={() => {
        const code = reviewCode; setReviewCode(""); void services.reviewer?.activate(code);
      }} />
      {services.reviewer?.busy && <Copy accessibilityRole="alert">Verifying review code…</Copy>}
      {!!services.reviewer?.message && <Copy accessibilityRole="alert">{services.reviewer.message}</Copy>}
    </Card>}
    {__DEV__ && entitlements.development && <Card><Label>DEVELOPER CONTROLS · NO PURCHASE</Label>
      {(["free", "active", "trial", "cancelled", "billingRetry", "grace", "expired"] as const).map((status) => <Button key={status} title={`Simulate ${status === "active" ? "Pro" : status}`} secondary onPress={() => entitlements.simulate(status)} />)}
      {subscriptions.adapter.mode === "development" && <>
        <View><Copy>Simulate optional trial</Copy><Switch accessibilityLabel={t("Simulate optional trial")} value={trial} onValueChange={(value) => { setTrial(value); (subscriptions.adapter as DevelopmentSubscriptionProvider).trial = value; }} /></View>
        {(["success", "cancel", "failure", "pending"] as const).map((outcome) => <Button key={outcome} title={`Next purchase: ${outcome}`} secondary onPress={() => { (subscriptions.adapter as DevelopmentSubscriptionProvider).outcome = outcome; setNotice(`Next demo purchase: ${outcome}`); }} />)}
      </>}
    </Card>}
  </BackScreen>;
}
