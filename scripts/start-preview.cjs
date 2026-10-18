const { readFileSync, existsSync } = require("node:fs");
const { resolve, dirname } = require("node:path");
const { spawn } = require("node:child_process");
const mobile = resolve(__dirname, "../apps/mobile");
const env = { ...process.env, INOUT_PREVIEW: "1", EXPO_NO_DOTENV: "1", EXPO_PUBLIC_ADS_MODE: "test", EXPO_PUBLIC_REVENUECAT_MODE: "store", EXPO_PUBLIC_SUBSCRIPTION_PROVIDER: "revenuecat" };
// Only public platform SDK keys enter Metro; private build credentials stay out.
const file = resolve(mobile, ".env.store.local");
if (existsSync(file)) {
  const values = require("dotenv").parse(readFileSync(file));
  for (const name of ["EXPO_PUBLIC_REVENUECAT_ANDROID_KEY", "EXPO_PUBLIC_REVENUECAT_IOS_KEY"]) if (values[name]) env[name] = values[name];
}
delete env.INOUT_RELEASE; delete env.INOUT_STORE_TEST; delete env.EXPO_PUBLIC_REVENUECAT_TEST_KEY;
const args = process.argv.slice(2);
const cli = resolve(dirname(require.resolve("expo/package.json")), "bin/cli");
const child = spawn(process.execPath, [cli, "start", "--dev-client", ...(args.includes("--tunnel") ? [] : ["--lan"]), ...args], { cwd: mobile, env, stdio: "inherit", windowsHide: true });
child.on("exit", code => process.exit(code ?? 1));
