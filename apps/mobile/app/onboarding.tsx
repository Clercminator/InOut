import { useTheme } from "../src/theme";
import { useLanguage } from "../src/use-language";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Screen, Title, Label, Card, Copy, Button, useStyles } from "../src/ui";
import { useSession, SaveError } from "../src/provider";

const pages = [
  {
    icon: "air",
    label: "A SMALL PRACTICE, ON PURPOSE",
    title: "Come back to your breath.",
    copy: "IN/OUT helps you move from the state you are in to the state you need next.",
  },
  {
    icon: "tune",
    label: "YOUR MOMENT, YOUR CADENCE",
    title: "Choose the right kind of practice.",
    copy: "Start with a situation, follow a protocol, or build a pattern that is yours.",
  },
  {
    icon: "insights",
    label: "NOTICE THE SHIFT",
    title: "Keep what works.",
    copy: "A quick before-and-after check turns each session into useful personal feedback.",
  },
] as const;

export default function Onboarding() {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  useEffect(() => { controller.analytics.track("onboarding_started"); }, [controller]);
  const [page, setPage] = useState(0);
  const current = pages[page];
  const finish = () => {
    controller.setPreferences({ ...controller.preferences, onboardingComplete: true });
    if (!controller.error) router.replace("/(tabs)");
  };
  return (
    <Screen headerAction={<Label>{page + 1} / {pages.length}</Label>}>
      <View style={s.onboardingBody}>
        <View style={s.onboardingIcon}><MaterialIcons name={current.icon} size={38} color={colors.accent} /></View>
        <Label>{current.label}</Label>
        <Title>{current.title}</Title>
        <Copy style={s.onboardingCopy}>{current.copy}</Copy>
      </View>
      <Card style={s.onboardingCard}>
        <SaveError />
        <Button title="Skip introduction" secondary onPress={finish} />
        <View style={s.onboardingDots}>{pages.map((_, index) => <View key={index} style={[s.onboardingDot, index === page && s.onboardingDotActive]} />)}</View>
        {page < pages.length - 1 ? (
          <Button title="Continue" onPress={() => setPage((value) => value + 1)} />
        ) : (
          <Button title="Enter IN/OUT" onPress={finish} />
        )}
        {page > 0 && <Button title="Back" secondary onPress={() => setPage((value) => value - 1)} />}
      </Card>
    </Screen>
  );
}
