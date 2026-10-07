const demo = '3940256099942544';
function buildPolicy(env, gates = {}, listingStatus = '') {
  const production = env.INOUT_RELEASE === '1' || env.EAS_BUILD_PROFILE === 'production';
  const store = production || env.INOUT_STORE_TEST === '1' || env.EAS_BUILD_PROFILE === 'store-test';
  const errors = [];
  for (const name of ['EXPO_PUBLIC_DEV_PRO', 'EXPO_PUBLIC_MOCK_PRO', 'EXPO_PUBLIC_ENTITLEMENT_OVERRIDE']) {
    if (env[name] && !['0', 'false'].includes(env[name])) errors.push(`${name} is unsupported; overrides must never enter a build.`);
  }
  if (env.EXPO_PUBLIC_SUBSCRIPTION_PROVIDER && env.EXPO_PUBLIC_SUBSCRIPTION_PROVIDER !== 'revenuecat') errors.push('RevenueCat is the only implemented production subscription provider.');
  if (!store) return errors;
  for (const [key, prefix] of [['EXPO_PUBLIC_REVENUECAT_IOS_KEY','appl_'], ['EXPO_PUBLIC_REVENUECAT_ANDROID_KEY','goog_']]) {
    if (!env[key]?.startsWith(prefix)) errors.push(`Configure the platform public SDK key: ${key}`);
  }
  for (const key of ['ADMOB_ANDROID_APP_ID','ADMOB_IOS_APP_ID']) {
    if (!/^ca-app-pub-\d+~\d+$/.test(env[key] || '') || env[key].includes(demo)) errors.push(`Real native app ID required: ${key}`);
  }
  if (!/^[0-9a-f-]{36}$/i.test(env.EXPO_PUBLIC_EAS_PROJECT_ID || '')) errors.push('Set EXPO_PUBLIC_EAS_PROJECT_ID to the owner EAS project UUID.');
  if (!['test', 'live'].includes(env.EXPO_PUBLIC_ADS_MODE)) errors.push('Explicit test/live ad mode required.');
  if (env.EXPO_PUBLIC_ADS_MODE === 'live') for (const key of ['EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID','EXPO_PUBLIC_ADMOB_IOS_BANNER_ID']) {
    if (!/^ca-app-pub-\d+\/\d+$/.test(env[key] || '') || env[key].includes(demo)) errors.push(`Real banner ID required: ${key}`);
  }
  if (production) {
    if (env.EXPO_PUBLIC_ADS_MODE !== 'live') errors.push('Production must explicitly use live ad configuration.');
    for (const name of ['billingVerified','adsAndConsentVerified','sharingVerified','analyticsDecisionVerified','nativeDeviceAcceptance','metadataAndLegalApproved']) {
      if (gates[name] !== true) errors.push(`Commercial launch gate is open: ${name}`);
    }
    if (listingStatus !== 'approved-commercial-v1') errors.push('Commercial metadata remains unapproved.');
  }
  return errors;
}
module.exports = { buildPolicy };
