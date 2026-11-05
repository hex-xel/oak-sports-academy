/**
 * @file apps/mobile/features/registration/components/OptionCard.tsx
 * Selectable card used for the student-type choice on step 1.
 *
 * Matches the high-fidelity mockup: a radio circle, an icon, a bold title and a
 * description line; the selected card switches to a 2dp gold border.
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

export interface OptionCardProps {
  /** Card heading, e.g. "Newly White Belt". */
  title: string;
  /** Supporting sentence shown under the heading. */
  description: string;
  /** Ionicons glyph paired with the heading. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Whether this option is the current choice. */
  selected: boolean;
  /** Invoked when the card is pressed. */
  onPress: () => void;
}

/**
 * Radio-style selection card with accessible checked state.
 *
 * @param props - Copy, icon, selection state and press handler.
 * @returns Pressable card with a visible radio indicator.
 */
export const OptionCard: React.FC<OptionCardProps> = ({
  title,
  description,
  icon,
  selected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, selected ? styles.cardSelected : styles.cardIdle]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${description}`}
    >
      <View style={styles.headerRow}>
        <View style={[styles.radio, selected ? styles.radioSelected : styles.radioIdle]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
        <Ionicons
          name={icon}
          size={22}
          color={RegistrationColors.navy}
          style={styles.icon}
        />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: RegistrationColors.card,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    marginBottom: Spacing.md,
  },
  cardSelected: {
    borderColor: RegistrationColors.goldDeep,
    borderWidth: 2,
  },
  cardIdle: {
    borderColor: RegistrationColors.divider,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  radioSelected: {
    borderColor: RegistrationColors.goldDeep,
  },
  radioIdle: {
    borderColor: RegistrationColors.progressRemaining,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: RegistrationColors.gold,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
  },
  description: {
    fontSize: Typography.fontSize.sm + 1,
    lineHeight: Typography.lineHeight.normal,
    color: RegistrationColors.progressRemaining,
  },
});
