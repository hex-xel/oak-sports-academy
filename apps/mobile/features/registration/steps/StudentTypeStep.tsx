/**
 * @file apps/mobile/features/registration/steps/StudentTypeStep.tsx
 * Step 1 — choose between a new white belt and an experienced student.
 */

import React from "react";
import { View } from "react-native";
import { SectionCard } from "../components/SectionCard";
import { OptionCard } from "../components/OptionCard";
import { InlineNotice } from "../components/InlineNotice";
import type { StudentType } from "../types";
import type { StepProps } from "./step-props";

/**
 * Renders the student-type choice as an accessible radio group.
 *
 * @param props - Draft, inline errors and update helpers from the wizard.
 * @returns Two selectable cards plus any validation message.
 */
export const StudentTypeStep: React.FC<StepProps> = ({
  draft,
  errors,
  update,
  clearError,
  busy = false,
  credentialsAccepted = false,
}) => {
  const choose = (studentType: StudentType) => {
    update((previous) => ({ ...previous, studentType }));
    clearError("studentType");
  };

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Student type">
      <SectionCard>
        <OptionCard
          title="Newly White Belt"
          description="I am new to taekwondo and have not earned a belt yet."
          icon="person-outline"
          selected={draft.studentType === "newly-white-belt"}
          onPress={() => choose("newly-white-belt")}
          disabled={busy || credentialsAccepted}
        />
        <OptionCard
          title="Experienced Student"
          description="I already hold a colored or black belt."
          icon="ribbon-outline"
          selected={draft.studentType === "experienced"}
          onPress={() => choose("experienced")}
          disabled={busy || credentialsAccepted}
        />
      </SectionCard>
      {credentialsAccepted ? <InlineNotice tone="info" message="Account details are already accepted. To start another flow, use another email from Account Credentials." /> : null}
      {errors.studentType ? (
        <InlineNotice tone="error" message={errors.studentType} />
      ) : null}
    </View>
  );
};
