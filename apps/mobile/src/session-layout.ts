/** The viewport is measured below safe areas/header and above the fixed controls.
 * When text needs more room, preserve a useful animation and let content scroll. */
export function sessionAnimationSize(width: number, availableHeight: number, readoutHeight: number) {
  const safeWidth = Math.max(1, width);
  const remaining = Math.max(96, availableHeight - readoutHeight - 12);
  return Math.floor(Math.min(safeWidth, remaining, 420));
}
export const pulseStageFill = 0.96;
