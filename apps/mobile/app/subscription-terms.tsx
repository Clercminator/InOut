import { useLanguage } from "../src/use-language";
import { Linking } from "react-native";
import { BackScreen, Title, Copy, Button } from "../src/ui";
import { Alert } from "../src/localized-native";
import info from "../../../release/public-info.json";
export default function SubscriptionTerms() {
  useLanguage();
  return <BackScreen title="SUBSCRIPTION TERMS">
    <Title>InOut Pro</Title>
    <Copy>IN/OUT Founding Member — Lifetime Pro is a one-time purchase for the supported lifetime of IN/OUT. It includes current Pro benefits and future Pro features without separately metered usage costs.</Copy>
    <Copy>Separately paid AI services with ongoing usage costs are not included.</Copy>
    <Copy>Lifetime means the supported lifetime of IN/OUT. AI features without incremental usage costs remain included when part of Pro.</Copy>
    <Copy>Restore Lifetime Pro with the same store account. Android and iOS purchases cannot currently be linked across platforms.</Copy>
    <Copy>Lifetime purchases do not cancel existing subscriptions. Refunds or store revocations can remove the corresponding purchase access.</Copy>
    <Copy>Weekly, monthly or yearly InOut Pro purchases use Apple App Store or Google Play billing. Review the store confirmation for the localized price, renewal period and any introductory offer for which your account is eligible.</Copy>
    <Copy>Recurring subscriptions renew unless cancelled through your store account. Cancelling renewal does not immediately remove paid-through access. Store-confirmed expiry, refunds and billing issues may change access. Restore purchases uses the store account that owns the subscription.</Copy>
    <Copy>Deleting local history or uninstalling IN/OUT does not cancel a subscription. Manage billing and cancellation in your store account. Support: davidclerc@imrtech.xyz.</Copy>
    <Copy>Core breathing and safety remain available without InOut Pro. Your practice data stays on this phone.</Copy>
    <Button title="Full terms of service" secondary onPress={() => { void Linking.openURL(info.termsUrl).catch(() => Alert.alert("Website unavailable", `Contact ${info.supportEmail}.`)); }} />
  </BackScreen>;
}
