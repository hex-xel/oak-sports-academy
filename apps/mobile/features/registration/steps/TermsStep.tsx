/**
 * @file apps/mobile/features/registration/steps/TermsStep.tsx
 * Step 6 — waiver text and the three required agreements.
 *
 * The waiver stays visible rather than behind a link: consent is only meaningful if the
 * text is readable on the same screen. The submit rule is also stated up front instead of
 * appearing only after a failed attempt.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Colors,
  Typography,
  Spacing,
  RegistrationColors,
} from "../../../constants/theme";
import { SectionCard } from "../components/SectionCard";
import { CheckboxRow } from "../components/CheckboxRow";
import { InlineNotice } from "../components/InlineNotice";
import type { StepProps } from "./step-props";

/**
 * Renders the waiver text and consent checkboxes.
 *
 * @param props - Draft, inline errors and update helpers from the wizard.
 * @returns Waiver card and agreement card.
 */
export const TermsStep: React.FC<StepProps> = ({ draft, errors, update, clearError }) => {
  const setConsent = (key: "waiver" | "fitness" | "terms", value: boolean) => {
    update((previous) => {
      const consents = { ...previous.consents };
      consents[key] = value;
      return { ...previous, consents };
    });
    clearError("consents");
  };

  return (
    <>
      <SectionCard title="Waiver and Agreement">
        <View style={styles.waiverBox}>
          <Text style={styles.waiverTitle}>
            Oak Sport Academy · Waiver and Release of Liability
          </Text>
          <Text style={styles.waiverBody}>
            <Text style={styles.waiverLead}>1. Assumption of risk. </Text>
            Taekwondo training and sparring involve physical contact and a risk of injury. I
            understand and accept these risks.
          </Text>
          <Text style={styles.waiverBody}>
            <Text style={styles.waiverLead}>2. Health declaration. </Text>
            I confirm that I am medically fit to train and will tell the academy about any
            condition that may affect my participation.
          </Text>
        </View>
      </SectionCard>

      <SectionCard title="I Agree">
        <CheckboxRow
          label="I have read and agree to the Waiver and Release of Liability."
          checked={draft.consents.waiver}
          onPress={() => setConsent("waiver", !draft.consents.waiver)}
          invalid={Boolean(errors.consents)}
        />
        <CheckboxRow
          label="I confirm that I am physically fit to train and have disclosed any health conditions."
          checked={draft.consents.fitness}
          onPress={() => setConsent("fitness", !draft.consents.fitness)}
          invalid={Boolean(errors.consents)}
        />
        <CheckboxRow
          label="I agree to the Terms and Conditions and the Data Privacy Notice."
          checked={draft.consents.terms}
          onPress={() => setConsent("terms", !draft.consents.terms)}
          invalid={Boolean(errors.consents)}
        />
        {errors.consents ? <InlineNotice tone="error" message={errors.consents} /> : null}
        <Text style={styles.hint}>Accept all three agreements to submit your registration.</Text>
      </SectionCard>
    </>
  );
};

const styles = StyleSheet.create({
  waiverBox: {
    backgroundColor: RegistrationColors.page,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RegistrationColors.divider,
    padding: Spacing.md,
  },
  waiverTitle: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
    marginBottom: Spacing.sm,
  },
  waiverBody: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.relaxed,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  waiverLead: {
    fontWeight: Typography.fontWeight.semibold,
    color: RegistrationColors.navy,
  },
  hint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.normal,
  },
});
