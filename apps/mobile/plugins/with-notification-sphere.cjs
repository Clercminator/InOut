const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const { generateImageAsync } = require("@expo/image-utils");
const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");

const metadata = "expo.modules.notifications.large_notification_icon";
const resource = "inout_notification_sphere";
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

function setLargeIcon(manifest) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, metadata, `@drawable/${resource}`, "resource");
  return manifest;
}

async function writeLargeIcons(projectRoot, androidRoot = path.join(projectRoot, "android")) {
  for (const [density, scale] of Object.entries(densities)) {
    const folder = path.join(androidRoot, "app/src/main/res", `drawable-${density}`);
    const { source } = await generateImageAsync({ projectRoot, cacheType: "inout-notification-sphere" }, {
      src: path.join(projectRoot, "assets/pulse-orb.png"), width: 64 * scale, height: 64 * scale,
      resizeMode: "contain", backgroundColor: "transparent",
    });
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, `${resource}.png`), source);
  }
}

// Expo 57's installed notification builder supports this metadata, but its config
// plugin does not expose it. This adds resources only, with no runtime native fork.
// Android chooses whether to display a large icon; FCM system-rendered payloads
// and iOS presentation do not use this local-notification metadata.
module.exports = config => {
  config = withAndroidManifest(config, result => {
    result.modResults = setLargeIcon(result.modResults);
    return result;
  });
  return withDangerousMod(config, ["android", async result => {
    await writeLargeIcons(result.modRequest.projectRoot, result.modRequest.platformProjectRoot);
    return result;
  }]);
};
module.exports.setLargeIcon = setLargeIcon;
module.exports.writeLargeIcons = writeLargeIcons;
