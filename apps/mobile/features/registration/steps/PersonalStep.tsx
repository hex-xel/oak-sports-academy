/**
 * @file apps/mobile/features/registration/steps/PersonalStep.tsx
 * Step 3 — names, gender and date of birth.
 *
 * Age is derived, never typed: it is shown read-only with the sticker sheet's
 * "Calculated: age 24 · Adult" helper so the user can see the value the academy uses.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RegistrationTextField } from "../components/RegistrationTextField";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  RegistrationColors,
} from "../../../constants/theme";
import { SectionCard } from "../components/SectionCard";
import { SelectField } from "../components/SelectField";
import { DateField } from "../components/DateField";
import { FieldShell } from "../components/FieldShell";
import { GENDER_OPTIONS, toGender } from "../types";
import { ageSummary, computeAge } from "../validation";
import type { StepProps } from "./step-props";

/**
 * Personal information fields with a computed, read-only age.
 *
 * @param props - Draft, inline errors and update helpers from the wizard.
 * @returns The personal-information card.
 */
export const PersonalStep: React.FC<StepProps> = ({
  draft,
  errors,
  update,
  clearError,
}) => {
  const age = draft.dateOfBirth ? computeAge(draft.dateOfBirth) : null;

  return (
    <SectionCard>
      <RegistrationTextField
        label="First Name"
        placeholder="Enter your first name"
        value={draft.firstName}
        onChangeText={(text) => {
          update((previous) => ({ ...previous, firstName: text }));
          clearError("firstName");
        }}
        error={errors.firstName ?? ""}
        autoCapitalize="words"
        textContentType="givenName"
      />
      <RegistrationTextField
        label="Middle Name"
        placeholder="Enter your middle name"
        value={draft.middleName}
        onChangeText={(text) => {
          update((previous) => ({ ...previous, middleName: text }));
          clearError("middleName");
        }}
        error={errors.middleName ?? ""}
        helperText="Optional"
        autoCapitalize="words"
      />
      <RegistrationTextField
        label="Surname"
        placeholder="Enter your surname"
        value={draft.surname}
        onChangeText={(text) => {
          update((previous) => ({ ...previous, surname: text }));
          clearError("surname");
        }}
        error={errors.surname ?? ""}
        autoCapitalize="words"
        textContentType="familyName"
      />
      <SelectField
        label="Gender"
        placeholder="Select an option"
        value={draft.gender}
        options={GENDER_OPTIONS}
        onChange={(value) => {
          update((previous) => ({ ...previous, gender: toGender(value) }));
          clearError("gender");
        }}
        error={errors.gender}
      />
      <DateField
        label="Date of Birth"
        value={draft.dateOfBirth}
        onChange={(iso) => {
          update((previous) => ({ ...previous, dateOfBirth: iso }));
          clearError("dateOfBirth");
        }}
        error={errors.dateOfBirth}
        hint={ageSummary(age)}
      />
      <FieldShell label="Age" hint="Calculated automatically from your date of birth." style={styles.ageField}>
        <View style={styles.ageBox} accessible accessibilityLabel={`Age: ${age !== null ? `${age} years old` : "not available yet"}`}>
          <Text style={[styles.ageValue, age === null && styles.ageValueMuted]}>
            {age !== null ? String(age) : "Unavailable"}
          </Text>
        </View>
      </FieldShell>
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  ageField: {
    marginBottom: 0,
  },
  ageBox: {
    minHeight: 52,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: RegistrationColors.divider,
    borderRadius: BorderRadius.input,
    backgroundColor: RegistrationColors.page,
    paddingHorizontal: Spacing.md,
  },
  ageValue: {
    fontSize: Typography.fontSize.base,
    color: RegistrationColors.navy,
  },
  ageValueMuted: {
    color: Colors.textMuted,
  },
});
