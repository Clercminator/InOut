import type { Preferences } from "@inout/shared-types";
import { audioSettings } from "./audio-preferences";
import { selectedMusicTrack, selectedVoice } from "./approved-audio";
import { breathPreviews } from "./audio-library";
import { experienceFor } from "./experience";

/** One 4/6 sample cycle with the same enable states, language and gains as practice. */
export function selectedAudioSample(preferences: Preferences) {
  const settings = audioSettings(preferences);
  const bank = selectedVoice(preferences);
  const clips: { source: number; volume: number; at: number; loop?: boolean }[] = [];
  if (settings.voice && bank && settings.breathingVoice) {
    [0, 2].forEach((index, i) => {
      const source = bank.cues[index];
      if (source !== undefined) clips.push({ source, volume: settings.voiceVolume, at: i * 4000 });
    });
  }
  if (settings.nature) clips.push({ source: breathPreviews[experienceFor(preferences).breathSound], volume: settings.natureVolume, at: 0, loop: true });
  const track = settings.music && selectedMusicTrack(settings.musicId);
  if (track) clips.push({ source: track.source, volume: settings.musicVolume, at: 0, loop: true });
  return clips;
}
