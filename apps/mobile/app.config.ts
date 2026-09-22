import type { ConfigContext } from "expo/config";

export default ({ config }: ConfigContext) => ({
  ...config,
  plugins: [...(config.plugins ?? []),
    "@react-native-community/datetimepicker",
    ["expo-build-properties", { android: { kotlinVersion: "2.2.21" } }],
    "./plugins/with-kotlin-compiler.cjs",
    ["react-native-google-mobile-ads", {
    androidAppId: process.env.ADMOB_ANDROID_APP_ID || "ca-app-pub-3940256099942544~3347511713",
    iosAppId: process.env.ADMOB_IOS_APP_ID || "ca-app-pub-3940256099942544~1458002511",
    delayAppMeasurementInit: true,
  }]],
});
