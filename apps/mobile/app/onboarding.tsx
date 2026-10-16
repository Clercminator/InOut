import { Redirect, router } from "expo-router";
import { BackHandler, View } from "react-native";
import { useEffect } from "react";
import { Screen, Title, Label, Card, Copy, Button, IconButton, ActionFooter, Chip } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { completeJourney, selectedGoals, goalContent, journeyFor, recommendPractice } from "../src/personalization";
import { GoalPicker } from "../src/goal-picker";
import { GoalMark, OnboardingHero, OnboardingScene } from "../src/onboarding-art";
import { OnboardingDemo } from "../src/onboarding-demo";
import { useTheme } from "../src/theme";
import { productConfig } from "../src/product-config";
import { Paywall } from "../src/paywall";
import { message, protocolTitle, t } from "../src/i18n";
import type { OnboardingJourney } from "@inout/shared-types";

const steps = ["welcome", "goals", "personalize", "safety", "demo", "value", "offer"] as const;
export default function Onboarding() {
  const controller = useSession();
  const { colors } = useTheme();
  const journey = journeyFor(controller.preferences);
  const goal = journey.primaryGoal ?? selectedGoals(controller.preferences)[0] ?? "stress";
  const content = goalContent[goal];
  const step = journey.step;
  useEffect(() => { if (!controller.preferences.onboardingComplete) controller.analytics.track("onboarding_started"); }, [controller]);
  const save = (patch: Partial<OnboardingJourney>) => controller.setPreferences({ ...controller.preferences, journey: { ...journey, ...patch } });
  const finish = () => {
    controller.setPreferences(completeJourney(controller.preferences, Date.now()));
    if (!controller.error) router.replace(journey.quickStart ? { pathname: "/pre", params: { id: recommendPractice(goal).id } } : "/(tabs)");
  };
  const back = step === "welcome" ? undefined : () => {
    const index = steps.indexOf(step as typeof steps[number]);
    save({ step: journey.quickStart ? "welcome" : steps[Math.max(0, index - 1)] });
  };
  useEffect(() => {
    if (!back || step === "offer" || step === "complete") return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => { back(); return true; });
    return () => listener.remove();
  }, [controller, step, journey.quickStart]);
  if (controller.preferences.onboardingComplete) return <Redirect href="/(tabs)" />;
  if (step === "offer") return <Paywall entry="onboarding" onClose={finish} completionError={controller.error} />;
  if (step === "complete") return <Screen><Title>Your next breath is ready.</Title><Button title="Enter IN/OUT" onPress={finish} /><SaveError /></Screen>;
  const next = () => {
    if (step === "welcome") save({ step: "goals", quickStart: false });
    if (step === "goals") save({ step: "personalize" });
    if (step === "personalize") save({ step: "safety" });
    if (step === "safety") {
      save({ safetyAcceptedAt: journey.safetyAcceptedAt ?? Date.now(), step: journey.quickStart ? "safety" : "demo" });
      if (!controller.error && journey.quickStart) finish();
    }
    if (step === "demo") save({ step: "value" });
    if (step === "value") {
      if (!journey.safetyAcceptedAt) save({ step: "safety" });
      else if (productConfig.onboardingPaywall && !controller.entitlements.state.pro) save({ step: "offer" });
      else finish();
    }
  };
  return <Screen key={step} back={back} title={step === "welcome" ? undefined : "YOUR FIRST MOMENT"}
    headerAction={<IconButton icon="help-outline" title="Breathing safety" onPress={() => router.push("/safety")} />}
    footer={<ActionFooter>
      <Button title={step === "welcome" ? "Personalize InOut" : step === "safety" ? "I understand" : step === "value" ? "Let's get started" : "Continue"} disabled={!!controller.error || step === "goals" && !selectedGoals(controller.preferences).length} onPress={next} />
      {step === "welcome" && <Button title="Start breathing" variant="quiet" onPress={() => save({ step: "safety", quickStart: true })} />}
      {step === "goals" && <Button title="Skip personalization" variant="quiet" onPress={() => save({ step: "safety", quickStart: false })} />}
    </ActionFooter>}>
    <OnboardingScene>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={t("Onboarding progress")} accessibilityValue={{ min: 1, max: steps.length, now: steps.indexOf(step) + 1 }} style={{ flexDirection: "row", gap: 6 }}>
        {steps.map((item, index) => <View key={item} style={{ flex: 1, height: 3, borderRadius: 3, backgroundColor: index <= steps.indexOf(step) ? colors.accent : colors.border }} />)}
      </View>
      {step === "welcome" && <>
        <OnboardingHero />
        <View style={{ gap: 10 }}><Label>A LITTLE SPACE FOR YOU</Label><Title>Change your pace. Find your breath.</Title><Copy>A few guided breaths. A moment to reset. A practice that grows with you.</Copy></View>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><GoalMark goal="stress" size={36} /><Copy style={{ flex: 1 }}>Start free. No account needed.</Copy></View>
      </>}
      {step === "goals" && <><Title>What brings you here?</Title><Copy>Choose your main goal. You can change it anytime in your profile.</Copy><GoalPicker /></>}
      {step === "personalize" && <>
        <OnboardingHero compact /><Title>A little time, just for you.</Title><Copy>How much time usually fits your day? Your Coach will keep practices within this time.</Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{[1, 3, 5, 10].map(minutes => <Chip key={minutes} title={message("{0} min", [minutes])} selected={controller.coachState().availableMinutes === minutes} onPress={() => controller.configureCoach({ availableMinutes: minutes })} />)}</View>
        <Copy>You can change this anytime. The default is three minutes.</Copy>
      </>}
      {step === "safety" && <>
        <GoalMark goal="learn" size={80} /><Label>BEFORE YOUR FIRST BREATH</Label><Title>Comfort comes first.</Title>
        <Card><Copy>Practice seated or lying down in a safe place.</Copy><Copy>Never practice while driving, operating machinery, or in water.</Copy><Copy>Stop if you feel dizzy or unwell. Return to natural breathing.</Copy><Copy>Keep holds comfortable and follow each protocol's precautions. You can stop at any time.</Copy></Card>
        <Button title="Read full safety guidance" secondary onPress={() => router.push("/safety")} />
      </>}
      {step === "demo" && <><Label>MEET PULSE</Label><Title>A rhythm you can follow.</Title><Copy>Try a short demonstration, or continue when you are ready.</Copy><OnboardingDemo /></>}
      {step === "value" && <>
        <GoalMark goal={goal} size={72} /><Label>FOR YOU</Label><Title>{content.heading}</Title>
        <Card><Label>YOUR FIRST PRACTICE</Label><Copy style={{ fontSize: 24, lineHeight: 32, fontWeight: "700" }}>{protocolTitle(recommendPractice(goal))}</Copy><Copy>A comfortable starting point for your goal. Your Coach helps you choose what comes next.</Copy></Card>
        {[["learn", "A plan that fits your day", "Start with a free seven-day program. Pause, repeat, and return at your own pace."], ["focus", "See your practice grow", "Save your progress and celebrate small milestones. No pressure to catch up."]].map(([mark, title, body]) => <View key={title} style={{ flexDirection: "row", gap: 14 }}><GoalMark goal={mark as "learn" | "focus"} /><View style={{ flex: 1, gap: 5 }}><Copy style={{ fontWeight: "700" }}>{title}</Copy><Copy>{body}</Copy></View></View>)}
        <Copy>This is a breathing practice, not medical treatment. Your experience may vary.</Copy>
      </>}
      <SaveError />
    </OnboardingScene>
  </Screen>;
}
