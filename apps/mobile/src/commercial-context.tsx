import { createContext, useContext, useSyncExternalStore } from "react";
import type { EntitlementService } from "./entitlements";
import type { SubscriptionService } from "./subscriptions";
import type { AdService } from "./ads";
import type { AnalyticsService } from "./analytics";
import type { ReviewerService } from "./reviewer";

export interface CommercialServices {
  entitlements: EntitlementService;
  subscriptions: SubscriptionService;
  ads: AdService;
  analytics: AnalyticsService;
  reviewer?: ReviewerService;
}
export const CommercialContext = createContext<CommercialServices | null>(null);
const idleSubscribe = () => () => {};
const idleRevision = () => 0;
export function useCommercial() {
  const services = useContext(CommercialContext);
  useSyncExternalStore(services?.entitlements.subscribe ?? idleSubscribe, services?.entitlements.getRevision ?? idleRevision, idleRevision);
  useSyncExternalStore(services?.subscriptions.subscribe ?? idleSubscribe, services?.subscriptions.getRevision ?? idleRevision, idleRevision);
  useSyncExternalStore(services?.ads.subscribe ?? idleSubscribe, services?.ads.getRevision ?? idleRevision, idleRevision);
  useSyncExternalStore(services?.reviewer?.subscribe ?? idleSubscribe, services?.reviewer?.getRevision ?? idleRevision, idleRevision);
  return services;
}
