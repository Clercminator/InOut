import { Alert } from "react-native";
import { router } from "expo-router";
import type { SavedRoutine } from "@inout/shared-types";
import { useSession, SaveError } from "./provider";
import { BackScreen, Title, Copy, Card, Button } from "./ui";
import { duration } from "./format";
export function RoutineLibrary({ kind }: { kind: SavedRoutine["kind"] }) {
  const controller = useSession();
  const items = controller.routines().filter((item) => item.kind === kind);
  const route = kind === "pattern" ? "/custom-pattern" : "/custom-mix";
  return <BackScreen title={kind === "pattern" ? "SAVED PATTERNS" : "SAVED MIXES"}>
    <Title>{kind === "pattern" ? "Your patterns." : "Your mixes."}</Title>
    <Button title={kind === "pattern" ? "Create Pattern" : "Create Mix"} onPress={() => router.push(route)} />
    <SaveError />
    {!items.length && <Card><Copy>No saved routines yet. Create one to keep it on this phone.</Copy></Card>}
    {items.map((item) => <Card key={item.id}><Title>{item.protocol.name}</Title><Copy>{duration(item.protocol.defaultDuration)} · Saved offline</Copy>
      <Button title={`Start ${item.protocol.name}`} disabled={!!controller.error} onPress={() => { controller.setCustomProtocol(item.protocol); router.push({ pathname: "/pre", params: { id: "custom" } }); }} />
      <Button title="Edit" secondary onPress={() => router.push({ pathname: route, params: { id: item.id } })} />
      <Button title="Duplicate" secondary disabled={!!controller.error} onPress={() => { controller.duplicateRoutine(item); }} />
      <Button title="Delete" danger secondary disabled={!!controller.error} onPress={() => Alert.alert("Delete this routine?", "Existing history and active sessions will remain.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { controller.removeRoutine(item.id); } }])} />
    </Card>)}
  </BackScreen>;
}
