import test from "node:test";
import assert from "node:assert/strict";
import { protocols, catalogProtocols, planFor } from "../packages/protocols/src/index";
import { totalDuration } from "../packages/breathing-engine/src/index";
import { protocolTags, searchProtocols } from "../apps/mobile/src/protocol-search";
import { evidenceFor, evidenceReferences, presentationFor } from "../apps/mobile/src/protocol-evidence";
import { t } from "../apps/mobile/src/i18n";
import { EntitlementService } from "../apps/mobile/src/entitlements";

test("purpose protocols preserve 4/6 timing, bounded minute presets and Free access", () => {
  for (const [id, minutes, min, max] of [["sleep-wind-down", 6, 3, 10], ["post-workout-reset", 5, 3, 10], ["intimacy-calm", 4, 2, 8]] as const) {
    const p = protocols.find(p => p.id === id)!;
    assert.ok(catalogProtocols.includes(p));
    assert.equal(totalDuration(planFor(p)), minutes * 60000);
    assert.deepEqual(p.phases.map(p => [p.type, p.durationMs]), [["inhale", 4000], ["exhale", 6000]]);
    assert.equal(p.durationPresets[0], min * 60000);
    assert.equal(p.durationPresets.at(-1), max * 60000);
    assert.equal(p.intensity, "gentle");
    assert.equal(p.safetyCategory, "general");
    assert.ok(new EntitlementService().protocolAccess(p).allowed);
    for (const language of ["es", "pt"] as const) for (const copy of [p.name, p.description, p.purpose, p.instructions, p.precaution].filter(Boolean) as string[])
      assert.notEqual(t(copy, language), copy, `${language}: ${copy}`);
  }
});
test("multilingual partial intent search is accent-insensitive, ranked and composable", () => {
  for (const query of ["SUEÑO", "dorm", "sono", "bedtime"]) assert.equal(searchProtocols(catalogProtocols, query)[0]?.id, "sleep-wind-down");
  for (const query of ["gym", "gimnasio", "academia", "pós treino", "recuperacion"]) assert.ok(searchProtocols(catalogProtocols, query, ["fitness", "recovery"]).some(p => p.id === "post-workout-reset"), query);
  for (const query of ["sex", "intimidad", "intimidade", "performance anxiety", "confiança"]) assert.ok(searchProtocols(catalogProtocols, query).some(p => p.id === "intimacy-calm"), query);
  assert.equal(searchProtocols(catalogProtocols, "box breathing")[0].id, "box");
  assert.equal(searchProtocols(catalogProtocols, "respiración para dormir", [], "es")[0].id, "sleep-wind-down");
  assert.equal(searchProtocols(catalogProtocols, "after meals")[0].id, "coherent");
  assert.deepEqual(searchProtocols(catalogProtocols, "zzzzzz"), []);
  assert.equal(searchProtocols(catalogProtocols, "").length, catalogProtocols.length);
  assert.ok(protocolTags(protocols.find(p => p.id === "post-workout-reset")!).includes("recovery"));
});
test("evidence has stable references, valid protocol mappings, localized limitations and counterevidence", () => {
  assert.equal(new Set(evidenceReferences.map(r => r.id)).size, evidenceReferences.length);
  for (const ref of evidenceReferences) {
    assert.match(ref.doi, /^10\.\d{4,9}\//);
    assert.equal(new URL(ref.url).protocol, "https:");
    assert.ok(ref.authors && ref.title && ref.limitations && ref.supportedClaim);
    assert.ok(ref.protocolIds.every(id => protocols.some(p => p.id === id)));
    for (const lang of ["es", "pt"] as const) for (const copy of [ref.supportedClaim, ref.limitations, ref.classification])
      assert.notEqual(t(copy, lang), copy);
  }
  const recovery = evidenceFor(protocols.find(p => p.id === "post-workout-reset")!).references;
  assert.deepEqual(recovery.map(r => r.id), ["zaccaro-2018", "sugimoto-2025", "raidl-2026"]);
  assert.equal(evidenceFor(protocols.find(p => p.id === "high-intensity-cyclic")!).references.length, 0);
});


test("wellness protocols stay free of research panels and unsupported endorsements", () => {
  for (const id of ["intimacy-calm", "post-workout-reset", "high-intensity-cyclic"])
    assert.equal(presentationFor(protocols.find(p => p.id === id)!).category, "General wellness");
  assert.equal(presentationFor(protocols.find(p => p.id === "coherent")!).category, "Research-supported");
  assert.equal(protocols.some(p => presentationFor(p).category === "Expert-recommended"), false);
  for (const query of ["sleeping", "insomnio", "insônia", "studying", "meditation", "mindfulness", "nervousness", "nervosismo"])
    assert.ok(searchProtocols(catalogProtocols, query).length > 0, query);
});
