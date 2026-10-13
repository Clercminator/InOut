import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { ChallengeArt as ArtKey } from "./challenges";

const palettes: Record<ArtKey, readonly [string, string]> = {
  dawn: ["#F8EBC8", "#D9ECE8"], waves: ["#E3F3F1", "#A9D3D7"], moon: ["#153F51", "#376D79"],
  focus: ["#DDECEA", "#90BDC2"], explore: ["#F2E8CB", "#B3D5CF"], growth: ["#E8F0DD", "#B8D8CB"],
};
/** Original, resolution-independent scenery made from native vector primitives. No downloaded imagery. */
export function ChallengeArt({ art, height = 210 }: { art: ArtKey; height?: number }) {
  const night = art === "moon";
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height, overflow: "hidden", borderRadius: 20 }}>
    <LinearGradient colors={palettes[art]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {(art === "dawn" || art === "explore" || art === "growth") && <View style={{ position: "absolute", top: "15%", right: "23%", width: height * .35, height: height * .35, borderRadius: height, backgroundColor: "#F5C75E" }} />}
      {night && <><View style={{ position: "absolute", top: "16%", left: "61%", width: height * .3, height: height * .3, borderRadius: height, backgroundColor: "#F9E8B3" }} /><View style={{ position: "absolute", top: "11%", left: "66%", width: height * .28, height: height * .28, borderRadius: height, backgroundColor: "#245564" }} />{[12, 29, 46, 82].map((left, i) => <View key={left} style={{ position: "absolute", left: `${left}%`, top: `${16 + (i % 2) * 24}%`, width: i % 2 ? 3 : 5, height: i % 2 ? 3 : 5, borderRadius: 4, backgroundColor: "#E4F0E7" }} />)}</>}
      {art === "focus" ? <>{[.92, .7, .48].map((size, i) => <View key={size} style={{ position: "absolute", width: height * size, height: height * size, borderRadius: height, borderWidth: 1.5, borderColor: i === 2 ? "#397780" : "#74A6AD" }} />)}<View style={{ width: height * .21, height: height * .21, borderRadius: height, backgroundColor: "#195C67" }} /><View style={{ position: "absolute", top: "23%", right: "30%", width: 13, height: 13, borderRadius: 8, backgroundColor: "#F5C75E" }} /></> : <>
        {[0, 1, 2].map(i => <View key={i} style={{ position: "absolute", width: "145%", height: height * (.65 + i * .1), left: `${-30 + i * 12}%`, bottom: -height * (.33 + i * .06), borderRadius: height, transform: [{ rotate: `${i % 2 ? 13 : -12}deg` }], backgroundColor: night ? ["#3C7781", "#255C69", "#134853"][i] : ["#99C5C4", "#66A1A8", "#367781"][i] }} />)}
        {art === "waves" && [0, 1, 2].map(i => <View key={i} style={{ position: "absolute", top: 28 + i * 16, left: `${14 + i * 5}%`, width: "62%", height: 32, borderWidth: 1.5, borderColor: "#FFFFFFA0", borderBottomColor: "transparent", borderLeftColor: "transparent", borderRightColor: "transparent", borderRadius: 100, transform: [{ rotate: "-8deg" }] }} />)}
        {art === "explore" && [0, 1, 2].map(i => <View key={i} style={{ position: "absolute", bottom: 23 + i * 17, left: `${28 + i * 12}%`, width: 18 - i * 3, height: 9, borderRadius: 8, backgroundColor: "#F8E9BC", transform: [{ rotate: "-20deg" }] }} />)}
        {art === "growth" && <View style={{ position: "absolute", bottom: "15%", left: "36%", width: 3, height: height * .43, backgroundColor: "#164F59", transform: [{ rotate: "-8deg" }] }}>{[0, 1, 2].map(i => <View key={i} style={{ position: "absolute", bottom: i * height * .12, left: i % 2 ? -31 : 1, width: 34, height: 20, borderTopLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: i % 2 ? "#E1ECCC" : "#235E62", transform: [{ rotate: i % 2 ? "28deg" : "-28deg" }] }} />)}</View>}
      </>}
    </LinearGradient>
  </View>;
}
