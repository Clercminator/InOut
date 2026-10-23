import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = mkdtempSync(join(tmpdir(), "inout-firebase-fixture-"));
export const firebaseEnv = { GOOGLE_SERVICES_JSON: join(directory, "android.json"), GOOGLE_SERVICES_PLIST: join(directory, "ios.plist") };
writeFileSync(firebaseEnv.GOOGLE_SERVICES_JSON, JSON.stringify({ project_info: { project_id: "poised-epigram-503804-a1" }, client: [{ client_info: { android_client_info: { package_name: "com.imrtech.inout" }, mobilesdk_app_id: "fixture" }, api_key: [{ current_key: "fixture-not-a-key" }] }] }));
writeFileSync(firebaseEnv.GOOGLE_SERVICES_PLIST, '<plist><dict>' + Object.entries({ PROJECT_ID: "poised-epigram-503804-a1", BUNDLE_ID: "com.imrtech.inout", GOOGLE_APP_ID: "fixture", API_KEY: "fixture-not-a-key" }).map(([key, value]) => `<key>${key}</key><string>${value}</string>`).join("") + '</dict></plist>');
