import type { Protocol } from "@inout/shared-types";
import { t, type Language, getLanguage } from "./i18n";

// Mobile discovery context; preset identities, timings and history remain unchanged.
export const athleteSearchTerms: Readonly<Record<string, string>> = {
  "runner-rhythm": "before exercise before running pre workout runner gym BJJ martial arts antes de entrenar antes de correr antes do treino corrida academia artes marciales artes marciais",
  athletic: "before exercise pre training gym BJJ martial arts antes de entrenar gimnasio artes marciales antes do treino academia artes marciais",
  "post-workout-reset": "after exercise after running post workout BJJ gym cooldown después de entrenar después de correr gimnasio recuperación após treino depois de correr academia recuperação",
  diaphragmatic: "recovery day dia de recuperacion día de descanso dia de recuperação",
};

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
  const seen = new Set<string>();
  return protocols.filter(protocol => {
    if (seen.has(protocol.id)) return false;
    seen.add(protocol.id); return true;
  }).map((protocol, order) => {
    const assigned = protocolTags(protocol);
    if (tags.length && !tags.some(tag => assigned.includes(tag))) return null;
    const title = normalizeSearch(t(protocol.name, language));
    const purpose = normalizeSearch(t(protocol.purpose ?? "", language));
    const description = normalizeSearch(t(protocol.description ?? "", language));
    const synonyms = normalizeSearch([
      protocol.name, ...(protocol.searchTerms ?? []), athleteSearchTerms[protocol.id] ?? "",
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

export const categories = ["Balance", "Calm & Unwind", "Energy & Focus", "Performance & Preparation", "Advanced"] as const;
export const categoryFor = (id: string) => ({
  "sleep-wind-down": "Calm & Unwind",
  "post-workout-reset": "Performance & Preparation",
  "intimacy-calm": "Calm & Unwind",
  coherent: "Balance",
  box: "Balance",
  "meditation-breathing": "Calm & Unwind",
  "traditional-yogic": "Calm & Unwind",
  equal: "Balance",
  "box-2": "Balance",
  "extended-exhale": "Calm & Unwind",
  "4-7-8": "Calm & Unwind",
  "three-stage-breath": "Calm & Unwind",
  "runner-rhythm": "Energy & Focus",
  "high-intensity-cyclic": "Advanced",
  athletic: "Performance & Preparation",
  endurance: "Performance & Preparation",
  swimmer: "Performance & Preparation",
  measured: "Energy & Focus",
  diaphragmatic: "Calm & Unwind",
  "physiological-sigh": "Calm & Unwind",
  "nadi-shodhana": "Energy & Focus",
  bhramari: "Calm & Unwind",
  "high-intensity-cyclic-alt": "Advanced",
})[id] ?? "Balance";


export function discoverProtocols(protocols: readonly Protocol[], options: {
  query: string; category: string | null; tags: readonly IntentTag[]; saved: boolean;
  isFavorite: (id: string) => boolean;
}, language: Language = getLanguage()) {
  return searchProtocols(protocols.filter(p => p.availability === "enabled" &&
    (!options.saved || options.isFavorite(p.id)) && (!options.category || categoryFor(p.id) === options.category)),
    options.query, options.tags, language);
}

export function discoveryFacets(protocols: readonly Protocol[], options: Parameters<typeof discoverProtocols>[1], language: Language = getLanguage()) {
  const base = searchProtocols(protocols.filter(p => p.availability === "enabled" && (!options.saved || options.isFavorite(p.id))), options.query, [], language);
  const categoryCounts = Object.fromEntries(categories.map(category => [category, base.filter(p => categoryFor(p.id) === category && (!options.tags.length || options.tags.some(tag => protocolTags(p).includes(tag)))).length]));
  const purposeBase = base.filter(p => !options.category || categoryFor(p.id) === options.category);
  const purposeCounts = Object.fromEntries((Object.keys(intentTags) as IntentTag[]).map(tag => [tag, purposeBase.filter(p => protocolTags(p).includes(tag)).length])) as Record<IntentTag, number>;
  return { categories: categoryCounts, purposes: purposeCounts };
}

export function reconcileDiscoveryFilters(protocols: readonly Protocol[], options: Parameters<typeof discoverProtocols>[1]) {
  const base = discoverProtocols(protocols, { ...options, category: null, tags: [] });
  // Keep a legitimate empty text search; changing the query should not erase choices.
  if (!base.length && options.query.trim()) return { category: options.category, tags: [...options.tags] };
  const category = base.some(p => categoryFor(p.id) === options.category) ? options.category : null;
  const candidates = base.filter(p => !category || categoryFor(p.id) === category);
  return { category, tags: options.tags.filter(tag => candidates.some(p => protocolTags(p).includes(tag))) };
}
