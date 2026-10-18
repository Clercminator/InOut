import test from "node:test";
import assert from "node:assert/strict";
import { exerciseTitle, sharedPage } from "../apps/web/server/shared-page";
import type { SharedPractice } from "../packages/sharing/src/index";

const id = "a".repeat(32);
const snapshot: SharedPractice = {
  v: 1,
  blocks: [{ cycles: 1, phases: [["inhale", 4000], ["exhale", 6000]] }],
};
const template = '<!doctype html><html lang="en"><head><title>Old title</title><!--SHARE_META_START--><!--SHARE_META_END--></head><body></body></html>';
const metadata = (html: string, name: string) => {
  const value = html.match(new RegExp(`<meta ${name} content="([^"]*)"`));
  assert.ok(value, `missing ${name}`);
  return value[1];
};

test("shared exercise pages render localized, private-data-free social metadata", async () => {
  const locales = [
    ["en", "en_US", "Try this breathing practice with IN/OUT. Keep breaths comfortable; pause whenever you need to."],
    ["es", "es_419", "Prueba esta práctica de respiración con IN/OUT. Respira cómodamente y haz una pausa cuando lo necesites."],
    ["pt", "pt_BR", "Experimente esta prática de respiração com IN/OUT. Respire confortavelmente e faça uma pausa quando precisar."],
  ] as const;

  for (const [language, locale, description] of locales) {
    const response = await sharedPage(
      new Request(`https://inout.imrtech.xyz/reset.html?s=${id}&lang=${language}`),
      template,
      async () => snapshot,
    );
    const html = await response.text();
    const canonical = `https://inout.imrtech.xyz/reset.html?s=${id}&lang=${language}`;
    const title = exerciseTitle(snapshot, language);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(html.includes(`<html lang="${language}">`), true);
    assert.equal(html.includes(`<title>${title} · IN/OUT</title>`), true);
    assert.equal(metadata(html, 'property="og:title"'), `${title} · IN/OUT`);
    assert.equal(metadata(html, 'property="og:description"'), description);
    assert.equal(metadata(html, 'property="og:locale"'), locale);
    assert.equal(metadata(html, 'property="og:url"'), canonical.replaceAll("&", "&amp;"));
    assert.equal(metadata(html, 'property="og:image"'), "https://inout.imrtech.xyz/exercise-og-background.png");
    assert.equal(metadata(html, 'property="og:image:width"'), "1200");
    assert.equal(metadata(html, 'property="og:image:height"'), "630");
    assert.equal(metadata(html, 'name="twitter:card"'), "summary_large_image");
    assert.equal(metadata(html, 'name="twitter:image"'), "https://inout.imrtech.xyz/exercise-og-background.png");
    assert.equal(html.includes("private"), false);
  }
});

test("shared exercise pages distinguish malformed, revoked, and unavailable links", async () => {
  const malformed = await sharedPage(
    new Request("https://inout.imrtech.xyz/reset.html?s=bad&lang=es"),
    template,
    async () => { throw new Error("must not resolve malformed IDs"); },
  );
  assert.equal(malformed.status, 404);
  assert.equal(metadata(await malformed.text(), 'property="og:title"'), "Ejercicio no disponible · IN/OUT");

  const revoked = await sharedPage(
    new Request(`https://inout.imrtech.xyz/reset.html?s=${id}&lang=pt`),
    template,
    async () => { throw new Error("This link has expired or been revoked."); },
  );
  assert.equal(revoked.status, 410);
  assert.equal(metadata(await revoked.text(), 'property="og:title"'), "Exercício indisponível · IN/OUT");

  const unavailable = await sharedPage(
    new Request(`https://inout.imrtech.xyz/reset.html?s=${id}`),
    template,
    async () => { throw new Error("Sharing is temporarily unavailable."); },
  );
  assert.equal(unavailable.status, 503);
});
