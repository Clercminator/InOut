import { useSession, SaveError } from "../src/provider";
import { useTheme } from "../src/theme";
import { t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { Pressable } from "../src/localized-native";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, ActionRow, useStyles } from "../src/ui";
import { protocols, sigh, isCyclic } from "@inout/protocols";
import { CyclicOverview, CyclicSafety } from "../src/cyclic-content";
import { useState, useEffect } from "react";
import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ShareExercise } from "../src/share-exercise";

export default function ProtocolDetail() {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const [showSafety, setShowSafety] = useState(false);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const protocol = protocols.find((item) => item.id === id) ?? sigh;
  useEffect(() => { if (!id || protocols.some(p => p.id === id)) controller.analytics.track("protocol_viewed"); }, [controller, id]);
  const available = protocol.availability === "enabled";
  if (id && !protocols.some(item => item.id === id)) return <BackScreen title="PROTOCOL"><Title>Session unavailable</Title><Button title="Browse protocols" onPress={() => router.replace("/(tabs)/protocols")} /></BackScreen>;
  if (!available) return <BackScreen title="PROTOCOL"><Title>Not in this release.</Title><Button title="Browse protocols" onPress={() => router.replace("/(tabs)/protocols")} /></BackScreen>;
  return (
    <BackScreen title="PROTOCOL" footer={<View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}><Button title="Start practice  →" onPress={() => router.push({ pathname: "/pre", params: { id: protocol.id } })} /></View>}>
      <View style={{ gap: 8 }}>
      <Label>{protocol.goalTags.join(" · ").toUpperCase()}</Label>
      <Title>{protocol.name}</Title>
      <Copy>{protocol.phases.map((phase) => phase.label).join(" · ")}</Copy>
      </View>
      {isCyclic(protocol) ? <><CyclicOverview /><Card><CyclicSafety /></Card></> : <Card>
        <Label>CADENCE</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {protocol.phases.filter(phase => phase.durationMs > 0).map((phase, index) => {
            const accent = phase.type === "exhale" || phase.type === "hum" ? colors.exhale : phase.type === "hold" ? colors.hold : colors.accent;
            return <View key={index} style={{ flexBasis: "44%", flexGrow: 1, padding: 14, borderRadius: 14, backgroundColor: accent + "12", borderTopWidth: 2, borderTopColor: accent, gap: 4 }}>
              <Copy style={[s.small, { color: accent }]}>{phase.label}</Copy>
              <Copy style={s.subtitle}>{phase.durationMs / 1000}s</Copy>
            </View>;
          })}
        </View>
        <Copy>
          Follow each phase gently and stop if you feel dizzy, faint or unwell.
        </Copy>
        <Label>
          {protocol.defaultCycles} CYCLES · {Math.round(protocol.defaultDuration / 1000)} SECONDS
        </Label>
      </Card>}
      {!isCyclic(protocol) && <Card>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Before you start")} accessibilityState={{ expanded: showSafety }}
          onPress={() => setShowSafety(value => !value)} style={[s.row, { minHeight: 48 }]}>
          <Label>BEFORE YOU START</Label>
          <MaterialIcons name={showSafety ? "expand-less" : "expand-more"} size={24} color={colors.accent} />
        </Pressable>
        {showSafety && <View style={{ gap: 16 }}>
          <Copy>
            Sit comfortably. Breathe without forcing. Stop if you feel dizzy,
            faint or unwell.
          </Copy>
          {protocol.safetyCategory === "retention" && (
            <Copy>
              Keep holds comfortable. Never strain, compete with the timer, or
              push through air hunger.
            </Copy>
          )}
          {protocol.safetyCategory === "highIntensity" && (
            <Copy style={{ color: colors.danger }}>
              A safety confirmation is required before starting. Practice only
              seated or lying down, never in or near water.
            </Copy>
          )}
          <Copy style={s.small}>
            The timings are a guide, not a target to push through.
          </Copy>
        </View>}
      </Card>}
      <Card style={{ paddingVertical: 8 }}>
        <ActionRow title={controller.isFavorite(protocol.id) ? "Remove from saved" : "Save protocol"}
          icon={controller.isFavorite(protocol.id) ? "bookmark" : "bookmark-border"}
          onPress={() => controller.toggleFavorite(protocol.id)} />
      </Card>
      <SaveError />
      <ShareExercise protocol={protocol} />
    </BackScreen>
  );
}
