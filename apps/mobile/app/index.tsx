import { useLanguage } from "../src/use-language";
import { Redirect } from "expo-router";
import { useSession } from "../src/provider";
export default function Launch() {
  useLanguage();
  const { current } = useSession();
  return (
    <Redirect
      href={
        current?.stage === "active"
          ? "/session"
          : current?.stage === "post"
            ? "/post"
            : "/(tabs)"
      }
    />
  );
}
