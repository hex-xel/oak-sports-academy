/**
 * @file apps/mobile/features/registration/VerificationSheet.tsx
 * Email verification modal for the credentials step.
 *
 * Mirrors the mockup: centred card over a dark scrim, six code boxes, resend countdown,
 * a green Verify action and a gold-outline Cancel. The expired variant swaps the mark and
 * copy and disables Verify until a new code is requested.
 *
 * No email is sent and no code is checked yet; the input only drives the UI states.
 */

import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  RegistrationColors,
} from "../../constants/theme";
import { OtpInput } from "./components/OtpInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { OutlineButton } from "../../components/OutlineButton";

/** Seconds a mock verification code stays valid before the expired state appears. */
const RESEND_SECONDS = 60;

export interface VerificationSheetProps {
  /** Controls modal visibility; opening restarts the countdown and clears the code. */
  visible: boolean;
  /** Address shown in the body copy. */
  email: string;
  /** Dismisses the sheet without verifying. */
  onCancel: () => void;
  /** Accepts the entered code and advances the wizard. */
  onVerified: () => void;
}

/**
 * Renders the email-verification modal and its countdown.
 *
 * @param props - Visibility, email, cancel and verified callbacks.
 * @returns Modal sheet with active and expired variants.
 */
export const VerificationSheet: React.FC<VerificationSheetProps> = ({
  visible,
  email,
  onCancel,
  onVerified,
}) => {
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (!visible) return;
    setCode("");
    setSecondsLeft(RESEND_SECONDS);
    const timer = setInterval(() => {
      setSecondsLeft((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  const expired = secondsLeft === 0;
  const canVerify = code.length === 6 && !expired;
  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
    secondsLeft % 60,
  ).padStart(2, "0")}`;

  const resend = () => {
    setCode("");
    setSecondsLeft(RESEND_SECONDS);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card} accessibilityViewIsModal accessibilityLabel="Email verification">
          <View style={[styles.mark, expired ? styles.markError : styles.markSuccess]}>
            <Ionicons
              name={expired ? "alert-circle-outline" : "shield-checkmark-outline"}
              size={26}
              color={expired ? RegistrationColors.error : RegistrationColors.forest}
            />
          </View>

          <Text style={styles.title}>
            {expired ? "Verification code expired" : "Verify your email"}
          </Text>
          <Text style={styles.body}>
            {expired
              ? `The 6-digit code sent to ${email} is no longer valid. Request a new code to continue.`
              : `Enter the 6-digit code we sent to ${email}.`}
          </Text>

          <OtpInput value={code} onChange={setCode} invalid={expired} disabled={expired} />

          <View style={styles.resendRow}>
            <Text style={styles.resendPrompt}>
              {expired ? "Code expired." : "Didn't get the code?"}
            </Text>
            <Pressable
              onPress={resend}
              disabled={!expired}
              accessibilityRole="button"
              accessibilityLabel={expired ? "Resend code" : `Resend code in ${countdown}`}
              accessibilityState={{ disabled: !expired }}
            >
              <Text style={[styles.resendLink, !expired && styles.resendLinkMuted]}>
                {expired ? "Resend code" : `Resend code (${countdown})`}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.previewNote}>
            Preview build: no email is sent and any 6 digits are accepted.
          </Text>

          <PrimaryButton
            label="Verify"
            onPress={onVerified}
            variant="forest"
            disabled={!canVerify}
            style={styles.verifyButton}
          />
          <OutlineButton label="Cancel" onPress={onCancel} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: RegistrationColors.scrim,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: RegistrationColors.card,
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  mark: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.base,
  },
  markSuccess: {
    backgroundColor: RegistrationColors.successSurface,
  },
  markError: {
    backgroundColor: RegistrationColors.errorSurface,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: Typography.fontSize.sm + 1,
    lineHeight: Typography.lineHeight.normal,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  resendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  resendPrompt: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  resendLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: RegistrationColors.forest,
  },
  resendLinkMuted: {
    color: Colors.textMuted,
  },
  previewNote: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  verifyButton: {
    marginBottom: Spacing.md,
  },
});
