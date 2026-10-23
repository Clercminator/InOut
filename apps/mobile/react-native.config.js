const store = process.env.INOUT_RELEASE === '1' || process.env.INOUT_STORE_TEST === '1' || ['production', 'store-test'].includes(process.env.EAS_BUILD_PROFILE);
if (store) {
  const errors = require('../../scripts/firebase-policy.cjs').firebasePolicy(process.env);
  if (errors.length) throw new Error(errors.join('\n'));
}
const dependencies = {};
for (const [platform, file] of [['android', 'GOOGLE_SERVICES_JSON'], ['ios', 'GOOGLE_SERVICES_PLIST']]) {
  if (process.env.INOUT_PREVIEW === '1' || !process.env[file]) {
    for (const name of ['app', 'analytics', 'crashlytics']) {
      const key = `@react-native-firebase/${name}`;
      dependencies[key] ??= { platforms: {} };
      dependencies[key].platforms[platform] = null;
    }
  }
}
module.exports = { dependencies };
