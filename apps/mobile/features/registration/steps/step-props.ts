/**
 * @file apps/mobile/features/registration/steps/step-props.ts
 * Shared prop contract for the six registration step bodies.
 *
 * Each step is a pure view over the wizard's draft and inline errors; it never stores
 * field values itself, so going Back and forward keeps every answer.
 */

import type {
  RegistrationDraft,
  RegistrationErrors,
  RegistrationField,
} from "../types";

export interface StepProps {
  /** Current answers for all steps. */
  draft: RegistrationDraft;
  /** Inline messages for the active step (may include stale keys from other steps). */
  errors: RegistrationErrors;
  /** Updates the draft immutably. */
  update: (updater: (previous: RegistrationDraft) => RegistrationDraft) => void;
  /** Removes a single inline message once the user edits that field. */
  clearError: (field: RegistrationField) => void;
  /** True after a blocked Continue press; steps may reveal unmet-requirement styling. */
  showErrors: boolean;
}
