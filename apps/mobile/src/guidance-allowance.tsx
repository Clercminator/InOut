import { router } from "expo-router";
import { useSession } from "./provider";
import { productConfig } from "./product-config";
import { Card, Label, Copy, Button } from "./ui";
import { message } from "./i18n";
export function GuidanceAllowance() {
  const controller = useSession();
  if (productConfig.guidedSessionsPerMonth === null) return null;
  const access = controller.guidedAccess();
  return <Card><Label>GUIDED SESSIONS</Label><Copy>{access.remaining === null ? "Unlimited with Pro" : message("{0} / {1} free guided sessions left", [access.remaining, access.limit!])}</Copy>
    <Copy>Voice guidance resets on the first of each month (UTC). Tones and silent breathing remain available.</Copy>
    {!access.allowed && <Button title="Unlock with InOut Pro" secondary onPress={() => router.push({ pathname: "/pro", params: { source: "quota" } })} />}
  </Card>;
}
