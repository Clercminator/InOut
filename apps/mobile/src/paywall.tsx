import { GoalMark, OnboardingHero } from "./onboarding-art";
import { PulseArtwork } from "./pulse-orb";
import { Celebration } from "./celebration";
import { RemotePaywall } from "./remote-paywall";
import { t, locale, message, countLabel } from "./i18n";
import { useLanguage } from "./use-language";
import { Pressable, Switch, TextInput } from "./localized-native";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Linking, View } from "react-native";
import { router } from "expo-router";
import { useCommercial } from "./commercial-context";
import type { DevelopmentSubscriptionProvider } from "./subscription-providers/test";
import { Screen, IconButton, Title, Label, Card, Copy, Button, Disclosure, ActionFooter, useStyles } from "./ui";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTheme } from "./theme";
import { productConfig } from "./product-config";
import { annualIsBetterValue, defaultPlan, type PlanId } from "./subscriptions";
function introDuration(period: string) {
  const match = /^P(\d+)([DWMY])$/.exec(period);
  const unit = { D: "day", W: "week", M: "month", Y: "year" }[match?.[2] ?? ""] as "day" | "week" | "month" | "year";
  return match && unit ? countLabel(Number(match[1]), unit) : period;
}
type PaywallProps = { entry?: string; onClose?: () => void; completionError?: string | null };
export function Paywall(props: PaywallProps) {
  const services = useCommercial();
  const [fallback, setFallback] = useState(false);
  const closing = useRef(false);
  useEffect(() => { if (props.completionError) closing.current = false; }, [props.completionError]);
  const close = () => {
    if (services?.subscriptions.purchaseConfirmation && services.entitlements.state.pro) return;
    if (closing.current) return;
    closing.current = true;
    services?.analytics.track("paywall_dismissed");
    if (props.onClose) props.onClose();
    else if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };
  const pro = services?.entitlements.state.pro;
  const confirmation = services?.subscriptions.purchaseConfirmation;
  useEffect(() => { if (props.entry === "onboarding" && pro && !confirmation) close(); }, [pro, props.entry, confirmation]);
  if (confirmation && pro && services) return <Screen title="InOut Pro">
    <View style={{ alignItems: "center" }}><PulseArtwork size={180} /></View>
    <Celebration title="Welcome to InOut Pro!" message="Your Pro access is ready." />
    <Copy>Guided programs for your goals</Copy><Copy>A practice without ads</Copy>
    <Button title="Start practicing" onPress={() => { services.subscriptions.dismissPurchaseConfirmation(); close(); }} />
  </Screen>;
  if (props.entry === "onboarding" && pro) return <Screen><Copy>Your Pro access is ready.</Copy>{props.completionError && <Copy accessibilityRole="alert">{props.completionError}</Copy>}<Button title="Continue to Home" onPress={close} /></Screen>;
  if (props.entry === "onboarding" && services?.subscriptions.adapter.mode === "store" && !services.entitlements.billingReady)
    return <Screen><Copy accessibilityRole="alert">{services.subscriptions.message || "Contacting the store…"}</Copy><Button title="Refresh plans & status" secondary disabled={services.subscriptions.busy} onPress={() => { void services.subscriptions.load(); }} /><Button title="Continue to Home" onPress={close} /></Screen>;
  if (services?.subscriptions.adapter.remotePaywall && !pro && !fallback)
    return <RemotePaywall services={services} entry={props.entry ?? "profile"} onClose={close} onFallback={() => setFallback(true)} completionError={props.completionError} />;
  return <FallbackPaywall {...props} onClose={props.onClose ? close : undefined} />;
}
function FallbackPaywall({ entry = "profile", onClose, completionError }: PaywallProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [selected, setSelected] = useState<PlanId | null>(null);
  useLanguage();
  const services = useCommercial();
  const [notice, setNotice] = useState("");
  const [trial, setTrial] = useState(false);
  const [reviewerOpen, setReviewerOpen] = useState(false);
  const [reviewCode, setReviewCode] = useState("");
  useEffect(() => services?.ads.paywallOpened(), [services]);
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
  const chosen = subscriptions.offers.find(o => o.id === selected) ?? defaultPlan(subscriptions.offers, productConfig.defaultPlan);
  return <Screen title="InOut Pro" avoidKeyboard headerAction={<IconButton icon="close" title="Close subscription offer" onPress={close} />} footer={chosen || onClose ? <ActionFooter>
    {chosen && !state.pro && <><Copy style={{ textAlign: "center", fontWeight: "600" }}>{message("{0} / {1}", [chosen.price, t(chosen.period)])}</Copy>
    <Button title={`${demo ? "Simulate" : "Continue with"} ${chosen.title}`} disabled={subscriptions.busy} onPress={() => { void subscriptions.purchase(chosen.id); }} /></>}
    {state.pro && <Copy accessibilityRole="alert">Your Pro access is ready.</Copy>}
    {onClose && <Button title={state.pro ? "Continue to Home" : "Continue for free"} variant="quiet" disabled={subscriptions.busy} onPress={close} />}
  </ActionFooter> : undefined}>
    {completionError && <Copy accessibilityRole="alert">{completionError}</Copy>}
    {entry === "onboarding" ? <><OnboardingHero compact /><Label>WELCOME TO YOUR NEXT CHAPTER</Label><Title>Make this practice yours.</Title><Copy>A personal breathing coach. More ways to grow.</Copy></> : <><View style={{ alignItems: "center" }}><PulseArtwork size={96} /></View><Title>{state.pro ? "Your Pro access is ready." : "More room for your practice."}</Title></>}
    {entry === "quota" && <Copy>Your guided allowance is used. Keep breathing with tones, or explore Pro.</Copy>}
    {entry === "protocol" && <Copy>Unlock this protocol and make more room for your practice.</Copy>}
    {entry === "coach" && <Copy>Pro includes multiweek guided programs and continuing weekly plans. Find Your Rhythm and basic recommendations remain free.</Copy>}
    {productConfig.proChallengeIds.length > 0 && <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><MaterialIcons accessible={false} name="emoji-events" size={26} color={colors.gold} /><Copy style={{ flex: 1 }}>More challenges for sleep, focus and consistent practice.</Copy></View>}
    <Copy>{productConfig.proProtocolIds.length || productConfig.guidedSessionsPerMonth !== null ? "Core breathing, State Shift and safety remain Free. Explore Pro for more options." : "All ten breathing protocols, cues, State Shift and safety remain Free. Pro removes ads and saved-routine limits."}</Copy>
    <View style={{ gap: 16 }}>{[["learn", "Guided programs for your goals"], ["focus", "Weekly plans that fit your life"], ["performance", "Private practice insights"], ["pressure", "Unlimited saved patterns & mixes"], ["stress", "A practice without ads"]].map(([mark, label]) => <View key={label} style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><GoalMark goal={mark as "learn" | "focus" | "performance" | "pressure" | "stress"} size={40} /><Copy style={{ flex: 1, fontWeight: "600" }}>{label}</Copy></View>)}</View>
    {demo && <Card><Label>DEVELOPMENT DEMO</Label><Copy>No money is charged. These plans and optional trial simulate store behavior; they are not real offers.</Copy></Card>}
    {subscriptions.adapter.testStore && <Card><Label>TEST STORE</Label><Copy>RevenueCat Test Store. No real charge or store subscription.</Copy></Card>}
    {subscriptions.adapter.mode === "unavailable" && !subscriptions.message && <Copy>Purchases are unavailable right now. You can keep breathing for free.</Copy>}
    <View style={{ gap: 12 }}>{(state.pro ? [] : subscriptions.offers).slice().sort((a, b) => productConfig.planOrder.indexOf(a.id) - productConfig.planOrder.indexOf(b.id)).map(offer => <Pressable key={offer.id} disabled={subscriptions.busy} accessibilityRole="button" accessibilityLabel={t(offer.title)} accessibilityState={{ selected: chosen?.id === offer.id }} onPress={() => { setSelected(offer.id); services.analytics.track("plan_selected"); }} style={{ padding: 20, gap: 12, borderRadius: 22, borderWidth: 2, borderColor: chosen?.id === offer.id ? colors.accent : colors.border, backgroundColor: chosen?.id === offer.id ? colors.accentSurface : colors.card }}>
      {offer.id === "annual" && productConfig.emphasizeAnnual && <Label>{recommended ? "BEST VALUE" : "RECOMMENDED PLAN"}</Label>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Copy style={styles.subtitle}>{offer.title}</Copy><Copy><Copy style={{ fontSize: 24, lineHeight: 30, fontWeight: "700" }}>{offer.price}</Copy>{!demo ? ` / ${t(offer.period)}` : ""}</Copy></View><MaterialIcons accessible={false} name={chosen?.id === offer.id ? "radio-button-checked" : "radio-button-unchecked"} size={26} color={colors.accent} /></View>
      {offer.trialEligible && <Label>FREE TRIAL AVAILABLE</Label>}
      {offer.introductoryOffer && <Copy style={styles.small}>{message("Introductory price: {0} / {1}, for {2} billing periods.", [offer.introductoryOffer.price, introDuration(offer.introductoryOffer.period), offer.introductoryOffer.periods])}</Copy>}
    </Pressable>)}</View>
    {!demo && subscriptions.offers.length > 0 && <Copy>Subscriptions renew automatically unless cancelled through your store. Review the store confirmation for final price, any eligible introductory offer, and renewal terms.</Copy>}
    {subscriptions.busy && <Copy accessibilityRole="alert">Contacting the store…</Copy>}
    {!!subscriptions.message && <Copy accessibilityRole="alert">{subscriptions.message}</Copy>}
    <Button title="Restore purchases" secondary disabled={subscriptions.busy} onPress={() => { void subscriptions.restore(); }} />
    <Disclosure title="Subscription details" icon="manage-accounts" initiallyOpen={state.pro}>
    <View style={{ gap: 8 }}><Label>YOUR ACCESS</Label><Copy>{state.pro ? "InOut Pro" : "Free"}</Copy>{state.productId && <Copy translate={false}>{state.productId}{state.planId ? ` · ${state.planId}` : ""}</Copy>}
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
      {state.reviewerPro && <Button title="Remove reviewer access" secondary disabled={services.reviewer?.busy} onPress={() => { void services.reviewer?.clear().catch(() => setNotice("Could not remove reviewer access. Please retry.")); }} />}
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
