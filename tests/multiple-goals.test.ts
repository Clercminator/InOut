import test from "node:test";
import assert from "node:assert/strict";
import { selectedGoals, toggleGoal, goalForDay, validateJourney } from "../apps/mobile/src/personalization";
import { dailyRecommendation, emptyCoach, generateWeek } from "../apps/mobile/src/coach";
import type { Preferences } from "@inout/shared-types";

test("legacy primary goals survive selection, persistence and removal without losing unrelated preferences", () => {
  let p: Preferences = { audio: "silent", haptics: false, keepAwake: true, journey: { version: 1, step: "complete", primaryGoal: "sleep", secondaryGoals: [] } };
  assert.deepEqual(selectedGoals(p), ["sleep"]);
  p = { ...p, journey: toggleGoal(p, "focus") };
  p = JSON.parse(JSON.stringify(p));
  validateJourney(p.journey!);
  assert.deepEqual(selectedGoals(p), ["sleep", "focus"]);
  assert.equal(p.journey?.primaryGoal, "sleep");
  p = { ...p, journey: toggleGoal(p, "sleep") };
  assert.equal(p.journey?.primaryGoal, undefined);
  assert.deepEqual(selectedGoals(p), ["focus"]);
  assert.equal(p.audio, "silent");
});
test("recommendations and weekly practices include every selected goal and need no primary", () => {
  const p: Preferences = { audio: "silent", haptics: false, keepAwake: true, journey: { version: 1, step: "complete", secondaryGoals: ["sleep", "focus", "energy"] } };
  const now = new Date(2026, 9, 16, 12).getTime();
  const goals = Array.from({ length: 7 }, (_, i) => goalForDay(p, now + i * 86400000));
  assert.equal(new Set(goals).size, 3);
  assert.equal(dailyRecommendation(p, [], emptyCoach(), now).goal, goals[0]);
  const week = generateWeek(p, [], emptyCoach(), now);
  assert.ok(new Set(week.entries.map(e => e.protocolId)).size > 1);
});
