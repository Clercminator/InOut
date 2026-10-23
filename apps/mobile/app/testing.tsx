import { Redirect } from "expo-router";

export default function Testing() {
  if (!__DEV__) return <Redirect href="/protocols" />;
  const DevelopmentTesting = require("../src/development-testing").default;
  return <DevelopmentTesting />;
}
