import { setDeviceLocales } from "./src/language-preference";
import { setLanguage } from "./src/i18n";

// UI fixtures have a stable device locale regardless of the developer/CI host.
beforeEach(() => { setDeviceLocales(["en-US"]); setLanguage("en"); });
