/**
 * @file apps/mobile/features/registration/components/PasswordChecklist.tsx
 * Live password requirements list from the sticker sheet.
 *
 * The rules are shown before, during and after typing so the user never has to guess
 * what the policy is. Unmet rules only turn red after a blocked submit attempt, which
 * avoids shouting at someone who has typed two characters.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Typography,
  Spacing,
  RegistrationColors,
} from "../../../constants/theme";
import { passwordRules } from "../validation";

export interface PasswordChecklistProps {
  /** Current password text. */
  password: string;
  /** Marks unmet rules in red; set after a failed Continue press. */
  showUnmet?: boolean;
}

/**
 * Renders the five password requirements with satisfaction icons.
 *
 * @param props - Password text and whether unmet rules should be highlighted.
 * @returns Non-interactive checklist announced politely by screen readers.
 */
export const PasswordChecklist: React.FC<PasswordChecklistProps> = ({
  password,
  showUnmet = false,
}) => {
  const rules = passwordRules(password);
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      {rules.map((rule) => {
        const failing = showUnmet && !rule.met;
        const color = rule.met
          ? RegistrationColors.forest
          : failing
            ? RegistrationColors.error
            : Colors.textSecondary;
        return (
          <View key={rule.id} style={styles.row}>
            <Ionicons
              name={rule.met ? "checkmark-circle" : failing ? "close-circle" : "ellipse-outline"}
              size={14}
              color={color}
              style={styles.icon}
            />
            <Text style={[styles.text, { color }, failing && styles.textFailing]}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: -Spacing.xs,
    marginBottom: Spacing.base,
    paddingLeft: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
  },
  textFailing: {
    fontWeight: Typography.fontWeight.medium,
  },
});
