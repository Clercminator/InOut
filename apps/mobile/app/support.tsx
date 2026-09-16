import { Alert, Linking } from "react-native";
import Constants from "expo-constants";
import { BackScreen, Title, Copy, Card, Label, Button } from "../src/ui";
import content from "../../../release/content.json";
import info from "../../../release/public-info.json";
export default function Support() {
  const email = () => void Linking.openURL(`mailto:${info.supportEmail}?subject=${encodeURIComponent("IN/OUT support")}&body=${encodeURIComponent(`App version: ${Constants.expoConfig?.version ?? "unknown"}\n\nDescribe the issue (please omit medical information):\n`)}`).catch(() => Alert.alert("Email unavailable", `You can contact ${info.supportEmail} from your email app.`));
  return <BackScreen title="HELP & SUPPORT"><Title>Here to help.</Title>{content.support.map((section) => <Card key={section.title}><Label>{section.title}</Label><Copy>{section.body}</Copy></Card>)}
    {info.supportEmail ? <><Copy>Contact {info.supportEmail}. Your session history is not attached automatically.</Copy><Button title="Email support" onPress={email} /></> : null}
  </BackScreen>;
}
