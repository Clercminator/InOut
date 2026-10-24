export type SwipeDirection = "left" | "right";
export const mainTabs = ["progress", "index", "challenges"] as const;
export function adjacentTab(name: string, direction: SwipeDirection) {
  const index = mainTabs.findIndex(tab => tab === name);
  return index < 0 ? undefined : mainTabs[index + (direction === "left" ? 1 : -1)];
}

/** Lock intent early: a vertical drag must never become navigation later. */
export class SwipeIntent {
  axis: "horizontal" | "vertical" | null = null;
  update(dx: number, dy: number, touches: number) {
    if (touches > 1) this.axis = "vertical";
    if (!this.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 12)
      this.axis = Math.abs(dx) > Math.abs(dy) * 1.8 ? "horizontal" : "vertical";
    return this.axis === "horizontal";
  }
  direction(dx: number, dy: number): SwipeDirection | undefined {
    return this.axis === "horizontal" && Math.abs(dx) >= 64 && Math.abs(dx) > Math.abs(dy) * 1.8
      ? dx < 0 ? "left" : "right" : undefined;
  }
}
