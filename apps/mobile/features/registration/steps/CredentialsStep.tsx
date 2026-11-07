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
import { InlineNotice } from "../components/InlineNotice";
import { OutlineButton } from "../../../components/OutlineButton";

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
  busy = false,
  credentialsAccepted = false,
  onChangeAccount,
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
        disabled={busy || credentialsAccepted}
      />
      <RegistrationTextField
        label="Password"
        placeholder={credentialsAccepted ? "Password accepted" : "Create a password"}
        value={draft.password}
        onChangeText={(text) => {
          update((previous) => ({ ...previous, password: text }));
          clearError("password");
        }}
        error={errors.password ?? ""}
        isPassword
        textContentType="newPassword"
        disabled={busy || credentialsAccepted}
      />
      {!credentialsAccepted ? <PasswordChecklist password={draft.password} showUnmet={showErrors} /> : null}
      <RegistrationTextField
        label="Confirm Password"
        placeholder={credentialsAccepted ? "Confirmation cleared" : "Re-enter your password"}
        value={draft.confirmPassword}
        onChangeText={(text) => {
          update((previous) => ({ ...previous, confirmPassword: text }));
          clearError("confirmPassword");
        }}
        error={errors.confirmPassword ?? ""}
        isPassword
        textContentType="newPassword"
        disabled={busy || credentialsAccepted}
      />
      <InlineNotice tone="info" message={credentialsAccepted
        ? (draft.emailVerified ? "Email verified for registration. Your account still awaits assessment approval."
          : "Credentials accepted. Check email if registration can continue; delivery is unconfirmed.")
        : "This step creates account data. Your password is cleared here after acceptance; profile details and files stay local until final agreements. If resuming, enter the original password—an existing password will not change."} />
      {credentialsAccepted && onChangeAccount ? <>
        <InlineNotice tone="warning" message="Using another email clears your local registration entries. It does not delete the account already created." />
        <OutlineButton label="Use another email" onPress={onChangeAccount} disabled={busy} />
      </> : null}
    </SectionCard>
  );
};
