import React, {
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import { createClock } from "@inout/breathing-engine";
import { SessionController } from "./session-controller";
import { LocalStore } from "./storage";
import { NativeSessionEffects } from "./session-effects";
import { SessionContext, useSession } from "./session-context";
import { Screen, Title, Copy, Button } from "./ui";

export function SessionProvider({ children }: PropsWithChildren) {
  const [attempt, setAttempt] = useState(0);
  const [controller, setController] = useState<SessionController | null>(null);
  const [failure, setFailure] = useState(false);
  useEffect(() => {
    try {
      const store = new LocalStore(SQLite.openDatabaseSync("inout.db"));
      const clock = createClock(Date.now, () => performance.now());
      setController(new SessionController(store, clock.now, randomUUID));
      setFailure(false);
    } catch {
      setFailure(true);
    }
  }, [attempt]);
  useEffect(() => {
    if (!controller) return;
    const state = AppState.addEventListener("change", (next) => {
      if (next !== "active") controller.pause("background");
    });
    const blur =
      Platform.OS === "android"
        ? AppState.addEventListener("blur", () =>
            controller.pause("interruption"),
          )
        : null;
    return () => {
      state.remove();
      blur?.remove();
      controller.pause("background");
    };
  }, [controller]);
  if (!controller)
    return (
      <Screen>
        <Title>IN/OUT</Title>
        <Copy>
          {failure
            ? "Your local data could not be opened. It has been preserved."
            : "Getting ready."}
        </Copy>
        {failure && (
          <Button title="Retry" onPress={() => setAttempt((n) => n + 1)} />
        )}
      </Screen>
    );
  return (
    <SessionContext.Provider value={controller}>
      <NativeSessionEffects />
      {children}
    </SessionContext.Provider>
  );
}
export { useSession } from "./session-context";
export function SaveError() {
  const controller = useSession();
  return controller.error ? (
    <>
      <Copy accessibilityRole="alert">{controller.error}</Copy>
      <Button title="Retry saving" onPress={() => controller.retry()} />
    </>
  ) : null;
}
