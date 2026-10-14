import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { snapshot, start } from "@inout/breathing-engine";
import { planFor, protocols } from "@inout/protocols";
import type { EngineState } from "@inout/shared-types";
import { PulseOrb } from "./pulse-orb";
import { Button, Copy } from "./ui";

const plan = planFor(protocols.find(p => p.id === "equal")!, 3);
const phases = plan.blocks[0].phases;
const idle = start(plan, 0);

/** A disposable demonstration of the real engine. Never writes sessions or rewards. */
export function OnboardingDemo() {
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [now, setNow] = useState(0);
  const [finished, setFinished] = useState(false);
  const clock = useRef(0);
  const generation = useRef(0);
  const { width } = useWindowDimensions();
  const stop = useCallback(() => { generation.current++; setEngine(null); setFinished(false); }, []);
  useFocusEffect(useCallback(() => {
    const listener = AppState.addEventListener("change", state => { if (state !== "active") stop(); });
    const blur = Platform.OS === "android" ? AppState.addEventListener("blur", stop) : undefined;
    return () => { listener.remove(); blur?.remove(); stop(); };
  }, [stop]));
  useEffect(() => {
    if (!engine) return;
    const run = generation.current;
    const timer = setInterval(() => {
      if (run !== generation.current) return;
      const time = Math.max(0, performance.now() - clock.current);
      setNow(time);
      if (snapshot(engine, time).completed) { setEngine(null); setFinished(true); }
    }, 100);
    return () => clearInterval(timer);
  }, [engine]);
  const view = snapshot(engine ?? idle, now);
  return <View style={{ gap: 16 }}>
    <View style={{ borderRadius: 32, padding: 24, alignItems: "center", gap: 18, backgroundColor: "#171024" }}>
      <PulseOrb view={engine ? view : snapshot(idle, 0)} phases={phases} running={!!engine} size={Math.min(228, width - 96)} />
      <Copy accessibilityLiveRegion="polite" style={{ color: "#FFFFFF", fontSize: 24, lineHeight: 32, textAlign: "center", fontWeight: "700" }}>{engine ? view.phase.type === "inhale" ? "Breathe in" : "Breathe out" : finished ? "Return to natural breathing." : "Follow your own comfort."}</Copy>
    </View>
    <Copy>No holds. No score. Breathe gently and stop whenever you need.</Copy>
    <Button title={engine ? "Stop demonstration" : finished ? "Try again" : "Try a few breaths"} secondary onPress={() => {
      if (engine) stop();
      else { clock.current = performance.now(); setNow(0); setFinished(false); setEngine(start(plan, 0)); }
    }} />
  </View>;
}
