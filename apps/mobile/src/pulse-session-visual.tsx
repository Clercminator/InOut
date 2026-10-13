import { View, useWindowDimensions } from "react-native";
import type { snapshot } from "@inout/breathing-engine";
import type { Phase } from "@inout/shared-types";
import { PulseOrb } from "./pulse-orb";
import { breathingGuidance } from "./breathing-guidance";
import { Copy } from "./ui";
import { t } from "./i18n";

export function PulseSessionVisual({ view, phases, running, cycleLabel }: {
  view: ReturnType<typeof snapshot>; phases: Phase[]; running: boolean; cycleLabel?: string;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const guidance = breathingGuidance(phases, view.phaseIndex, view.phaseElapsedMs);
  const size = Math.max(120, Math.min(260, width - 88, height * .32));
  const separate = fontScale > 1.3 || width < 350;
  const readout = <View accessible accessibilityLabel={`${t(running ? guidance.label : "Paused")}. ${Math.ceil(view.phaseRemainingMs / 1000)}. ${view.phase.nostril ? t(view.phase.nostril + " nostril") : ""}`}
    style={{ alignItems: "center", gap: 4, padding: 8 }}>
    <Copy style={{ color: "#F1DBFF", fontSize: 16, lineHeight: 24, fontWeight: "700", textAlign: "center" }}>{running ? guidance.label : "Paused"}</Copy>
    <Copy style={{ color: "#FFFFFF", fontSize: separate ? 38 : 48, lineHeight: separate ? 46 : 56, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{Math.ceil(view.phaseRemainingMs / 1000)}</Copy>
    {view.phase.nostril && <Copy style={{ color: "#FFFFFF" }}>{view.phase.nostril.toUpperCase()} NOSTRIL</Copy>}
  </View>;
  return <View style={{ gap: 12, alignItems: "center", paddingVertical: 12 }}>
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <PulseOrb key={view.blockIndex} view={view} phases={phases} running={running} size={size} />
      {!separate && <View style={{ position: "absolute", backgroundColor: "#130B2D99", borderRadius: 28, maxWidth: "90%" }}>{readout}</View>}
    </View>
    {separate && readout}
    <Copy style={{ color: "#E2D6F5", textAlign: "center" }}>{cycleLabel ?? `${t("CYCLE")} ${view.currentCycle}/${view.totalCycles}`}</Copy>
    <Copy style={{ color: "#E2D6F5", textAlign: "center" }}>{running ? guidance.instruction : "Breathe naturally while paused"}</Copy>
  </View>;
}
