import { useLanguage } from "../src/use-language";
import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { BackScreen, Title, Label, ProtocolRow, Chip, Card, Copy, Button, ActionRow, useStyles } from "../src/ui";
import { catalogProtocols } from "@inout/protocols";
import { useSession } from "../src/provider";
import { protocolTitle, t } from "../src/i18n";

const categories = ["Balance", "Calm & Unwind", "Energy & Focus", "Performance & Preparation", "Advanced"] as const;
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
  "meditation-breathing": "Settle into calm",
  "traditional-yogic": "Balance the breath",
  "three-stage-breath": "Refresh without forcing",
  "runner-rhythm": "Steady cadence",
  "high-intensity-cyclic": "Cyclic hyperventilation with retention",
  athletic: "Prepare with control",
  endurance: "Build steady stamina",
  swimmer: "Keep rhythm while moving",
  measured: "Find a calm pace",
};
const categoryFor = (id: string) => ({
  coherent: "Balance",
  box: "Balance",
  "meditation-breathing": "Calm & Unwind",
  "traditional-yogic": "Calm & Unwind",
  equal: "Balance",
  "box-2": "Balance",
  "extended-exhale": "Calm & Unwind",
  "4-7-8": "Calm & Unwind",
  "three-stage-breath": "Calm & Unwind",
  "runner-rhythm": "Energy & Focus",
  "high-intensity-cyclic": "Advanced",
  athletic: "Performance & Preparation",
  endurance: "Performance & Preparation",
  swimmer: "Performance & Preparation",
  measured: "Energy & Focus",
  diaragmatic: "Calm & Unwind",
  diaphragmatic: "Calm & Unwind",
  "physiological-sigh": "Calm & Unwind",
  "nadi-shodhana": "Energy & Focus",
  bhramari: "Calm & Unwind",
  "high-intensity-cyclic-alt": "Advanced",
})[id] ?? "Balance";

export default function Protocols() {
  useLanguage();
  const controller = useSession();
  const s = useStyles();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState(params.filter === "Saved" ? "Saved" : "All");
  const [search, setSearch] = useState("");
  useEffect(() => { if (params.filter === "Saved") setFilter("Saved"); }, [params.filter]);

  const visibleProtocols = catalogProtocols.filter((p) => p.availability === "enabled");
  const filtered = visibleProtocols.filter((p) => {
    const matchesFilter = filter === "All" || filter === "Saved" ? (filter === "All" || controller.isFavorite(p.id)) : categoryFor(p.id) === filter;
    const needle = search.trim().toLowerCase();
    if (!matchesFilter) return false;
    if (!needle) return true;
    const haystack = [protocolTitle(p), p.description ?? "", ...(p.searchTerms ?? [])].join(" ").toLowerCase();
    return haystack.includes(needle);
  });

  return (
    <BackScreen title="PROTOCOLS">
      <View style={{ gap: 8 }}>
        <Title>Find your rhythm.</Title>
        <Copy>Choose a cadence for the moment ahead.</Copy>
      </View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("Search protocols")}
        accessibilityLabel={t("Search protocols")}
        style={[s.input, { width: "100%" }]}
      />
      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
        {["All", "Saved", ...categories].map((goal) => <Chip key={goal} title={t(goal)} selected={filter === goal} onPress={() => setFilter(goal)} />)}
      </ScrollView>
      {!filtered.length && <Card><Title>{filter === "Saved" ? "Your collection starts here." : "No protocols in this category yet."}</Title><Copy>{filter === "Saved" ? "Save a protocol from its detail screen to find it here." : "Explore another category to find your next practice."}</Copy><Button title="Browse protocols" secondary onPress={() => setFilter("All")} /></Card>}
      {(filter === "All" || filter === "Saved" ? categories : [filter]).map(section => (
        <View key={section} style={{ gap: 14 }}>
          {filter === "All" && <Label>{t(section)}</Label>}
          {filtered.filter(p => (filter === "All" || filter === "Saved") ? categoryFor(p.id) === section : true).map((protocol) => (
            <ProtocolRow
              key={protocol.id}
              protocol={protocol}
              locked={!controller.entitlements.protocolAccess(protocol).allowed}
              favorite={controller.isFavorite(protocol.id)}
              purpose={purposes[protocol.id] ?? protocol.goalTags.join(" · ")}
              onPress={() => router.push({ pathname: "/protocol", params: { id: protocol.id } })}
            />
          ))}
        </View>
      ))}
      {filter === "All" && <Card><Label>ANIMATION LAB</Label><Copy>Try the new sphere in a separate testing protocol.</Copy><ActionRow title="Testing · Pulse" icon="blur-on" onPress={() => router.push("/testing")} /></Card>}
    </BackScreen>
  );
}
