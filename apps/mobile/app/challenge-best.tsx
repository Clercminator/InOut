import { router } from "expo-router";
import { BackScreen, Title, Copy, Label, Card, Button } from "../src/ui";
import { useSession } from "../src/provider";
import { personalBest } from "../src/challenge-tests";
import { ChallengeArt } from "../src/challenge-art";
import { useLanguage } from "../src/use-language";
import { message } from "../src/i18n";
export default function ChallengeBest() {
  useLanguage(); const c = useSession();
  const best = personalBest(c.testAttempts().filter(a => a.challengeId === "long-exhale" && a.completed).map(a => ({ value: a.value, timestamp: a.finishedAt })), { metricId: "long-exhale", direction: "higher_is_better", unit: "sec", challengeType: "benchmark" });
  const allowed = c.entitlements.challengeAccess("beat-your-best").allowed;
  return <BackScreen title="Beat Your Best"><ChallengeArt art="focus" height={220} /><Title>Your previous self.</Title><Copy>A personal target from your own history. No rankings, no strangers.</Copy><Card><Label>LONG EXHALE</Label><Title>{best ? message("Current best: {0} sec", [best.value.toFixed(1)]) : "Establish your baseline"}</Title><Copy>{best ? "Try another comfortable exhale. A new best is welcome; stopping comfortably matters more." : "Complete Long Exhale once. Your next attempt can become a personal best."}</Copy></Card>
    <Button title={allowed ? best ? "Start challenge" : "Set a baseline" : "Unlock with InOut Pro"} onPress={() => router.push(allowed ? { pathname: "/challenge-test", params: { id: "long-exhale" } } : { pathname: "/pro", params: { source: "challenges" } })} />
    <Copy>Comfort Hold is intentionally excluded from competitive targets. Never push past the first desire to breathe.</Copy>
  </BackScreen>;
}
