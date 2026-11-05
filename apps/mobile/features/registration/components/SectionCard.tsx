/**
 * @file apps/mobile/features/registration/components/SectionCard.tsx
 * White rounded group used for each block of registration fields.
 *
 * The mockup stacks several of these per step (for example "Contact Details" and
 * "Address"), separated by the page background rather than dividers.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Typography,
  Spacing,
  BorderRadius,
  RegistrationColors,
} from "../../../constants/theme";

export interface SectionCardProps {
  /** Optional heading inside the card. */
  title?: string;
  /** Card contents. */
  children: React.ReactNode;
}

/**
 * Renders a bordered white group with optional heading.
 *
 * @param props - Optional title and the grouped content.
 * @returns Styled container matching the registration card rhythm.
 */
export const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: RegistrationColors.card,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: RegistrationColors.divider,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
    marginBottom: Spacing.md,
  },
});
