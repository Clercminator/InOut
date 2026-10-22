const disableIosFirebase = process.env.INOUT_PREVIEW === '1' || !process.env.GOOGLE_SERVICES_PLIST;

module.exports = {
  dependencies: disableIosFirebase ? {
    '@react-native-firebase/app': { platforms: { ios: null } },
    '@react-native-firebase/analytics': { platforms: { ios: null } },
    '@react-native-firebase/crashlytics': { platforms: { ios: null } },
  } : {},
};
