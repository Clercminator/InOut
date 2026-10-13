import React, { useState } from 'react';
import { useTheme } from './theme';
import * as Native from 'react-native';
import { t } from './i18n';
import { useLanguage } from './use-language';

function accessibility<T extends { accessibilityLabel?: string; accessibilityHint?: string }>(props: T): T {
  return { ...props,
    accessibilityLabel: props.accessibilityLabel ? t(props.accessibilityLabel) : undefined,
    accessibilityHint: props.accessibilityHint ? t(props.accessibilityHint) : undefined,
  };
}
export const Pressable = React.forwardRef<React.ComponentRef<typeof Native.Pressable>, Native.PressableProps>((props, ref) => {
  useLanguage();
  return <Native.Pressable ref={ref} {...accessibility(props)} />;
});
export const Switch = React.forwardRef<Native.Switch, Native.SwitchProps>((props, ref) => {
  useLanguage();
  return <Native.Switch ref={ref} {...accessibility(props)} />;
});
export const TextInput = React.forwardRef<Native.TextInput, Native.TextInputProps>((props, ref) => {
  useLanguage();
  const { colors, mode } = useTheme();
  const [focused, setFocused] = useState(false);
  return <Native.TextInput ref={ref} placeholderTextColor={colors.muted} selectionColor={colors.accent} keyboardAppearance={mode}
    {...accessibility(props)} placeholder={props.placeholder ? t(props.placeholder) : undefined}
    style={[{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 12, minHeight: 48 }, props.style, focused && { borderColor: colors.accent }]}
    onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }} />;
});
export const Alert = {
  ...Native.Alert,
  alert: (...args: Parameters<typeof Native.Alert.alert>) => {
    args[0] = t(args[0]);
    if (args[1]) args[1] = t(args[1]);
    if (args[2]) args[2] = args[2].map(button => ({ ...button, text: button.text ? t(button.text) : button.text }));
    Native.Alert.alert(...args);
  },
};
