import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stateShift, stateMetric } from "../packages/shared-types/src/index";
import { manualSession } from "../apps/mobile/src/manual-session";
import { summarize } from "../apps/mobile/src/progress";
import { practiceInsights } from "../apps/mobile/src/insights";
import { emotionalAnchors, emotionFor } from "../apps/mobile/src/wellbeing";
import { stateShiftAttempt, attemptComparison, validateTestStore, emptyTestStore } from "../apps/mobile/src/challenge-tests";
import { discoveryFacets, discoverProtocols, reconcileDiscoveryFilters } from "../apps/mobile/src/protocol-search";
import { catalogProtocols } from "../packages/protocols/src/index";
import { notificationContent, notificationCopy } from "../apps/mobile/src/notification-content";
import { notificationDefaults, buildEngagementSchedule, notificationTime, notificationPreferences } from "../apps/mobile/src/local-notifications";
import { defaultPreferences } from "../apps/mobile/src/storage";
import { t } from "../apps/mobile/src/i18n";
import { classifySubscriptionError } from "../apps/mobile/src/subscriptions";
import { sessionAnimationSize, pulseStageFill } from "../apps/mobile/src/session-layout";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const record = (id: string, day = 1) => ({ ...manualSession({ goal: "Calm", startedAt: new Date(2026, 9, day, 10).getTime(), durationMs: 60000 }, id, new Date(2026, 9, day, 11).getTime()), source: "app" as const, pre: 3, post: 8 });
test("well-being polarity, all emoji anchors, intermediate values and unanswered states", () => {
  assert.equal(stateShift(3, 8, "wellbeing_v2"), 5);
  assert.equal(stateShift(8, 3, "wellbeing_v2"), -5);
  assert.equal(stateShift(3, 8), -5);
  assert.equal(stateMetric({}), "tension_v1");
  for (const metric of ["tension_v1", "wellbeing_v2"] as const) {
    assert.equal(stateShift(null, 7, metric), null); assert.equal(stateShift(7, null, metric), null);
    assert.equal(stateShift(4.5, 7, metric), null); assert.equal(stateShift(0, 7, metric), null);
  }
  for (const anchor of emotionalAnchors) assert.equal(emotionFor(anchor.value), anchor);
  for (let n = 1; n <= 10; n++) assert.ok(emotionalAnchors.includes(emotionFor(n)));
});
test("history and insight groups never combine legacy tension with well-being", () => {
  const old = record("old"); const current = { ...record("new"), stateMetric: "wellbeing_v2" as const };
  assert.equal(summarize([old, current]).averageShift, 5);
  assert.equal(summarize([old, current]).shifts, 1);
  assert.equal(summarize([old, current], "tension_v1").averageShift, -5);
  const rows = Array.from({ length: 5 }, (_, i) => [record(`old${i}`, i + 1), { ...record(`new${i}`, i + 1), stateMetric: "wellbeing_v2" as const }]).flat();
  const insights = practiceInsights(rows, new Date(2026, 9, 10));
  assert.equal(insights.patterns.length, 2);
  assert.deepEqual(insights.patterns.map(p => p.median).sort((a,b) => a! - b!), [-5, 5]);
});
test("State Shift challenge versions retain their own comparison direction", () => {
  const old = stateShiftAttempt({ ...record("old"), challengeTest: "state-shift-60" })!;
  const current = stateShiftAttempt({ ...record("new", 2), stateMetric: "wellbeing_v2", challengeTest: "state-shift-60" })!;
  assert.equal(old.definitionVersion, 1); assert.equal(current.definitionVersion, 2);
  validateTestStore({ ...emptyTestStore(), attempts: [old, current] });
  assert.equal(attemptComparison(current, [old, current]).previousBest, null);
  assert.equal(attemptComparison(current, [old, current]).attemptCount, 1);
});
test("facets exclude their own dimension and candidate purposes cannot borrow other purposes' matches", () => {
  const options = { query: "", category: "Advanced", tags: ["wellness"] as const, saved: false, isFavorite: () => false };
  const facets = discoveryFacets(catalogProtocols, options);
  assert.equal(facets.purposes.stress, 0); assert.ok(facets.purposes.wellness > 0);
  assert.ok(facets.categories.Balance > 0);
  assert.equal(discoverProtocols(catalogProtocols, { ...options, tags: ["stress"] }).length, 0);
  const saved = { ...options, category: null, tags: [], saved: true, isFavorite: (id: string) => id === "box" };
  assert.equal(discoveryFacets(catalogProtocols, saved).categories.Advanced, 0);
  assert.ok(discoveryFacets(catalogProtocols, saved).purposes.focus > 0);
  assert.deepEqual(reconcileDiscoveryFilters(catalogProtocols, { ...saved, category: "Advanced", tags: ["energy"] }), { category: null, tags: [] });
  assert.equal(discoverProtocols(catalogProtocols, { ...saved, query: "zzzzzz" }).length, 0);
  const union = discoverProtocols(catalogProtocols, { ...saved, saved: false, tags: ["focus", "sleep"] });
  for (const tag of ["focus", "sleep"] as const) for (const p of discoverProtocols(catalogProtocols, { ...saved, saved: false, tags: [tag] })) assert.ok(union.some(row => row.id === p.id));
});
test("40 distinct messages per language cover eight categories with stable, nonconsecutive rotation", () => {
  assert.equal(Object.keys(notificationContent).length, 8);
  for (const entries of Object.values(notificationContent)) assert.equal(entries.length, 5);
  for (const language of ["en", "es", "pt"] as const) {
    const copy = Object.values(notificationContent).flat().map(text => t(text, language));
    assert.equal(copy.length, 40); assert.equal(new Set(copy).size, 40);
    assert.ok(copy.every(text => text.length < 150));
    if (language !== "en") for (const text of Object.values(notificationContent).flat()) assert.notEqual(t(text, language), text);
  }
  const dates = [19, 21, 23, 26, 28, 30].map(day => new Date(2026, 9, day));
  const messages = dates.map(date => notificationCopy(["motivation"], date));
  for (let i = 1; i < messages.length; i++) assert.notEqual(messages[i], messages[i-1]);
});
test("quiet minutes migrate from old settings and schedules stay on selected weekdays", () => {
  const old = notificationPreferences({ ...defaultPreferences, notifications: { ...notificationDefaults, quietStartMinute: undefined, quietEndMinute: undefined } });
  const settings = { ...old, motivation: true, hour: 23, weekdays: [2,4,6], quietHoursEnabled: true, quietEndMinute: 30 };
  const schedule = buildEngagementSchedule(settings, new Date(2026, 9, 19, 10));
  assert.ok(schedule.length > 0 && schedule.length <= 3);
  for (const item of schedule) { assert.ok(settings.weekdays.includes(item.date.getDay() + 1)); assert.equal(item.date.getMinutes(), 30); assert.equal(item.date.getHours(), 8); }
  assert.equal(new Set(schedule.map(item => item.id)).size, schedule.length);
  assert.deepEqual(buildEngagementSchedule({ ...settings, weekdays: [] }), []);
  assert.equal(notificationTime(new Date(2026, 9, 19), 22, 15, { ...settings, quietStartMinute: 30 }).getHours(), 22);
});
test("store errors are classified without exposing raw provider details or blaming every failure on connectivity", () => {
  const cases = { 2: "store", 5: "product_unavailable", 10: "network", 11: "configuration", 16: "service", 23: "configuration", 35: "network" };
  for (const [code, reason] of Object.entries(cases)) {
    const error = classifySubscriptionError({ code, message: "private credentials" });
    assert.equal(error.reason, reason); assert.ok(!error.message.includes("private"));
    assert.equal(error.message.includes("Check your connection"), reason === "network");
  }
  assert.equal(classifySubscriptionError(new Error("private")).reason, "failed");
});
test("notification resource is a 96px white silhouette with transparent negative space", async () => {
  const { PNG } = await import("pngjs");
  const icon = PNG.sync.read(readFileSync("apps/mobile/assets/notification-sphere-small.png"));
  assert.equal(icon.width, 96); assert.equal(icon.height, 96);
  let transparent = 0, opaque = 0;
  for (let i = 0; i < icon.data.length; i += 4) {
    if (icon.data[i+3] === 0) transparent++;
    else { opaque++; assert.equal(icon.data[i], 255); assert.equal(icon.data[i+1], 255); assert.equal(icon.data[i+2], 255); }
  }
  assert.ok(transparent > 1500 && opaque > 2000);
});

