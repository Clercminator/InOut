import { useLanguage } from "./use-language";
import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { adUnit } from "./monetization";
import { usePathname } from "expo-router";
import { useCommercial } from "./commercial-context";
import { useSession } from "./provider";
import type { AdPlacement } from "./ads";
import { Card, Copy, Button, Label } from "./ui";

export function AdSlot({ placement }: { placement: AdPlacement }) {
  useLanguage();
  const services = useCommercial();
  const controller = useSession();
  const path = usePathname();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const [height, setHeight] = useState(90);
  const eligible = useRef(false);
  const requested = useRef(new Set<string>());
  const context = { path, foreground, sessionStage: controller.current?.stage ?? null, challengeActive: controller.hasActiveChallenge?.() ?? !!controller.pendingTest?.() };
  eligible.current = !!services?.ads.allowed(placement, context);
  const allowed = eligible.current;
  const automatic = services?.ads.mode === "live" || (!__DEV__ && services?.ads.mode === "test");
  useEffect(() => () => { eligible.current = false; }, []);
  useEffect(() => { const sub = AppState.addEventListener("change", (s) => setForeground(s === "active")); return () => sub.remove(); }, []);
  useEffect(() => {
    if (!allowed) { setFailed(false); return; }
    if (!services || !allowed || !automatic) return;
    let mounted = true;
    const prepare = async () => {
      try {
        await services.ads.prepare(() => mounted && eligible.current);
        if (mounted) setReady(services.ads.ready);
      } catch {
        if (mounted) setReady(false);
        services.analytics.track("ad_consent_failed");
      }
    };
    void prepare();
    return () => { mounted = false; };
  }, [services, allowed, automatic, foreground, path]);
  useEffect(() => {
    if (!services || !allowed || !ready || failed || width <= 0 || services.ads.mode === "preview") return;
    const unitId = adUnit("banner", services.ads.mode);
    if (!unitId) return;
    const key = `${path}:${width}:${unitId}`;
    if (requested.current.has(key)) return;
    requested.current.add(key);
    services.analytics.track("ad_requested");
  }, [services, allowed, ready, failed, width, path]);
  if (!services || !services.ads.allowed(placement, context)) return null;
  if (services.ads.mode === "preview") return null;
  // No empty ad card, compulsory button, or error interrupts normal practice.
  if (automatic && (!ready || !services.ads.ready)) return null;
  if (!ready || !services.ads.ready) return <Card>
    <Label>{services.ads.mode === "live" ? "ADVERTISING" : "TEST ADVERTISING"}</Label>
    <Copy>{services.ads.mode === "test" ? "Google demo inventory only. Loading a test ad connects to Google's ad service; no practice data is sent." : "Review privacy choices before loading an ad. Breathing sessions stay uninterrupted."}</Copy>
    {<Button title={services.ads.mode === "test" ? "Load native test ad" : "Review ad privacy choices"} secondary onPress={() => {
      setNotice("");
      void services.ads.prepare(() => eligible.current).then(() => { setReady(services.ads.ready); if (!services.ads.ready) setNotice("Ads are unavailable. Your breathing practice is unaffected."); }).catch(() => setNotice("Ad consent could not load. No ad was requested."));
    }} />}
    {!!notice && <Copy accessibilityRole="alert">{notice}</Copy>}
  </Card>;
  const sdk = require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
  const unitId = adUnit("banner", services.ads.mode);
  if (!unitId) return null;
  return <View style={{ paddingHorizontal: 20, paddingVertical: 6, gap: 4 }}><Label>{services.ads.mode === "test" ? "TEST AD" : "ADVERTISEMENT"}</Label>
    <View testID="banner-container" onLayout={event => setWidth(Math.floor(event.nativeEvent.layout.width))} style={{ minHeight: height, alignItems: "center" }}>
    {width > 0 && !failed && <sdk.BannerAd key={width} unitId={unitId} size={sdk.BannerAdSize.ANCHORED_ADAPTIVE_BANNER} width={width}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      onAdLoaded={dimensions => { setHeight(h => Math.max(h, dimensions.height)); services.analytics.track("ad_loaded"); }}
      onSizeChange={dimensions => setHeight(h => Math.max(h, dimensions.height))}
      onAdImpression={() => services.analytics.track("ad_impression")}
      onAdFailedToLoad={() => { setFailed(true); services.analytics.track("ad_failed", { outcome: "failed" }); }} />}
    </View>
  </View>;
}
