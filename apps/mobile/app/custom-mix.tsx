import { useLanguage } from "../src/use-language";
import { RoutineEditor } from "../src/routine-editor";
export default function Editor() {
  useLanguage(); return <RoutineEditor kind="mix" />; }
