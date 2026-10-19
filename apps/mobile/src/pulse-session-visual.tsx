import { useEffect, useState } from "react";
import { BoxVisual } from "./box-visual";
import { AccessibilityInfo, View, useWindowDimensions } from "react-native";
import type { snapshot } from "@inout/breathing-engine";
import type { Phase, Preferences } from "@inout/shared-types";
import { PulseOrb } from "./pulse-orb";
import { resolvePacerTheme } from "./pacer-theme";
import { breathingGuidance } from "./breathing-guidance";
import { Copy } from "./ui";
import { t } from "./i18n";

export function PulseSessionVisual({ view, phases, running, cycleLabel, pacerTheme, geometry = "pulse" }: {
  view: ReturnType<typeof snapshot>; phases: Phase[]; running: boolean; cycleLabel?: string; pacerTheme?: Preferences["pacerTheme"]; geometry?: "pulse" | "box" | "triangle";
}) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(v => { if (active) setReduced(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { active = false; sub.remove(); };
  }, []);
  const { width, height } = useWindowDimensions();
  const guidance = breathingGuidance(phases, view.phaseIndex, view.phaseElapsedMs);
  const size = Math.max(96, Math.min(260, width - 104, height * .32));
  const separate = true;
  const theme = resolvePacerTheme(pacerTheme);
  const readout = <View accessible accessibilityLabel={`${t(running ? guidance.label : "Paused")}. ${Math.ceil(view.phaseRemainingMs / 1000)}. ${view.phase.nostril ? t(view.phase.nostril + " nostril") : ""}`}
    style={{ alignItems: "center", flexDirection: separate ? "row" : "column", flexWrap: "wrap", justifyContent: "center", gap: separate ? 12 : 4, padding: 8 }}>
    <Copy style={{ color: theme.preview.secondaryText, fontSize: 16, lineHeight: 24, fontWeight: "700", textAlign: "center" }}>{running ? guidance.label : "Paused"}</Copy>
    <Copy style={{ color: theme.preview.text, fontSize: separate ? 38 : 48, lineHeight: separate ? 46 : 56, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{Math.ceil(view.phaseRemainingMs / 1000)}</Copy>
    {view.phase.nostril && <Copy style={{ color: theme.preview.text }}>{view.phase.nostril.toUpperCase()} NOSTRIL</Copy>}
  </View>;
  return <View testID="pulse-session-visual" style={{ width: "100%", gap: 12, alignItems: "center", padding: 12, backgroundColor: theme.preview.background, borderRadius: 24, overflow: "hidden" }}>
    <View style={{ width: "100%", alignItems: "center", justifyContent: "center" }}>
      {geometry !== "pulse" ? <View testID={`${geometry}-orb-container`} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
        <View style={geometry === "triangle" ? { transform: [{ translateY: size * (.1 + .8 / Math.sqrt(3) - .5) }] } : undefined}>
          <PulseOrb view={view} phases={phases} running={running} size={size * (geometry === "triangle" ? .43 : .76)} minimumScale={.45} theme={pacerTheme ?? "default"} />
        </View>
        <BoxVisual phases={phases} geometry={geometry} view={view} running={running} reduced={reduced} pacerTheme={pacerTheme ?? "default"} />
      </View> : <PulseOrb view={view} phases={phases} running={running} size={size} minimumScale={.45} theme={pacerTheme ?? "default"} />}
      {!separate && <View style={{ position: "absolute", backgroundColor: `${theme.preview.surface}E8`, borderColor: `${theme.preview.ring}88`, borderWidth: 1, borderRadius: 28, maxWidth: "90%" }}>{readout}</View>}
    </View>
    {separate && <View style={{ backgroundColor: theme.preview.surface, borderColor: `${theme.preview.ring}88`, borderWidth: 1, borderRadius: 20 }}>{readout}</View>}
    <Copy style={{ color: theme.preview.secondaryText, textAlign: "center" }}>{cycleLabel ?? `${t("CYCLE")} ${view.currentCycle}/${view.totalCycles}`}</Copy>
    <Copy style={{ color: theme.preview.secondaryText, textAlign: "center" }}>{running ? guidance.instruction : "Breathe naturally while paused"}</Copy>
  </View>;
}
