/**
 * @file apps/mobile/app/register.tsx
 * Route entry for the six-step student registration UI.
 *
 * The wizard is presentation only: no account is created, no email is sent and no
 * document is uploaded. Returning to login uses a replace so the abandoned draft cannot
 * be reached with the system back gesture.
 */

import React from "react";
import { useRouter } from "expo-router";
import { RegistrationWizard } from "../features/registration/RegistrationWizard";

/**
 * Renders the registration wizard at `/register`.
 *
 * @returns The wizard with navigation back to the login screen.
 */
export default function RegisterScreen() {
  const router = useRouter();
  return <RegistrationWizard onExitToLogin={() => router.replace("/login")} />;
}
