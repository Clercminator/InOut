import { BackScreen, Title, Copy, Card, Label } from "../src/ui";
import content from "../../../release/content.json";
import info from "../../../release/public-info.json";
export default function Privacy() {
  return <BackScreen title="PRIVACY"><Title>Your data, your practice.</Title><Copy>Effective {content.updated}</Copy>
    {info.publisherName ? <Copy>Published by {info.publisherName}</Copy> : null}
    {content.privacy.map((section) => <Card key={section.title}><Label>{section.title}</Label><Copy>{section.body}</Copy></Card>)}
    {info.supportEmail ? <Copy>Privacy questions: {info.supportEmail}</Copy> : null}
  </BackScreen>;
}
