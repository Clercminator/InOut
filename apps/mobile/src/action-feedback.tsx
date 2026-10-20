import { useEffect, useRef, useState } from "react";
import { Button, Copy } from "./ui";
import { publicError } from "./public-error";

/** UI feedback only; persistence and retry semantics stay in the owning service. */
export function useActionFeedback() {
  const lock = useRef(false), mounted = useRef(true);
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async (action: () => void | Promise<void>, fallback: string) => {
    if (lock.current) return false;
    lock.current = true;
    setError(""); setState("idle");
    const timer = setTimeout(() => { if (mounted.current) setState("pending"); }, 250);
    try {
      await action();
      if (mounted.current) setState("success");
      return true;
    } catch (error) {
      if (mounted.current) { setError(publicError(error, fallback)); setState("error"); }
      return false;
    } finally { clearTimeout(timer); lock.current = false; }
  };
  return { state, error, run };
}

export function ActionFeedback({ state, error, success = "Saved", retry }: {
  state: "idle" | "pending" | "success" | "error"; error?: string; success?: string; retry?: () => void;
}) {
  if (state === "idle") return null;
  return <>
    <Copy accessibilityLiveRegion="polite">{state === "pending" ? "Saving…" : state === "success" ? success : error}</Copy>
    {state === "error" && retry && <Button title="Retry" secondary onPress={retry} />}
  </>;
}
