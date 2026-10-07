import { useLanguage } from "../../src/use-language";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Screen, Title, Label, ProtocolRow, Chip, Card, Copy, Button } from "../../src/ui";
import { protocols } from "@inout/protocols";
import { useSession } from "../../src/provider";

const purposes: Record<string, string> = {
  "physiological-sigh": "Short practice",
  box: "Steady concentration",
  coherent: "Easy, balanced rhythm",
  "extended-exhale": "Downshift gently",
  "4-7-8": "Prepare for sleep",
  diaphragmatic: "Restore natural breathing",
  equal: "Quiet mental focus",
  "nadi-shodhana": "Alternate and settle",
  bhramari: "Soften tension",
  "high-intensity-cyclic": "Cyclic hyperventilation with retention",
};

export default function Protocols() {
  useLanguage();
  const controller = useSession();
  const [filter, setFilter] = useState("All");
  const filtered = protocols.filter((p) => p.availability === "enabled" && (filter === "All" || (filter === "Saved" ? controller.isFavorite(p.id) : p.goalTags.some((goal) => goal === filter))));
  return (
    <Screen tabScreen>
      <View style={{ gap: 8 }}>
      <Label>PROTOCOLS</Label>
      <Title>Find your rhythm.</Title>
      <Copy>Choose a cadence for the moment ahead.</Copy>
      </View>
      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
        {["All", "Saved", "Calm", "Focus", "Perform", "Recover", "Sleep", "Energize"].map((goal) => <Chip key={goal} title={goal} selected={filter === goal} onPress={() => setFilter(goal)} />)}
      </ScrollView>
      {!filtered.length && <Card><Title>{filter === "Saved" ? "Your collection starts here." : "No protocols in this category yet."}</Title><Copy>{filter === "Saved" ? "Save a protocol from its detail screen to find it here." : "Explore another category to find your next practice."}</Copy><Button title="Browse protocols" secondary onPress={() => setFilter("All")} /></Card>}
      {(filter === "All" ? ["Foundational", "Calm & sleep", "Focus & balance", "High intensity"] : [filter]).map(section => <View key={section} style={{ gap: 14 }}>
      {filter === "All" && <Label>{section}</Label>}
      {filtered.filter(p => filter !== "All" || (p.intensity === "high" ? "High intensity" : ["diaphragmatic", "coherent", "equal"].includes(p.id) ? "Foundational" : p.goalTags.includes("Sleep") || p.goalTags.includes("Calm") ? "Calm & sleep" : "Focus & balance") === section).map((protocol) => {
        const available = protocol.availability === "enabled";
        return available ? (
          <ProtocolRow
            key={protocol.id}
            protocol={protocol}
            locked={!controller.entitlements.protocolAccess(protocol).allowed}
            favorite={controller.isFavorite(protocol.id)}
            purpose={purposes[protocol.id] ?? protocol.goalTags.join(" · ")}
            onPress={() => router.push({ pathname: "/protocol", params: { id: protocol.id } })}
          />
        ) : null;
      })}</View>)}
    </Screen>
  );
}
