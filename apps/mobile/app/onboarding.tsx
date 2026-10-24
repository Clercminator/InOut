import { Redirect, router } from "expo-router";
import { BackHandler, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Screen, Title, Label, Card, Copy, Button, IconButton, ActionFooter, Chip } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { completeJourney, selectedGoals, journeyFor, recommendPractice } from "../src/personalization";
import { GoalPicker } from "../src/goal-picker";
import { GoalMark, OnboardingHero, OnboardingScene } from "../src/onboarding-art";
import { OnboardingDemo } from "../src/onboarding-demo";
import { useTheme } from "../src/theme";
import { productConfig } from "../src/product-config";
import { Paywall } from "../src/paywall";
import { message, t } from "../src/i18n";
import { AppDialog } from "../src/app-dialog";
import { SwipeSurface } from "../src/swipe-surface";
import { onboardingSteps, onboardingStep, previousOnboardingStep, canAdvanceOnboarding } from "../src/onboarding-flow";
import type { OnboardingJourney } from "@inout/shared-types";


export default function Onboarding() {
  const controller = useSession();
  const { colors } = useTheme();
  const journey = journeyFor(controller.preferences);
  const goal = journey.primaryGoal ?? selectedGoals(controller.preferences)[0] ?? "stress";
  const step = onboardingStep(journey);
  const steps = onboardingSteps.filter(item => (item !== "offer" || !journey.quickStart && productConfig.onboardingPaywall && !controller.entitlements.state.pro) && (item !== "goals" || !journey.quickStart));
  const [help, setHelp] = useState(false);
  const navigating = useRef(false);
  const completionRequested = useRef(false);
  const lastNavigation = useRef(-Infinity);
  useEffect(() => { if (!controller.preferences.onboardingComplete) controller.analytics.track("onboarding_started"); }, [controller]);
  const save = (patch: Partial<OnboardingJourney>) => controller.setPreferences({ ...controller.preferences, journey: { ...journey, ...patch } });
  const finish = () => {
    const current = controller.preferences;
    if (!current.journey?.safetyAcceptedAt || navigating.current || controller.error) return;
    navigating.current = true;
    completionRequested.current = true;
    controller.setPreferences(completeJourney(current, Date.now()));
    if (controller.preferencesSaved) router.replace({ pathname: "/pre", params: { id: recommendPractice(goal).id } });
    else navigating.current = false;
  };
  const previous = previousOnboardingStep(journey);
  const back = previous ? () => { if (Date.now() - lastNavigation.current < 350) return; lastNavigation.current = Date.now(); save({ step: previous }); } : undefined;
  useEffect(() => {
    if (!back || step === "offer") return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => { back(); return true; });
    return () => listener.remove();
  }, [controller, step, journey.quickStart]);
  if (controller.preferences.onboardingComplete && navigating.current) return null;
  if (controller.preferences.onboardingComplete) return <Redirect href={completionRequested.current ? { pathname: "/pre", params: { id: recommendPractice(goal).id } } : "/(tabs)"} />;
  if (step === "offer") return <Paywall entry="onboarding" onClose={finish} completionError={controller.error} />;
  const next = (gesture = false) => {
    if (controller.error || !canAdvanceOnboarding(journey, selectedGoals(controller.preferences).length, gesture) || Date.now() - lastNavigation.current < 350) return;
    lastNavigation.current = Date.now();
    if (step === "welcome") save({ step: "goals", quickStart: false });
    if (step === "goals") save({ step: "safety", quickStart: false });
    if (step === "safety") save({ safetyAcceptedAt: journey.safetyAcceptedAt ?? Date.now(), step: "demo" });
    if (step === "demo") {
      if (!journey.safetyAcceptedAt) save({ step: "safety" });
      else if (!journey.quickStart && productConfig.onboardingPaywall && !controller.entitlements.state.pro) save({ step: "offer" });
      else finish();
    }
  };
  return <SwipeSurface onSwipe={direction => { if (help) return; if (direction === "right") back?.(); else next(true); }}><Screen key={step} back={back} title={step === "welcome" ? undefined : "YOUR FIRST MOMENT"}
    headerAction={<IconButton icon="help-outline" title="Breathing safety" onPress={() => router.push("/safety")} />}
    footer={<ActionFooter>
      <Button title={step === "welcome" ? "Personalize InOut" : step === "safety" ? "I understand" : step === "demo" ? "Start breathing" : "Continue"} disabled={!!controller.error || step === "goals" && !selectedGoals(controller.preferences).length} onPress={() => next()} />
      {step === "welcome" && <Button title="Start breathing" variant="quiet" onPress={() => save({ step: "safety", quickStart: true })} />}
      {step === "goals" && <Button title="Skip personalization" variant="quiet" onPress={() => save({ step: "safety", quickStart: false })} />}
    </ActionFooter>}>
    <OnboardingScene compact={step === "demo"}>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={t("Onboarding progress")} accessibilityValue={{ min: 1, max: steps.length, now: steps.indexOf(step) + 1 }} style={{ flexDirection: "row", gap: 6 }}>
        {steps.map((item, index) => <View key={item} style={{ flex: 1, height: 3, borderRadius: 3, backgroundColor: index <= steps.indexOf(step) ? colors.accent : colors.border }} />)}
      </View>
      {step === "welcome" && <>
        <OnboardingHero />
        <View style={{ gap: 10 }}><Label>A LITTLE SPACE FOR YOU</Label><Title>Change your pace. Find your breath.</Title><Copy>A few guided breaths. A moment to reset. A practice that grows with you.</Copy></View>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><GoalMark goal="stress" size={36} /><Copy style={{ flex: 1 }}>Start free. No account needed.</Copy></View>
      </>}
      {step === "goals" && <><Title>What brings you here?</Title><GoalPicker showPrimary={false} compact />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Label>TIME FOR YOU · OPTIONAL</Label><IconButton icon="info-outline" title="About your practice" onPress={() => setHelp(true)} /></View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[1, 3, 5, 10].map(minutes => <Chip key={minutes} title={message("{0} min", [minutes])} selected={controller.coachState().availableMinutes === minutes} onPress={() => controller.configureCoach({ availableMinutes: minutes })} />)}</View>
      </>}
      {step === "safety" && <>
        <GoalMark goal="learn" size={80} /><Label>BEFORE YOUR FIRST BREATH</Label><Title>Comfort comes first.</Title>
        <Card><Copy>Practice seated or lying down in a safe place.</Copy><Copy>Never practice while driving, operating machinery, or in water.</Copy><Copy>Stop if you feel dizzy or unwell. Return to natural breathing.</Copy><Copy>Keep holds comfortable and follow each protocol's precautions. You can stop at any time.</Copy></Card>
        <Button title="Read full safety guidance" secondary onPress={() => router.push("/safety")} />
      </>}
      {step === "demo" && <><View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><View style={{ flex: 1 }}><Title>A rhythm you can follow.</Title></View><IconButton icon="info-outline" title="About your practice" onPress={() => setHelp(true)} /></View><OnboardingDemo /></>}
      <SaveError />
    </OnboardingScene>
  </Screen>{help && <AppDialog title="About your practice" onRequestClose={() => setHelp(false)}><Copy>Your Coach suggests short practices for your goals. Change your preferences anytime.</Copy><Copy>This is a breathing practice, not medical treatment. Your experience may vary.</Copy><Button title="Close" onPress={() => setHelp(false)} /></AppDialog>}</SwipeSurface>;
}
