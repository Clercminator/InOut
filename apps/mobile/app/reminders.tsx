import { Redirect } from "expo-router";

export default function Reminders() {
  return <Redirect href={{ pathname: "/settings", params: { section: "notifications" } }} />;
}
