/**
 * @file apps/mobile/features/registration/RegistrationWizard.tsx
 * Six-step student registration flow.
 *
 * Visual source: `docs/design/mobile/high-fidelity/registration.png`, with component
 * specifics (progress card, password checklist, gold outline/secondary buttons, dashed
 * dropzones, OTP boxes) taken from
 * `docs/design/mobile/sticker-sheet/sticker-sheet.png`.
 *
 * Credentials/OTP use the registration API. Profile/files remain local until the
 * later agreements/upload/finalize integration; no preview submission is reported.
 */

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as Crypto from "expo-crypto";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ScrollViewInstance } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Spacing,
  Typography,
  RegistrationColors,
} from "../../constants/theme";
import { PrimaryButton } from "../../components/PrimaryButton";
import { OutlineButton } from "../../components/OutlineButton";
import { ProgressSteps } from "./components/ProgressSteps";
import { StudentTypeStep } from "./steps/StudentTypeStep";
import { CredentialsStep } from "./steps/CredentialsStep";
import { PersonalStep } from "./steps/PersonalStep";
import { ContactStep } from "./steps/ContactStep";
import { RequirementsStep } from "./steps/RequirementsStep";
import { TermsStep } from "./steps/TermsStep";
import { VerificationSheet } from "./VerificationSheet";
import { InlineNotice } from "./components/InlineNotice";
import { registrationApi } from "../../lib/registration-api";
import { readRegistration, writeRegistration, removeRegistration } from "../../lib/registration-store";
import { createRegistrationState } from "./registration-state";
import { createEmptyDraft } from "./types";
import type { RegistrationDraft, RegistrationErrors, RegistrationField } from "./types";
import {
  validateContactDetails,
  validateCredentials,
  validatePersonalInformation,
  validateRequirements,
  validateTerms,
} from "./validation";

/** Step labels shown in the progress card, in wizard order. */
const STEP_TITLES = [
  "Student Type",
  "Account Credentials",
  "Personal Information",
  "Contact Details",
  "Requirements",
  "Terms & Agreement",
] as const;

export interface RegistrationWizardProps {
  /** Leaves the wizard for the login screen from the initial Back action. */
  onExitToLogin: () => void;
  /**
   * Whether missing documents block step 5. Off while the device picker is not wired so
   * the flow stays reviewable; flip it once uploads land.
   */
  uploadsRequired?: boolean;
}

/**
 * Renders registration with server-backed verification and local profile steps.
 *
 * @param props - Exit callback and the uploads gate.
 * @returns Wizard chrome and OTP modal; real submission remains the later integration.
 */
