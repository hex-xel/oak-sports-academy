/**
 * @file apps/mobile/components/PrimaryButton.tsx
 * Primary call-to-action button primitive for Oak Sports Academy mobile app.
 *
 * Implements the primary action button specification:
 * - High-contrast dark fill (`#0D1B2A` / `#0B3026`) when enabled
 * - Subtle gray fill (`#E5E7EB`) with muted text (`#9CA3AF`) when disabled or incomplete
 * - Integrated ActivityIndicator spinner for asynchronous submission states
 * - Guaranteed minimum touch target of 48dp to satisfy mobile accessibility standards
 * - Disables touch handling automatically while loading to prevent duplicate API dispatches
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { Colors, Typography, Spacing, BorderRadius } from "../constants/theme";

export interface PrimaryButtonProps {
  /** The text displayed inside the button */
  label: string;
  /** Action executed on press; ignored if loading or disabled */
  onPress: () => void;
  /**
   * Visual tone. `dark` is the approved login/sign-in fill; `forest` and `gold` are the
   * registration "Continue" and "Submit Registration" fills from the sticker sheet.
   */
  variant?: "dark" | "forest" | "gold";
  /** Whether an asynchronous operation is in progress (shows spinner and locks interaction) */
  loading?: boolean;
  /** Disables click interaction and switches to muted disabled color tokens */
  disabled?: boolean;
  /** Accessible label announced to screen readers; defaults to label */
  accessibilityLabel?: string;
  /** Optional custom container style overrides */
  style?: StyleProp<ViewStyle>;
  /** Optional custom text style overrides */
  textStyle?: StyleProp<TextStyle>;
  /** Automated test identification selector */
  testID?: string;
}

/**
 * Primary action button adhering to the Oak Sports Academy mobile design guidelines.
 *
 * @param props - Component configuration properties
 * @returns Primary button component with loading and disabled states
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  variant = "dark",
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
  textStyle,
  testID,
}) => {
  // Interaction is blocked if either disabled or an async operation is actively pending
  const isInteractionDisabled = disabled || loading;
  const tone =
    variant === "gold"
      ? { fill: Colors.buttonGold, label: Colors.buttonGoldText }
      : variant === "forest"
        ? { fill: Colors.buttonForest, label: Colors.textOnDark }
        : { fill: Colors.buttonDark, label: Colors.textOnDark };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isInteractionDisabled ? styles.buttonDisabled : [styles.buttonActive, { backgroundColor: tone.fill }],
        style,
      ]}
      onPress={onPress}
      disabled={isInteractionDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{
        disabled: isInteractionDisabled,
        busy: loading,
      }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isInteractionDisabled ? Colors.textMuted : tone.label}
          accessibilityLabel="Loading, please wait"
        />
      ) : (
        <Text
          style={[
            styles.label,
            isInteractionDisabled ? styles.labelDisabled : { color: tone.label },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 48, // Complies with mobile human-interface guidelines for touchable targets
    borderRadius: BorderRadius.button,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  buttonActive: {
    elevation: 2, // Subtle Android elevation shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  buttonDisabled: {
    backgroundColor: Colors.buttonDisabled,
    elevation: 0,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: "center",
  },
  labelDisabled: {
    color: Colors.buttonTextDisabled,
  },
});
