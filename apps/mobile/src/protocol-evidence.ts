import { protocols, includesHighIntensity } from "@inout/protocols";
import type { Protocol } from "@inout/shared-types";

export interface EvidenceReference {
  id: string;
  title: string;
  authors: string;
  year: number;
  doi: string;
  url: string;
  classification: "Systematic review" | "Small physiological study" | "Randomized trial" | "Clinical guideline";
  supportedClaim: string;
  protocolIds: string[];
  limitations: string;
}
const slowProtocols = protocols.filter(p => !includesHighIntensity(p) && p.phases.every(phase => phase.type !== "inhaleTopUp") &&
  p.phases.reduce((sum, phase) => sum + phase.durationMs, 0) > 6000).map(p => p.id);
export const evidenceReferences: EvidenceReference[] = [
  {
    id: "zaccaro-2018", title: "How Breath-Control Can Change Your Life: A Systematic Review on Psycho-Physiological Correlates of Slow Breathing",
    authors: "Zaccaro A, Piarulli A, Laurino M, Garbella E, Menicucci D, Neri B, Gemignani A", year: 2018,
    doi: "10.3389/fnhum.2018.00353", url: "https://doi.org/10.3389/fnhum.2018.00353", classification: "Systematic review",
    supportedClaim: "Slow breathing research links changes in heart-rate variability and breathing rhythms with relaxation in healthy adults.",
    protocolIds: slowProtocols,
    limitations: "General slow-breathing evidence does not validate every exact cadence, breath hold or promised health outcome.",
  },
  {
    id: "eide-2026", title: "Slow breathing techniques before bedtime and the effects on sleep: A systematic review",
    authors: "Eide EM, Hernes HM, Grønli J", year: 2026, doi: "10.1016/j.smrv.2026.102284",
    url: "https://pubmed.ncbi.nlm.nih.gov/41886931/", classification: "Systematic review",
    supportedClaim: "Studies of slow breathing before bed suggest improvements in self-reported sleep quality and duration.",
    protocolIds: ["sleep-wind-down", "4-7-8", "meditation-breathing"],
    limitations: "Objective sleep findings remain inconclusive. This exact cadence is not an established treatment for insomnia.",
  },
  {
    id: "sugimoto-2025", title: "Effects of consciously controlled slow breathing on cardiac parasympathetic nervous activity postexercise in young healthy males",
    authors: "Sugimoto T, Sugiyama K, Matsumura K, Michiue K, Ono K, Ishikawa A", year: 2025,
    doi: "10.1111/cpf.70007", url: "https://pubmed.ncbi.nlm.nih.gov/40079612/", classification: "Small physiological study",
    supportedClaim: "A study of 15 young men found changes in some autonomic measures with six breaths per minute after moderate exercise.",
    protocolIds: ["post-workout-reset"],
    limitations: "Heart rate and high-frequency HRV did not differ. Short-term physiological changes do not establish faster athletic or injury recovery.",
  },
  {
    id: "raidl-2026", title: "No Evidence for the Efficacy of Slow-Paced Breathing as a Recovery Strategy After Sprint Interval Training",
    authors: "Raidl P, Wessner B, Laister S, Csapo R", year: 2026,
    doi: "10.1123/ijspp.2025-0138", url: "https://pubmed.ncbi.nlm.nih.gov/41569822/", classification: "Randomized trial",
    supportedClaim: "A four-week trial with 34 participants found no added performance or physiological recovery benefit from slow breathing after sprint training.",
    protocolIds: ["post-workout-reset"],
    limitations: "Results concern this training context. Recovery benefits should not be promised.",
  },
  {
    id: "aua-smsna-2022", title: "Disorders of Ejaculation: An AUA/SMSNA Guideline",
    authors: "Shindel AW, Althof SE, Carrier S, Chou R, McMahon CG, Mulhall JP, Paduch DA, Pastuszak AW, Rowland D, Tapscott AH, Sharlip ID",
    year: 2022, doi: "10.1097/JU.0000000000002392", url: "https://pubmed.ncbi.nlm.nih.gov/34961344/", classification: "Clinical guideline",
    supportedClaim: "Persistent or distressing sexual difficulties warrant professional assessment.",
    protocolIds: ["intimacy-calm"],
    limitations: "Clinical background only. This guideline does not establish benefit from our breathing pattern or breathing alone for premature ejaculation.",
  },
];
export function evidenceFor(protocol: Protocol) {
  const references = evidenceReferences.filter(ref => ref.protocolIds.includes(protocol.id));
  return {
    explanation: includesHighIntensity(protocol)
      ? "Rapid breathing and retention alter carbon dioxide levels and can cause dizziness or fainting. Slow-breathing findings should not be applied to this practice."
      : "Breathing and heart rhythm interact. Slower, comfortable breaths can provide a steady focus and may help you settle.",
    rationale: protocol.purpose ?? (protocol.animationType === "box" ? "Equal phases provide a repeatable attention cue. Keep holds comfortable."
      : "This cadence provides a simple structure for attention. Comfort takes priority over matching the timer."),
    limitation: "This is a general wellness practice, not medical treatment. Evidence for this exact pattern and purpose may be limited.",
    references,
  };
}


export type ProtocolPresentation =
  | { category: "Research-supported"; purpose: string; rationale: string; source: EvidenceReference }
  | { category: "Expert-recommended"; purpose: string; recommendation: string; attribution: string; url: string }
  | { category: "General wellness"; purpose: string; instructions: string; feeling: string };
// No verified expert attribution has been supplied for the current catalog.
const verifiedRecommendations: Readonly<Record<string, { recommendation: string; attribution: string; url: string }>> = {};
export function presentationFor(protocol: Protocol): ProtocolPresentation {
  const purpose = protocol.purpose ?? protocol.description ?? protocol.name;
  const expert = verifiedRecommendations[protocol.id];
  if (expert) return { category: "Expert-recommended", purpose, ...expert };
  const source = evidenceFor(protocol).references.find(ref => ref.id === "zaccaro-2018");
  if (source && !["intimacy-calm", "post-workout-reset"].includes(protocol.id) &&
      protocol.phases.every(phase => ["inhale", "exhale"].includes(phase.type)))
    return { category: "Research-supported", purpose: "Slow, comfortable breathing may help you settle and relax.", rationale: evidenceFor(protocol).explanation, source };
  return { category: "General wellness", purpose, instructions: protocol.instructions ?? "Follow the guide without forcing your breath.",
    feeling: "Aim for a comfortable rhythm and an unhurried moment of attention." };
}
