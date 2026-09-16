import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { BackScreen, Button, Card, Copy, Label, Title, s } from "../src/ui";
import { useSession } from "../src/provider";
import { makeMixProtocol } from "../src/custom-protocol";
import { protocols } from "@inout/protocols";
import { colors } from "@inout/design-tokens";

export default function CustomMix() {
  const controller = useSession();
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const launch = () => {
    const chosen = selected.map((id) => protocols.find((protocol) => protocol.id === id)!);
    if (!chosen.length) return;
    controller.setCustomProtocol(makeMixProtocol(chosen));
    router.push({ pathname: "/pre", params: { id: "custom" } });
  };
  return (
    <BackScreen title="CUSTOM MIX">
      <Title>Create Mix</Title>
      <Copy>Combine protocols into one guided session. Choose at least one to begin.</Copy>
      <Card>
        <Label>MIX SEQUENCE · {selected.length}</Label>
        {protocols.map((protocol) => {
          const active = selected.includes(protocol.id);
          return <Pressable key={protocol.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => toggle(protocol.id)} style={[s.mixOption, active && s.mixOptionActive]}><View style={s.mixNumber}><Copy style={active ? { color: colors.accent } : undefined}>{active ? selected.indexOf(protocol.id) + 1 : "+"}</Copy></View><View style={{ flex: 1 }}><Copy style={s.protocolName}>{protocol.name}</Copy><Copy style={s.small}>{Math.round(protocol.defaultDuration / 1000)} sec · {protocol.goalTags.join(" · ")}</Copy></View></Pressable>;
        })}
      </Card>
      <Button title="Use this mix" disabled={!selected.length} onPress={launch} />
      <Copy style={s.small}>The mix uses the same safety and State Shift check-in as every built-in protocol.</Copy>
    </BackScreen>
  );
}
