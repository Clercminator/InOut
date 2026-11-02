import test from "node:test";
import assert from "node:assert/strict";
import { SwipeIntent, adjacentTab } from "../apps/mobile/src/swipe-navigation";
import { onboardingStep, onboardingSteps, previousOnboardingStep, canAdvanceOnboarding } from "../apps/mobile/src/onboarding-flow";
import { copyCandidates, auditLocalization, hasCompleteTranslation, catalogIntegrityIssues } from "../scripts/check-localization";
import { protocols } from "../packages/protocols/src/index";
import { t, message, countLabel, setLanguage, getLanguage } from "../apps/mobile/src/i18n";
import es from "../apps/mobile/src/locales/es.json";
import pt from "../apps/mobile/src/locales/pt.json";
import mobileConfig from "../apps/mobile/app.config";

test("main tabs have bounded, symmetric swipe destinations", () => {
  assert.equal(adjacentTab("index", "right"), "progress");
  assert.equal(adjacentTab("index", "left"), "challenges");
  assert.equal(adjacentTab("progress", "left"), "index");
  assert.equal(adjacentTab("challenges", "right"), "index");
  assert.equal(adjacentTab("progress", "right"), undefined);
  assert.equal(adjacentTab("challenges", "left"), undefined);
  assert.equal(adjacentTab("protocols", "right"), undefined);
});
test("vertical, diagonal, short and multitouch gestures cannot change pages", () => {
  for (const [dx, dy, touches] of [[5, 30, 1], [30, 28, 1], [100, 0, 2]]) {
    const intent = new SwipeIntent(); intent.update(dx, dy, touches); intent.update(100, 0, 1);
    assert.equal(intent.direction(100, 0), undefined);
  }
  const intent = new SwipeIntent(); assert.equal(intent.update(-20, 2, 1), true);
  assert.equal(intent.direction(-40, 2), undefined); assert.equal(intent.direction(-80, 2), "left");
});

test("short deliberate flicks navigate, tiny movements and reversing flicks do not", () => {
  const intent = new SwipeIntent(); intent.update(-20, 2, 1);
  assert.equal(intent.direction(-35, 2, -.6), "left");
  assert.equal(intent.direction(-20, 2, -2), undefined);
  assert.equal(intent.direction(-35, 2, .6), undefined);
  assert.equal(intent.direction(-35, 2, -.1), undefined);
});
test("five-stage flow migrates checkpoints and never turns a swipe into safety consent", () => {
  assert.equal(onboardingSteps.length, 5);
  const journey = { version: 1 as const, step: "safety" as const, secondaryGoals: [] };
  assert.equal(canAdvanceOnboarding(journey, 0, true), false);
  assert.equal(canAdvanceOnboarding(journey, 0, false), true);
  assert.equal(canAdvanceOnboarding({ ...journey, safetyAcceptedAt: 1 }, 0, true), true);
  assert.equal(canAdvanceOnboarding({ ...journey, step: "goals" }, 0, true), false);
  assert.equal(canAdvanceOnboarding({ ...journey, step: "goals" }, 2, true), true);
  assert.equal(onboardingStep({ ...journey, step: "personalize" }), "safety");
  assert.equal(onboardingStep({ ...journey, step: "value", safetyAcceptedAt: 1 }), "demo");
  assert.equal(onboardingStep({ ...journey, step: "offer" }), "safety");
  assert.equal(previousOnboardingStep({ ...journey, quickStart: true }), "welcome");
  assert.equal(previousOnboardingStep({ ...journey, step: "welcome" }), undefined);
});
test("copy audit catches raw text and missing labels but ignores technical identifiers and logs", () => {
  const source = `import { Text } from 'react-native'; const id='test-id'; console.log('Internal debug log');
    const x=<><Text>Continue</Text><Button title="Missing label"/><Copy>{status === 'pending' ? 'Waiting here' : 'Ready'}</Copy></>`;
  const copy = copyCandidates(source, "sample.tsx");
  assert.ok(copy.some(v => v.text === "Continue" && v.raw));
  assert.ok(copy.some(v => v.text === "Missing label"));
  assert.ok(copy.some(v => v.text === "Waiting here"));
  assert.ok(!copy.some(v => ["pending", "test-id", "Internal debug log", "react-native"].includes(v.text)));
  assert.ok(copyCandidates('<Copy>{`You have ${n} new items`}</Copy>', 'sample.tsx').some(v => v.text === "You have {0} new items"));
  assert.deepEqual(auditLocalization().issues, []);
});
test("all built-in protocol descriptions and instructions translate in both languages", () => {
  for (const language of ["es", "pt"] as const) for (const p of protocols) {
    for (const text of [p.name, p.description, p.instructions, p.precaution, p.purpose, ...p.phases.map(v => v.label)].filter(Boolean) as string[]) {
      if (["Nadi Shodhana", "Bhramari"].includes(text)) continue;
      assert.notEqual(t(text, language), text, `${language}: ${p.id}: ${text}`);
      assert.ok(hasCompleteTranslation(text), `${p.id}: ${text}`);
    }
  }
});

