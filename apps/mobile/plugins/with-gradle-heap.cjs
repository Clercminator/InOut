const { withGradleProperties } = require("expo/config-plugins");

module.exports = config => withGradleProperties(config, result => {
  const key = "org.gradle.jvmargs";
  let property = result.modResults.find(item => item.type === "property" && item.key === key);
  if (!property) {
    property = {
      type: "property",
      key,
      value: "-XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8",
    };
    result.modResults.push(property);
  }
  property.value = property.value
    .replace(/-Xmx\S+/, "-Xmx4g")
    .replace(/-XX:MaxMetaspaceSize=\S+/, "-XX:MaxMetaspaceSize=1g");
  if (!property.value.includes("-Xmx4g")) property.value += " -Xmx4g";
  if (!property.value.includes("-XX:MaxMetaspaceSize=")) property.value += " -XX:MaxMetaspaceSize=1g";
  return result;
});
