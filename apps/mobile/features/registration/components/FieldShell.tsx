/**
 * @file apps/mobile/features/registration/components/FieldShell.tsx
 * Label + feedback wrapper for non-text registration controls (selects, date field).
 *
 * {@link TextField} already provides this layout for text inputs; this shell keeps the
 * pressable controls pixel-identical without changing the approved shared component.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Typography,
  Spacing,
  RegistrationColors,
} from "../../../constants/theme";

export interface FieldShellProps {
  /** Field caption shown above the control. */
  label: string;
  /** The control itself (already styled as a bordered box). */
  children: React.ReactNode;
  /** Inline error message; replaces the hint while present. */
  error?: string | undefined;
  /** Neutral helper text shown when there is no error. */
  hint?: string | undefined;
  /** Extra spacing override for the field block. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders a labelled control with either an error or a hint underneath.
 *
 * @param props - Label, control, messages and spacing.
 * @returns Field block matching the registration form rhythm.
 */
export const FieldShell: React.FC<FieldShellProps> = ({
  label,
  children,
  error,
  hint,
  style,
}) => {
  const hasError = Boolean(error && error.trim().length > 0);
  return (
    <View style={[styles.container, style ?? null]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hasError ? (
        <View style={styles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={RegistrationColors.error}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: Spacing.base,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: RegistrationColors.navy,
    marginBottom: Spacing.xs,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  errorIcon: {
    marginRight: 4,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: RegistrationColors.error,
  },
  hint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
