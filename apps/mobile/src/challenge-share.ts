import { attemptComparison, testDefinition, testCatalog, type ChallengeAttempt } from "./challenge-tests";
import { definitionForState, challengeShareable, type ChallengeDefinition, type UserChallenge } from "./challenges";
import { message, t } from "./i18n";
import info from "../../../release/public-info.json";
export function challengeShareData(definition: ChallengeDefinition, state: UserChallenge, story: boolean) {
  definition = definitionForState(definition, state);
  if (!challengeShareable(definition, state)) return null;
  const minutes = Math.floor(state.completedSteps.reduce((total, step) => total + step.elapsedMs, 0) / 60000);
  return { width: 1080, height: story ? 1920 : 1080, title: t(definition.title),
    status: state.status === "completed" ? t("CHALLENGE COMPLETE") : message("{0} / {1} practices", [state.progress, definition.targetCount]),
    practices: state.progress, minutes, metric: null as string | null, detail: message("{0} practices · {1} min", [state.progress, minutes]), art: definition.artKey, destination: info.supportUrl };
}
export function attemptShareData(attempt: ChallengeAttempt, history: ChallengeAttempt[], story: boolean, includeRating = false) {
  const d = testDefinition(attempt.challengeId);
  if (!d) return null;
  const comparison = attemptComparison(attempt, history);
  const state = d.id === "state-shift-60";
  return { width: 1080, height: story ? 1920 : 1080, title: t(d.title), art: d.art, destination: info.supportUrl,
    status: t(comparison.isPersonalBest ? "NEW PERSONAL BEST" : attempt.completed ? "CHALLENGE COMPLETE" : "ATTEMPT SAVED"),
    metric: state ? includeRating ? `${attempt.before} → ${attempt.after}` : null : `${attempt.value.toFixed(1)} ${t(d.unit)}`,
    detail: state ? includeRating ? `${t("Self-reported tension · 1–10")} · ${message("{0} in 60 seconds", [attempt.value > 0 ? `+${attempt.value}` : attempt.value])}` : t("One minute. A moment for myself.") : comparison.isPersonalBest ? message("+{0} sec from your previous best", [comparison.improvement!.toFixed(1)]) : t(attempt.completed ? "A personal practice. A moment worth keeping." : "Every attempt is part of the practice.") };
}
