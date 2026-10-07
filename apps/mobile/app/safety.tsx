import { useLanguage } from "../src/use-language";
import { BackScreen, Title, Copy, Card, Label } from "../src/ui";
import content from "../../../release/content.json";
import { CyclicSafety } from "../src/cyclic-content";
export default function Safety() {
  useLanguage();
  return <BackScreen title="SAFETY"><Title>Breathe comfortably.</Title>{content.safety.map((section) => <Card key={section.title}><Label>{section.title}</Label><Copy>{section.body}</Copy></Card>)}<Card><CyclicSafety /></Card></BackScreen>;
}
