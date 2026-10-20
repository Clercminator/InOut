import type { Protocol } from "@inout/shared-types";
import { t, type Language, getLanguage } from "./i18n";

export const intentTags = {
  sleep: { label: "Sleep", terms: "sleep sleeping bedtime insomnia insomnio insônia dormindo dormir sueño sueno sono noite noche" },
  stress: { label: "Stress", terms: "stress anxiety calm relaxation nervousness nervios nervosismo relajacion relaxamento estrés ansiedad estresse ansiedade tension tensión" },
  fitness: { label: "Fitness", terms: "gym workout running runners gimnasio correr treino corrida academia deporte exercício" },
  recovery: { label: "Recovery", terms: "recovery rest cooldown cool down recuperación descanso recuperação post workout" },
  focus: { label: "Focus", terms: "focus concentration studying meditation mindfulness meditación meditação atención atenção study trabajo concentración foco concentração estudiar estudar" },
  energy: { label: "Energy", terms: "energy concentration studying energía morning fatigue energía mañana manhã energia cansancio" },
  intimacy: { label: "Intimacy", terms: "sex intimacy confidence performance anxiety sexo sexual intimidad intimidade confianza confiança ansiedade desempenho ansiedad rendimiento" },
  wellness: { label: "General wellness", terms: "breathing relax wellness breathing basics respiración respiração bienestar bem estar" },
} as const;
export type IntentTag = keyof typeof intentTags;
export function protocolTags(p: Protocol): IntentTag[] {
  if (p.id === "intimacy-calm") return ["intimacy", "stress", "wellness"];
  if (p.id === "post-workout-reset") return ["fitness", "recovery", "wellness"];
  const tags = new Set<IntentTag>(["wellness"]);
  const goals = { Calm: "stress", Sleep: "sleep", Focus: "focus", Recover: "recovery", Perform: "fitness", Energize: "energy" } as const;
  p.goalTags.forEach(goal => tags.add(goals[goal]));
  if (p.id === "runner-rhythm") tags.add("fitness");
  return [...tags];
}
export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function searchProtocols(protocols: readonly Protocol[], query: string, tags: readonly IntentTag[] = [], language: Language = getLanguage()) {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return protocols.map((protocol, order) => {
    const assigned = protocolTags(protocol);
    if (tags.length && !tags.every(tag => assigned.includes(tag))) return null;
    const title = normalizeSearch(t(protocol.name, language));
    const purpose = normalizeSearch(t(protocol.purpose ?? "", language));
    const description = normalizeSearch(t(protocol.description ?? "", language));
    const synonyms = normalizeSearch([
      protocol.name, ...(protocol.searchTerms ?? []),
      ...assigned.map(tag => `${t(intentTags[tag].label, language)} ${intentTags[tag].terms}`),
      // A comfortable pause after meals is context, not a digestive treatment.
      ...(["diaphragmatic", "coherent"].includes(protocol.id) ? ["after meals digestion después comer digestión após refeições digestão"] : []),
    ].join(" "));
    let score = title === normalizeSearch(query) && tokens.length ? 100 : 0;
    for (const token of tokens) {
      const value = title.split(" ").includes(token) ? 20 : title.includes(token) ? 12 :
        purpose.includes(token) ? 8 : synonyms.split(" ").includes(token) ? 6 : synonyms.includes(token) ? 4 : description.includes(token) ? 2 : 0;
      if (!value) return null;
      score += value;
    }
    return { protocol, score, order };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.score - a.score || a.order - b.order).map(entry => entry.protocol);
}
