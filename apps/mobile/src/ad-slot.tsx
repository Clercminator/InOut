import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { usePathname } from "expo-router";
import { useCommercial } from "./commercial-context";
import { useSession } from "./provider";
import type { AdPlacement } from "./ads";
import { Card, Copy, Button, Label } from "./ui";

export function AdSlot({ placement }: { placement: AdPlacement }) {
  const services = useCommercial();
  const controller = useSession();
  const path = usePathname();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const eligible = useRef(false);
  eligible.current = !!services?.ads.allowed(placement, { path, foreground, sessionStage: controller.current?.stage ?? null });
  useEffect(() => () => { eligible.current = false; }, []);
  useEffect(() => { const sub = AppState.addEventListener("change", (s) => setForeground(s === "active")); return () => sub.remove(); }, []);
  if (!services || !services.ads.allowed(placement, { path, foreground, sessionStage: controller.current?.stage ?? null })) return null;
  if (!ready || !services.ads.ready) return <Card>
    <Label>{services.ads.mode === "live" ? "ADVERTISING" : "TEST ADVERTISING"}</Label>
    <Copy>{services.ads.mode === "preview" ? "Native test ads require a development build. Expo Go can preview this placement only." : services.ads.mode === "test" ? "Google demo inventory only. Loading a test ad connects to Google's ad service; no practice data is sent." : "Review privacy choices before loading an ad. Breathing sessions stay uninterrupted."}</Copy>
    {services.ads.mode !== "preview" && <Button title={services.ads.mode === "test" ? "Load native test ad" : "Review ad privacy choices"} secondary onPress={() => {
      setNotice("");
      void services.ads.prepare(() => eligible.current).then(() => { setReady(services.ads.ready); if (!services.ads.ready) setNotice("Ads are unavailable. Your breathing practice is unaffected."); }).catch(() => setNotice("Ad consent could not load. No ad was requested."));
    }} />}
    {!!notice && <Copy accessibilityRole="alert">{notice}</Copy>}
  </Card>;
  if (services.ads.mode === "preview") return null;
  const sdk = require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
  const liveId = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID : process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID;
  const unitId = services.ads.mode === "test" ? sdk.TestIds.BANNER : liveId;
  if (!unitId) return null;
  return <Card><Label>{services.ads.mode === "test" ? "TEST AD" : "ADVERTISEMENT"}</Label>
    <sdk.BannerAd unitId={unitId} size={sdk.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      onAdImpression={() => services.analytics.track("ad_impression")}
      onAdFailedToLoad={() => { setReady(false); setNotice("No ad available right now."); }} />
  </Card>;
}
