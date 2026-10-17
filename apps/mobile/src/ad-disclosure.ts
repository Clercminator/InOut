export const freeAdsDisclosure = {
  title: "About Free ads",
  message: "IN/OUT's free version includes occasional ads that help support ongoing improvements. Thank you for helping us keep breathing exercises accessible. Pro removes ads.",
  dismiss: "Understood",
} as const;

export function shouldShowFreeAdsDisclosure(seen: boolean, adFree: boolean, preview: boolean) {
  return !seen && !adFree && !preview;
}
