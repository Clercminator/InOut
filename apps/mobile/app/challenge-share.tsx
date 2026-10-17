import { ShareExercise } from "../src/share-exercise";
import { dailyResetProtocol } from "../src/daily-reset";
import { useRef, useState } from "react";
import { Image, View, Platform, Share, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { captureRef, releaseCapture } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { BackScreen, Title, Copy, Button, Chip } from "../src/ui";
import { useSession } from "../src/provider";
import { definitionForState, challengeCatalog } from "../src/challenges";
import { challengeShareData, attemptShareData, dailyResetShareData } from "../src/challenge-share";
import { ChallengeArt } from "../src/challenge-art";
import { message, t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
export default function ChallengeShare() {
  useLanguage();
  const { id, attempt, daily } = useLocalSearchParams<{ id?: string; attempt?: string; daily?: string }>(), c = useSession();
  const state = c.challenges().find(s => s.challengeId === id), current = challengeCatalog().find(d => d.id === id);
  const d = current ? definitionForState(current, state) : undefined;
  const [includeRating, setIncludeRating] = useState(false);
  const result = c.testAttempts().find(a => a.id === attempt);
  const [story, setStory] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const card = useRef<View>(null), busyRef = useRef(false), { width } = useWindowDimensions();
  const [ready, setReady] = useState(false);
  const data = daily ? dailyResetShareData(c.dailyReset(), daily, story, c.history().find(r => r.id === daily)) : result ? attemptShareData(result, c.testAttempts(), story, includeRating) : d && state ? challengeShareData(d, state, story) : null;
  if (!data) return <BackScreen title="Challenges"><Copy>Your next milestone is ahead.</Copy></BackScreen>;
  const w = Math.min(360, width - 40), scale = w / 360;
  const share = async () => {
    if (busyRef.current || !ready) return; busyRef.current = true; setBusy(true); setError(""); c.analytics.track("challenge_share_tapped");
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
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Chip title="Story · 9:16" selected={story} onPress={() => { if (!busy && !story) { setReady(false); setStory(true); } }} /><Chip title="Square · 1:1" selected={!story} onPress={() => { if (!busy && story) { setReady(false); setStory(false); } }} /></View>
    <View ref={card} collapsable={false} testID="challenge-share-card" style={{ width: w, aspectRatio: story ? 9 / 16 : 1, alignSelf: "center", backgroundColor: "#18102c" }}>
      <Image key={String(story)} source={story ? require("../assets/sharing/result-story-background.png") : require("../assets/sharing/result-square-background.png")} onLoad={() => setReady(true)} onError={() => { setReady(false); setError("Could not load sharing artwork."); }} style={{ position: "absolute", width: "100%", height: "100%" }} />
      <View style={{ position: "absolute", top: (story ? 1090 : 660) * w / 1080, left: 80 * w / 1080, right: 80 * w / 1080, gap: 10 * w / 1080 }}>
        <Copy allowFontScaling={false} numberOfLines={2} adjustsFontSizeToFit style={{ color: "#f9f7ff", fontSize: (story ? 46 : 35) * w / 1080, lineHeight: (story ? 56 : 43) * w / 1080, fontWeight: "700" }}>{data.title}</Copy>
        <Copy allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ color: "#ffffff", fontSize: 60 * w / 1080, lineHeight: 74 * w / 1080, fontWeight: "800" }}>{data.metric}</Copy>
        <Copy allowFontScaling={false} style={{ color: "#d7b8ff", fontSize: 24 * w / 1080, lineHeight: 32 * w / 1080 }}>{data.status}</Copy>
        <Copy allowFontScaling={false} numberOfLines={3} adjustsFontSizeToFit style={{ color: "#f9f7ff", fontSize: 24 * w / 1080, lineHeight: 32 * w / 1080 }}>{data.detail}</Copy>
      </View>
      <Copy translate={false} allowFontScaling={false} style={{ position: "absolute", left: 80 * w / 1080, top: (story ? 1680 : 975) * w / 1080, color: "#d7b8ff", fontSize: 27 * w / 1080, lineHeight: 36 * w / 1080 }}>inout.imrtech.xyz</Copy>
    </View>
    {result?.challengeId === "state-shift-60" && <Chip title="Include my self-reported ratings on this card" selected={includeRating} onPress={() => setIncludeRating(!includeRating)} />}
    <Copy>{result ? "Only the visible card is shared. Your name, photo and notes stay private." : "Only this card is shared. Your name, photo, ratings and notes stay private."}</Copy>
    {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
    <Button title={busy ? "Preparing card…" : "Share achievement"} disabled={busy || !ready} onPress={() => { void share(); }} />
    {daily && <ShareExercise protocol={dailyResetProtocol()} title="Invite a friend" />}
    <Button title="Share app link" secondary onPress={() => { void Share.share({ message: `${t("Try a breathing challenge with IN/OUT.")}\n${data.destination}` }).catch(() => setError("Could not share. Please try again.")); }} />
  </BackScreen>;
}
