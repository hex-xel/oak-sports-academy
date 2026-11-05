/**
 * @file apps/mobile/features/registration/components/CheckboxRow.tsx
 * Consent row with a square checkbox, as designed for the terms step.
 *
 * Visual states from the mockup and sticker sheet:
 * - unchecked: light divider border, empty white box
 * - checked: dark-gold border, forest box with a white check
 * - invalid: red border after a blocked submit attempt
 */

import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Typography,
  Spacing,
  BorderRadius,
  RegistrationColors,
} from "../../../constants/theme";

export interface CheckboxRowProps {
  /** Agreement text announced and shown next to the box. */
  label: string;
  /** Whether the agreement is currently accepted. */
  checked: boolean;
  /** Toggles the agreement. */
  onPress: () => void;
  /** Renders the row with an error border after a blocked submit. */
  invalid?: boolean;
}

/**
 * Pressable agreement row with a 48dp-tall touch target.
 *
 * @param props - Label, checked state, toggle handler and optional invalid styling.
 * @returns Accessible checkbox row.
 */
export const CheckboxRow: React.FC<CheckboxRowProps> = ({
  label,
  checked,
  onPress,
  invalid = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.row,
        checked ? styles.rowChecked : styles.rowIdle,
        invalid && !checked ? styles.rowInvalid : null,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View style={[styles.box, checked ? styles.boxChecked : styles.boxIdle]}>
        {checked ? <Ionicons name="checkmark" size={16} color={RegistrationColors.card} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    backgroundColor: RegistrationColors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  rowChecked: {
    borderColor: RegistrationColors.goldDeep,
  },
  rowIdle: {
    borderColor: RegistrationColors.divider,
  },
  rowInvalid: {
    borderColor: RegistrationColors.error,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  boxChecked: {
    backgroundColor: RegistrationColors.forest,
    borderColor: RegistrationColors.forest,
  },
  boxIdle: {
    backgroundColor: RegistrationColors.card,
    borderColor: RegistrationColors.progressRemaining,
  },
  label: {
    flex: 1,
    fontSize: Typography.fontSize.sm + 1,
    lineHeight: Typography.lineHeight.normal,
    color: RegistrationColors.navy,
  },
});