test("animation uses measured remaining space, shrinks for large text and caps raster enlargement", () => {
  assert.equal(sessionAnimationSize(320, 600, 190), 320);
  assert.equal(sessionAnimationSize(320, 400, 190), 198);
  assert.equal(sessionAnimationSize(320, 400, 320), 96);
  assert.equal(sessionAnimationSize(700, 1000, 190), 420);
  assert.equal(pulseStageFill, .96);
  assert.ok(sessionAnimationSize(320, 400, 190) * pulseStageFill < 198);
});

test("large notification icon uses original color artwork, native metadata and all Android densities", async () => {
  const require = createRequire(import.meta.url);
  const { setLargeIcon, writeLargeIcons } = require("../apps/mobile/plugins/with-notification-sphere.cjs");
  const manifest = { manifest: { application: [{ $: { "android:name": ".MainApplication" } }] } };
  setLargeIcon(manifest); setLargeIcon(manifest);
  const metadata = (manifest.manifest.application[0] as any)["meta-data"];
  assert.equal(metadata.length, 1);
  assert.equal(metadata[0].$["android:resource"], "@drawable/inout_notification_sphere");
  const folder = await mkdtemp(path.join(tmpdir(), "inout-notification-test-"));
  try {
    await writeLargeIcons(path.resolve("apps/mobile"), folder);
    const { PNG } = await import("pngjs");
    for (const [dpi, size] of [["mdpi",64],["hdpi",96],["xhdpi",128],["xxhdpi",192],["xxxhdpi",256]] as const) {
      const icon = PNG.sync.read(await readFile(path.join(folder, `app/src/main/res/drawable-${dpi}/inout_notification_sphere.png`)));
      assert.equal(icon.width, size); assert.equal(icon.height, size);
      assert.ok(icon.data.some((value, index) => index % 4 === 0 && icon.data[index+3] > 0 && value !== icon.data[index+1]));
    }
  } finally { assert.ok(path.resolve(folder).startsWith(path.resolve(tmpdir()) + path.sep)); await rm(folder, { recursive: true, force: true }); }
  const config = readFileSync("apps/mobile/app.config.ts", "utf8");
  assert.ok(config.includes("with-notification-sphere.cjs"));
  assert.ok(!config.includes('"./assets/notification-sphere.png"'));
  assert.equal(JSON.parse(readFileSync("apps/mobile/app.json", "utf8")).expo.icon, "./assets/icon-pulse.png");
});

test("notification rotation survives reconciliation and five-day gaps without immediate repeats", () => {
  const settings = { ...notificationDefaults, motivation: true, weekdays: [2,7] };
  const seen = new Map<string, string>();
  for (let day = 1; day <= 30; day++) {
    for (const item of buildEngagementSchedule(settings, new Date(2026, 9, day, 10))) {
      if (seen.has(item.id)) assert.equal(seen.get(item.id), item.body);
      seen.set(item.id, item.body);
    }
  }
  const messages = [...seen.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([,body]) => body);
  for (let i = 1; i < messages.length; i++) assert.notEqual(messages[i], messages[i-1]);
});
