import { Card, Copy, Label } from "./ui";

export function CyclicOverview({ compact = false }: { compact?: boolean }) {
  return <Card>
    <Label>{compact ? "Cyclic hyperventilation with retention" : "ABOUT THIS PRACTICE"}</Label>
    {!compact && <Copy>An intense sequence of repeated deep breaths and optional retention. Start with a gentle protocol if you are new to breathing practice.</Copy>}
    <Copy>Each round: 30 deep, unforced breaths, an optional hold after exhaling, one recovery inhale with a brief hold, then natural breathing. Choose 1–3 rounds.</Copy>
    <Copy>Retention is capped at 60 seconds and the recovery hold at 15 seconds. These are limits, not targets: breathe as soon as you need to. End either hold with the on-screen button.</Copy>
  </Card>;
}

export function CyclicSafety() {
  return <>
    <Label>HIGH-INTENSITY BREATHING</Label>
    <Copy>This practice can cause dizziness or fainting. Stay seated or lying down in a safe place. Never practice in or near water, while driving, standing, or operating machinery. Do not combine it with cold exposure.</Copy>
    <Copy>Do not practice during pregnancy or with epilepsy. If you have a heart or blood-pressure condition, a history of fainting or stroke, recent surgery, panic attacks, or another significant medical condition, seek medical guidance first.</Copy>
    <Copy>Never force a breath or hold. Stop and breathe naturally if you feel dizzy, faint, anxious or unwell. Longer holds are not better.</Copy>
  </>;
}
