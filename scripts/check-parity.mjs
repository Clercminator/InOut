import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import policy from './build-policy.cjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(resolve(root, path), 'utf8').replaceAll('\r\n', '\n');
const json = path => JSON.parse(read(path));
const hash = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const files = path => readdirSync(resolve(root, path), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);
export function sourceFingerprint() {
  const walk = path => readdirSync(resolve(root, path), { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', 'dist', 'build', '.expo', '__pycache__'].includes(entry.name)) return [];
    return entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`];
  });
  const inputs = ['apps/mobile/app', 'apps/mobile/src', 'apps/mobile/assets', 'apps/mobile/plugins', 'packages', 'vendor', 'scripts'].flatMap(walk)
    .concat(['package.json', 'package-lock.json', 'apps/mobile/package.json', 'apps/mobile/tsconfig.json', 'apps/mobile/app.json', 'apps/mobile/app.config.ts', 'apps/mobile/eas.json', 'apps/mobile/firebase.json', 'apps/mobile/react-native.config.js', 'release/parity.json', 'release/monetization.json', 'release/links.json'])
    .filter(file => !/\.(log|pyc|tsbuildinfo)$/.test(file)).sort();
  const digest = createHash('sha256');
  for (const file of inputs) {
    const bytes = readFileSync(resolve(root, file));
    const content = /\.(ts|tsx|js|mjs|cjs|json|tsv|sh|py|yaml|yml|md)$/.test(file) ? bytes.toString('utf8').replaceAll('\r\n', '\n') : bytes;
    digest.update(file + '\0' + hash(content) + '\n');
  }
  return digest.digest('hex');
}
export function staticParity() {
  const errors = [], app = json('apps/mobile/app.json').expo, eas = json('apps/mobile/eas.json');
  const monetization = json('release/monetization.json');
  if (monetization.entitlement !== 'in_out_pro' || monetization.offering !== 'default') errors.push('Both platforms must retain the shared in_out_pro entitlement and default offering.');
  if (!/^\d+\.\d+\.\d+$/.test(app.version) || app.android?.version || app.ios?.version) errors.push('Use one shared Expo semantic version.');
  if (app.android.package !== 'com.imrtech.inout' || app.ios.bundleIdentifier !== app.android.package) errors.push('Both platform identities must remain com.imrtech.inout.');
  if (!Number.isSafeInteger(app.android.versionCode) || app.android.versionCode < 1 || !/^\d+$/.test(app.ios.buildNumber)) errors.push('Invalid platform build identifiers.');
  if (eas.cli.appVersionSource !== 'local') errors.push('Build identifiers must be frozen in source.');
  for (const profile of ['store-test', 'production']) {
    const build = eas.build[profile];
    if (build.autoIncrement !== false || build.android?.autoIncrement || build.ios?.autoIncrement || build.developmentClient) errors.push(`${profile}: no auto-increment or developer client in frozen artifacts.`);
    if (build.env.EXPO_PUBLIC_REVENUECAT_MODE !== 'store' || build.env.EXPO_PUBLIC_SUBSCRIPTION_PROVIDER !== 'revenuecat') errors.push(`${profile}: real store billing required.`);
    if (build.env.EXPO_PUBLIC_ADS_MODE !== (profile === 'production' ? 'live' : 'test')) errors.push(`${profile}: wrong advertising mode.`);
    for (const platform of ['android', 'ios']) if (build[platform]?.env) errors.push(`${profile}: platform-specific environment overrides require parity review.`);
  }
  const differences = json('release/parity.json').platformDifferences;
  for (const file of [...files('apps/mobile/app'), ...files('apps/mobile/src')].filter(f => /\.[jt]sx?$/.test(f))) {
    const source = read(file);
    if (/\.(ios|android)\.[jt]sx?$/.test(file) || /Platform\s*(?:\.\s*(?:OS|select)|\[)/.test(source) || /(?:isIOS|isAndroid)\b/.test(source)) {
      const approval = differences[file];
      if (!approval?.reason || !approval.acceptance || approval.sha256 !== hash(source)) errors.push(`${file}: new/changed platform difference requires reason, equivalence review, source hash and device acceptance in release/parity.json.`);
    }
    if (file.startsWith('apps/mobile/app/') && /\.(ios|android)\./.test(file)) errors.push(`${file}: product routes must be shared.`);
  }
  for (const file of ['entitlements.ts', 'product-config.ts', 'protocol-search.ts']) if (/Platform\.|isIOS|isAndroid/.test(read(`apps/mobile/src/${file}`))) errors.push(`${file}: product policy must remain shared.`);
  for (const file of ['app/breath-hold-timer.tsx', 'app/onboarding.tsx', 'app/(tabs)/_layout.tsx', 'src/swipe-surface.tsx', 'src/swipe-navigation.ts', 'src/onboarding-flow.ts', 'src/breath-hold-timer.ts', 'src/audio-preferences.ts', 'src/audio-sample.ts']) {
    if (/Platform\s*\.|isIOS|isAndroid/.test(read(`apps/mobile/${file}`))) errors.push(`${file}: timer, onboarding and audio behavior must remain shared.`);
  }
  for (const file of ['src/audio-library.ts', 'src/audio-sample.ts', 'src/session-effects.tsx', 'src/sound-controls.tsx']) {
    if (/breathTextures|breathPreviews|humTexture|settings\.nature|NATURAL BREATHING SOUNDS/.test(read(`apps/mobile/${file}`))) errors.push(`${file}: retired natural-sound playback must not return on either platform.`);
  }
  if (!/if \(!__DEV__\) return <Redirect href="\/protocols"/.test(read('apps/mobile/app/testing.tsx'))) errors.push('Testing route must reject release deep links.');
  if (!/ListFooterComponent=\{__DEV__ &&/.test(read('apps/mobile/app/protocols.tsx'))) errors.push('Animation Lab entry must be compile-time development only.');
  const native = read('apps/mobile/app.config.ts');
  if (!native.includes('firebase-policy') && !native.includes('buildPolicy')) errors.push('Expo configuration must enforce Firebase/store policy.');
  if (!native.includes('useFrameworks: "dynamic"')) errors.push('Firebase iOS SPM requires dynamic framework linking.');
  const defaults = json('apps/mobile/firebase.json')['react-native'];
  for (const key of ['analytics_auto_collection_enabled', 'crashlytics_auto_collection_enabled', 'analytics_default_allow_ad_storage', 'analytics_default_allow_ad_user_data', 'google_analytics_adid_collection_enabled', 'analytics_idfv_collection_enabled']) if (defaults[key] !== false) errors.push(`Firebase consent default changed: ${key}`);
  for (const file of files('.github/workflows').concat(files('scripts')).filter(f => /\.(yml|yaml|sh|py)$/.test(f))) {
    if (/CFBundleShortVersionString[^\n]*==\s*['"]\d+\.\d+\.\d+/.test(read(file))) errors.push(`${file}: capture version must come from Expo configuration.`);
  }
  return errors;
}

export function candidateErrors(manifest, app, commit, profile) {
  const errors = [];
  if (!/^[a-f0-9]{40}$/.test(manifest.sourceCommit ?? '') || manifest.sourceCommit !== commit) errors.push('Candidate sourceCommit must equal the frozen build commit.');
  if (manifest.version !== app.version || manifest.profile !== profile) errors.push('Candidate version/profile does not match build.');
  for (const [platform, current] of [['android', app.android.versionCode], ['ios', app.ios.buildNumber]]) {
    const entry = manifest[platform];
    if (!entry || String(entry.buildIdentifier) !== String(current)) errors.push(`${platform}: candidate build identifier differs from source.`);
    if (!Number.isSafeInteger(Number(entry?.lastUploaded)) || Number(entry?.lastUploaded) < 0 || Number(current) <= Number(entry?.lastUploaded) || !entry?.historyEvidence) errors.push(`${platform}: require store history evidence and a build identifier greater than lastUploaded.`);
  }
  return errors;
}

export function pairErrors(receipts, manifest) {
  const errors = [];
  if (receipts.length !== 2 || new Set(receipts.map(r => r.platform)).size !== 2 || !receipts.some(r => r.platform === 'ios') || !receipts.some(r => r.platform === 'android')) return ['Both Android and iOS receipts are required.'];
  for (const receipt of receipts) {
    if (receipt.sourceCommit !== manifest.sourceCommit || receipt.version !== manifest.version || receipt.profile !== manifest.profile || receipt.buildIdentifier !== String(manifest[receipt.platform]?.buildIdentifier) || !receipt.buildId) errors.push(`${receipt.platform}: artifact receipt does not match frozen candidate.`);
    if (!/^[a-f0-9]{64}$/.test(receipt.sourceFingerprint ?? '') || receipt.sourceFingerprint !== manifest.sourceFingerprint || !/^[a-f0-9]{64}$/.test(receipt.productFingerprint ?? '')) errors.push(`${receipt.platform}: missing or mismatched source/configuration fingerprint.`);
  }
  if (receipts[0].productFingerprint !== receipts[1].productFingerprint) errors.push('Artifact product configuration differs between platforms.');
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), errors = staticParity();
  const app = json('apps/mobile/app.json').expo;
  const store = process.env.INOUT_RELEASE === '1' || process.env.INOUT_STORE_TEST === '1' || ['production', 'store-test'].includes(process.env.EAS_BUILD_PROFILE);
  const commercial = args.includes('--commercial') || store;
  const profile = process.env.EAS_BUILD_PROFILE || (process.env.INOUT_RELEASE === '1' ? 'production' : 'store-test');
  if (commercial) errors.push(...policy.buildPolicy({ ...process.env, EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_EAS_PROJECT_ID: app.extra.eas.projectId }, json('release/readiness.json').gates, json('release/store-listing.json').status, { artifactOnly: args.includes('--artifact-only') || process.env.INOUT_ARTIFACT_ONLY === '1' }));
  let manifest;
  if (args.includes('--fingerprint')) {
    if (git('status', '--porcelain')) errors.push('A source fingerprint for release requires a clean committed checkout.');
    else console.log(sourceFingerprint());
  }
  if (args.includes('--build') || args.includes('--pair') || args.includes('--receipt')) {
    try { manifest = JSON.parse(readFileSync(process.env.INOUT_RELEASE_MANIFEST, 'utf8')); }
    catch { errors.push('Set INOUT_RELEASE_MANIFEST to the approved frozen candidate JSON file (see CROSS_PLATFORM_RELEASE_READINESS.md).'); }
    if (manifest) {
      const commit = process.env.EAS_BUILD_GIT_COMMIT_HASH || git('rev-parse', 'HEAD');
      errors.push(...candidateErrors(manifest, app, commit, profile));
      if (manifest.sourceFingerprint !== sourceFingerprint()) errors.push('Candidate source fingerprint differs from actual build inputs. Freeze a clean commit; do not upload dirty sources under an old SHA.');
      if (args.includes('--build') && !process.env.EAS_BUILD && git('status', '--porcelain')) errors.push('Freeze a clean source checkout before building a candidate.');
    }
  }
  if (args.includes('--pair') && manifest) {
    try { errors.push(...pairErrors(args.slice(args.indexOf('--pair') + 1).map(p => JSON.parse(readFileSync(p, 'utf8'))), manifest)); }
    catch { errors.push('Provide two readable artifact receipt JSON paths after --pair.'); }
  }
  if (errors.length) { console.error(errors.map(e => `- ${e}`).join('\n')); process.exitCode = 1; }
  else if (args.includes('--receipt') && manifest) {
    const platform = process.env.EAS_BUILD_PLATFORM;
    if (!['android', 'ios'].includes(platform) || !process.env.EAS_BUILD_ID) throw Error('Artifact receipt requires EAS platform and build ID.');
    const path = resolve(root, 'apps/mobile/artifacts/release-receipt.json');
    mkdirSync(dirname(path), { recursive: true });
    const productFingerprint = hash(['apps/mobile/app.json', 'apps/mobile/eas.json', 'apps/mobile/src/product-config.ts', 'apps/mobile/src/entitlements.ts', 'release/monetization.json', 'apps/mobile/firebase.json'].map(read).join('\n') + JSON.stringify(Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('EXPO_PUBLIC_')).sort(([a], [b]) => a.localeCompare(b)))));
    writeFileSync(path, JSON.stringify({ sourceCommit: manifest.sourceCommit, sourceFingerprint: manifest.sourceFingerprint, version: app.version, platform, buildIdentifier: String(manifest[platform].buildIdentifier), profile, buildId: process.env.EAS_BUILD_ID, productFingerprint }, null, 2) + '\n');
    console.log(`Artifact provenance recorded: ${relative(root, path)}`);
  } else console.log(commercial ? 'Commercial configuration parity passed; native/device and paired artifact acceptance remain separate.' : 'Static parity passed. Firebase credentials, native binaries and device behavior are not verified by this check.');
}
