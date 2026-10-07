import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { TextInput } from "./localized-native";
import { Button, Card, Copy, Label, useStyles } from "./ui";
import { useSession } from "./session-context";
import { welcomeRequest, validEmail } from "./welcome-email";
import { productConfig } from "./product-config";
import config from "../../../release/lifecycle.json";
import { t } from "./i18n";
export function WelcomeEmailOptIn() {
  const controller = useSession(), styles = useStyles();
  const saved = controller.preferences.welcomeEmail;
  const [email, setEmail] = useState("");
  if (!productConfig.welcomeEmail) return null;
  return <Card><Label>YOUR FIRST PRACTICE, BY EMAIL</Label>
    <Copy>Optional. Send your email address, first name and selected goal to our email service for one welcome message. No marketing sequence.</Copy>
    {saved ? <><Copy>{saved.status === "sent" ? "Welcome email sent." : saved.status === "review" ? "Delivery could not be confirmed. Contact support if you need help." : "Your request is saved. Delivery will be retried when available."}</Copy>
      <Button title="Remove email from this phone" secondary onPress={() => controller.setPreferences({ ...controller.preferences, welcomeEmail: undefined })} /></> : <>
      <TextInput accessibilityLabel={t("Email address")} placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} style={{ ...styles.copy, minHeight: 52, padding: 14, borderWidth: 1, borderRadius: 12 }} />
      <Button title="Email my first practice" secondary disabled={!validEmail(email.trim())} onPress={() => controller.setPreferences({ ...controller.preferences, welcomeEmail: { email: email.trim().toLowerCase(), consentAt: Date.now(), status: "pending" } })} />
    </>}
  </Card>;
}
export function WelcomeEmailEffects() {
  const controller = useSession();
  const busy = useRef(false), next = useRef(0);
  const pending = controller.preferences.welcomeEmail;
  const completed = controller.preferences.onboardingComplete;
  useEffect(() => {
    let mounted = true;
    const send = async () => {
      if (!productConfig.welcomeEmail || busy.current || Date.now() < next.current || !completed || pending?.status !== "pending") return;
      busy.current = true; next.current = Date.now() + 600000;
      try {
        let installation = await SecureStore.getItemAsync("inout-welcome-installation");
        if (!installation) { installation = randomUUID(); await SecureStore.setItemAsync("inout-welcome-installation", installation); }
        const body = welcomeRequest(controller.preferences, installation);
        if (!body || !mounted) return;
        const response = await fetch(config.welcomeUrl, { method: "POST", headers: { "Content-Type": "application/json", apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
        if (!response.ok) return;
        const result = await response.json();
        if (mounted && controller.preferences.welcomeEmail?.email === body.email && ["sent", "review"].includes(result.status)) controller.setPreferences({ ...controller.preferences, welcomeEmail: { ...controller.preferences.welcomeEmail, status: result.status } });
      } catch { /* Email availability must never interrupt practice. */ }
      finally { busy.current = false; }
    };
    void send();
    const listener = AppState.addEventListener("change", state => { if (state === "active") void send(); });
    const timer = setInterval(() => { if (AppState.currentState === "active") void send(); }, 600000);
    return () => { mounted = false; listener.remove(); clearInterval(timer); };
  }, [controller, completed, pending]);
  return null;
}
