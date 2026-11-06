/**
 * @file apps/mobile/features/registration/RegistrationSuccess.tsx
 * Confirmation screen shown after the wizard's Submit action.
 *
 * Matches the mockup: forest circle with a gold check, "Registration Submitted!", the
 * address the confirmation would go to, a numbered "What happens next" card and a
 * "Continue to Login" action.
 *
 * Because nothing is submitted yet, a preview notice states that plainly instead of
 * implying an email is on its way.
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  RegistrationColors,
} from "../../constants/theme";
import { InlineNotice } from "./components/InlineNotice";
import { PrimaryButton } from "../../components/PrimaryButton";

const NEXT_STEPS: ReadonlyArray<string> = [
  "Wait for your free trial schedule in your email.",
  "Attend the free trial. It serves as your assessment.",
  "The academy marks your account Approved or Rejected based on the results.",
  "If approved, enroll and pay within 1 week or your account will be deleted.",
];

export interface RegistrationSuccessProps {
  /** Address the confirmation would be sent to. */
  email: string;
  /** Returns the user to the login screen. */
  onContinueToLogin: () => void;
}

/**
 * Renders the post-registration confirmation screen.
 *
 * @param props - Destination email and the login-navigation callback.
 * @returns Scrollable confirmation with the next-steps list.
 */
export const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({
  email,
  onContinueToLogin,
}) => {
  // Keep the action clear of the Android navigation bar (edge-to-edge drawing).
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: Spacing.xxl + insets.bottom }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.mark}>
        <Ionicons name="checkmark" size={44} color={RegistrationColors.gold} />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        Registration Submitted!
      </Text>
      <Text style={styles.body}>
        Please check your email for your free trial schedule. We sent the details to {email}.
      </Text>

      <InlineNotice
        tone="warning"
        message="Preview build: nothing was submitted and no email will arrive."
        style={styles.preview}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What happens next</Text>
        {NEXT_STEPS.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepIndex}>
              <Text style={styles.stepIndexText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <PrimaryButton
        label="Continue to Login"
        onPress={onContinueToLogin}
        variant="forest"
        style={styles.action}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    alignItems: "center",
  },
  mark: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    backgroundColor: RegistrationColors.forest,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.display - 2,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.forest,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.lineHeight.relaxed,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  preview: {
    alignSelf: "stretch",
  },
  card: {
    alignSelf: "stretch",
    backgroundColor: RegistrationColors.card,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: RegistrationColors.divider,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
    marginBottom: Spacing.base,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.base,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: RegistrationColors.warningSurface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    marginTop: 1,
  },
  stepIndexText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.goldDeep,
  },
  stepText: {
    flex: 1,
    fontSize: Typography.fontSize.sm + 1,
    lineHeight: Typography.lineHeight.relaxed,
    color: Colors.textSecondary,
  },
  action: {
    alignSelf: "stretch",
  },
});
