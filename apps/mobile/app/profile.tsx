import { router } from "expo-router";
import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BackScreen, Title, Label, Card, Copy, Button, s } from "../src/ui";
import { useSession } from "../src/provider";
import { duration } from "../src/format";

export default function Profile() {
  const controller = useSession();
  const records = controller.history();
  const saved = controller.preferences.favoriteProtocolIds?.length ?? 0;
  const total = records.reduce((sum, record) => sum + record.engine.elapsedAtAnchor, 0);
  return (
    <BackScreen title="PROFILE">
      <View style={s.profileIdentity}>
        <View style={s.profileAvatar}><MaterialIcons name="person" size={28} color="#111317" /></View>
        <View><Title>Your practice</Title><Copy style={s.small}>Private on this device</Copy></View>
      </View>
      <Card>
        <Label>YOUR IN/OUT</Label>
        <View style={s.profileStats}>
          <View><Label>SESSIONS</Label><Title>{records.length}</Title></View>
          <View><Label>TIME</Label><Title>{duration(total)}</Title></View>
          <View><Label>SAVED</Label><Title>{saved}</Title></View>
        </View>
      </Card>
      <Card>
        <Label>GUEST PRACTICE</Label>
        <Copy style={s.subtitle}>IN/OUT</Copy>
        <Copy>Your routines and history are available offline on this phone. No account is required.</Copy>
      </Card>
      <Button title="Settings" secondary onPress={() => router.push("/settings")} />
    </BackScreen>
  );
}
