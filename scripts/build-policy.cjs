const demo = '3940256099942544';
const { admob } = require('../release/monetization.json');
function buildPolicy(env, gates = {}, listingStatus = '') {
  const production = env.INOUT_RELEASE === '1' || env.EAS_BUILD_PROFILE === 'production';
  const store = production || env.INOUT_STORE_TEST === '1' || env.EAS_BUILD_PROFILE === 'store-test';
  const errors = [];
  for (const [platform, ids] of Object.entries(admob)) {
    const names = { app: `ADMOB_${platform.toUpperCase()}_APP_ID`, banner: `EXPO_PUBLIC_ADMOB_${platform.toUpperCase()}_BANNER_ID`, interstitial: `EXPO_PUBLIC_ADMOB_${platform.toUpperCase()}_INTERSTITIAL_ID` };
    for (const [format, name] of Object.entries(names)) if (env[name] && env[name] !== ids[format]) errors.push(`${name} conflicts with release/monetization.json.`);
  }
  for (const name of ['EXPO_PUBLIC_DEV_PRO', 'EXPO_PUBLIC_MOCK_PRO', 'EXPO_PUBLIC_ENTITLEMENT_OVERRIDE']) {
    if (env[name] && !['0', 'false'].includes(env[name])) errors.push(`${name} is unsupported; overrides must never enter a build.`);
  }
  if (env.EXPO_PUBLIC_SUBSCRIPTION_PROVIDER && env.EXPO_PUBLIC_SUBSCRIPTION_PROVIDER !== 'revenuecat') errors.push('RevenueCat is the only implemented production subscription provider.');
  if (!store) return errors;
  if (env.EXPO_PUBLIC_REVENUECAT_MODE && env.EXPO_PUBLIC_REVENUECAT_MODE !== 'store') errors.push('Store builds cannot use mock or RevenueCat Test Store mode.');
  if (env.EXPO_PUBLIC_REVENUECAT_TEST_KEY) errors.push('Remove the Test Store key from store build environments.');
  for (const [key, prefix] of [['EXPO_PUBLIC_REVENUECAT_IOS_KEY','appl_'], ['EXPO_PUBLIC_REVENUECAT_ANDROID_KEY','goog_']]) {
    if (!env[key]?.startsWith(prefix)) errors.push(`Configure the platform public SDK key: ${key}`);
  }
  for (const [platform, ids] of Object.entries(admob)) {
    if (!/^ca-app-pub-\d+~\d+$/.test(ids.app) || ids.app.includes(demo)) errors.push(`Real native app ID required: ${platform}`);
    for (const format of ['banner', 'interstitial']) if (!/^ca-app-pub-\d+\/\d+$/.test(ids[format]) || ids[format].includes(demo)) errors.push(`Real ${format} ID required: ${platform}`);
  }
  if (!/^[0-9a-f-]{36}$/i.test(env.EXPO_PUBLIC_EAS_PROJECT_ID || '')) errors.push('Set EXPO_PUBLIC_EAS_PROJECT_ID to the owner EAS project UUID.');
  if (!['test', 'live'].includes(env.EXPO_PUBLIC_ADS_MODE)) errors.push('Explicit test/live ad mode required.');
  if (production) {
    if (env.EXPO_PUBLIC_ADS_MODE !== 'live') errors.push('Production must explicitly use live ad configuration.');
    for (const name of ['billingVerified','adsAndConsentVerified','sharingVerified','analyticsDecisionVerified','nativeDeviceAcceptance','metadataAndLegalApproved','accountsAndDeletionVerified']) {
      if (gates[name] !== true) errors.push(`Commercial launch gate is open: ${name}`);
    }
    if (listingStatus !== 'approved-commercial-v1') errors.push('Commercial metadata remains unapproved.');
  }
  return errors;
}
module.exports = { buildPolicy };
