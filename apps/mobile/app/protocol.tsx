import { useSession, SaveError } from "../src/provider";
import { useTheme } from "../src/theme";
import { message, countLabel, decimal } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, Disclosure, IconButton, useStyles } from "../src/ui";
import { protocols, sigh, isCyclic } from "@inout/protocols";
import { CyclicOverview, CyclicSafety } from "../src/cyclic-content";
import { useEffect } from "react";
import { View } from "react-native";
import { ShareExercise } from "../src/share-exercise";
import { ProtocolEvidenceCard } from "../src/protocol-evidence-card";

export default function ProtocolDetail() {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const protocol = protocols.find((item) => item.id === id) ?? sigh;
  useEffect(() => { if (id !== "intimacy-calm" && (!id || protocols.some(p => p.id === id))) controller.analytics.track("protocol_viewed"); }, [controller, id]);
  const available = protocol.availability === "enabled";
  if (id && !protocols.some(item => item.id === id)) return <BackScreen title="PROTOCOL"><Title>Session unavailable</Title><Button title="Browse protocols" onPress={() => router.replace("/protocols")} /></BackScreen>;
  if (!available) return <BackScreen title="PROTOCOL"><Title>Not in this release.</Title><Button title="Browse protocols" onPress={() => router.replace("/protocols")} /></BackScreen>;
  return (
    <BackScreen title="PROTOCOL" footer={<View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}><Button title="Start practice  →" onPress={() => router.push({ pathname: "/pre", params: { id: protocol.id } })} /></View>}>
      <View style={{ gap: 8 }}>
      <Label>{protocol.goalTags.join(" · ").toUpperCase()}</Label>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ flex: 1 }}><Title>{protocol.name}</Title></View>
        <IconButton title={controller.isFavorite(protocol.id) ? "Remove from saved" : "Save protocol"}
          icon={controller.isFavorite(protocol.id) ? "bookmark" : "bookmark-border"} onPress={() => controller.toggleFavorite(protocol.id)} />
      </View>
      {protocol.description && <Copy>{protocol.description}</Copy>}
      {protocol.precaution && <Copy>{protocol.precaution}</Copy>}
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
          {countLabel(protocol.defaultCycles, "cycle")} · {message("{0} seconds", [Math.round(protocol.defaultDuration / 1000)])} · {message("{0}s / cycle", [decimal(protocol.phases.reduce((sum, phase) => sum + phase.durationMs, 0) / 1000, 0)])} · {message("{0} breaths/min", [decimal(60 / (protocol.phases.reduce((sum, phase) => sum + phase.durationMs, 0) / 1000))])}
        </Label>
      </Card>}
      {protocol.safetyCategory === "retention" && <Copy>Keep holds comfortable. Never strain, compete with the timer, or push through air hunger.</Copy>}
      <View style={{ gap: 0 }}>
        <Label>About this practice</Label>
        <Disclosure compact title="Before you start">
          {protocol.instructions && <Copy>{protocol.instructions}</Copy>}
          <Copy>Sit comfortably. Breathe without forcing. Stop if you feel dizzy, faint or unwell.</Copy>
          <Copy>The timings are a guide, not a target to push through.</Copy>
        </Disclosure>
        <Disclosure compact title="Benefits and purpose"><Copy>{protocol.purpose ?? protocol.description ?? protocol.name}</Copy></Disclosure>
        <ProtocolEvidenceCard protocol={protocol} compact />
      </View>
      <SaveError />
      <ShareExercise protocol={protocol} />
    </BackScreen>
  );
}
