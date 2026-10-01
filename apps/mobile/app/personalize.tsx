import { useTheme } from "../src/theme";
import { t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { Alert } from "../src/localized-native";
import { View } from "react-native";
import { BackScreen, Card, Chip, Copy, Label, Title, Disclosure, useStyles } from "../src/ui";
import { SaveError, useSession } from "../src/provider";
import { cosmetics, experienceFor, unlocked, weeklyPractice } from "../src/experience";
import type { Experience } from "@inout/shared-types";
import { SoundControls } from "../src/sound-controls";
import { WeeklyGoal } from "../src/practice-rewards";

export default function Personalize() {
  const { palettes, backgrounds } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const e = experienceFor(controller.preferences);
  const ledger = controller.rewards();
  const currentWeek = weeklyPractice(controller.history(), ledger, e.weeklyGoal);
  const choices = <K extends keyof Experience>(key: K, values: readonly Experience[K][]) => <View style={s.row}>{values.map(value => {
    const available = unlocked(ledger, key, String(value));
    return <Chip key={String(value)} title={`${available ? "" : "Locked · "}${String(value).replaceAll("-", " ")}`} selected={e[key] === value} onPress={() => {
      if (available) controller.updateExperience({ [key]: value });
      else Alert.alert("A little practice unlocks this", cosmetics.find(item => item.kind === key && item.id === value)?.requirement);
    }} />;
  })}</View>;
  return <BackScreen title="MAKE IT YOURS">
    <Title>Your rhythm. Your style.</Title>
    <WeeklyGoal compact />
    <Disclosure title="Weekly practice goal" icon="event-available">
      <View style={s.row}>{[2, 3, 4, 5, 6, 7].map(weeklyGoal => <Chip key={weeklyGoal} title={`${weeklyGoal} days`} selected={e.weeklyGoal === weeklyGoal} onPress={() => controller.updateExperience({ weeklyGoal })} />)}</View>
      <Copy style={s.small}>{ledger.weekGoals[currentWeek.week] ? `This week's goal stays at ${currentWeek.goal} days. Changes apply from next week.` : "Choose a comfortable goal. Each day counts once, however many sessions you do."}</Copy>
    </Disclosure>
    <Disclosure title="Your look" icon="palette">
      <View style={{ height: 140, backgroundColor: backgrounds[e.background], alignItems: "center", justifyContent: "center", borderRadius: 18 }}>
        <View accessibilityLabel={t(`${e.palette} palette with ${e.texture} bubble`)} style={{ width: 100, height: 100, borderRadius: 50,
          borderColor: palettes[e.palette].accent, borderWidth: e.texture === "halo" ? 5 : 2, borderStyle: e.texture === "orbit" ? "dotted" : "solid",
          backgroundColor: palettes[e.palette].accent + "12", shadowColor: palettes[e.palette].accent, shadowOpacity: e.texture === "halo" ? 0.6 : 0, shadowRadius: 18 }} />
      </View>
      <Label>PALETTE</Label>{choices("palette", ["sky", "mint", "dusk", "sunrise"])}
      <Label>BUBBLE TEXTURE</Label>{choices("texture", ["glass", "halo", "orbit"])}
      <Label>BACKGROUND</Label>{choices("background", ["midnight", "deep-sea", "plum"])}
      <Label>PROFILE FRAME</Label>{choices("frame", ["simple", "glow", "laurel"])}
    </Disclosure>
    <Disclosure title="Celebrations" icon="auto-awesome">{choices("celebration", ["quiet", "gentle", "playful"])}
      <Copy style={s.small}>Quiet keeps the message. Gentle adds a small sparkle. Playful adds a larger burst. System reduced motion always takes priority.</Copy>
      <Label>BURST STYLE</Label>{choices("celebrationStyle", ["sparks", "confetti"])}
    </Disclosure>
    <Disclosure title="Sound" icon="volume-up"><SoundControls /></Disclosure>
    <Disclosure title="Your collection" icon="emoji-events">
      {cosmetics.map(item => <View key={item.id} style={{ gap: 3 }}><Copy style={s.subtitle}>{unlocked(ledger, item.kind, item.id) ? "✓ " : "○ "}{item.label}</Copy><Copy style={s.small}>{item.requirement}</Copy></View>)}
      <Copy style={s.small}>Unlocks are earned through practice and stay yours. Your tension rating never changes your rewards.</Copy>
    </Disclosure>
    <SaveError />
  </BackScreen>;
}
