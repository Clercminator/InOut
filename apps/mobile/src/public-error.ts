// Native/provider exceptions may contain paths, SQL or request details. Only app-owned
// recovery copy may cross the UI boundary.
const messages = new Set([
  "Please choose a JPG, PNG or WebP photo.", "Choose a photo smaller than 12 MB.",
  "Exercise sharing is not available online yet. Please try again later.",
  "Too many links were created recently. Please try again later.",
  "This link has expired or been revoked.", "Sharing is temporarily unavailable. Please try again online.",
  "This exercise link is invalid or unsupported.",
  "High-intensity practices cannot be shared as browser exercises.",
  "This exercise is too large to share. Try a shorter pattern or mix.",
  "Shared links could not be read. Your data has been preserved.",
  "Revoke an existing link before creating another.", "Could not verify the shared link.",
]);
export function publicError(error: unknown, fallback: string) {
  return error instanceof Error && messages.has(error.message) ? error.message : fallback;
}
