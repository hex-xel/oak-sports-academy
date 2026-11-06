/**
 * @file apps/mobile/features/registration/RegistrationWizard.tsx
 * Six-step student registration flow.
 *
 * Visual source: `docs/design/mobile/high-fidelity/registration.png`, with component
 * specifics (progress card, password checklist, gold outline/secondary buttons, dashed
 * dropzones, OTP boxes) taken from
 * `docs/design/mobile/sticker-sheet/sticker-sheet.png`.
 *
 * Scope note: this is UI only. Nothing is submitted, uploaded or verified. The wizard
 * keeps every answer in local state so Back/Continue never loses input.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { RegistrationSuccess } from "./RegistrationSuccess";
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
  /** Leaves the wizard for the login screen (step 1 "Back to Login" and success CTA). */
  onExitToLogin: () => void;
  /**
   * Whether missing documents block step 5. Off while the device picker is not wired so
   * the flow stays reviewable; flip it once uploads land.
   */
  uploadsRequired?: boolean;
}

/**
 * Renders the registration wizard and its confirmation screen.
 *
 * @param props - Exit callback and the uploads gate.
 * @returns Wizard chrome (title, progress, step body, footer) or the success screen.
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
  const [success, setSuccess] = useState(false);
  // Each step renders a different height, so the previous scroll offset would otherwise
  // leave the user halfway down the next step.
  const scrollRef = useRef<ScrollViewInstance>(null);
  // Android draws edge to edge, so system insets (status bar, gesture/3-button nav) must
  // be applied by hand; react-native's SafeAreaView is iOS-only.
  const insets = useSafeAreaInsets();

  const goToStep = useCallback((index: number) => {
    setStepIndex(index);
    setErrors({});
    setShowErrors(false);
  }, []);

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

  const handleContinue = () => {
    const stepErrors = validateStep(stepIndex);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      setShowErrors(true);
      return;
    }
    if (stepIndex === 1 && !draft.emailVerified) {
      setVerifying(true);
      return;
    }
    if (stepIndex === STEP_TITLES.length - 1) {
      setSuccess(true);
      return;
    }
    goToStep(stepIndex + 1);
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      onExitToLogin();
      return;
    }
    goToStep(stepIndex - 1);
  };

  const handleVerified = () => {
    setDraft((previous) => ({ ...previous, emailVerified: true }));
    setVerifying(false);
    goToStep(2);
  };

  // Android back should walk the wizard backwards before leaving the route.
  useEffect(() => {
    if (success) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (verifying) {
        setVerifying(false);
        return true;
      }
      if (stepIndex === 0) return false;
      goToStep(stepIndex - 1);
      return true;
    });
    return () => subscription.remove();
  }, [goToStep, stepIndex, success, verifying]);

  if (success) {
    return (
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <RegistrationSuccess email={draft.email.trim()} onContinueToLogin={onExitToLogin} />
      </View>
    );
  }

  const stepProps = {
    draft,
    errors,
    update: setDraft,
    clearError,
    showErrors,
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
          />
          <PrimaryButton
            label={isLastStep ? "Submit Registration" : "Continue"}
            onPress={handleContinue}
            variant={isLastStep ? "gold" : "forest"}
          />
        </View>
      </KeyboardAvoidingView>

      <VerificationSheet
        visible={verifying}
        email={draft.email.trim()}
        onCancel={() => setVerifying(false)}
        onVerified={handleVerified}
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
