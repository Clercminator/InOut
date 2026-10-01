import { useState } from "react";
import { Share } from "react-native";
import { router } from "expo-router";
import type { Protocol } from "@inout/shared-types";
import { includesHighIntensity } from "@inout/protocols";
import { shareSnapshot } from "@inout/sharing";
import { Button, Copy } from "./ui";
import { useSession } from "./provider";
import { t, getLanguage } from "./i18n";
import info from "../../../release/public-info.json";
import linkConfig from "../../../release/links.json";
import { useShareLinks } from "./share-links-context";
import sharingConfig from "../../../release/sharing.json";
const shareBase = () => linkConfig.origin ? new URL(linkConfig.path, linkConfig.origin).href : new URL("reset.html", info.privacyUrl).href;
export const shareUrl = (id: string) => `${shareBase()}?s=${id}&lang=${getLanguage()}`;
export function ShareExercise({ protocol }: { protocol: Protocol }) {
  const controller = useSession();
  const links = useShareLinks();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (includesHighIntensity(protocol)) return null;
  return <>
    <Button title="Share this exercise" secondary disabled={busy || links?.busy} onPress={() => {
      setBusy(true); setError("");
      void (async () => {
        if (!sharingConfig.apiUrl || !links) throw new Error("Exercise sharing is not available online yet. Please try again later.");
        const base = shareBase();
        const abort = new AbortController();
        const timeout = setTimeout(() => abort.abort(), 8000);
        try {
          const page = await fetch(base, { signal: abort.signal });
          if (!page.ok || !(await page.text()).includes('id="guide"')) throw new Error();
        } catch { throw new Error("Exercise sharing is not available online yet. Please try again later."); }
        finally { clearTimeout(timeout); }
        const link = await links.create(shareSnapshot(protocol), protocol.name);
        if (!link) throw new Error(links.message || "Could not create the link. Try again.");
        const result = await Share.share({ message: `${t("Try this breathing practice in your browser.")}\n${shareUrl(link.id)}` });
        if (result.action === Share.sharedAction) controller.analytics.track("share_created");
      })().catch(error => setError(error instanceof Error ? error.message : "Sharing unavailable")).finally(() => setBusy(false));
    }} />
    <Copy>Only the breathing cadence is uploaded. Names, ratings and notes stay private. Links expire after 30 days and can be revoked from Shared links.</Copy>
    <Button title="Manage shared links" secondary onPress={() => router.push("/shared-links")} />
    {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
  </>;
}
