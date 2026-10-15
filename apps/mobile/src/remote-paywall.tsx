import { useEffect, useRef, useState } from "react";
import { BackHandler, View } from "react-native";
import type { PurchasesOffering } from "react-native-purchases";
import type RevenueCatUI from "react-native-purchases-ui";
import type { CommercialServices } from "./commercial-context";
import { Screen, Copy, Button, IconButton, ActionFooter } from "./ui";
import { locale } from "./i18n";
import { useLanguage } from "./use-language";

export function RemotePaywall({ services, entry, onClose, onFallback, completionError }: {
  services: CommercialServices; entry: string; onClose: () => void; onFallback: () => void; completionError?: string | null;
}) {
  const language = useLanguage();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [NativePaywall] = useState(() => {
    try { return (require("react-native-purchases-ui").default as typeof RevenueCatUI).Paywall; }
    catch { return null; }
  });
  const latest = useRef({ onClose, onFallback }); latest.current = { onClose, onFallback };
  useEffect(() => services.ads.paywallOpened(), [services]);
  useEffect(() => {
    services.analytics.track("paywall_viewed"); services.analytics.paywallSource(entry);
    if (entry === "onboarding") services.analytics.track("onboarding_paywall_viewed");
    const back = BackHandler.addEventListener("hardwareBackPress", () => { latest.current.onClose(); return true; });
    return () => { back.remove(); services.subscriptions.remoteClosed(); };
  }, [services, entry]);
  useEffect(() => {
    let alive = true;
    setOffering(null);
    const timeout = setTimeout(() => { if (alive) { alive = false; latest.current.onFallback(); } }, 10000);
    if (!NativePaywall) { clearTimeout(timeout); latest.current.onFallback(); return; }
    void services.subscriptions.adapter.remotePaywall!.offering(locale()).then(value => {
      if (alive) { clearTimeout(timeout); setOffering(value); }
    }).catch(() => { if (alive) { clearTimeout(timeout); latest.current.onFallback(); } });
    return () => { alive = false; clearTimeout(timeout); };
  }, [services, language, NativePaywall]);
  const complete = (info: unknown, operation: "purchase" | "restore") => {
    if (services.subscriptions.remoteCompleted(info, operation)) latest.current.onClose();
  };
  return <Screen title="InOut Pro" scroll={false} headerAction={<IconButton icon="close" title="Close subscription offer" onPress={onClose} />}
    footer={<ActionFooter>
      {!!completionError && <Copy accessibilityRole="alert">{completionError}</Copy>}
      {!!services.subscriptions.message && <Copy accessibilityRole="alert">{services.subscriptions.message}</Copy>}
      <Button title={services.entitlements.state.pro ? "Continue to Home" : "Continue for free"} variant="quiet" onPress={onClose} />
      <Button title="Subscription details" variant="quiet" onPress={onFallback} />
    </ActionFooter>}>
    <View style={{ flex: 1 }}>
      {NativePaywall && offering ? <NativePaywall key={language} style={{ flex: 1 }} options={{ offering, displayCloseButton: true }}
        onDismiss={onClose}
        onPurchaseStarted={() => services.subscriptions.remoteStarted("purchase")}
        onPurchaseCompleted={({ customerInfo }) => complete(customerInfo, "purchase")}
        onPurchaseCancelled={() => services.subscriptions.remoteFailed(true)}
        onPurchaseError={() => services.subscriptions.remoteFailed()}
        onRestoreStarted={() => services.subscriptions.remoteStarted("restore")}
        onRestoreCompleted={({ customerInfo }) => complete(customerInfo, "restore")}
        onRestoreError={() => services.subscriptions.remoteFailed()} />
        : <View style={{ padding: 24 }}><Copy accessibilityRole="alert">Contacting the store…</Copy></View>}
    </View>
  </Screen>;
}
