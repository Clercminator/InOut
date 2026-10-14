import { getLocales } from "expo-localization";
import { setDeviceLocales } from "./language-preference";
export function refreshDeviceLanguage() {
  setDeviceLocales(getLocales().map(item => item.languageTag));
}
refreshDeviceLanguage();
