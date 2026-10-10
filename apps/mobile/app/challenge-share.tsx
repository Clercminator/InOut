import { useRef, useState } from "react";
import { View, Platform, Share, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { captureRef, releaseCapture } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { BackScreen, Title, Copy, Button, Chip } from "../src/ui";
import { useSession } from "../src/provider";
import { definitionForState, challengeCatalog } from "../src/challenges";
import { challengeShareData, attemptShareData } from "../src/challenge-share";
import { ChallengeArt } from "../src/challenge-art";
import { message, t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
export default function ChallengeShare() {
  useLanguage();
  const { id, attempt } = useLocalSearchParams<{ id?: string; attempt?: string }>(), c = useSession();
  const state = c.challenges().find(s => s.challengeId === id), current = challengeCatalog().find(d => d.id === id);
  const d = current ? definitionForState(current, state) : undefined;
  const [includeRating, setIncludeRating] = useState(false);
  const result = c.testAttempts().find(a => a.id === attempt);
  const [story, setStory] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const card = useRef<View>(null), busyRef = useRef(false), { width } = useWindowDimensions();
  const data = result ? attemptShareData(result, c.testAttempts(), story, includeRating) : d && state ? challengeShareData(d, state, story) : null;
  if (!data) return <BackScreen title="Challenges"><Copy>Your next milestone is ahead.</Copy></BackScreen>;
  const w = Math.min(360, width - 40), scale = w / 360;
  const share = async () => {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(""); c.analytics.track("challenge_share_tapped");
    let uri: string | undefined;
    try {
      if (!await Sharing.isAvailableAsync()) throw Error();
      uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile", width: data.width, height: data.height });
      c.analytics.track("native_share_opened"); c.analytics.track("challenge_share_opened");
      if (Platform.OS === "ios") { const result = await Share.share({ url: uri }, { subject: data.title }); if (result.action === Share.sharedAction) { c.analytics.track("challenge_share_completed"); c.analytics.track("challenge_shared"); } }
      else await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: data.title });
    } catch { setError("Could not share. Please try again."); }
    finally { if (uri) releaseCapture(uri); busyRef.current = false; setBusy(false); }
  };
  return <BackScreen title="SHARE YOUR PRACTICE"><Title>A moment worth keeping.</Title>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Chip title="Story · 9:16" selected={story} onPress={() => setStory(true)} /><Chip title="Square · 1:1" selected={!story} onPress={() => setStory(false)} /></View>
    <View ref={card} collapsable={false} testID="challenge-share-card" style={{ width: w, aspectRatio: story ? 9 / 16 : 1, alignSelf: "center", borderRadius: 24, padding: 24 * scale, backgroundColor: "#EFF7F7", justifyContent: "space-between", overflow: "hidden" }}>
      <View style={{ gap: 10 * scale }}><Copy allowFontScaling={false} style={{ color: "#14545D", fontSize: 16 * scale, lineHeight: 20 * scale, fontWeight: "800", letterSpacing: 3 }}>IN/OUT</Copy><Copy allowFontScaling={false} style={{ color: "#756022", fontSize: 11 * scale, lineHeight: 15 * scale, fontWeight: "700", letterSpacing: 1 }}>{data.status}</Copy></View>
      <View style={{ gap: 12 * scale }}><Copy allowFontScaling={false} numberOfLines={2} adjustsFontSizeToFit style={{ color: "#0F4650", fontSize: (story ? 36 : 27) * scale, lineHeight: (story ? 42 : 32) * scale, fontWeight: "800" }}>{data.title}</Copy><ChallengeArt art={data.art} height={(story ? data.metric ? 170 : 235 : data.metric ? 65 : 115) * scale} />{data.metric && <Copy translate={false} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ color: "#0F4650", fontSize: (story ? 52 : 38) * scale, lineHeight: (story ? 60 : 44) * scale, fontWeight: "800" }}>{data.metric}</Copy>}<Copy allowFontScaling={false} style={{ color: "#14545D", fontSize: 14 * scale, lineHeight: 19 * scale, fontWeight: "600" }}>{data.detail}</Copy></View>
      <View style={{ gap: 5 * scale }}><Copy allowFontScaling={false} style={{ color: "#14545D", fontSize: 12 * scale, lineHeight: 16 * scale }}>Breathe. Practice. Repeat.</Copy><Copy translate={false} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ color: "#617B80", fontSize: 9 * scale, lineHeight: 13 * scale }}>{data.destination.replace("https://", "")}</Copy></View>
    </View>
    {result?.challengeId === "state-shift-60" && <Chip title="Include my self-reported ratings on this card" selected={includeRating} onPress={() => setIncludeRating(!includeRating)} />}
    <Copy>{result ? "Only the visible card is shared. Your name, photo and notes stay private." : "Only this card is shared. Your name, photo, ratings and notes stay private."}</Copy>
    {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
    <Button title={busy ? "Preparing card…" : "Share achievement"} disabled={busy} onPress={() => { void share(); }} />
    <Button title="Share app link" secondary onPress={() => { void Share.share({ message: `${t("Try a breathing challenge with IN/OUT.")}\n${data.destination}` }).catch(() => setError("Could not share. Please try again.")); }} />
  </BackScreen>;
}
