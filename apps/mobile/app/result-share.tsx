import { useRef, useState } from "react";
import { Image, View, Share, Platform, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { captureRef, releaseCapture } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { BackScreen, Title, Copy, Button, Chip } from "../src/ui";
import { useSession } from "../src/provider";
import { resultShareData } from "../src/result-share-data";
import { useLanguage } from "../src/use-language";
import { t } from "../src/i18n";

export default function ResultShare() {
  useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>(), c = useSession();
  const record = c.current?.id === id ? c.current : c.history().find(r => r.id === id);
  const [story, setStory] = useState(false), [ratingConsentFor, setRatingConsentFor] = useState<string | null>(null);
  const includeRating = ratingConsentFor === id;
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState("");
  const capture = useRef<View>(null), locked = useRef(false), { width } = useWindowDimensions();
  if (!record || record.stage !== "result") return <BackScreen><Copy>Session unavailable</Copy></BackScreen>;
  const data = resultShareData(record, includeRating), w = Math.min(400, width - 40), scale = w / 1080;
  const text = `${t("Try a breathing practice with IN/OUT.")}\n${data.invitation}`;
  const share = async () => {
    if (locked.current || !ready) return;
    locked.current = true; setBusy(true); setError("");
    let uri: string | undefined;
    try {
      if (!await Sharing.isAvailableAsync()) throw Error();
      uri = await captureRef(capture, { format: "png", quality: 1, result: "tmpfile", width: 1080, height: story ? 1920 : 1080 });
      if (Platform.OS === "ios") await Share.share({ url: uri, message: text });
      else await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("Share result") });
      c.analytics.track("native_share_opened");
    } catch {
      c.analytics.track("share_delivery_failed", { outcome: "failed", errorCategory: "delivery" });
      setError("Could not share. Please try again.");
    }
    finally { if (uri) releaseCapture(uri); locked.current = false; setBusy(false); }
  };
  return <BackScreen title="SHARE YOUR PRACTICE"><Title>A moment worth keeping.</Title>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <Chip title="Square · 1:1" selected={!story} onPress={() => { if (!busy) { if (story) setReady(false); setStory(false); } }} />
      <Chip title="Story · 9:16" selected={story} onPress={() => { if (!busy) { if (!story) setReady(false); setStory(true); } }} />
    </View>
    <View ref={capture} collapsable={false} testID="result-share-card" style={{ width: w, height: (story ? 1920 : 1080) * scale, alignSelf: "center", backgroundColor: "#18102c" }}>
      <Image testID="result-share-background" key={String(story)} source={story ? require("../assets/sharing/result-story-background.png") : require("../assets/sharing/result-square-background.png")} onLoad={() => setReady(true)} onError={() => { setReady(false); setError("Could not load sharing artwork."); }} style={{ position: "absolute", width: "100%", height: "100%" }} />
      <View style={{ position: "absolute", top: (story ? 1090 : 690) * scale, left: 80 * scale, right: 80 * scale, gap: (story ? 18 : 8) * scale }}>
        <Copy translate={false} allowFontScaling={false} numberOfLines={2} adjustsFontSizeToFit style={{ color: "#f9f7ff", fontWeight: "700", fontSize: (story ? 46 : 30) * scale, lineHeight: (story ? 56 : 36) * scale }}>{data.title}</Copy>
        <Copy translate={false} allowFontScaling={false} style={{ color: "#ffffff", fontSize: (story ? 66 : 46) * scale, lineHeight: (story ? 78 : 54) * scale, fontWeight: "800" }}>{data.duration}</Copy>
        <Copy translate={false} allowFontScaling={false} style={{ color: "#d7b8ff", fontSize: (story ? 26 : 20) * scale, lineHeight: (story ? 36 : 26) * scale }}>{data.status}</Copy>
        {data.measurement && <Copy translate={false} allowFontScaling={false} numberOfLines={2} style={{ color: "#f9f7ff", fontSize: (story ? 25 : 18) * scale, lineHeight: (story ? 32 : 24) * scale }}>{data.measurement}</Copy>}
      </View>
      <Copy testID="result-share-invitation" allowFontScaling={false} numberOfLines={2} adjustsFontSizeToFit style={{ position: "absolute", left: 80 * scale, right: 80 * scale, top: (story ? 1680 : 935) * scale, color: "#FFFFFF", fontSize: (story ? 32 : 26) * scale, lineHeight: (story ? 42 : 32) * scale }}>Try a breathing practice with IN/OUT.</Copy>
      <Copy translate={false} allowFontScaling={false} style={{ position: "absolute", left: 80 * scale, right: 80 * scale, top: (story ? 1790 : 1010) * scale, color: "#d7b8ff", fontSize: 27 * scale, lineHeight: 36 * scale }}>inout.imrtech.xyz</Copy>
    </View>
    {record.pre !== null && record.post !== null && <Chip title="Include my tension change when sharing" selected={includeRating} onPress={() => { if (!busy) setRatingConsentFor(includeRating ? null : id); }} />}
    <Copy>Only the visible card is shared. Your name, photo and notes stay private.</Copy>
    <Copy>Some apps share the image without its link. Use Share invitation link to send the link separately.</Copy>
    {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
    <Button title={busy ? "Preparing card…" : "Share result"} disabled={busy || !ready} onPress={() => void share()} />
    <Button title="Share invitation link" secondary disabled={busy} onPress={() => {
      if (locked.current) return;
      locked.current = true; setBusy(true); setError("");
      void Share.share({ message: text }).then(() => c.analytics.track("native_share_opened")).catch(() => {
        c.analytics.track("share_delivery_failed", { outcome: "failed", errorCategory: "delivery" });
        setError("Could not share. Please try again.");
      }).finally(() => { locked.current = false; setBusy(false); });
    }} />
  </BackScreen>;
}
