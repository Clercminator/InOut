import { Redirect } from "expo-router";
import { useSession } from "../src/provider";
export default function Launch() {
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
