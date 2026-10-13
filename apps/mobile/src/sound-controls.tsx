import { voices } from "./voice-library";
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
  const language = controller.preferences.language ?? "en";
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
  const preview = async (kind: "breath" | "chime") => {
    stop(); setError("");
    if (controller.current?.stage === "active") return;
    const token = generation.current;
    setPlaying(true);
    const preview = createAudioPreview(() => {
      if (token === generation.current) { stop(); setError("Sound preview unavailable. Check media volume and silent mode, then try again."); }
    }, () => { if (token === generation.current) stop(); });
    audioPreview.current = preview;
    const clips = [{ source: kind === "breath" ? breathPreviews[e.breathSound] : chimes[e.chime === "off" ? "bell" : e.chime],
      volume: kind === "breath" ? e.guidanceVolume * (controller.preferences.audio === "voice" ? 0.25 : 1) : e.celebrationVolume, at: 0 }];
    if (kind === "breath" && controller.preferences.audio === "voice") clips.push(
      { source: voices[language][0], volume: e.guidanceVolume, at: 0 },
      { source: voices[language][2], volume: e.guidanceVolume, at: 3000 });
    await preview.start(clips, kind === "breath" ? 6200 : 2200);
  };
  const previewTouch = () => {
    stop(); setError("");
    if (controller.current?.stage === "active" || !controller.preferences.haptics) return;
    if (Platform.OS !== "android" && Platform.OS !== "ios") { setError("Vibration preview is available on supported phones only."); return; }
    const token = generation.current;
    const started = performance.now();
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
    }, style => { void emitBreathHaptic(style).catch(() => {
      if (token === generation.current) { stop(); setError("Vibration unavailable. Check system touch feedback and battery settings."); }
    }); });
    timers.current.push(setTimeout(stop, 6000));
  };
  return <View style={{ gap: 12 }}>
    <Label>SOUND</Label>
    <View style={s.row}>{(["tones", "voice", "silent"] as const).map(audio => <Chip key={audio}
      title={audio === "tones" ? "Breath sounds" : audio === "voice" ? "Voice + breath" : "Silent"}
      selected={controller.preferences.audio === audio} onPress={() => { stop(); controller.setPreferences({ ...controller.preferences, audio }); }} />)}</View>
    {controller.preferences.audio !== "silent" && <>
      <View style={s.row}>{(["air", "ocean", "warm"] as const).map(breathSound => <Chip key={breathSound} title={breathSound === "air" ? "Air" : breathSound === "ocean" ? "Ocean" : "Warm"}
        selected={e.breathSound === breathSound} onPress={() => { stop(); controller.updateExperience({ breathSound }); }} />)}</View>
      <Label>GUIDANCE VOLUME · {Math.round(e.guidanceVolume * 100)}%</Label>
      <View style={s.row}>{[0.25, 0.5, 0.7, 1].map(guidanceVolume => <Chip key={guidanceVolume} title={`${Math.round(guidanceVolume * 100)}%`} selected={e.guidanceVolume === guidanceVolume}
        onPress={() => { stop(); controller.updateExperience({ guidanceVolume }); }} />)}</View>
      <Button title="Preview breath sounds · 6 sec" secondary disabled={playing || controller.current?.stage === "active"}
        onPress={() => void preview("breath")} />
      <Copy style={s.small}>Inhale, a quiet hold, exhale, then rest. Preview uses a short sample rhythm. During practice, sound follows your protocol.</Copy>
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
