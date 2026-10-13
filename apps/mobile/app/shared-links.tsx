import { Share } from "react-native";
import { BackScreen, Button, Card, Copy, Title } from "../src/ui";
import { useShareLinks } from "../src/share-links-context";
import { shareUrl } from "../src/share-exercise";
import { locale, t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { useState } from "react";
export default function SharedLinks() {
  useLanguage(); const service = useShareLinks(); const [error, setError] = useState("");
  return <BackScreen title="SHARED LINKS"><Title>Manage your exercise links.</Title>
    <Copy>Links expire after 30 days. Revoke a link to prevent future opens. Copies or exercises already loaded cannot be erased. Keep this phone's data to retain your revocation controls.</Copy>
    {!!service?.message && <Copy accessibilityRole="alert">{service.message}</Copy>}{!!error && <Copy accessibilityRole="alert">{error}</Copy>}
    {!service?.items.length && <Copy>No shared links yet.</Copy>}
    {service?.items.map(item => <Card key={item.id}>
      <Title translate={!item.label}>{item.label || "Shared breathing practice"}</Title>
      <Copy translate={false}>{new Date(item.createdAt).toLocaleString(locale())}</Copy>
      <Copy>{item.snapshot ? "Link creation is unconfirmed. Retry or revoke it before removing local data." : item.expiresAt <= Date.now() ? "Expired" : "Active link"}</Copy>
      {item.snapshot ? <Button title="Retry creating link" disabled={service.busy} onPress={() => { void service.retry(item.id); }} />
        : <Button title="Share link" secondary disabled={service.busy || item.expiresAt <= Date.now()} onPress={() => { void Share.share({ message: `${t("Try this breathing practice in your browser.")}\n${shareUrl(item.id)}` }).catch(() => setError("Sharing unavailable")); }} />}
      <Button title="Revoke link" danger secondary disabled={service.busy} onPress={() => { void service.revoke(item.id); }} />
    </Card>)}
    <Button title="Reload shared links" secondary disabled={service?.busy} onPress={() => service?.reload()} />
  </BackScreen>;
}
