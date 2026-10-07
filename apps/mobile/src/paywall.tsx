import { t, locale } from "./i18n";
import { useLanguage } from "./use-language";
import { Pressable, Switch, TextInput } from "./localized-native";
import { useEffect, useState } from "react";
import { BackHandler, Linking, View } from "react-native";
import { router } from "expo-router";
import { useCommercial } from "./commercial-context";
import type { DevelopmentSubscriptionProvider } from "./subscription-providers/test";
import { Screen, IconButton, Title, Label, Card, Copy, Button, Disclosure, ActionFooter, useStyles } from "./ui";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTheme } from "./theme";
import { productConfig } from "./product-config";
import { annualIsBetterValue, type PlanId } from "./subscriptions";
export function Paywall({ entry = "profile", onClose, completionError }: { entry?: string; onClose?: () => void; completionError?: string | null }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [selected, setSelected] = useState<PlanId | null>(null);
  useLanguage();
  const services = useCommercial();
  const [notice, setNotice] = useState("");
  const [trial, setTrial] = useState(false);
  const [reviewerOpen, setReviewerOpen] = useState(false);
  const [reviewCode, setReviewCode] = useState("");
  const close = () => { services?.analytics.track("paywall_dismissed"); if (onClose) onClose(); else if (router.canGoBack()) router.back(); else router.replace("/(tabs)"); };
  useEffect(() => { const listener = BackHandler.addEventListener("hardwareBackPress", () => { close(); return true; }); return () => listener.remove(); }, [onClose, services]);
  useEffect(() => {
    if (entry === "onboarding") services?.analytics.track("onboarding_paywall_viewed");
    services?.analytics.track("paywall_viewed");
    services?.analytics.paywallSource(entry);
    if (services && !services.subscriptions.offers.length && !services.subscriptions.busy) void services.subscriptions.load();
  }, [services, entry]);
  if (!services) return <Screen title="IN/OUT PRO" back={close}><Copy>Subscription services are unavailable.</Copy><Button title="Continue for free" onPress={close} />{completionError && <Copy accessibilityRole="alert">{completionError}</Copy>}</Screen>;
  const { entitlements, subscriptions } = services;
  const state = entitlements.state;
  const demo = subscriptions.adapter.mode === "development";
  const recommended = productConfig.emphasizeAnnual && annualIsBetterValue(subscriptions.offers);
  const chosen = subscriptions.offers.find(o => o.id === selected) ?? subscriptions.offers.find(o => o.id === (recommended ? "annual" : "monthly")) ?? subscriptions.offers[0];
  return <Screen title="InOut Pro" avoidKeyboard headerAction={<IconButton icon="close" title="Close subscription offer" onPress={close} />} footer={chosen ? <ActionFooter>
    <Button title={`${demo ? "Simulate" : "Continue with"} ${chosen.title}`} disabled={subscriptions.busy} onPress={() => { void subscriptions.purchase(chosen.id); }} />
    {onClose && <Button title={state.pro ? "Continue to Home" : "Continue for free"} variant="quiet" disabled={subscriptions.busy} onPress={close} />}
  </ActionFooter> : undefined}>
    {completionError && <Copy accessibilityRole="alert">{completionError}</Copy>}
    <View style={{ width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.reward }}><MaterialIcons accessible={false} name="auto-awesome" size={32} color={colors.onReward} /></View>
    <Title>More room for your practice.</Title>
    {entry === "onboarding" && <Copy>Build a practice that fits you. You can also continue for free.</Copy>}
    {entry === "quota" && <Copy>Your guided allowance is used. Keep breathing with tones, or explore Pro.</Copy>}
    {entry === "protocol" && <Copy>Unlock this protocol and make more room for your practice.</Copy>}
    <Copy>{productConfig.proProtocolIds.length || productConfig.guidedSessionsPerMonth !== null ? "Core breathing, State Shift and safety remain Free. Explore Pro for more options." : "All ten breathing protocols, cues, State Shift and safety remain Free. Pro removes ads and saved-routine limits."}</Copy>
    <View style={{ gap: 12 }}>{[["tune", "Unlimited saved patterns & mixes"], ["insights", "Private practice insights"], ["notifications-none", "Up to five personal reminders"], ["spa", "A practice without ads"]].map(([icon, label]) => <View key={label} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><MaterialIcons accessible={false} name={icon as "tune"} size={22} color={colors.accent} /><Copy style={{ flex: 1 }}>{label}</Copy></View>)}</View>
    {demo && <Card><Label>DEVELOPMENT DEMO</Label><Copy>No money is charged. These plans and optional trial simulate store behavior; they are not real offers.</Copy></Card>}
    {subscriptions.adapter.mode === "unavailable" && <Copy>Purchases are unavailable right now. You can keep breathing for free.</Copy>}
    <View style={{ gap: 12 }}>{subscriptions.offers.slice().sort((a, b) => Number(b.id === "annual") - Number(a.id === "annual")).map(offer => <Pressable key={offer.id} accessibilityRole="button" accessibilityLabel={t(offer.title)} accessibilityState={{ selected: chosen?.id === offer.id }} onPress={() => { setSelected(offer.id); services.analytics.track("plan_selected"); }} style={{ padding: 20, gap: 12, borderRadius: 22, borderWidth: 2, borderColor: chosen?.id === offer.id ? colors.accent : colors.border, backgroundColor: chosen?.id === offer.id ? colors.accentSurface : colors.card }}>
      {offer.id === "annual" && recommended && <Label>BEST VALUE</Label>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Copy style={styles.subtitle}>{offer.title}</Copy><Copy><Copy style={{ fontSize: 24, lineHeight: 30, fontWeight: "700" }}>{offer.price}</Copy>{!demo ? ` / ${t(offer.period)}` : ""}</Copy></View><MaterialIcons accessible={false} name={chosen?.id === offer.id ? "radio-button-checked" : "radio-button-unchecked"} size={26} color={colors.accent} /></View>
      {offer.trialEligible && offer.introductoryOffer && <><Label>FREE TRIAL AVAILABLE</Label><Copy style={styles.small}>Review your eligible trial duration and renewal price in the store confirmation.</Copy></>}
    </Pressable>)}</View>
    {!chosen && onClose && <Button title="Continue for free" onPress={close} />}
    {!demo && subscriptions.offers.length > 0 && <Copy>Subscriptions renew automatically unless cancelled through your store. Review the store confirmation for final price, any eligible introductory offer, and renewal terms.</Copy>}
    {subscriptions.busy && <Copy accessibilityRole="alert">Contacting the store…</Copy>}
    {!!subscriptions.message && <Copy accessibilityRole="alert">{subscriptions.message}</Copy>}
    <Button title="Restore purchases" secondary disabled={subscriptions.busy} onPress={() => { void subscriptions.restore(); }} />
    <Disclosure title="Subscription details" icon="manage-accounts">
    <View style={{ gap: 8 }}><Label>YOUR ACCESS</Label><Copy>{state.pro ? "InOut Pro" : "Free"}</Copy>
      {state.expiresAt && <Copy>Access until: {new Date(state.expiresAt).toLocaleDateString(locale())}</Copy>}
      {state.status === "cancelled" && <Copy>Renewal is cancelled. Pro remains active until the paid period ends.</Copy>}
      {state.status === "billingRetry" && <Copy>The store reported a payment issue. Check your payment method.</Copy>}
      {state.status === "grace" && <Copy>Pro remains available during the store's grace period. Update your payment method.</Copy>}
      {state.needsRefresh && <Copy>Connect to refresh your store access. Basic breathing stays available offline.</Copy>}
    </View>
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
    </Disclosure>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Button title="Privacy policy" variant="quiet" onPress={() => router.push("/privacy")} /><Button title="Subscription terms" variant="quiet" onPress={() => router.push("/subscription-terms")} /></View>
    <Button title="Reviewer access" variant="quiet" onPress={() => setReviewerOpen(value => !value)} />
    {reviewerOpen && <Card><Label>Reviewer access</Label>
      <TextInput accessibilityLabel="Review code" placeholder="Review code" secureTextEntry autoCapitalize="none" autoCorrect={false}
        maxLength={128} value={reviewCode} editable={!services.reviewer?.busy} onChangeText={setReviewCode} style={styles.input} />
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
  </Screen>;
}
