import test from "node:test";
import assert from "node:assert/strict";
import { darkColors, lightColors } from "../packages/design-tokens/src/index";
function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(h => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
for (const [mode, c] of Object.entries({ dark: darkColors, light: lightColors })) {
  test(`${mode} theme keeps readable text and selected controls`, () => {
    for (const surface of [c.background, c.card, c.raised, c.sessionSurface, c.accentSurface]) {
      for (const ink of [c.text, c.secondaryText, c.muted]) {
        assert.ok(contrast(ink, surface) >= 4.5, `${ink} on ${surface}: ${contrast(ink, surface)}`);
      }
    }
    assert.ok(contrast(c.danger, c.dangerSurface) >= 4.5);
    for (const accent of [c.accent, c.exhale, c.gold, c.hold]) {
      assert.ok(contrast(accent, c.card) >= 4.5);
      assert.ok(contrast(c.onAccent, accent) >= 4.5);
    }
  });
}
