import test from "node:test";
import assert from "node:assert/strict";
import { sharedPage } from "../apps/web/server/shared-page";
import { shareSnapshot } from "../packages/sharing/src/index";
import { protocols } from "../packages/protocols/src/index";
import { resultShareData } from "../apps/mobile/src/result-share-data";
import { manualSession } from "../apps/mobile/src/manual-session";
import { setLanguage } from "../apps/mobile/src/i18n";

const template = '<html lang="en"><head><title>Old</title><!--SHARE_META_START-->old branding<!--SHARE_META_END--></head><body><div id="guide"></div></body></html>';
const id = "a".repeat(32);
test("WhatsApp crawler receives localized exercise metadata without executing JavaScript", async () => {
  for (const [lang, name] of [["en", "Box Breathing"], ["es", "Respiración cuadrada"], ["pt", "Respiração quadrada"]]) {
    const response = await sharedPage(new Request(`https://inout.imrtech.xyz/reset.html?s=${id}&lang=${lang}`, { headers: { "User-Agent": "WhatsApp/2.24" } }), template,
      async () => shareSnapshot(protocols.find(p => p.id === "box")!));
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes(name));
    assert.ok(html.includes("exercise-og-background.png"));
    assert.ok(!html.includes("old branding"));
    assert.ok(html.includes(`s=${id}&amp;lang=${lang}`));
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
test("invalid, revoked and unavailable links do not advertise a valid exercise or cache it", async () => {
  let calls = 0;
  assert.equal((await sharedPage(new Request('https://inout.imrtech.xyz/reset.html?s=%22%3E%3Cscript%3E'), template, async () => { calls++; throw Error(); })).status, 404);
  assert.equal(calls, 0);
  for (const [message, code] of [["This link has expired or been revoked.", 410], ["Network error", 503]] as const) {
    const result = await sharedPage(new Request(`https://inout.imrtech.xyz/reset.html?s=${id}&lang=es`), template, async () => { throw Error(message); });
    assert.equal(result.status, code);
    assert.ok((await result.text()).includes("Ejercicio no disponible"));
  }
});
test("result card data excludes private notes, profile and measurements by default in all locales", () => {
  const record = manualSession({ goal: "Calm", startedAt: 0, durationMs: 60000 }, "private-id", 100000);
  record.pre = 8; record.post = 3; record.note = "Private medical note";
  for (const lang of ["en", "es", "pt"] as const) {
    setLanguage(lang);
    const data = resultShareData(record);
    assert.equal(data.measurement, null);
    assert.ok(!JSON.stringify(data).includes(record.note));
    assert.ok(!JSON.stringify(data).includes(record.id));
    assert.ok(resultShareData(record, true).measurement?.includes("8 → 3"));
    assert.equal(resultShareData(record).measurement, null);
  }
  setLanguage("en");
});
