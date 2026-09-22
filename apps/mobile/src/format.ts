import { stateShift, type SessionRecord } from "@inout/shared-types";
export function shiftText(record: SessionRecord) {
  const shift = stateShift(record.pre, record.post);
  if (shift === null)
    return record.post === null
      ? "State Shift not recorded"
      : `Tension ${record.post}/10 · no pre-rating`;
  return shift === 0
    ? "Tension unchanged"
    : `Tension ${shift > 0 ? "down" : "up"} ${Math.abs(shift)} ${Math.abs(shift) === 1 ? "point" : "points"}`;
}
export function duration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function practiceDuration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const remainder = seconds % 60;
  return [hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", remainder || !seconds ? `${remainder}s` : ""].filter(Boolean).join(" ");
}
