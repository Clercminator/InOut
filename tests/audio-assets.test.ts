import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { musicTrackIds, voiceOptions } from "../apps/mobile/src/audio-preferences";

test("selected supplied voice and music recordings are present in the native asset bundle", () => {
  const root = join(process.cwd(), "apps/mobile/assets/audio/supplied");
  const names = [
    "music-bliss-breath.mp3", "music-sweet-and-spicy.mp3", "music-the-awakening.mp3",
    "music-the-initiation.mp3", "music-westerpark.mp3",
    "voice-en-male-in.mp3", "voice-en-male-out.mp3", "voice-en-male-hold.mp3", "voice-en-male-flow.mp3",
    "voice-en-female-in.mp3", "voice-en-female-out.mp3", "voice-en-female-hold.mp3", "voice-en-female-flow.mp3",
    "voice-es-female-in.mp3", "voice-es-female-out.mp3", "voice-es-female-hold.mp3", "voice-es-female-flow.mp3",
    ...["es-male", "pt-male", "pt-female"].flatMap(bank => ["in", "out", "hold", "flow"].map(cue => `voice-${bank}-${cue}.mp3`)),
  ];
  for (const name of names) assert.equal(existsSync(join(root, name)), true, name);
  const manifest = readFileSync("apps/mobile/src/approved-audio.ts", "utf8");
  for (const name of names) assert.ok(manifest.includes(name), name);
  assert.equal(names.length, 29);
  for (const name of ["completion-1.mp3", "completion-2.mp3"]) {
    assert.ok(existsSync(join(root, name)));
    assert.ok(readFileSync("apps/mobile/src/audio-library.ts", "utf8").includes(name));
  }
});

test("every static audio asset reference resolves to a Metro-bundled file", () => {
  const sourceRoot = resolve("apps/mobile/src");
  const requirePattern = /require\(["']([^"']+\.(?:mp3|wav))["']\)/g;
  const references: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.(?:ts|tsx)$/.test(entry.name)) {
        const source = readFileSync(path, "utf8");
        for (const match of source.matchAll(requirePattern)) {
          const assetPath = resolve(dirname(path), match[1]);
          assert.equal(existsSync(assetPath), true, relative(process.cwd(), assetPath));
          references.push(assetPath);
        }
      }
    }
  };
  visit(sourceRoot);
  assert.ok(references.length >= 60, "expected static audio assets to be declared");
  assert.equal(new Set(references).size, references.length, "each audio asset should have one static declaration");
});

test("supported voice banks and music choices have an explicit manifest mapping", () => {
  assert.deepEqual(voiceOptions, [
    { id: "existing", language: "en" },
    { id: "existing", language: "es" },
    { id: "existing", language: "pt" },
    { id: "male", language: "en" },
    { id: "female", language: "en" },
    { id: "female", language: "es" },
    { id: "male", language: "es" },
    { id: "female", language: "pt" },
    { id: "male", language: "pt" },
  ]);
  assert.deepEqual(musicTrackIds, [
    "bliss-breath", "sweet-and-spicy", "the-awakening", "the-initiation", "westerpark",
  ]);
});
