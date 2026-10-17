import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useLanguage } from "../src/use-language";
import { useSession } from "../src/provider";
import { BackScreen, Title, Copy, Card, Label, Button } from "../src/ui";
import { Linking } from "react-native";
import { Alert } from "../src/localized-native";
import info from "../../../release/public-info.json";
import content from "../../../release/content.json";
import { CyclicSafety } from "../src/cyclic-content";
export default function Safety() {
  useLanguage();
  const controller = useSession();
  useFocusEffect(useCallback(() => { controller.analytics.track("safety_screen_viewed"); }, [controller]));
  return <BackScreen title="SAFETY"><Title>Breathe comfortably.</Title>{content.safety.map((section) => <Card key={section.title}><Label>{section.title}</Label><Copy>{section.body}</Copy></Card>)}<Card><CyclicSafety /></Card><Button title="Online safety information" secondary onPress={() => { void Linking.openURL(info.safetyUrl).catch(() => Alert.alert("Website unavailable", `Contact ${info.supportEmail}.`)); }} /></BackScreen>;
}
