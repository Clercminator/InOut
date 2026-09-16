import { BackScreen, Title, Copy, Card, Label } from "../src/ui";
import content from "../../../release/content.json";
export default function Safety() {
  return <BackScreen title="SAFETY"><Title>Breathe comfortably.</Title>{content.safety.map((section) => <Card key={section.title}><Label>{section.title}</Label><Copy>{section.body}</Copy></Card>)}</BackScreen>;
}
