/**
 * @file apps/mobile/features/registration/steps/CredentialsStep.tsx
 * Step 2 — email, password and confirmation.
 *
 * The password policy is shown as a live checklist (sticker sheet pattern) instead of a
 * single generic sentence, so the user can see which rule is still missing.
 */

import React from "react";
import { RegistrationTextField } from "../components/RegistrationTextField";
import { SectionCard } from "../components/SectionCard";
import { PasswordChecklist } from "../components/PasswordChecklist";
import type { StepProps } from "./step-props";

/**
 * Email and password fields for a new account.
 *
 * @param props - Draft, inline errors and update helpers from the wizard.
 * @returns The credential card with the password requirement checklist.
 */
export const CredentialsStep: React.FC<StepProps> = ({
  draft,
  errors,
  update,
  clearError,
  showErrors,
}) => {
  return (
    <SectionCard>
      <RegistrationTextField
        label="Email Address"
        placeholder="Enter your email address"
        value={draft.email}
        onChangeText={(text) => {
          // Changing the address invalidates a previously confirmed code.
          update((previous) => ({ ...previous, email: text, emailVerified: false }));
          clearError("email");
        }}
        error={errors.email ?? ""}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
      />
      <RegistrationTextField
        label="Password"
        placeholder="Create a password"
        value={draft.password}
        onChangeText={(text) => {
          update((previous) => ({ ...previous, password: text }));
          clearError("password");
        }}
        error={errors.password ?? ""}
        isPassword
        textContentType="newPassword"
      />
      <PasswordChecklist password={draft.password} showUnmet={showErrors} />
      <RegistrationTextField
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={draft.confirmPassword}
        onChangeText={(text) => {
          update((previous) => ({ ...previous, confirmPassword: text }));
          clearError("confirmPassword");
        }}
        error={errors.confirmPassword ?? ""}
        isPassword
        textContentType="newPassword"
      />
    </SectionCard>
  );
};