test("audit rejects partial translations and untranslated native attributes", () => {
  assert.notEqual(t("Untranslated Pattern", "es"), "Untranslated Pattern");
  assert.equal(hasCompleteTranslation("Untranslated Pattern"), false);
  assert.equal(hasCompleteTranslation("Endurance Pattern"), true);
  assert.equal(hasCompleteTranslation("A sentence entirely missing from the catalog"), false);
  const copy = copyCandidates(`import { View } from 'react-native'; import { TextInput } from './localized-native';
    const screen = <><View accessibilityLabel="Continue"/><View accessibilityLabel={t('Next')}/><TextInput placeholder="Name"/></>`, "sample.tsx");
  assert.ok(copy.some(item => item.text === "Continue" && item.raw));
  assert.ok(copy.some(item => item.text === "Next" && !item.raw));
  assert.ok(copy.some(item => item.text === "Name" && !item.raw));
  assert.deepEqual(catalogIntegrityIssues(), []);
});

test("Spanish and Brazilian Portuguese use natural breathing cues and full protocol names", () => {
  for (const [key, spanish, portuguese] of [
    ["Breathe in", "Inhala", "Inspire"], ["Breathe out", "Exhala", "Expire"],
    ["Endurance Pattern", "Ritmo de resistencia", "Ritmo de resistência"],
    ["LEFT NOSTRIL", "FOSA NASAL IZQUIERDA", "NARINA ESQUERDA"],
    ["RIGHT NOSTRIL", "FOSA NASAL DERECHA", "NARINA DIREITA"],
    ["Coach", "Guía", "Guia"],
  ]) {
    assert.equal(t(key, "es"), spanish); assert.equal(t(key, "pt"), portuguese);
  }
});

test("composed copy agrees with singular counts and preserves user supplied values", () => {
  assert.equal(message("{0} day streak", [1], "es"), "Racha de 1 día");
  assert.equal(message("{0} day streak", [2], "es"), "Racha de 2 días");
  assert.equal(message("{0} seconds remaining", [1], "pt"), "Resta 1 segundo");
  assert.equal(countLabel(1, "pairedRating", "pt"), "1 avaliação antes e depois");
  assert.equal(countLabel(2, "pairedRating", "pt"), "2 avaliações antes e depois");
  assert.equal(countLabel(1, "minute", "es"), "1 minuto");
  assert.equal(message("{0} ({1} pairs)", ["Focus", 1], "es"), "Focus (1 par)");
  assert.equal(message("Contact {0}. Your session history is not attached automatically.", ["hello@example.com"], "pt"),
    "Contate hello@example.com. Seu histórico de sessões não é anexado automaticamente.");
});

test("native photo permission has Spanish and Portuguese iOS localization", () => {
  const config = mobileConfig({ config: { name: "IN/OUT", slug: "inout" }, projectRoot: process.cwd(), staticConfigPath: null, packageJsonPath: null });
  assert.equal(config.locales.es.ios.NSPhotoLibraryUsageDescription, "Elige una foto para tu perfil privado de IN/OUT.");
  assert.equal(config.locales.pt.ios.NSPhotoLibraryUsageDescription, "Escolha uma foto para seu perfil privado no IN/OUT.");
  assert.equal(config.locales.en.ios.NSPhotoLibraryUsageDescription, "Choose a photo for your private IN/OUT profile.");
});
test("every count unit has singular and plural catalog entries; unsupported choices preserve the active language", () => {
  for (const catalog of [es, pt]) for (const [singular, plural] of [["session", "sessions"], ["day", "days"], ["week", "weeks"], ["month", "months"], ["year", "years"], ["practice day", "practice days"], ["consecutive day", "consecutive days"], ["milestone", "milestones"], ["cycle", "cycles"], ["repeat", "repeats"]]) {
    for (const unit of [singular, plural]) assert.ok(catalog[`{0} ${unit}` as keyof typeof catalog], unit);
  }
  assert.equal(countLabel(1, "session", "pt"), "1 sessão");
  assert.equal(countLabel(2, "session", "pt"), "2 sessões");
  setLanguage("es"); setLanguage("fr" as never); assert.equal(getLanguage(), "es"); setLanguage("en");
});
