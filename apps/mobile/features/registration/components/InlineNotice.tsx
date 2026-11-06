/**
 * @file apps/mobile/features/registration/components/InlineNotice.tsx
 * Compact banner for guidance and form-level feedback inside the registration wizard.
 *
 * Tones follow the sticker sheet surfaces: blue for guidance, red for blocking errors,
 * amber for preview/non-blocking notes and green for confirmations. Errors and warnings
 * are announced through `accessibilityRole="alert"` so a screen reader hears them when
 * they appear.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Typography,
  Spacing,
  RegistrationColors,
} from "../../../constants/theme";

/** Visual families available to the notice banner. */
export type NoticeTone = "info" | "error" | "warning" | "success";

export interface InlineNoticeProps {
  /** Visual family; also selects the leading icon. */
  tone: NoticeTone;
  /** The message. Keep it to one or two sentences. */
  message: string;
  /** Optional bold lead-in shown above the message. */
  title?: string;
  /** Optional spacing override for the banner container. */
  style?: StyleProp<ViewStyle>;
}

const TONE = {
  info: {
    surface: RegistrationColors.infoSurface,
    border: RegistrationColors.infoBorder,
    text: RegistrationColors.navy,
    icon: "information-circle-outline" as const,
  },
  error: {
    surface: RegistrationColors.errorSurface,
    border: RegistrationColors.error,
    text: RegistrationColors.error,
    icon: "alert-circle-outline" as const,
  },
  warning: {
    surface: RegistrationColors.warningSurface,
    border: RegistrationColors.warningBorder,
    text: RegistrationColors.warningText,
    icon: "warning-outline" as const,
  },
  success: {
    surface: RegistrationColors.successSurface,
    border: RegistrationColors.forest,
    text: RegistrationColors.forest,
    icon: "checkmark-circle-outline" as const,
  },
} as const;

/**
 * Renders a single notice block.
 *
 * @param props - Tone, message, optional title and spacing.
 * @returns Banner with icon and text, announced politely for assistive technology.
 */
export const InlineNotice: React.FC<InlineNoticeProps> = ({ tone, message, title, style }) => {
  const palette = TONE[tone];
  const isAssertive = tone === "error" || tone === "warning";
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style ?? null,
      ]}
    >
      <Ionicons name={palette.icon} size={18} color={palette.text} style={styles.icon} />
      <View style={styles.body}>
        {title ? <Text style={[styles.title, { color: palette.text }]}>{title}</Text> : null}
        <Text
          style={[styles.message, { color: palette.text }]}
          accessibilityRole={isAssertive ? "alert" : "text"}
          accessibilityLiveRegion="polite"
        >
          {message}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  icon: {
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 2,
  },
  message: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.normal,
  },
});
