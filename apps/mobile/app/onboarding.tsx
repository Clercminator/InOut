import { router } from "expo-router";
import { BackHandler, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect } from "react";
import { Screen, Title, Label, Card, Copy, Button, IconButton } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { completeJourney, goalContent, journeyFor, recommendPractice } from "../src/personalization";
import { GoalPicker } from "../src/goal-picker";
import { WelcomeEmailOptIn } from "../src/welcome-email-ui";
import { useTheme } from "../src/theme";
import { productConfig } from "../src/product-config";
import { Paywall } from "../src/paywall";
import type { OnboardingJourney } from "@inout/shared-types";

export default function Onboarding() {
  const controller = useSession();
  const { colors } = useTheme();
  const journey = journeyFor(controller.preferences);
  const goal = journey.primaryGoal ?? "stress";
  const content = goalContent[goal];
  useEffect(() => { if (!controller.preferences.onboardingComplete) controller.analytics.track("onboarding_started"); }, [controller]);
  const save = (patch: Partial<OnboardingJourney>) => controller.setPreferences({ ...controller.preferences, journey: { ...journey, ...patch } });
  const finish = () => {
    controller.setPreferences(completeJourney(controller.preferences, Date.now()));
    if (!controller.error) router.replace(journey.quickStart ? { pathname: "/pre", params: { id: recommendPractice(goal).id } } : "/(tabs)");
  };
  const back = journey.step === "welcome" ? undefined : () => save({ step: journey.step === "goals" ? "welcome" : journey.step === "value" ? "goals" : journey.quickStart ? "welcome" : "value" });
  useEffect(() => {
    if (!back || journey.step === "offer" || journey.step === "complete") return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => { back(); return true; });
    return () => listener.remove();
  }, [controller, journey.step, journey.quickStart]);
  if (journey.step === "offer") return <Paywall entry="onboarding" onClose={finish} completionError={controller.error} />;
  if (journey.step === "complete") return <Screen><Title>Your next breath is ready.</Title><Button title="Enter IN/OUT" onPress={finish} /></Screen>;
  return <Screen key={journey.step} avoidKeyboard back={back} headerAction={<IconButton icon="help-outline" title="Breathing safety" onPress={() => router.push("/safety")} />}>
    <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
      <MaterialIcons accessible={false} name={journey.step === "safety" ? "health-and-safety" : content.icon} size={40} color={colors.accent} />
    </View>
    {journey.step === "welcome" && <>
      <Label>WELCOME TO IN/OUT</Label><Title>Use your breath to change how you feel.</Title>
      <Copy>A small practice for the moment ahead. Start now, or make InOut yours.</Copy>
      <Button title="Start breathing" onPress={() => save({ step: "safety", quickStart: true })} />
      <Button title="Personalize InOut" secondary onPress={() => save({ step: "goals", quickStart: false })} />
      <Card><Label>HOW IT WORKS</Label><Copy>Choose a rhythm. Follow the breathing guide. Notice how you feel with an optional before-and-after check-in.</Copy></Card>
    </>}
    {journey.step === "goals" && <>
      <Title>What brings you here?</Title><Copy>Choose your main goal. You can change it anytime in your profile.</Copy>
      <GoalPicker />
      <Button title="Continue" disabled={!journey.primaryGoal} onPress={() => save({ step: "value" })} />
      <Button title="Skip personalization" secondary onPress={() => save({ step: "safety", quickStart: true })} />
    </>}
    {journey.step === "value" && <>
      <Label>FOR YOU</Label><Title>{content.heading}</Title><Copy>{content.body}</Copy>
      <Card><Label>YOUR FIRST PRACTICE</Label><Copy>{recommendPractice(goal).name}</Copy><Copy>This is a breathing practice, not medical treatment. Your experience may vary.</Copy></Card>
      <Button title="Let's get started" onPress={() => save({ step: "safety" })} />
      <WelcomeEmailOptIn />
    </>}
    {journey.step === "safety" && <>
      <Label>BEFORE YOUR FIRST BREATH</Label><Title>Comfort comes first.</Title>
      <Card><Copy>Practice seated or lying down in a safe place.</Copy><Copy>Never practice while driving, operating machinery, or in water.</Copy><Copy>Stop if you feel dizzy or unwell. Return to natural breathing.</Copy><Copy>Keep holds comfortable and follow each protocol's precautions. You can stop at any time.</Copy></Card>
      <Button title="I understand" onPress={() => {
        save({ safetyAcceptedAt: journey.safetyAcceptedAt ?? Date.now(), step: !journey.quickStart && productConfig.onboardingPaywall && !controller.entitlements.state.pro ? "offer" : "safety" });
        if (!controller.error && (journey.quickStart || !productConfig.onboardingPaywall || controller.entitlements.state.pro)) finish();
      }} />
      <Button title="Read full safety guidance" secondary onPress={() => router.push("/safety")} />
    </>}
    <SaveError />
  </Screen>;
}
