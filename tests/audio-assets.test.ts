import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

test("selected supplied voice and music recordings are present in the native asset bundle", () => {
  const root = join(process.cwd(), "apps/mobile/assets/audio/supplied");
  const names = [
    "music-bliss-breath.mp3", "music-sweet-and-spicy.mp3", "music-the-awakening.mp3",
    "music-the-initiation.mp3", "music-westerpark.mp3",
    "voice-en-male-in.mp3", "voice-en-male-out.mp3", "voice-en-male-hold.mp3", "voice-en-male-flow.mp3",
    "voice-en-female-in.mp3", "voice-en-female-out.mp3", "voice-en-female-hold.mp3", "voice-en-female-flow.mp3",
    "voice-es-female-in.mp3", "voice-es-female-out.mp3", "voice-es-female-hold.mp3",
  ];
  for (const name of names) assert.equal(existsSync(join(root, name)), true, name);
  const manifest = readFileSync("apps/mobile/src/approved-audio.ts", "utf8");
  for (const name of names) assert.ok(manifest.includes(name), name);
  assert.equal(names.length, 16);
});
