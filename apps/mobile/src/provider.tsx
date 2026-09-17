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
import { createCommercialServices } from "./commercial";
import { CommercialContext, type CommercialServices } from "./commercial-context";

export function SessionProvider({ children }: PropsWithChildren) {
  const [attempt, setAttempt] = useState(0);
  const [controller, setController] = useState<SessionController | null>(null);
  const [failure, setFailure] = useState(false);
  const [commercial, setCommercial] = useState<CommercialServices | null>(null);
  useEffect(() => {
    try {
      const store = new LocalStore(SQLite.openDatabaseSync("inout.db"));
      const clock = createClock(Date.now, () => performance.now());
      const services = createCommercialServices(store);
      setCommercial(services);
      setController(new SessionController(store, clock.now, randomUUID, services.entitlements, services.analytics));
      setFailure(false);
    } catch {
      setFailure(true);
    }
  }, [attempt]);
  useEffect(() => {
    if (!commercial || !controller) return;
    const unsubscribe = commercial.entitlements.subscribe(controller.entitlementsChanged);
    const unsubscribeStore = commercial.subscriptions.listen();
    if (commercial.subscriptions.adapter.mode !== "unavailable") void commercial.subscriptions.load();
    commercial.analytics.track("app_open");
    const timer = setInterval(commercial.entitlements.refresh, 30000);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        commercial.entitlements.refresh();
        if (commercial.subscriptions.adapter.mode === "store") void commercial.subscriptions.load();
      }
    });
    return () => { unsubscribe(); unsubscribeStore(); foreground.remove(); clearInterval(timer); };
  }, [commercial, controller]);
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
      <CommercialContext.Provider value={commercial}>
      <NativeSessionEffects />
      {children}
      </CommercialContext.Provider>
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
