/**
 * @file apps/mobile/features/registration/components/UploadTile.tsx
 * Dashed document dropzone for the requirements step.
 *
 * Styled from the sticker sheet "File Upload & Documents" section: gold dashed outline,
 * muted fill, upload glyph, bold action label and a format/size hint. The red dashed
 * variant is the invalid state shown in the registration mockup.
 */

import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Typography,
  Spacing,
  RegistrationColors,
} from "../../../constants/theme";

export interface UploadTileProps {
  /** Bold action line, e.g. "Upload 2×2 Photo". */
  title: string;
  /** Format and content guidance under the title. */
  description: string;
  /** Inline error shown under the tile when the document is missing. */
  error?: string | undefined;
  /** Opens the (not yet wired) document picker. */
  onPress: () => void;
}

/**
 * Empty-state upload tile with an optional invalid treatment.
 *
 * @param props - Copy, error message and press handler.
 * @returns Pressable dashed dropzone plus its error line.
 */
export const UploadTile: React.FC<UploadTileProps> = ({
  title,
  description,
  error,
  onPress,
}) => {
  const hasError = Boolean(error && error.trim().length > 0);
  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.tile,
          hasError && styles.tileError,
          pressed && styles.tilePressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${description}`}
        accessibilityHint="Opens the device file picker"
      >
        <Ionicons
          name="cloud-upload-outline"
          size={26}
          color={hasError ? RegistrationColors.error : RegistrationColors.navy}
        />
        <Text style={[styles.title, hasError && styles.titleError]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Pressable>
      {hasError ? (
        <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: RegistrationColors.gold,
    backgroundColor: RegistrationColors.uploadFill,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
    minHeight: 116,
  },
  tileError: {
    borderColor: RegistrationColors.error,
    backgroundColor: RegistrationColors.errorSurface,
  },
  tilePressed: {
    opacity: 0.85,
  },
  title: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
    textAlign: "center",
  },
  titleError: {
    color: RegistrationColors.error,
  },
  description: {
    marginTop: 2,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  errorText: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: RegistrationColors.error,
  },
});
