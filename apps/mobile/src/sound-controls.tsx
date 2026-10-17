import { audioSettings } from "./audio-preferences";
import { selectedMusicTrack, selectedVoice, voiceBanks, musicTracks } from "./approved-audio";
import { Switch } from "./localized-native";
import type { Preferences } from "@inout/shared-types";
import { useLanguage } from "./use-language";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { createAudioPreview } from "./preview-audio";
import { useSession } from "./provider";
import { experienceFor } from "./experience";
import { breathPreviews, chimes } from "./audio-library";
import { Button, Chip, Copy, Label, useStyles } from "./ui";
import { startHapticPacer } from "./haptic-pacer";
import { emitBreathHaptic, hapticOffsets } from "./breath-haptics";
import { protocols } from "@inout/protocols";

export function SoundControls({ compact = false }: { compact?: boolean }) {
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const e = experienceFor(controller.preferences);
  const settings = audioSettings(controller.preferences);
  const bank = selectedVoice(controller.preferences);
  const language = settings.language;
  const update = (patch: NonNullable<Preferences["guidance"]>) => {
    stop();
    const guidance = { ...settings, ...patch };
    controller.setPreferences({ ...controller.preferences, guidance,
      audio: guidance.voice ? "voice" : guidance.nature || guidance.music ? "tones" : "silent" });
    if (["voice", "nature", "music"].some(key => key in patch)) controller.analytics.track("audio_mode_selected");
  };
  const toggle = (title: string, value: boolean, onValueChange: (value: boolean) => void) => <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><Copy style={{ flex: 1 }}>{title}</Copy><Switch accessibilityLabel={title} value={value} onValueChange={onValueChange} /></View>;
  const volume = (title: string, key: "voiceVolume" | "natureVolume" | "musicVolume") => <><Label>{title}</Label><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[0, 0.25, 0.5, 0.7, 1].map(value => <Chip key={value} title={`${Math.round(value * 100)}%`} selected={settings[key] === value} onPress={() => update({ [key]: value })} />)}</View></>;
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const audioPreview = useRef<ReturnType<typeof createAudioPreview> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const generation = useRef(0);
  const stopHaptics = useRef<(() => void) | null>(null);
  const stop = useCallback(() => {
    generation.current++;
    stopHaptics.current?.(); stopHaptics.current = null;
    timers.current.forEach(clearTimeout); timers.current = [];
    audioPreview.current?.stop(); audioPreview.current = null;
    setPlaying(false);
  }, []);
  useFocusEffect(useCallback(() => stop, [stop]));
  useEffect(() => { const sub = AppState.addEventListener("change", state => { if (state !== "active") stop(); }); return () => sub.remove(); }, [stop]);
  useEffect(() => stop, [language, stop]);
  useEffect(() => { if (controller.current?.stage === "active") stop(); }, [controller.current?.stage, stop]);
  const preview = async (kind: "breath" | "chime" | "voice" | "music") => {
    stop(); setError("");
    if (controller.current?.stage === "active") return;
    const token = generation.current;
    setPlaying(true);
    const preview = createAudioPreview(() => {
      if (token === generation.current) { stop(); setError("Sound preview unavailable. Check media volume and silent mode, then try again."); }
    }, () => { if (token === generation.current) stop(); });
    audioPreview.current = preview;
    const track = selectedMusicTrack(settings.musicId);
    const clips: { source: number; volume: number; at: number }[] = [];
    if (kind === "breath") clips.push({ source: breathPreviews[e.breathSound], volume: settings.natureVolume, at: 0 });
    if (kind === "chime") clips.push({ source: chimes[e.chime === "off" ? "bell" : e.chime], volume: e.celebrationVolume, at: 0 });
    if (kind === "music" && track) clips.push({ source: track.source, volume: settings.musicVolume, at: 0 });
    if (kind === "voice" && bank) [0, 2].forEach((index, i) => {
      const source = bank.cues[index];
      if (source !== undefined) clips.push({ source, volume: settings.voiceVolume, at: i * 3000 });
    });
    if (!clips.length) { stop(); return; }
    await preview.start(clips, kind === "chime" ? 2200 : kind === "music" ? 15000 : 6200);
  };
  const previewTouch = () => {
    stop(); setError("");
    if (controller.current?.stage === "active" || !controller.preferences.haptics) return;
    if (Platform.OS !== "android" && Platform.OS !== "ios") { setError("Vibration preview is available on supported phones only."); return; }
    const token = generation.current;
    const started = performance.now();
    let hapticInFlight = false;
    const phases = protocols.find(p => p.id === "box")!.phases.map((phase, i) => ({ ...phase, durationMs: i % 2 ? 1000 : 2000 }));
    setPlaying(true);
    stopHaptics.current = startHapticPacer(() => {
      let elapsed = performance.now() - started;
      if (elapsed >= 6000 || AppState.currentState !== "active" || controller.current?.stage === "active") return null;
      let index = 0;
      while (elapsed >= phases[index].durationMs) { elapsed -= phases[index].durationMs; index++; }
      const phase = phases[index];
      return { key: `preview:${index}`, elapsedMs: elapsed, remainingMs: phase.durationMs - elapsed,
        intervalMs: 1000, offsetsMs: hapticOffsets(phase, controller.preferences.hapticMode),
        style: phase.type === "inhale" ? "light" : phase.type === "exhale" ? "soft" : null };
    }, style => { if (hapticInFlight) return; hapticInFlight = true; void emitBreathHaptic(style).catch(() => {
      if (token === generation.current) { stop(); setError("Vibration unavailable. Check system touch feedback and battery settings."); }
    }).finally(() => { hapticInFlight = false; }); });
    timers.current.push(setTimeout(stop, 6000));
  };
  return <View style={{ gap: 12 }}>
    <Label>GUIDED VOICE</Label>
    {toggle("Guided voice", settings.voice, voice => update({ voice }))}
    {settings.voice && <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["en", "es", "pt"] as const).map(language => <Chip key={language} title={{ en: "English", es: "Español (Latinoamérica)", pt: "Português (Brasil)" }[language]} selected={settings.language === language} onPress={() => update({ language, voiceId: "existing" })} />)}</View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{voiceBanks.filter(bank => bank.language === language).map(bank => <Chip key={bank.id} title={bank.label} selected={settings.voiceId === bank.id} onPress={() => update({ voiceId: bank.id })} />)}</View>
      <Copy style={s.small}>Only available recordings are shown. Missing instructions stay quiet.</Copy>
      {toggle("Breathing guidance", settings.breathingVoice, breathingVoice => update({ breathingVoice }))}
      {toggle("Hold and rest guidance", settings.restingVoice, restingVoice => update({ restingVoice }))}
      {volume("VOICE VOLUME", "voiceVolume")}
      <Button title="Preview voice" secondary disabled={playing || controller.current?.stage === "active"} onPress={() => void preview("voice")} />
    </>}
    <Label>NATURAL BREATHING SOUNDS</Label>
    {toggle("Natural breathing sounds", settings.nature, nature => update({ nature }))}
    {settings.nature && <>
      <View style={s.row}>{(["air", "ocean", "warm"] as const).map(breathSound => <Chip key={breathSound} title={breathSound === "air" ? "Air" : breathSound === "ocean" ? "Ocean" : "Warm"} selected={e.breathSound === breathSound} onPress={() => { stop(); controller.updateExperience({ breathSound }); }} />)}</View>
      {volume("NATURE VOLUME", "natureVolume")}
      <Button title="Preview breath sounds · 6 sec" secondary disabled={playing || controller.current?.stage === "active"} onPress={() => void preview("breath")} />
      <Copy style={s.small}>Inhale, a quiet hold, exhale, then rest. Preview uses a short sample rhythm. During practice, sound follows your protocol.</Copy>
    </>}
    {musicTracks.length > 0 && <>
      <Label>BACKGROUND MUSIC</Label>
      {toggle("Background music", settings.music, music => update({ music }))}
      {settings.music && <>
        <View style={{ gap: 8 }}>{musicTracks.map(track => <Chip key={track.id} title={track.title} selected={(settings.musicId ?? musicTracks[0].id) === track.id} onPress={() => update({ musicId: track.id })} />)}</View>
        {volume("MUSIC VOLUME", "musicVolume")}
        <Button title="Preview music" secondary disabled={playing || controller.current?.stage === "active"} onPress={() => void preview("music")} />
      </>}
    </>}
    <Label>VIBRATION</Label>
    <View style={s.row}>
      <Chip title="Off" selected={!controller.preferences.haptics} onPress={() => { stop(); controller.setPreferences({ ...controller.preferences, haptics: false }); }} />
      {(["transitions", "rhythm"] as const).map(hapticMode => <Chip key={hapticMode} title={hapticMode === "transitions" ? "Gentle transitions" : "Rhythm pulses"}
        selected={controller.preferences.haptics && (controller.preferences.hapticMode ?? "transitions") === hapticMode}
        onPress={() => { stop(); controller.setPreferences({ ...controller.preferences, haptics: true, hapticMode }); }} />)}
    </View>
    <Copy style={s.small}>Gentle transitions: two light taps in, one soft tap out. Rhythm: gentle taps throughout each breath. Both stay quiet during holds.</Copy>
    {controller.preferences.haptics && <Button title="Preview vibration · 6 sec" secondary disabled={playing || controller.current?.stage === "active"} onPress={previewTouch} />}
    {!compact && <>
      <Label>COMPLETION CHIME</Label>
      <View style={s.row}>{(["bell", "bloom", "off"] as const).map(chime => <Chip key={chime} title={chime} selected={e.chime === chime} onPress={() => { stop(); controller.updateExperience({ chime }); }} />)}</View>
      <Label>CELEBRATION VOLUME</Label>
      <View style={s.row}>{[0.2, 0.45, 0.7, 1].map(celebrationVolume => <Chip key={celebrationVolume} title={`${Math.round(celebrationVolume * 100)}%`} selected={e.celebrationVolume === celebrationVolume}
        onPress={() => { stop(); controller.updateExperience({ celebrationVolume }); }} />)}</View>
      {e.chime !== "off" && controller.preferences.audio !== "silent" && <Button title="Preview chime" secondary disabled={playing || controller.current?.stage === "active"} onPress={() => void preview("chime")} />}
      <Copy style={s.small}>Silent mode mutes all sounds. Quiet celebrations mute reward sounds and touch. Previews play only when requested. Audio respects your phone volume and silent switch.</Copy>
    </>}
    {controller.preferences.haptics && <Copy style={s.small}>No vibration? Your phone may suppress touch feedback in system or battery settings. Some hardware does not support these effects.</Copy>}
    {playing && <Button title="Stop preview" secondary onPress={stop} />}
    {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
  </View>;
}
