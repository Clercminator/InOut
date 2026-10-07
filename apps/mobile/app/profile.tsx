import { practiceStats } from "../src/progress";
import { WelcomeEmailOptIn } from "../src/welcome-email-ui";
import { goalContent } from "../src/personalization";
import { useTheme } from "../src/theme";
import { t, locale } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { Alert } from "../src/localized-native";
import { useRef, useState } from "react";
import { router } from "expo-router";
import { Image, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BackScreen, Title, Label, Card, ActionRow, Copy, Button, useStyles } from "../src/ui";
import { useSession } from "../src/provider";
import { practiceDuration } from "../src/format";
import { experienceFor } from "../src/experience";
import { photoUri } from "../src/profile-photo";
import { WeeklyGoal } from "../src/practice-rewards";
import { captureRef, releaseCapture } from "react-native-view-shot";
import * as sharingService from "expo-sharing";

export default function Profile() {
  const { colors, palettes } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const e = experienceFor(controller.preferences);
  const records = controller.history();
  const stats = practiceStats(records);
  const badges = controller.rewards().badges;
  const pinned = badges.filter(b => e.pinnedBadges.includes(b.id));
  const card = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const accent = palettes[e.palette].accent;
  const total = records.reduce((sum, r) => sum + r.engine.elapsedAtAnchor, 0);
  const favorite = e.rituals.find(r => r.id === e.favoriteRitualId);
  return <BackScreen title="PROFILE">
    <View ref={card} collapsable={false} style={{ backgroundColor: colors.card, padding: 24, borderRadius: 24, gap: 16, borderWidth: 1, borderColor: accent + "55" }}>
      <Label>IN/OUT · MY PRACTICE</Label>
      <View style={[s.profileIdentity, { flexWrap: "wrap" }]}>
        <View style={[s.profileAvatar, { width: 76, height: 76, backgroundColor: accent + "20", borderWidth: e.frame === "laurel" ? 4 : 2, borderColor: accent,
          shadowColor: accent, shadowOpacity: e.frame === "glow" ? 0.6 : 0, shadowRadius: 16 }]}>
          {e.photo && failedPhoto !== e.photo ? <Image accessibilityLabel={t("Your profile photo")} source={{ uri: photoUri(e.photo) }} onError={() => setFailedPhoto(e.photo)} style={{ width: 66, height: 66, borderRadius: 14 }} />
            : <MaterialIcons name={e.avatar} size={34} color={accent} />}
        </View>
        <View style={{ flex: 1, minWidth: 140, gap: 4 }}><Title translate={false}>{e.name || t("Your practice")}</Title><Copy translate={false}>{controller.preferences.experience?.intention ?? t(e.intention)}</Copy></View>
      </View>
      {!!e.bio && <Copy translate={false}>{e.bio}</Copy>}
      <View style={[s.profileStats, { flexWrap: "wrap" }]}>
        <View><Label>CURRENT STREAK</Label><Title>{stats.current}</Title></View>
        <View><Label>SESSIONS</Label><Title>{records.length}</Title></View>
        <View><Label>TIME</Label><Title>{practiceDuration(total)}</Title></View>
        <View><Label>BADGES</Label><Title>{badges.length}</Title></View>
      </View>
      {pinned.map(b => <View key={b.id} style={s.inlineLabel}><MaterialIcons name="workspace-premium" size={20} color={accent} /><Copy>{b.label}</Copy></View>)}
      {favorite && <Copy translate={false}>{t("My ritual")} · {favorite.name}</Copy>}
    </View>
    <Copy style={s.small}>Private on this phone. Sharing sends only the card above, including your photo and bio. Tension ratings and notes stay private.</Copy>
    <Button title="Edit profile" onPress={() => router.push("/edit-profile")} />
    <Button title={sharing ? "Preparing card…" : "Share my practice card"} secondary disabled={sharing} onPress={() => {
      if (sharing) return; setSharing(true);
      void (async () => {
        let uri: string | undefined;
        try {
          if (!await sharingService.isAvailableAsync()) throw new Error("Sharing is unavailable on this device.");
          uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile" });
          await sharingService.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("My IN/OUT practice") });
        } finally { if (uri) releaseCapture(uri); }
      })().catch(() => Alert.alert("Could not share", "Please try again.")).finally(() => setSharing(false));
    }} />
    {controller.preferences.journey?.primaryGoal && <Card><Label>YOUR MAIN GOAL</Label><Copy>{goalContent[controller.preferences.journey.primaryGoal].title}</Copy></Card>}
    <Card><ActionRow title="Pro & subscriptions" icon="workspace-premium" onPress={() => router.push("/pro")} /><ActionRow title="Reminders" icon="notifications-none" onPress={() => router.push("/reminders")} /><ActionRow title="View progress" icon="insights" onPress={() => router.push("/(tabs)/progress")} /></Card>
    <WeeklyGoal />
    <Button title="Personalize my experience" secondary onPress={() => router.push("/personalize")} />
    <Button title="My rituals" secondary onPress={() => router.push("/rituals")} />
    <Card><Label>YOUR MILESTONE TIMELINE</Label>
      {!badges.length && <Copy>Your first practice starts your collection.</Copy>}
      {badges.slice(0, 3).map(b => <View key={b.id} style={{ gap: 4 }}><Copy style={s.subtitle}>{b.label}</Copy><Copy style={s.small}>{new Date(b.date + "T12:00:00").toLocaleDateString(locale())}</Copy></View>)}
    </Card>
    {badges.length > 3 && <Button title="View all badges" secondary onPress={() => router.push({ pathname: "/(tabs)/progress", params: { view: "Badges" } })} />}
    <Button title="Settings" secondary onPress={() => router.push("/settings")} />
    <WelcomeEmailOptIn />
  </BackScreen>;
}
