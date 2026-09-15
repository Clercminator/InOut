import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { SpaceGrotesk_500Medium } from "@expo-google-fonts/space-grotesk/500Medium";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk/700Bold";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "../src/provider";
import { colors } from "@inout/design-tokens";
import { Screen, Copy } from "../src/ui";
export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  if (!loaded && !error) return null;
  if (error)
    return (
      <SafeAreaProvider>
        <Screen>
          <Copy>
            IN/OUT could not load its bundled fonts. Please reopen the app.
          </Copy>
        </Screen>
      </SafeAreaProvider>
    );
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SessionProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "none",
          }}
        >
          <Stack.Screen name="session" options={{ gestureEnabled: false }} />
          <Stack.Screen name="post" options={{ gestureEnabled: false }} />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
