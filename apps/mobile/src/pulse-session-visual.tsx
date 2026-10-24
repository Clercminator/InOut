import { useEffect, useState } from "react";
import { BoxVisual } from "./box-visual";
import { AccessibilityInfo, View, useWindowDimensions } from "react-native";
import type { snapshot } from "@inout/breathing-engine";
import type { Phase, Preferences } from "@inout/shared-types";
import { PulseOrb } from "./pulse-orb";
import { resolvePacerTheme } from "./pacer-theme";
import { SessionReadout } from "./session-readout";
import { sessionAnimationSize, pulseStageFill } from "./session-layout";

export function PulseSessionVisual({ view, phases, running, cycleLabel, pacerTheme, geometry = "pulse", availableHeight, nextLabel }: {
  view: ReturnType<typeof snapshot>; phases: Phase[]; running: boolean; cycleLabel?: string; pacerTheme?: Preferences["pacerTheme"]; geometry?: "pulse" | "box" | "triangle"; availableHeight?: number; nextLabel?: string;
}) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(v => { if (active) setReduced(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { active = false; sub.remove(); };
  }, []);
  const { width, height, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const [readoutHeight, setReadoutHeight] = useState(190 * fontScale);
  const size = sessionAnimationSize(measuredWidth ?? width - 56, availableHeight ?? height * .7, readoutHeight);
  const theme = resolvePacerTheme(pacerTheme);
  return <View testID="pulse-session-visual" style={{ width: "100%", gap: 12, alignItems: "center", padding: 0, backgroundColor: theme.preview.background, borderRadius: 24 }}>
    <View testID="session-animation-area" onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)} style={{ width: "100%", height: size, alignItems: "center", justifyContent: "center" }}>
      {geometry !== "pulse" ? <View testID={`${geometry}-orb-container`} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
        <View style={geometry === "triangle" ? { transform: [{ translateY: size * (.1 + .8 / Math.sqrt(3) - .5) }] } : undefined}>
          <PulseOrb view={view} phases={phases} running={running} size={size * (geometry === "triangle" ? .43 : .76)} minimumScale={.45} theme={pacerTheme ?? "default"} />
        </View>
        <BoxVisual phases={phases} geometry={geometry} view={view} running={running} reduced={reduced} pacerTheme={pacerTheme ?? "default"} />
      </View> : <PulseOrb view={view} phases={phases} running={running} size={size * pulseStageFill} minimumScale={.58} theme={pacerTheme ?? "default"} />}
    </View>
    <SessionReadout view={view} phases={phases} running={running} cycleLabel={cycleLabel} pacerTheme={pacerTheme} nextLabel={nextLabel}
      onLayout={event => setReadoutHeight(event.nativeEvent.layout.height)} />
  </View>;
}
