import { View, type LayoutChangeEvent } from "react-native";
import type { snapshot } from "@inout/breathing-engine";
import type { Phase } from "@inout/shared-types";
import { Copy } from "./ui";
import { breathingGuidance } from "./breathing-guidance";
import { message, t } from "./i18n";
import { resolvePacerTheme, type PacerThemeId } from "./pacer-theme";

/** Each readout has its own intrinsic-height row; text never sits over the animation. */
export function SessionReadout({ view, phases, running, cycleLabel, pacerTheme, nextLabel, onLayout }: {
  view: ReturnType<typeof snapshot>; phases: Phase[]; running: boolean; cycleLabel?: string;
  pacerTheme?: PacerThemeId; nextLabel?: string; onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const colors = resolvePacerTheme(pacerTheme).preview;
  const guidance = breathingGuidance(phases.length ? phases : [view.phase], phases.length ? view.phaseIndex : 0, view.phaseElapsedMs);
  const cycle = cycleLabel ? t(cycleLabel) : message("Cycle {0} of {1}", [view.currentCycle, view.totalCycles]);
  return <View testID="session-readout" accessible accessibilityLabel={`${message("{0}. {1} seconds remaining.", [t(running ? guidance.label : "Paused"), Math.ceil(view.phaseRemainingMs / 1000)])} ${cycle}. ${t(running ? guidance.instruction : "Breathe naturally while paused")}${nextLabel ? ` ${message("Next: {0}", [t(nextLabel)])}` : ""}`}
    onLayout={onLayout} style={{ width: "100%", alignItems: "center", gap: 4, flexShrink: 0 }}>
    <View testID="session-phase-row" style={{ width: "100%", minHeight: 28, justifyContent: "center" }}>
      <Copy style={{ color: colors.secondaryText, fontSize: 18, lineHeight: 26, fontWeight: "700", textAlign: "center" }}>{running ? guidance.label : "Paused"}</Copy>
      {view.phase.nostril && <Copy style={{ color: colors.secondaryText, textAlign: "center" }}>{view.phase.nostril.toUpperCase()} NOSTRIL</Copy>}
    </View>
    <View testID="session-countdown-row" style={{ minHeight: 72, width: "100%", alignItems: "center", justifyContent: "center" }}>
      <Copy translate={false} accessibilityLabel={message("{0} seconds remaining", [Math.ceil(view.phaseRemainingMs / 1000)])}
        style={{ color: colors.text, fontSize: 60, lineHeight: 72, fontWeight: "700", fontVariant: ["tabular-nums"], textAlign: "center" }}>{Math.ceil(view.phaseRemainingMs / 1000)}</Copy>
    </View>
    <View testID="session-cycle-row" style={{ minHeight: 24, width: "100%" }}><Copy translate={false} style={{ color: colors.secondaryText, textAlign: "center", fontSize: 14, lineHeight: 22 }}>{cycle}</Copy></View>
    <View testID="session-guidance-row" style={{ minHeight: 24, width: "100%" }}><Copy style={{ color: colors.secondaryText, textAlign: "center", fontSize: 14, lineHeight: 22 }}>{running ? guidance.instruction : "Breathe naturally while paused"}</Copy></View>
    {nextLabel && <View testID="session-next-row" style={{ minHeight: 24, width: "100%", paddingTop: 4 }}><Copy style={{ color: colors.secondaryText, textAlign: "center", fontSize: 12, lineHeight: 20 }}>Next: {nextLabel}</Copy></View>}
  </View>;
}
