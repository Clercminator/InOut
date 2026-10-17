import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { retainNativeSymbols } = require("../apps/mobile/plugins/with-android-symbols.cjs");

test("Android symbol configuration preserves signing and obfuscation settings and is idempotent", () => {
  const gradle = `android { buildTypes { debug { signingConfig signingConfigs.debug } release {
    signingConfig signingConfigs.release
    minifyEnabled enableMinifyInReleaseBuilds
  } } }`;
  const result = retainNativeSymbols(gradle);
  assert.equal(retainNativeSymbols(result), result);
  assert.match(result, /release \{\s*\/\/ IN\/OUT native crash symbols\s*ndk \{ debugSymbolLevel 'SYMBOL_TABLE' \}/);
  assert.match(result, /signingConfig signingConfigs.release/);
  assert.match(result, /minifyEnabled enableMinifyInReleaseBuilds/);
  assert.throws(() => retainNativeSymbols("new template"), /review the Expo template/);
});
