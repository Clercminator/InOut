import { createContext, useContext, useSyncExternalStore } from "react";
import { ShareLinksService } from "./share-links";
export const ShareLinksContext = createContext<ShareLinksService | null>(null);
const subscribe = () => () => {}, revision = () => 0;
export function useShareLinks() {
  const service = useContext(ShareLinksContext);
  useSyncExternalStore(service?.subscribe ?? subscribe, service?.getRevision ?? revision, revision);
  return service;
}
