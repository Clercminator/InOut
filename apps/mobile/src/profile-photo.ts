import { Directory, File, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
const directory = () => new Directory(Paths.document, "profile-photos");
export function photoUri(name?: string) { return name ? new File(directory(), name).uri : undefined; }
export async function chooseProfilePhoto() {
  const picker = await import("expo-image-picker");
  const result = await picker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8, exif: false });
  if (result.canceled || !result.assets[0]) return null;
  const original = new File(result.assets[0].uri);
  const extension = original.extension.toLowerCase().replace(".", "");
  if (!["jpg", "jpeg", "png", "webp"].includes(extension)) throw new Error("Please choose a JPG, PNG or WebP photo.");
  if (original.size > 12 * 1024 * 1024) throw new Error("Choose a photo smaller than 12 MB.");
  const name = `profile-${randomUUID()}.${extension}`;
  directory().create({ intermediates: true, idempotent: true });
  original.copy(new File(directory(), name));
  return name;
}
export function removeProfilePhoto(name?: string) {
  if (!name || !/^profile-[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/.test(name)) return;
  const file = new File(directory(), name);
  if (file.exists) file.delete();
}
export function clearProfilePhotos() { const dir = directory(); if (dir.exists) dir.delete(); }
