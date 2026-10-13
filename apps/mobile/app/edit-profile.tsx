import { useTheme } from "../src/theme";
import { publicError } from "../src/public-error";
import { t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { Alert, TextInput } from "../src/localized-native";
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { BackScreen, Button, Card, Chip, Copy, Label, useStyles } from "../src/ui";
import { SaveError, useSession } from "../src/provider";
import { experienceFor } from "../src/experience";
import { chooseProfilePhoto, removeProfilePhoto } from "../src/profile-photo";

export default function EditProfile() {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const e = experienceFor(controller.preferences);
  const [name, setName] = useState(e.name), [bio, setBio] = useState(e.bio), [intention, setIntention] = useState(controller.preferences.experience?.intention ?? t(e.intention));
  const [busy, setBusy] = useState(false);
  const fieldStyle = s.input;
  return <BackScreen title="EDIT PROFILE" avoidKeyboard>
    <Label>DISPLAY NAME</Label><TextInput accessibilityLabel={t("Display name")} style={fieldStyle} value={name} onChangeText={setName} maxLength={40} />
    <Label>ABOUT YOU</Label><TextInput accessibilityLabel={t("About you")} style={fieldStyle} value={bio} onChangeText={setBio} maxLength={180} multiline />
    <Label>YOUR INTENTION</Label><TextInput accessibilityLabel={t("Your intention")} style={fieldStyle} value={intention} onChangeText={setIntention} maxLength={90} />
    <View style={s.row}>{["More calm", "A moment for myself", "Room to recharge"].map(value => <Chip key={value} title={value} selected={t(value) === intention} onPress={() => setIntention(t(value))} />)}</View>
    <Card><Label>PHOTO OR AVATAR</Label>
      <View style={s.row}>{(["spa", "air", "nightlight", "wb-sunny"] as const).map((avatar, index) => <Chip key={avatar} title={["Leaf", "Breeze", "Moon", "Sun"][index]} selected={!e.photo && e.avatar === avatar} onPress={() => {
        const old = e.photo;
        if (controller.updateExperience({ avatar, photo: undefined })) { try { removeProfilePhoto(old); } catch {} }
      }} />)}</View>
      <Button title={busy ? "Opening photos…" : "Choose profile photo"} secondary disabled={busy || !!controller.error} onPress={() => {
        setBusy(true);
        void chooseProfilePhoto().then(photo => {
          if (!photo) return;
          const old = experienceFor(controller.preferences).photo;
          if (controller.updateExperience({ photo })) { try { removeProfilePhoto(old); } catch {} }
        }).catch(error => Alert.alert("Photo unavailable", publicError(error, "Try another photo."))).finally(() => setBusy(false));
      }} />
      <Copy style={s.small}>Photo and avatar choices save immediately. Your profile stays on this phone.</Copy>
    </Card>
    <Card><Label>PIN UP TO THREE BADGES</Label>
      {!controller.rewards().badges.length && <Copy>Earn your first badge by practicing.</Copy>}
      {controller.rewards().badges.map(b => <Chip key={b.id} title={`${e.pinnedBadges.includes(b.id) ? "★ " : ""}${b.label}`} selected={e.pinnedBadges.includes(b.id)} onPress={() => {
        if (e.pinnedBadges.includes(b.id)) controller.updateExperience({ pinnedBadges: e.pinnedBadges.filter(id => id !== b.id) });
        else if (e.pinnedBadges.length < 3) controller.updateExperience({ pinnedBadges: [...e.pinnedBadges, b.id] });
        else Alert.alert("Three badges pinned", "Unpin one to choose another.");
      }} />)}
    </Card>
    <SaveError />
    <Button title="Save profile" disabled={busy || !!controller.error} onPress={() => {
      if (controller.updateExperience({ name: name.trim(), bio: bio.trim(), intention: intention.trim() })) router.back();
    }} />
  </BackScreen>;
}
