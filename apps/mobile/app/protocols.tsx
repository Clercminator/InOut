import { useLanguage } from "../src/use-language";
import { useEffect, useState } from "react";
import { FlatList, Keyboard, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Title, Label, ProtocolRow, Chip, Card, Copy, Button, ActionRow, useStyles } from "../src/ui";
import { catalogProtocols } from "@inout/protocols";
import { useSession } from "../src/provider";
import { message, t } from "../src/i18n";
import { useTheme } from "../src/theme";
import { categories, intentTags, discoveryFacets, reconcileDiscoveryFilters, discoverProtocols, normalizeSearch, type IntentTag } from "../src/protocol-search";

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
export default function Protocols() {
  useLanguage();
  const controller = useSession();
  const s = useStyles();
  const { colors: c } = useTheme();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [saved, setSaved] = useState(params.filter === "Saved");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tags, setTags] = useState<IntentTag[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState<string | null>(null);
  const [draftTags, setDraftTags] = useState<IntentTag[]>([]);
  useEffect(() => { if (params.filter) setSaved(params.filter === "Saved"); }, [params.filter]);
  const filtered = discoverProtocols(catalogProtocols, { query: search, category, tags, saved, isFavorite: id => controller.isFavorite(id) });
  const facets = discoveryFacets(catalogProtocols, { query: search, category: draftCategory, tags: draftTags, saved, isFavorite: id => controller.isFavorite(id) });
  const favoriteKey = catalogProtocols.filter(p => controller.isFavorite(p.id)).map(p => p.id).join(",");
  useEffect(() => {
    const next = reconcileDiscoveryFilters(catalogProtocols, { query: search, category, tags, saved, isFavorite: id => controller.isFavorite(id) });
    if (next.category !== category) setCategory(next.category);
    if (next.tags.join(",") !== tags.join(",")) setTags(next.tags);
  }, [search, saved, favoriteKey, category, tags, controller]);
  const activeCount = tags.length + Number(!!category);
  const emptyCollection = saved && !search.trim() && activeCount === 0;
  const searching = !!search.trim() || activeCount > 0 || saved;
  const sensitiveSearch = tags.includes("intimacy") || /sex|intim|ejacul|ejacu|arousal/.test(normalizeSearch(search)) || filtered.some(p => p.id === "intimacy-calm");
  const mealSearch = /meal|digest|comer|refeic/.test(normalizeSearch(search));
  useEffect(() => {
    if (!searching || sensitiveSearch) return;
    // Never send query, filters, protocol identity or sensitive intent.
    const timer = setTimeout(() => controller.analytics.track(filtered.length ? "protocol_search_used" : "protocol_search_empty"), 800);
    return () => clearTimeout(timer);
  }, [search, tags, category, saved, filtered.length, controller, searching, sensitiveSearch]);
  const reset = () => { setSaved(false); setSearch(""); setCategory(null); setTags([]); };
  const removeChip = (label: string, remove: () => void) => <Pressable key={label} accessibilityRole="button"
    accessibilityLabel={message("Remove filter: {0}", [t(label)])} onPress={remove}
    style={[s.chip, { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 }]}>
    <Copy style={{ flexShrink: 1 }}>{label}</Copy><MaterialIcons name="close" size={16} color={c.secondaryText} accessible={false} />
  </Pressable>;
  return <Screen title="PROTOCOLS" scroll={false} avoidKeyboard back={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
    <FlatList data={filtered} keyExtractor={p => p.id} contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" initialNumToRender={8} windowSize={5}
      ListHeaderComponent={<View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}><Title>Find your rhythm.</Title><Copy>Choose a cadence for the moment ahead.</Copy></View>
        <View style={[s.input, { paddingVertical: 0, flexDirection: "row", alignItems: "center", gap: 8 }]}>
          <MaterialIcons name="search" size={23} color={c.secondaryText} accessible={false} />
          <TextInput value={search} onChangeText={setSearch} placeholder={t("Search protocols")} placeholderTextColor={c.muted}
            accessibilityLabel={t("Search protocols")} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss} style={{ flex: 1, minWidth: 0, minHeight: 48, color: c.text, fontSize: 16 }} />
          {!!search && <Pressable accessibilityRole="button" accessibilityLabel={t("Clear search")} onPress={() => setSearch("")}
            style={{ minWidth: 44, minHeight: 48, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="cancel" size={22} color={c.secondaryText} accessible={false} />
          </Pressable>}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <Chip title="All" selected={!saved} onPress={() => setSaved(false)} />
          <Chip title="Saved" selected={saved} onPress={() => setSaved(true)} />
          <Pressable accessibilityRole="button" accessibilityLabel={message("Filters, {0} active", [activeCount])}
            accessibilityState={{ expanded: filtersOpen }} onPress={() => { Keyboard.dismiss(); setDraftCategory(category); setDraftTags(tags); setFiltersOpen(true); }}
            style={[s.chip, { marginLeft: "auto", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, borderColor: c.accent }]}>
            <MaterialIcons name="tune" size={20} color={c.accent} accessible={false} /><Copy>Filters</Copy>
            {activeCount > 0 && <Copy translate={false}>{String(activeCount)}</Copy>}
          </Pressable>
        </View>
        {activeCount > 0 && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {category && removeChip(category, () => setCategory(null))}
          {tags.map(tag => removeChip(intentTags[tag].label, () => setTags(current => current.filter(item => item !== tag))))}
        </View>}
        {searching && <View accessibilityLiveRegion="polite"><Copy>{message("Protocols found: {0}", [filtered.length])}</Copy></View>}
        {mealSearch && <Copy>After meals, wait until comfortable and never practice while eating. These exercises do not treat digestive conditions.</Copy>}
      </View>}
      ListEmptyComponent={<Card><Title>{emptyCollection ? "Your collection starts here." : "No matching protocols."}</Title>
        <Copy>{emptyCollection ? "Save a protocol from its detail screen to find it here." : "Try another word or clear the filters."}</Copy>
        <Button title="Reset search & filters" secondary onPress={reset} /></Card>}
      renderItem={({ item: protocol }) => <ProtocolRow protocol={protocol} locked={!controller.entitlements.protocolAccess(protocol).allowed}
        favorite={controller.isFavorite(protocol.id)} purpose={protocol.purpose ?? purposes[protocol.id] ?? protocol.goalTags.join(" · ")}
        onPress={() => { Keyboard.dismiss(); router.push({ pathname: "/protocol", params: { id: protocol.id } }); }} />}
      ListFooterComponent={__DEV__ && !saved ? <Card><Label>ANIMATION LAB</Label><Copy>Try the new sphere in a separate testing protocol.</Copy>
        <ActionRow title="Testing · Pulse" icon="blur-on" onPress={() => router.push("/testing")} /></Card> : null}
    />
    <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
        <SafeAreaView edges={["bottom", "left", "right"]} accessibilityViewIsModal
          style={{ maxHeight: "90%", backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Title>Filters</Title><Button title="Close" secondary onPress={() => setFiltersOpen(false)} />
            </View>
            <Copy>Choose one category and any purposes. Results match any selected purpose.</Copy>
            <Label>Categories</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip title="All" selected={!draftCategory} onPress={() => setDraftCategory(null)} />
              {categories.map(item => <Chip key={item} translate={false} title={`${t(item)} (${facets.categories[item]})`} disabled={draftCategory !== item && !facets.categories[item]} selected={draftCategory === item} onPress={() => setDraftCategory(draftCategory === item ? null : item)} />)}
            </View>
            <Label>Purposes</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(Object.keys(intentTags) as IntentTag[]).map(tag => <Chip key={tag} translate={false} title={`${t(intentTags[tag].label)} (${facets.purposes[tag]})`} disabled={!draftTags.includes(tag) && !facets.purposes[tag]} selected={draftTags.includes(tag)}
                onPress={() => setDraftTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])} />)}
            </View>
          </ScrollView>
          <View style={{ padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: c.border }}>
            <Button title="Apply filters" onPress={() => { setCategory(draftCategory); setTags(draftTags); setFiltersOpen(false); }} />
            <Button title="Clear filters" secondary onPress={() => { setCategory(null); setTags([]); setDraftCategory(null); setDraftTags([]); setFiltersOpen(false); }} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  </Screen>;
}
