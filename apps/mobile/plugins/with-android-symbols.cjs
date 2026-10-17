const { withAppBuildGradle } = require("expo/config-plugins");

function retainNativeSymbols(contents) {
  const marker = "// IN/OUT native crash symbols";
  if (contents.includes(marker)) return contents;
  const release = /(buildTypes\s*\{[\s\S]*?\brelease\s*\{)/;
  if (!release.test(contents)) throw new Error("Android release build type not found; review the Expo template.");
  return contents.replace(release, `$1\n            ${marker}\n            ndk { debugSymbolLevel 'SYMBOL_TABLE' }`);
}
module.exports = config => withAppBuildGradle(config, result => {
  result.modResults.contents = retainNativeSymbols(result.modResults.contents);
  return result;
});
module.exports.retainNativeSymbols = retainNativeSymbols;
