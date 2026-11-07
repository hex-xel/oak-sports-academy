/**
 * @file apps/mobile/features/registration/VerificationSheet.tsx
 * Email verification modal for the credentials step.
 *
 * Mirrors the mockup: centred card over a dark scrim, six code boxes, resend countdown,
 * a green Verify action and a gold-outline Cancel. The expired variant swaps the mark and
 * copy and disables Verify until a new code is requested.
 *
 * Server metadata drives separate expiry/cooldown; only server verification advances.
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
  ScrollView,
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
import { InlineNotice } from "./components/InlineNotice";
import type { RegistrationStartResponse } from "@oak/shared";
import type { RegistrationState } from "./registration-state";

export interface VerificationSheetProps {
  /** Visibility never resets server expiry or resend timing. */
  visible: boolean;
  /** Address shown in the body copy. */
  email: string;
  /** Dismisses the sheet without verifying. */
  onCancel: () => void;
  /** Current server-issued flow, excluding any ordinary login authority. */
  flow: RegistrationStartResponse | null;
  /** Bounded operation progress and safe feedback from the registration lifecycle. */
  phase: RegistrationState["phase"];
  error: string | null;
  errorCode: string | null;
  blockedUntil: number;
  verificationLimited: boolean;
  needsConfirmation: boolean;
  storageError: boolean;
  /** Explicit actions; code is transient and never accepted locally. */
  onVerify: (code: string) => void;
  onResend: () => void;
  onRetry: () => void;
  onCodeChange: () => void;
}

/**
 * Renders the email-verification modal and its countdown.
 *
 * @param props Server timings, safe lifecycle feedback and explicit verification/retry actions.
 * @returns Scrollable modal with independent cooldown/expiry and keyboard-safe progress/errors.
 */
export const VerificationSheet: React.FC<VerificationSheetProps> = ({
  visible,
  email,
  onCancel,
  flow, phase, error, errorCode, blockedUntil, verificationLimited, needsConfirmation, storageError,
  onVerify, onResend, onRetry, onCodeChange,
}) => {
  const [code, setCode] = useState("");
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    setCode("");
    if (!visible) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible, flow?.challengeId]);

  const busy = phase !== "idle";
  const expired = !flow || Date.parse(flow.codeExpiresAt) <= now || errorCode === "VERIFICATION_EXPIRED";
  const flowExpired = !flow || Date.parse(flow.registrationExpiresAt) <= now;
  const secondsLeft = Math.max(0, Math.ceil((Math.max(flow ? Date.parse(flow.resendAfter) : 0, blockedUntil) - now) / 1000));
  const waiting = blockedUntil > now;
  const canVerify = code.length === 6 && !expired && !flowExpired && !busy && !storageError && !needsConfirmation && !verificationLimited && !waiting;
  const canResend = secondsLeft === 0 && !flowExpired && !busy && !storageError && !needsConfirmation;
  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
    secondsLeft % 60,
  ).padStart(2, "0")}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card} accessibilityViewIsModal accessibilityLabel="Email verification">
          <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.mark, expired ? styles.markError : styles.markSuccess]}>
            <Ionicons
              name={expired ? "alert-circle-outline" : "shield-checkmark-outline"}
              size={26}
              color={expired ? RegistrationColors.error : RegistrationColors.forest}
            />
          </View>

          <Text style={styles.title} accessibilityRole="header" accessibilityLiveRegion="polite">
            {expired ? "Verification code expired" : "Verify your email"}
          </Text>
          <Text style={styles.body}>
            {expired
              ? "This code is no longer valid. Request a new code to continue."
              : `Enter the 6-digit code for ${email}. If registration can continue, check your inbox. Delivery is unconfirmed.`}
          </Text>

          <OtpInput value={code} onChange={value => { setCode(value); onCodeChange(); }}
            invalid={expired || errorCode === "INVALID_VERIFICATION_CODE" || verificationLimited}
            disabled={expired || flowExpired || busy || storageError || needsConfirmation} />
          {error ? <InlineNotice tone="error" message={error} /> : null}
          {flowExpired ? <InlineNotice tone="warning" message="This registration flow has expired. Check registration to see recovery guidance." /> : null}

          <View style={styles.resendRow}>
            <Text style={styles.resendPrompt}>
              {expired ? "Code expired." : "Didn't get the code?"}
            </Text>
            <Pressable
              onPress={onResend}
              disabled={!canResend}
              style={styles.resendAction}
              accessibilityRole="button"
              accessibilityLabel={secondsLeft === 0 ? "Resend code" : `Resend code in ${countdown}`}
              accessibilityState={{ disabled: !canResend, busy: phase === "resending" }}
            >
              <Text style={[styles.resendLink, !canResend && styles.resendLinkMuted]}>
                {phase === "resending" ? "Requesting…" : secondsLeft === 0 ? "Resend code" : `Resend code (${countdown})`}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.guidance}>
            Code expiry and resend availability are separate. Only a server-verified code continues registration.
          </Text>

          <PrimaryButton
            label={phase === "verifying" ? "Verifying…" : storageError ? "Retry secure storage" : needsConfirmation || flowExpired ? "Check registration" : "Verify"}
            onPress={storageError || needsConfirmation || flowExpired ? onRetry : () => onVerify(code)}
            variant="forest"
            disabled={busy || (!(storageError || needsConfirmation || flowExpired) && !canVerify)}
            loading={busy}
            style={styles.verifyButton}
          />
          <OutlineButton label="Cancel" onPress={onCancel} disabled={busy} />
          </ScrollView>
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
    maxHeight: "90%",
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
  resendAction: { minHeight: 48, justifyContent: "center" },
  guidance: {
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
