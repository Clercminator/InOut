import { useEffect, useState } from "react";
import { View } from "react-native";
import { useCommercial } from "./commercial-context";
import { Button, Card, Copy, Disclosure, Label, Title, useStyles } from "./ui";
import { TextInput } from "./localized-native";
import { message } from "./i18n";
import { ProBadge } from "./pro-badge";
import { useTheme } from "./theme";

export function FounderOffer() {
  const services = useCommercial(); const f = services?.founders;
  const { colors } = useTheme();
  useEffect(() => { void f?.load(); }, [f]);
  if (!f?.supported || !services || services.entitlements.state.reviewerPro) return null;
  if (f.loading) return <Copy accessibilityRole="alert">Contacting the store…</Copy>;
  const state = services.entitlements.state;
  if (state.lifetimePro) return <Card><Label>{f.member && !f.sandboxMember ? "Founding Member" : "Lifetime Pro"}</Label><Copy>Lifetime Pro is active.</Copy>
    {!!f.message && <Copy accessibilityRole="alert">{f.message}</Copy>}</Card>;
  if (!f.allowed || !f.offer) return f.pending || f.message || f.status === "sold_out" ? <View style={{ gap: 8 }}>
    <Copy accessibilityRole="alert">{f.status === "sold_out" ? "The Founding Member allocation is sold out." : f.message || "Purchase is pending store approval. Refresh or restore when it completes."}</Copy>
    <Button title="Refresh Lifetime availability" secondary disabled={f.busy} onPress={() => { void services.subscriptions.refreshAccess().then(() => f.load()); }} />
  </View> : null;
  return <Card style={{ borderColor: colors.gold, gap: 14 }}>
    <ProBadge />
    <Label>FOUNDING MEMBER EDITION</Label>
    <Title>Breathe better. Forever.</Title>
    <Copy>One payment. No subscription.</Copy>
    {f.environment === "sandbox" && <Label>STORE SANDBOX TESTING</Label>}
    <Copy>All current premium breathing practices, advanced progress tracking, premium challenges and Pro experiences.</Copy>
    <Copy>No advertising. Future non-metered Pro features included. Founding Member recognition.</Copy>
    <Copy>Separately paid AI services with ongoing usage costs are not included.</Copy>
    <Copy>Limited to the first 1,000 founding purchases worldwide.</Copy>
    <Copy>Lifetime means the supported lifetime of IN/OUT. AI features without incremental usage costs remain included when part of Pro.</Copy>
    {state.subscriptionPro && <Copy accessibilityRole="alert">You already have a subscription. To avoid overlapping charges, Lifetime checkout is unavailable until your paid subscription ends. Cancelling renewal is separate and does not end access immediately.</Copy>}
    <Button title={message("Unlock Lifetime Pro — {0}", [f.offer.price])} disabled={f.busy || f.pending || services.subscriptions.purchaseUncertain || state.subscriptionPro} onPress={() => { void f.purchase(); }} />
    {!!f.message && <Copy accessibilityRole="alert">{f.message}</Copy>}
    {f.busy && <Copy accessibilityRole="alert">Contacting the store…</Copy>}
    {f.pending && <Button title="Refresh plans & status" secondary disabled={f.busy} onPress={() => { void services.subscriptions.refreshAccess().then(() => f.reconcile()); }} />}
    <Copy>Restore Lifetime Pro with the same store account. Android and iOS purchases cannot currently be linked across platforms.</Copy>
  </Card>;
}

export function FounderTesting() {
  const f = useCommercial()?.founders; const styles = useStyles(); const [code, setCode] = useState("");
  if (!f?.supported) return null;
  return <Disclosure title="Lifetime purchase testing" icon="science">
    <Copy>Authorized testers only. Use a store sandbox account. This code opens the real store checkout and does not grant Pro.</Copy>
    <TextInput accessibilityLabel="Lifetime testing code" placeholder="Lifetime testing code" value={code} onChangeText={setCode} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128} style={styles.input} />
    <Button title="Open sandbox offer" secondary disabled={!code.trim() || f.busy} onPress={() => { const value = code; setCode(""); void f.testAccess(value); }} />
    <Button title="Exit purchase testing" variant="quiet" disabled={f.busy} onPress={() => { setCode(""); void f.testAccess(""); }} />
    {!!f.message && <Copy accessibilityRole="alert">{f.message}</Copy>}
  </Disclosure>;
}
