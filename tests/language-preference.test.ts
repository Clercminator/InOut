import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { deviceLanguage, languagePreference, setDeviceLocales } from "../apps/mobile/src/language-preference";
import { LocalStore, type Database } from "../apps/mobile/src/storage";
import { SessionController } from "../apps/mobile/src/session-controller";
import { getLanguage, locale, t } from "../apps/mobile/src/i18n";

test("regional device locales map to the available languages and unsupported primary locales use English", () => {
  for (const tag of ["es-CL", "es-MX", "es-419", "es-ES", "ES_ar", "es"]) assert.equal(deviceLanguage([tag]), "es");
  for (const tag of ["pt-BR", "pt-PT", "pt-AO", "PT_br", "pt"]) assert.equal(deviceLanguage([tag]), "pt");
  for (const tags of [["en-GB"], ["de-DE", "es-CL"], ["ja"], []]) assert.equal(deviceLanguage(tags), "en");
});

test("fresh installation, foreground locale changes, manual choice and legacy preferences survive persistence", () => {
  const db = new DatabaseSync(":memory:");
  const adapter: Database = {
    execSync: sql => db.exec(sql), runSync: (sql, ...p) => db.prepare(sql).run(...p),
    getAllSync: <T>(sql: string, ...p: any[]) => db.prepare(sql).all(...p) as T[],
    getFirstSync: <T>(sql: string, ...p: any[]) => (db.prepare(sql).get(...p) as T) ?? null,
    withTransactionSync: action => { db.exec("begin"); try { action(); db.exec("commit"); } catch (e) { db.exec("rollback"); throw e; } },
  };
  const store = new LocalStore(adapter);
  const open = () => new SessionController(store, Date.now, () => "language-fixture");
  try {
    setDeviceLocales(["es-CL"]);
    let controller = open();
    assert.equal(getLanguage(), "es"); assert.equal(locale(), "es-419");
    assert.equal(controller.preferences.onboardingComplete, false);
    assert.equal(t("Change your pace. Find your breath."), "Cambia el ritmo. Encuentra tu respiración.");
    controller.setPreferences({ ...controller.preferences, haptics: false });
    setDeviceLocales(["pt-PT"]);
    controller = open();
    assert.equal(getLanguage(), "pt"); assert.equal(locale(), "pt-BR");
    assert.equal(controller.preferences.haptics, false);
    controller.setPreferences({ ...controller.preferences, language: "en", languageSource: "manual", onboardingComplete: true });
    setDeviceLocales(["es-MX"]);
    controller = open();
    assert.equal(getLanguage(), "en"); assert.equal(controller.preferences.onboardingComplete, true);
    controller.setPreferences({ ...controller.preferences, languageSource: "device" });
    assert.equal(getLanguage(), "es");
    setDeviceLocales(["fr-FR"]);
    controller.setPreferences(controller.preferences);
    assert.equal(getLanguage(), "en");
    // Old versions lacked a source field: preserve the saved selection on upgrade.
    store.savePreferences({ audio: "silent", haptics: false, keepAwake: false, language: "pt" });
    controller = open();
    assert.equal(getLanguage(), "pt"); assert.equal(controller.preferences.languageSource, "manual");
    assert.equal(controller.preferences.onboardingComplete, true);
    assert.deepEqual(languagePreference({ language: "es", languageSource: "manual" }), { language: "es", languageSource: "manual" });
  } finally { setDeviceLocales(["en-US"]); db.close(); }
});
