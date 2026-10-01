import { createContext, useContext, useSyncExternalStore } from "react";
import type { SessionController } from "./session-controller";

export const SessionContext = createContext<SessionController | null>(null);

export function useSession() {
  const controller = useContext(SessionContext);
  if (!controller) throw new Error("SessionProvider required");
  useSyncExternalStore(
    controller.subscribe,
    controller.getRevision,
    controller.getRevision,
  );
  return controller;
}