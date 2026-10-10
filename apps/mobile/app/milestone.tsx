import { useEffect, useRef, useState } from "react";
import { Platform, Share, View, useWindowDimensions } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams } from "expo-router";
import { captureRef, releaseCapture } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useSession } from "../src/provider";
import { BackScreen, Copy, Title, Label, Button, Chip } from "../src/ui";
import { practiceStats, statsDuration } from "../src/progress";
import { t, message } from "../src/i18n";
import info from "../../../release/public-info.json";
import { ShareExercise } from "../src/share-exercise";
import { sigh } from "@inout/protocols";

export default function Milestone() {
  const controller = useSession();
  const { badge } = useLocalSearchParams<{ badge?: string }>();
  const { width } = useWindowDimensions();
  const [story, setStory] = useState(true), [includeTime, setIncludeTime] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const busyRef = useRef(false), card = useRef<View>(null);
  const stats = practiceStats(controller.history());
  const earned = controller.rewards().badges.find(b => b.id === badge);
  const title = earned?.label ?? message("{0} day streak", [stats.current]);
  useEffect(() => { controller.analytics.track("achievement_view"); }, [controller]);
  if ((badge && !earned) || (!badge && stats.current < 3)) return <BackScreen title="MILESTONE"><Title>Your next milestone is ahead.</Title><Copy>Share after earning a badge or reaching a three-day streak.</Copy></BackScreen>;
  const cardWidth = Math.min(360, Math.max(200, width - 40));
  const scale = cardWidth / 360;
  return <BackScreen title="SHARE YOUR PRACTICE"><Title>A moment worth keeping.</Title>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Chip title="Story · 9:16" selected={story} onPress={() => setStory(true)} /><Chip title="Square · 1:1" selected={!story} onPress={() => setStory(false)} /></View>
    <View ref={card} collapsable={false} style={{ alignSelf: "center", width: cardWidth, aspectRatio: story ? 9 / 16 : 1, padding: 26 * scale, borderRadius: 24, backgroundColor: "#EAF5F6", justifyContent: "space-between", overflow: "hidden" }}>
      <Copy allowFontScaling={false} style={{ color: "#124F59", fontSize: 20 * scale, lineHeight: 24 * scale, fontWeight: "800", letterSpacing: 3 }}>IN/OUT</Copy>
      <View style={{ alignItems: "center", gap: (story ? 20 : 10) * scale }}><View style={{ padding: (story ? 28 : 14) * scale, borderRadius: 80, backgroundColor: "#F5B52C" }}><MaterialIcons name="workspace-premium" size={(story ? 68 : 36) * scale} color="#124F59" /></View>
        <Copy numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={{ color: "#124F59", fontSize: (story ? 36 : 26) * scale, lineHeight: (story ? 42 : 30) * scale, textAlign: "center", fontWeight: "800" }}>{title}</Copy>
        {includeTime && <Copy allowFontScaling={false} style={{ color: "#41636A", fontSize: 14 * scale, lineHeight: 18 * scale, textAlign: "center" }}>{statsDuration(stats.totalMs)} · {t("total breathing time")}</Copy>}
      </View>
      <View style={{ gap: 8 }}><Copy allowFontScaling={false} style={{ color: "#124F59", fontSize: 13 * scale, lineHeight: 17 * scale, textAlign: "center" }}>Small breaths. Consistent practice.</Copy><Copy allowFontScaling={false} style={{ color: "#41636A", fontSize: 10 * scale, lineHeight: 14 * scale, textAlign: "center" }}>{info.supportUrl.replace("https://", "")}</Copy></View>
    </View>
    <Chip title="Include total breathing time" selected={includeTime} onPress={() => setIncludeTime(v => !v)} />
    <Copy>Only the preview is shared. Your name, photo, tension ratings and notes stay private.</Copy>
    {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
    <Button title={busy ? "Preparing card…" : "Share achievement"} disabled={busy} onPress={() => {
      if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(""); controller.analytics.track("achievement_share_tapped");
      void (async () => { let uri: string | undefined;
        try { if (!await Sharing.isAvailableAsync()) throw Error("Sharing unavailable");
          uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile", width: 1080, height: story ? 1920 : 1080 });
          controller.analytics.track("native_share_opened");
          if (Platform.OS === "ios") {
            const result = await Share.share({ url: uri }, { subject: t("My IN/OUT practice") });
            if (result.action === Share.sharedAction) controller.analytics.track("badge_shared");
          } else {
            // Android's image-share API cannot distinguish completion from dismissal.
            await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("My IN/OUT practice") });
          }
        } catch { setError("Could not share. Please try again."); }
        finally { if (uri) releaseCapture(uri); busyRef.current = false; setBusy(false); }
      })();
    }} />
    <ShareExercise protocol={sigh} />
  </BackScreen>;
}
