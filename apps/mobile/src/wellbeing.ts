export const emotionalAnchors = [
  { value: 1, emoji: "😣", label: "Very bad" },
  { value: 3, emoji: "😟", label: "Not great" },
  { value: 5, emoji: "😐", label: "Okay" },
  { value: 7, emoji: "🙂", label: "Good" },
  { value: 10, emoji: "😄", label: "Excellent" },
] as const;
export function emotionFor(value: number) {
  return emotionalAnchors.reduce((best, anchor) => Math.abs(anchor.value - value) < Math.abs(best.value - value) ? anchor : best, emotionalAnchors[0] as typeof emotionalAnchors[number]);
}