export const RegistrationWizard: React.FC<RegistrationWizardProps> = ({
  onExitToLogin,
  uploadsRequired = false,
}) => {
  const [draft, setDraft] = useState<RegistrationDraft>(createEmptyDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [registration] = useState(() => createRegistrationState({ api: registrationApi,
    storage: { read: readRegistration, write: writeRegistration, remove: removeRegistration }, newId: () => Crypto.randomUUID() }));
  const registrationState = useSyncExternalStore(registration.subscribe, registration.getSnapshot, registration.getSnapshot);
  const busy = registrationState.phase !== "idle";
  const [now, setNow] = useState(Date.now);
  // Each step renders a different height, so the previous scroll offset would otherwise
  // leave the user halfway down the next step.
  const scrollRef = useRef<ScrollViewInstance>(null);
  // Android draws edge to edge, so system insets (status bar, gesture/3-button nav) must
  // be applied by hand; react-native's SafeAreaView is iOS-only.
  const insets = useSafeAreaInsets();

  useEffect(() => { void registration.restore(); return () => registration.cancel(); }, [registration]);
  useEffect(() => {
    setNow(Date.now());
    if (registrationState.blockedUntil <= Date.now()) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= registrationState.blockedUntil) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [registrationState.blockedUntil]);

  const goToStep = useCallback((index: number) => {
    setStepIndex(index);
    setErrors({});
    setShowErrors(false);
  }, []);

  useEffect(() => {
    if (registration.getSnapshot().saved !== registrationState.saved) return;
    const saved = registrationState.saved;
    if (!saved?.flow) setVerifying(false);
    if (saved) setDraft(previous => ({ ...previous, email: saved.email, studentType: saved.studentType,
      emailVerified: registrationState.verified,
      ...(saved.flow ? { password: "", confirmPassword: "" } : {}) }));
    else setDraft(previous => ({ ...previous, emailVerified: false }));
    if (registrationState.verified) {
      setVerifying(false);
      setStepIndex(previous => previous <= 1 ? 2 : previous);
      setErrors({}); setShowErrors(false);
    }
  }, [registration, registrationState.saved, registrationState.verified]);

  const changeAccount = () => {
    setDraft(createEmptyDraft()); setVerifying(false); goToStep(0);
    void registration.reset();
  };

  const clearError = useCallback((field: RegistrationField) => {
    setErrors((previous) => {
      if (!(field in previous)) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  // Start every step at the top so the progress card and first field are visible.
  useEffect(() => {
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [stepIndex]);

  /**
   * Validates the active step.
   *
   * @param index Step being submitted.
   * @returns Messages for that step, using the same keys as the field components.
   */
  const validateStep = (index: number): RegistrationErrors => {
    switch (index) {
      case 0:
        return draft.studentType ? {} : { studentType: "Choose your student type to continue." };
      case 1:
        return validateCredentials(draft);
      case 2:
        return validatePersonalInformation(draft);
      case 3:
        return validateContactDetails(draft);
      case 4:
        return validateRequirements(draft, uploadsRequired);
      default:
        return validateTerms(draft);
    }
  };

  const handleContinue = async () => {
    if (busy || registrationState.storageError || registrationState.blockedUntil > Date.now()) return;
    if (stepIndex === 1 && registrationState.needsConfirmation) {
      if (await registration.restore() && registration.getSnapshot().saved?.flow && !registration.getSnapshot().verified) setVerifying(true);
      return;
    }
    if (stepIndex === 1 && registrationState.saved?.flow) {
      if (registrationState.verified) goToStep(2); else setVerifying(true);
      return;
    }
    if (stepIndex > 1 && !registrationState.verified) { goToStep(1); return; }
    const stepErrors = validateStep(stepIndex);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      setShowErrors(true);
      return;
    }
    if (stepIndex === 1 && draft.studentType) {
      if (await registration.start(draft.email, draft.studentType, draft.password)) setVerifying(true);
      return;
    }
    if (stepIndex === STEP_TITLES.length - 1) {
      // No preview success: final agreements/uploads/submission are wired in T017.
      return;
    }
    goToStep(stepIndex + 1);
  };

  const handleBack = () => {
    if (registration.getSnapshot().phase !== "idle") return;
    if (stepIndex === 0) {
      onExitToLogin();
      return;
    }
    goToStep(stepIndex - 1);
  };

  // Android back should walk the wizard backwards before leaving the route.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (registration.getSnapshot().phase !== "idle") return true;
      if (verifying) {
        setVerifying(false);
        return true;
      }
      if (stepIndex === 0) return false;
      goToStep(stepIndex - 1);
      return true;
    });
    return () => subscription.remove();
  }, [busy, goToStep, stepIndex, verifying]);

  const stepProps = {
    draft,
    errors,
    update: (updater: (previous: RegistrationDraft) => RegistrationDraft) => {
      setDraft(previous => {
        const current = registration.getSnapshot();
        if (current.phase !== "idle" || current.storageError) return previous;
        const next = updater(previous);
        // Accepted identity is locked by its controls until explicit account reset.
        if (current.saved?.flow) return { ...next, studentType: previous.studentType, email: previous.email,
          emailVerified: current.verified, password: "", confirmPassword: "" };
        return next;
      });
    },
    clearError,
    showErrors,
    busy: busy || registrationState.storageError,
    credentialsAccepted: Boolean(registrationState.saved?.flow),
    onChangeAccount: changeAccount,
  };

  const isLastStep = stepIndex === STEP_TITLES.length - 1;

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle} accessibilityRole="header">
            Registration
          </Text>
          <ProgressSteps
            stepIndex={stepIndex}
            totalSteps={STEP_TITLES.length}
            title={STEP_TITLES[stepIndex] ?? ""}
          />

          {registrationState.error && !verifying ? <InlineNotice tone="error" message={registrationState.error} /> : null}
          {registrationState.storageError ? <>
            <OutlineButton label="Retry registration storage" onPress={() => { void registration.retryStorage(); }} disabled={busy} />
            <OutlineButton label="Clear this registration" onPress={changeAccount} disabled={busy} />
          </> : null}
          {stepIndex === 5 ? <InlineNotice tone="warning" message="Profile and file submission is not connected yet. This registration has not been submitted." /> : null}

          {stepIndex === 0 ? <StudentTypeStep {...stepProps} /> : null}
          {stepIndex === 1 ? <CredentialsStep {...stepProps} /> : null}
          {stepIndex === 2 ? <PersonalStep {...stepProps} /> : null}
          {stepIndex === 3 ? <ContactStep {...stepProps} /> : null}
          {stepIndex === 4 ? <RequirementsStep {...stepProps} /> : null}
          {stepIndex === 5 ? <TermsStep {...stepProps} /> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
          <OutlineButton
            label={stepIndex === 0 ? "Back to Login" : "Back"}
            onPress={handleBack}
            style={styles.footerSecondary}
            disabled={busy}
          />
          <PrimaryButton
            label={busy ? (registrationState.phase === "starting" ? "Starting registration…" : "Checking registration…")
              : registrationState.blockedUntil > now ? `Try again in ${Math.ceil((registrationState.blockedUntil - now) / 1000)}s`
                : registrationState.needsConfirmation ? "Try again" : isLastStep ? "Submit Registration" : "Continue"}
            onPress={() => { void handleContinue(); }}
            variant={isLastStep ? "gold" : "forest"}
            loading={busy}
            disabled={isLastStep || registrationState.storageError || registrationState.blockedUntil > now}
          />
        </View>
      </KeyboardAvoidingView>

      <VerificationSheet
        visible={verifying && Boolean(registrationState.saved?.flow)}
        email={draft.email.trim()}
        flow={registrationState.saved?.flow ?? null}
        phase={registrationState.phase}
        error={registrationState.error}
        errorCode={registrationState.errorCode}
        blockedUntil={registrationState.blockedUntil}
        verificationLimited={registrationState.verificationLimited}
        needsConfirmation={registrationState.needsConfirmation}
        storageError={registrationState.storageError}
        onCancel={() => { if (registration.getSnapshot().phase === "idle") setVerifying(false); }}
        onVerify={code => { void registration.verify(code); }}
        onResend={() => { void registration.resend(); }}
        onRetry={() => { void (registrationState.storageError ? registration.retryStorage() : registration.restore()); }}
        onCodeChange={() => registration.clearCodeError()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: RegistrationColors.page,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === "android" ? Spacing.xl : Spacing.md,
    paddingBottom: Spacing.lg,
  },
  screenTitle: {
    fontSize: Typography.fontSize.display,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
    marginBottom: Spacing.base,
  },
  footer: {
    backgroundColor: RegistrationColors.card,
    borderTopWidth: 1,
    borderTopColor: RegistrationColors.divider,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  footerSecondary: {
    marginBottom: Spacing.md,
  },
});
