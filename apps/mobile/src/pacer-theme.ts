import type { SessionRecord } from "@inout/shared-types";

export type PacerThemeId =
  | "default"
  | "dark-muted"
  | "sky"
  | "neon"
  | "mono"
  | "mustard"
  | "light"
  | "ember"
  | "aurora"
  | "matcha";

export const pacerThemes = [
  { id: "default", name: "Pulse Default", unlockDays: 0, preview: { background: "#1A1228", surface: "#1A1228", ring: "#7B5CFF", glow: "#8A7BFF", text: "#FFFFFF", secondaryText: "#E2D6F5" } },
  { id: "dark-muted", name: "Dark Muted", unlockDays: 0, preview: { background: "#111317", surface: "#121A1F", ring: "#6FB8D2", glow: "#6FB8D2", text: "#F4F8FA", secondaryText: "#C3D0D6" } },
  { id: "light", name: "Light", unlockDays: 0, preview: { background: "#F4F5F7", surface: "#F4F5F7", ring: "#3B6F9E", glow: "#7AA6D2", text: "#142332", secondaryText: "#344B5E" } },
  { id: "sky", name: "Sky", unlockDays: 3, preview: { background: "#0D2437", surface: "#123B5A", ring: "#A4D7FF", glow: "#A4D7FF", text: "#F4FAFF", secondaryText: "#C7E3F8" } },
  { id: "mono", name: "Mono", unlockDays: 5, preview: { background: "#121212", surface: "#121212", ring: "#F5F5F5", glow: "#F5F5F5", text: "#FFFFFF", secondaryText: "#D0D0D0" } },
  { id: "mustard", name: "Mustard", unlockDays: 7, preview: { background: "#1D160E", surface: "#3B2B10", ring: "#F7C464", glow: "#F7C464", text: "#FFF9EC", secondaryText: "#F2D9A6" } },
  { id: "neon", name: "Neon", unlockDays: 14, preview: { background: "#170E27", surface: "#230F25", ring: "#FF9AE4", glow: "#FF9AE4", text: "#FFF5FC", secondaryText: "#F5CBE8" } },
  { id: "ember", name: "Ember", unlockDays: 21, preview: { background: "#191112", surface: "#2E1516", ring: "#FF9A7C", glow: "#FF9A7C", text: "#FFF6F2", secondaryText: "#F0C8BD" } },
  { id: "aurora", name: "Aurora", unlockDays: 30, preview: { background: "#071B1B", surface: "#0E2E2B", ring: "#7EE4D0", glow: "#7EE4D0", text: "#F1FFFC", secondaryText: "#BFEAE2" } },
  { id: "matcha", name: "Matcha", unlockDays: 45, preview: { background: "#1D2A1B", surface: "#2D3B25", ring: "#BBE9A3", glow: "#BBE9A3", text: "#F7FFF2", secondaryText: "#D4E8C9" } },
] as const;

export interface PacerThemeProgress {
  practiceDays: number;
  earnedThemeIds: PacerThemeId[];
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function validDateKey(value: string) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isPacerThemeId(value: unknown): value is PacerThemeId {
  return pacerThemes.some(theme => theme.id === value);
}

export function practiceDateForPacerTheme(record: SessionRecord, now = Date.now()): string | null {
  if (record.stage !== "result" || record.endReason !== "completed" || record.source === "manual" ||
      record.engine.status !== "completed" || !Number.isFinite(record.engine.elapsedAtAnchor) ||
      record.engine.elapsedAtAnchor <= 0 || !Number.isFinite(record.engine.startedAt) ||
      !Number.isFinite(record.finishedAt) || record.finishedAt === null ||
      record.finishedAt <= record.engine.startedAt || record.finishedAt > now) return null;

  const recordedDay = record.completionLocalDay;
  if (typeof recordedDay === "string" && validDateKey(recordedDay)) return recordedDay;
  return localDayKey(new Date(record.finishedAt));
}

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function qualifyingPacerPracticeDays(records: readonly SessionRecord[], now = Date.now()): string[] {
  return [...new Set(records.map(record => practiceDateForPacerTheme(record, now)).filter((day): day is string => day !== null))].sort();
}

export function earnedPacerThemeIds(
  practiceDays: number,
  previouslyEarned: readonly PacerThemeId[] = [],
): PacerThemeId[] {
  const earned = new Set<PacerThemeId>(previouslyEarned);
  for (const theme of pacerThemes) {
    if (theme.unlockDays > 0 && practiceDays >= theme.unlockDays) earned.add(theme.id);
  }
  return pacerThemes.filter(theme => earned.has(theme.id)).map(theme => theme.id);
}

export function resolvePacerTheme(themeId?: PacerThemeId | null) {
  return pacerThemes.find(theme => theme.id === (themeId ?? "default")) ?? pacerThemes[0];
}
