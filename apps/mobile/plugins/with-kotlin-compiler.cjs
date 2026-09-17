const { withProjectBuildGradle } = require("expo/config-plugins");

// SDK 57 propagates kotlinVersion to the catalog but leaves the compiler classpath
// on RN's default. Keep both aligned for Google Ads' Kotlin 2.3 metadata.
// Remove when https://github.com/expo/expo/issues/49668 is resolved.
module.exports = (config) => withProjectBuildGradle(config, (result) => {
  const dependency = /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::[^'"]+)?['"]\)/;
  if (!dependency.test(result.modResults.contents)) {
    throw new Error("Kotlin compiler dependency not found; review the Expo Android template.");
  }
  result.modResults.contents = result.modResults.contents.replace(
    dependency, "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.21')",
  );
  return result;
});
