import { useLocalSearchParams } from "expo-router";
import { Paywall } from "../src/paywall";
export default function Pro() { const { source } = useLocalSearchParams<{ source?: string }>(); return <Paywall entry={source} />; }
