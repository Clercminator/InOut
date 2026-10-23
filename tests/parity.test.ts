import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { candidateErrors, pairErrors, staticParity } from "../scripts/check-parity.mjs";
import { firebasePolicy } from "../scripts/firebase-policy.cjs";
import { firebaseEnv } from "./firebase-fixture";
import { transformSync } from "esbuild";

test("shared configuration, reviewed platform differences and development guards pass static parity", () => assert.deepEqual(staticParity(), []));
test("both Firebase identities are required; missing, malformed or swapped files fail closed", () => {
  assert.deepEqual(firebasePolicy(firebaseEnv), []);
  assert.equal(firebasePolicy({}).length, 2);
  assert.equal(firebasePolicy({ ...firebaseEnv, GOOGLE_SERVICES_PLIST: firebaseEnv.GOOGLE_SERVICES_JSON }).length, 1);
  assert.equal(firebasePolicy({ ...firebaseEnv, GOOGLE_SERVICES_JSON: '/missing' }).length, 1);
});
test("candidate enforces same SHA/version/profile and independently increasing platform build IDs", () => {
  const app = { version: "2.0.0", android: { versionCode: 12 }, ios: { buildNumber: "4" } };
  const commit = "a".repeat(40);
  const manifest = { sourceCommit: commit, sourceFingerprint: "c".repeat(64), version: app.version, profile: "store-test", android: { buildIdentifier: 12, lastUploaded: 11, historyEvidence: "Play all tracks" }, ios: { buildIdentifier: "4", lastUploaded: 3, historyEvidence: "App Store Connect" } };
  assert.deepEqual(candidateErrors(manifest, app, commit, "store-test"), []);
  assert.ok(candidateErrors(manifest, app, "b".repeat(40), "store-test").length);
  assert.ok(candidateErrors(manifest, app, commit, "production").length);
  assert.ok(candidateErrors({ ...manifest, ios: { ...manifest.ios, lastUploaded: 4 } }, app, commit, "store-test").length);
  const receipts = ['android', 'ios'].map(platform => ({ platform, sourceCommit: commit, sourceFingerprint: "c".repeat(64), version: app.version, profile: 'store-test', buildIdentifier: String(manifest[platform as 'android' | 'ios'].buildIdentifier), buildId: platform, productFingerprint: 'd'.repeat(64) }));
  assert.deepEqual(pairErrors(receipts, manifest), []);
  assert.ok(pairErrors([receipts[0]], manifest).length);
  assert.ok(pairErrors([receipts[0], { ...receipts[1], sourceCommit: 'different' }], manifest).length);
  assert.ok(pairErrors([receipts[0], { ...receipts[1], productFingerprint: 'different' }], manifest).length);
});
test("production compilation eliminates experimental screen rendering", () => {
  const source = readFileSync('apps/mobile/app/testing.tsx', 'utf8');
  const code = transformSync(source, { loader: 'tsx', format: 'esm', define: { __DEV__: 'false' }, minify: true, treeShaking: true }).code;
  assert.doesNotMatch(code, /Start testing|DevelopmentTesting|setInterval/);
  assert.match(code, /Redirect/);
});
