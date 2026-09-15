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
