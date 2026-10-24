/** Curated copy; achievement messages are only selected for persisted earned events. */
export const notificationContent = {
  "motivation": [
    "A small pause can make room for what matters.",
    "Take a moment for yourself when it fits.",
    "A gentle breath is enough to begin.",
    "Your practice is here whenever you are ready.",
    "You can begin again with a short practice."
  ],
  "relaxation": [
    "Unclench your jaw and take a comfortable breath.",
    "Make room for a quiet breathing pause.",
    "Let your shoulders rest for a moment.",
    "There is no pace to beat. Breathe comfortably.",
    "Pause and notice one easy breath."
  ],
  "focus": [
    "Before your next task, take a breathing break.",
    "Step away from the screen for a quiet moment.",
    "One task at a time. A pause can fit between them.",
    "Try a comfortable rhythm before returning to work.",
    "Give your next study break a moment of breathing."
  ],
  "sleep": [
    "Make a little space to unwind this evening.",
    "A gentle practice can be part of your bedtime routine.",
    "Put the day on pause with a comfortable breath.",
    "Ready to wind down? Keep each breath easy.",
    "Your evening pause does not need to be long."
  ],
  "recovery": [
    "After movement, settle somewhere safe before practicing.",
    "Rest is also part of making time for yourself.",
    "After exercise, wait until breathing feels comfortable.",
    "Choose an easy practice when you are ready to rest.",
    "Let your next rest break include a natural breath."
  ],
  "habit": [
    "A brief practice can have a place in your day.",
    "Choose a moment that works for you today.",
    "Returning matters more than doing it perfectly.",
    "Your next practice can start small.",
    "Take a look at your practice history when you have a moment."
  ],
  "followup": [
    "Did you make time to breathe today? Log it if you did.",
    "Practiced away from the app? You can add it to your history.",
    "Want to record a breathing practice from today?",
    "Your practice log is here if you need it.",
    "A practice outside the app can be logged too."
  ],
  "achievement": [
    "You earned a practice milestone. See it in your progress.",
    "A new practice milestone is saved on your phone.",
    "Your latest practice milestone is ready to view.",
    "Take a moment to see the milestone you earned.",
    "Your progress includes a newly earned milestone."
  ]
} as const;
export type NotificationContentCategory = keyof typeof notificationContent;
export function notificationCopy(categories: readonly NotificationContentCategory[], date: Date, rotation?: number) {
  const pool = categories.flatMap(category => [...notificationContent[category]]);
  const day = rotation ?? Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  // A calendar key keeps rotation stable across restart/reconciliation and DST.
  return pool[((day % pool.length) + pool.length) % pool.length];
}
