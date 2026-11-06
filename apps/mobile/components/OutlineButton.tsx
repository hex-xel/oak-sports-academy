/**
 * @file apps/mobile/components/OutlineButton.tsx
 * Gold-outline secondary action for Oak Sports Academy mobile screens.
 *
 * Matches the sticker sheet "Mobile / Gold outline · Back" component:
 * white fill, dark-gold 1.5dp border, navy semibold label, 48dp minimum touch target.
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  RegistrationColors,
} from "../constants/theme";

export interface OutlineButtonProps {
  /** Button label, e.g. "Back" or "Cancel". */
  label: string;
  /** Invoked on press; ignored while disabled. */
  onPress: () => void;
  /** Disables interaction and switches to the muted outline treatment. */
  disabled?: boolean;
  /** Screen-reader label; defaults to the visible label. */
  accessibilityLabel?: string;
  /** Optional container overrides. */
  style?: StyleProp<ViewStyle>;
  /** Automated test identification selector. */
  testID?: string;
}

/**
 * Secondary action rendered as a gold-outlined white button.
 *
 * @param props - Label, press handler and optional disabled/style overrides.
 * @returns Accessible outlined button with a muted disabled variant.
 */
export const OutlineButton: React.FC<OutlineButtonProps> = ({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled ? styles.buttonDisabled : styles.buttonEnabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 48, // Android accessibility minimum touch target
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
  },
  buttonEnabled: {
    borderColor: RegistrationColors.goldDeep,
  },
  buttonDisabled: {
    borderColor: RegistrationColors.divider,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: RegistrationColors.navy,
    textAlign: "center",
  },
  labelDisabled: {
    color: Colors.textMuted,
  },
});
