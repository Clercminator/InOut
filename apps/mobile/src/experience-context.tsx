import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { defaultExperience, experienceFor } from "./experience";
import { useSession } from "./session-context";
const ExperienceContext = createContext({ experience: defaultExperience, audio: "tones" as "voice" | "tones" | "silent", haptics: true });
export const useExperience = () => useContext(ExperienceContext);
export function ExperienceProvider({ children }: PropsWithChildren) {
  const { preferences } = useSession();
  const value = useMemo(() => ({ experience: experienceFor(preferences), audio: preferences.audio, haptics: preferences.haptics }), [preferences]);
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}
