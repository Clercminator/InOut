import { useLanguage } from "../src/use-language";
import { BackScreen, Title, Copy, Card, Label, Button } from "../src/ui";
import { Linking } from "react-native";
import { Alert } from "../src/localized-native";
import content from "../../../release/content.json";
import info from "../../../release/public-info.json";
export default function Privacy() {
  useLanguage();
  return <BackScreen title="PRIVACY"><Title>Your data, your practice.</Title><Copy>Effective {content.updated}</Copy>
    {info.publisherName ? <Copy>Published by {info.publisherName}</Copy> : null}
    {content.privacy.map((section) => <Card key={section.title}><Label>{section.title}</Label><Copy>{section.body}</Copy></Card>)}
    {info.supportEmail ? <Copy>Privacy questions: {info.supportEmail}</Copy> : null}
    <Button title="Online privacy policy" secondary onPress={() => { void Linking.openURL(info.privacyUrl).catch(() => Alert.alert("Website unavailable", `Contact ${info.supportEmail}.`)); }} />
  </BackScreen>;
}
