const { withDangerousMod } = require('expo/config-plugins');
const { copyFile, mkdir } = require('node:fs/promises');
const path = require('node:path');

// RNFirebase 26's SPM symbol uploader reads the project root, while its Expo
// plugin copies the bundled plist into the app target folder. Keep both paths.
async function copyCrashlyticsPlist(projectRoot, iosRoot, source) {
  await mkdir(iosRoot, { recursive: true });
  await copyFile(path.resolve(projectRoot, source), path.join(iosRoot, 'GoogleService-Info.plist'));
}

module.exports = config => !config.ios?.googleServicesFile ? config : withDangerousMod(config, ['ios', async result => {
  await copyCrashlyticsPlist(result.modRequest.projectRoot, result.modRequest.platformProjectRoot, result.ios.googleServicesFile);
  return result;
}]);
module.exports.copyCrashlyticsPlist = copyCrashlyticsPlist;
