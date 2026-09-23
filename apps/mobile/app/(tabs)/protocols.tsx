import { useState } from "react";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { Screen, Title, Label, ProtocolRow, Chip, Card, Copy } from "../../src/ui";
import { protocols } from "@inout/protocols";
import { useSession } from "../../src/provider";

const purposes: Record<string, string> = {
  "physiological-sigh": "Quick reset",
  box: "Steady concentration",
  coherent: "Easy, balanced rhythm",
  "extended-exhale": "Downshift gently",
  "4-7-8": "Prepare for sleep",
  diaphragmatic: "Restore natural breathing",
  equal: "Quiet mental focus",
  "nadi-shodhana": "Alternate and settle",
  bhramari: "Soften tension",
  "high-intensity-cyclic": "Energize your body",
};

export default function Protocols() {
  const controller = useSession();
  const [filter, setFilter] = useState("All");
  const filtered = protocols.filter((p) => p.availability === "enabled" && (filter === "All" || (filter === "Saved" ? controller.isFavorite(p.id) : p.goalTags.some((goal) => goal === filter))));
  return (
    <Screen>
      <Label>PROTOCOLS</Label>
      <Title>Find your rhythm.</Title>
      <Copy>Choose a cadence for the moment ahead.</Copy>
      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
        {["All", "Saved", "Calm", "Focus", "Perform", "Recover", "Sleep", "Energize"].map((goal) => <Chip key={goal} title={goal} selected={filter === goal} onPress={() => setFilter(goal)} />)}
      </ScrollView>
      {!filtered.length && <Card><Title>Your collection starts here.</Title><Copy>Save a protocol from its detail screen to find it here.</Copy></Card>}
      {filtered.map((protocol) => {
        const available = protocol.availability === "enabled";
        return available ? (
          <ProtocolRow
            key={protocol.id}
            protocol={protocol}
            purpose={purposes[protocol.id] ?? protocol.goalTags.join(" · ")}
            onPress={() => router.push({ pathname: "/protocol", params: { id: protocol.id } })}
          />
        ) : null;
      })}
    </Screen>
  );
}
