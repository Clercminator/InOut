import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { BackScreen, Button, Card, Copy, Label, Title, s } from "../src/ui";
import { useSession } from "../src/provider";
import { customPhase, makeCustomProtocol } from "../src/custom-protocol";
import type { PhaseType } from "@inout/shared-types";

const options: { type: PhaseType; seconds: number; label: string }[] = [
  { type: "inhale", seconds: 4, label: "Inhale · 4 sec" },
  { type: "hold", seconds: 4, label: "Hold · 4 sec" },
  { type: "exhale", seconds: 6, label: "Exhale · 6 sec" },
  { type: "freeBreathing", seconds: 8, label: "Breathe naturally · 8 sec" },
];

export default function CustomPattern() {
  const controller = useSession();
  const [selected, setSelected] = useState([{ type: "inhale" as PhaseType, seconds: 4 }, { type: "exhale" as PhaseType, seconds: 6 }]);
  const phases = selected.map((phase) => customPhase(phase.type, phase.seconds));
  const addPhase = (option: (typeof options)[number]) => setSelected((current) => [...current, option]);
  const launch = () => {
    controller.setCustomProtocol(makeCustomProtocol("custom-pattern", "My Custom Pattern", phases, 6));
    router.push({ pathname: "/pre", params: { id: "custom" } });
  };
  return (
    <BackScreen title="CUSTOM PATTERN">
      <Title>Create Pattern</Title>
      <Copy>Build a cadence from simple phases, then try it through the same State Shift flow.</Copy>
      <Card>
        <Label>YOUR CADENCE</Label>
        {selected.map((phase, index) => <View key={`${phase.type}-${index}`} style={s.customPhase}><Copy>{index + 1}</Copy><Copy style={s.subtitle}>{phase.type === "inhale" ? "Inhale" : phase.type === "exhale" ? "Exhale" : phase.type === "hold" ? "Hold" : "Breathe naturally"}</Copy><Copy style={s.small}>{phase.seconds} sec</Copy></View>)}
      </Card>
      <Label>ADD A PHASE</Label>
      <View style={s.customOptions}>{options.map((option) => <Button key={option.label} title={option.label} secondary disabled={selected.length >= 20} onPress={() => addPhase(option)} />)}</View>
      <Button title="Use this pattern" onPress={launch} />
      <Copy style={s.small}>This is a session draft. Saving and editing presets are not available yet. Completed sessions remain in History.</Copy>
    </BackScreen>
  );
}
