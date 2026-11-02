import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { protocols } from "@inout/protocols";
import { BackScreen, Card, Chip, Copy, Label, ProtocolRow, Title } from "../src/ui";
import { useSession } from "../src/provider";
import { useLanguage } from "../src/use-language";
import { athleteGuidance, exerciseStages, type ExerciseStage } from "../src/athlete-guidance";
import { protocolGuidance } from "../src/protocol-guidance";

export default function Athletes() {
  useLanguage();
  const controller = useSession();
  const [stage, setStage] = useState<ExerciseStage>("before");
  const guidance = athleteGuidance[stage];
  return <BackScreen title="Breathing for exercise">
    <Title>Before, during & after training</Title>
    <Copy>Choose where you are in your workout.</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {exerciseStages.map(value => <Chip key={value} title={athleteGuidance[value].title} selected={stage === value} onPress={() => setStage(value)} />)}
    </View>
    <Card>
      <Label>{guidance.purpose}</Label>
      <Copy>{guidance.who}</Copy>
      <Copy>{guidance.description}</Copy>
      <Label>What to expect</Label>
      <Copy>{guidance.expectation}</Copy>
      {stage === "during" && <>
        <Copy>For lifting or BJJ drills, keep breathing without deliberate holds. Follow your coach's technique guidance and take a break when needed. Read this before moving; keep your attention on your surroundings.</Copy>
        <Copy>Use the timed practices only at rest. Never use breath-hold or rapid-breathing routines while exercising or in water.</Copy>
      </>}
      {stage === "after" && <Copy>If the count feels too slow, return to natural breathing. This practice does not replace your cool-down, hydration or rest.</Copy>}
    </Card>
    {guidance.protocolIds.map(id => {
      const protocol = protocols.find(item => item.id === id);
      if (!protocol || protocol.availability !== "enabled") return null;
      return <ProtocolRow key={id} protocol={protocol} purpose={protocolGuidance[id].purpose}
        locked={!controller.entitlements.protocolAccess(protocol).allowed} favorite={controller.isFavorite(id)}
        onPress={() => router.push({ pathname: "/protocol", params: { id } })} />;
    })}
  </BackScreen>;
}
