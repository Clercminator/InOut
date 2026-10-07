import { useLocalSearchParams, router } from "expo-router";
import { sharedProtocol } from "@inout/sharing";
import { resolveSharedLink } from "../../../packages/sharing/src/client";
import sharingConfig from "../../../release/sharing.json";
import { BackScreen, Button, Copy, Title } from "../src/ui";
import { useSession } from "../src/provider";
import { practiceDuration } from "../src/format";
import { useEffect, useState } from "react";
import type { Protocol } from "@inout/shared-types";
export default function SharedPractice() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const controller = useSession();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setProtocol(null); setError("");
    void resolveSharedLink(sharingConfig.apiUrl, typeof id === "string" ? id : "").then(value => { if (active) setProtocol(sharedProtocol(value)); }).catch(error => { if (active) setError(error instanceof Error ? error.message : "Sharing unavailable"); });
    return () => { active = false; };
  }, [id, attempt]);
  if (!protocol) return <BackScreen title="SHARED EXERCISE"><Title>{error || "Loading exercise…"}</Title>
    {!!error && <Button title="Retry" onPress={() => setAttempt(n => n + 1)} />}
    <Button title="Browse protocols" secondary onPress={() => router.replace("/(tabs)/protocols")} /></BackScreen>;
  const selected = protocol;
  return <BackScreen title="SHARED EXERCISE"><Title>Shared breathing practice</Title><Copy>{practiceDuration(selected.defaultDuration)}</Copy>
    <Copy>This cadence was shared by another person. Keep breaths comfortable and stop if unwell.</Copy>
    <Button title="Review & start" onPress={() => { controller.setCustomProtocol(selected); router.replace({ pathname: "/pre", params: { id: "custom" } }); }} />
  </BackScreen>;
}
