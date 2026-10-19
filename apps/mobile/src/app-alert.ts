import { Alert as NativeAlert, type AlertButton, type AlertOptions } from "react-native";

export interface AppAlert { id: number; title: string; message?: string; buttons: AlertButton[]; options?: AlertOptions }
let nextId = 0;
let queue: AppAlert[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export const appAlerts = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => queue[0] ?? null,
  show(...args: Parameters<typeof NativeAlert.alert>) {
    const [title, message, buttons, options] = args;
    // Startup errors still have a native fallback before the themed host has mounted.
    if (!listeners.size) { NativeAlert.alert(...args); return; }
    queue = [...queue, { id: ++nextId, title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }], options }];
    emit();
  },
  finish(id: number, button?: AlertButton) {
    if (queue[0]?.id !== id) return;
    const alert = queue[0];
    queue = queue.slice(1); emit();
    if (button) button.onPress?.(); else alert.options?.onDismiss?.();
  },
};
