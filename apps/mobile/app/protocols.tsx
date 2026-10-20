import { useLanguage } from "../src/use-language";
import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { BackScreen, Title, Label, ProtocolRow, Chip, Card, Copy, Button, ActionRow, useStyles } from "../src/ui";
import { catalogProtocols } from "@inout/protocols";
import { useSession } from "../src/provider";
import { protocolTitle, t } from "../src/i18n";
import { intentTags, searchProtocols, normalizeSearch, type IntentTag } from "../src/protocol-search";

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
  "sleep-wind-down": "Calm & Unwind",
  "post-workout-reset": "Performance & Preparation",
  "intimacy-calm": "Calm & Unwind",
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
  const [tags, setTags] = useState<IntentTag[]>([]);
  useEffect(() => { if (params.filter === "Saved") setFilter("Saved"); }, [params.filter]);

  const visibleProtocols = catalogProtocols.filter((p) => p.availability === "enabled");
  const filtered = searchProtocols(visibleProtocols.filter((p) => {
    const matchesFilter = filter === "All" || filter === "Saved" ? (filter === "All" || controller.isFavorite(p.id)) : categoryFor(p.id) === filter;
    return matchesFilter;
  }), search, tags);
  const searching = !!search.trim() || !!tags.length;
  const sensitiveSearch = tags.includes("intimacy") || /sex|intim|ejacul|ejacu|arousal/.test(normalizeSearch(search)) || filtered.some(p => p.id === "intimacy-calm");
  const mealSearch = /meal|digest|comer|refeic/.test(normalizeSearch(search));
  useEffect(() => {
    if (!searching || sensitiveSearch) return;
    // No query, tag, result identity or sensitive intent enters telemetry.
    const timer = setTimeout(() => controller.analytics.track(filtered.length ? "protocol_search_used" : "protocol_search_empty"), 800);
    return () => clearTimeout(timer);
  }, [search, tags, filtered.length, controller, searching, sensitiveSearch]);

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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(intentTags) as IntentTag[]).map(tag => <Chip key={tag} title={intentTags[tag].label}
          selected={tags.includes(tag)} onPress={() => setTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])} />)}
      </View>
      {!searching && <Copy>Explore a purpose above or search in your own words.</Copy>}
      {mealSearch && <Copy>After meals, wait until comfortable and never practice while eating. These exercises do not treat digestive conditions.</Copy>}
      {!filtered.length && <Card><Title>{filter === "Saved" ? "Your collection starts here." : "No matching protocols."}</Title><Copy>{filter === "Saved" ? "Save a protocol from its detail screen to find it here." : "Try another word or clear the filters."}</Copy><Button title="Reset search & filters" secondary onPress={() => { setFilter("All"); setSearch(""); setTags([]); }} /></Card>}
      {(searching ? ["Search results"] : filter === "All" || filter === "Saved" ? categories : [filter]).map(section => (
        <View key={section} style={{ gap: 14 }}>
          {(filter === "All" || searching) && <Label>{t(section)}</Label>}
          {filtered.filter(p => searching ? true : (filter === "All" || filter === "Saved") ? categoryFor(p.id) === section : true).map((protocol) => (
            <ProtocolRow
              key={protocol.id}
              protocol={protocol}
              locked={!controller.entitlements.protocolAccess(protocol).allowed}
              favorite={controller.isFavorite(protocol.id)}
              purpose={protocol.purpose ?? purposes[protocol.id] ?? protocol.goalTags.join(" · ")}
              onPress={() => router.push({ pathname: "/protocol", params: { id: protocol.id } })}
            />
          ))}
        </View>
      ))}
      {filter === "All" && <Card><Label>ANIMATION LAB</Label><Copy>Try the new sphere in a separate testing protocol.</Copy><ActionRow title="Testing · Pulse" icon="blur-on" onPress={() => router.push("/testing")} /></Card>}
    </BackScreen>
  );
}
