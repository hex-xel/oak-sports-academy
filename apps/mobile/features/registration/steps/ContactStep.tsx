/**
 * @file apps/mobile/features/registration/steps/ContactStep.tsx
 * Step 4 — mobile number, address and, for minors, parent/guardian details.
 *
 * The guardian block appears only when the computed age is under 18 and is announced as
 * a requirement so a minor knows the form grew for a reason.
 */

import React from "react";
import { RegistrationTextField } from "../components/RegistrationTextField";
import { SectionCard } from "../components/SectionCard";
import { SelectField } from "../components/SelectField";
import { InlineNotice } from "../components/InlineNotice";
import { RELATIONSHIP_OPTIONS, toRelationship } from "../types";
import type { GuardianDraft } from "../types";
import { formatMobileNational, isMinorRegistration, MOBILE_NUMBER_MAX_LENGTH } from "../validation";
import type { StepProps } from "./step-props";

/**
 * Contact-detail fields with the conditional guardian section.
 *
 * @param props - Draft, inline errors and update helpers from the wizard.
 * @returns Address and guardian cards, or only the address card for adults.
 */
export const ContactStep: React.FC<StepProps> = ({
  draft,
  errors,
  update,
  clearError,
}) => {
  const isMinor = isMinorRegistration(draft.dateOfBirth);
  const updateGuardian = (patch: Partial<GuardianDraft>) => {
    update((previous) => ({ ...previous, guardian: { ...previous.guardian, ...patch } }));
  };

  return (
    <>
      <SectionCard title="Contact Details">
        <RegistrationTextField
          label="Mobile Number"
          placeholder="917 555 0124"
          value={draft.mobile}
          onChangeText={(text) => {
            update((previous) => ({ ...previous, mobile: formatMobileNational(text) }));
            clearError("mobile");
          }}
          error={errors.mobile ?? ""}
          prefix="+63"
          maxLength={MOBILE_NUMBER_MAX_LENGTH}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
      </SectionCard>

      <SectionCard title="Address">
        <RegistrationTextField
          label="House and Lot"
          placeholder="Enter house and lot number"
          value={draft.houseAndLot}
          onChangeText={(text) => {
            update((previous) => ({ ...previous, houseAndLot: text }));
            clearError("houseAndLot");
          }}
          error={errors.houseAndLot ?? ""}
          autoCapitalize="words"
        />
        <RegistrationTextField
          label="Barangay"
          placeholder="Enter barangay"
          value={draft.barangay}
          onChangeText={(text) => {
            update((previous) => ({ ...previous, barangay: text }));
            clearError("barangay");
          }}
          error={errors.barangay ?? ""}
          autoCapitalize="words"
        />
        <RegistrationTextField
          label="Municipality"
          placeholder="Enter municipality or city"
          value={draft.municipality}
          onChangeText={(text) => {
            update((previous) => ({ ...previous, municipality: text }));
            clearError("municipality");
          }}
          error={errors.municipality ?? ""}
          autoCapitalize="words"
        />
        <RegistrationTextField
          label="Province"
          placeholder="Enter province"
          value={draft.province}
          onChangeText={(text) => {
            update((previous) => ({ ...previous, province: text }));
            clearError("province");
          }}
          error={errors.province ?? ""}
          autoCapitalize="words"
        />
      </SectionCard>

      {isMinor ? (
        <>
          <InlineNotice
            tone="info"
            message="Because you're under 18, a parent or guardian must provide their details before you can continue."
          />
          <SectionCard title="Parent / Guardian Information">
            <RegistrationTextField
              label="Parent / Guardian Name"
              placeholder="Enter parent or guardian name"
              value={draft.guardian.name}
              onChangeText={(text) => {
                updateGuardian({ name: text });
                clearError("guardianName");
              }}
              error={errors.guardianName ?? ""}
              autoCapitalize="words"
              textContentType="name"
            />
            <SelectField
              label="Relationship to Athlete"
              placeholder="Select relationship"
              value={draft.guardian.relationship}
              options={RELATIONSHIP_OPTIONS}
              onChange={(value) => {
                updateGuardian({ relationship: toRelationship(value) });
                clearError("guardianRelationship");
              }}
              error={errors.guardianRelationship}
            />
            <RegistrationTextField
              label="Parent / Guardian Occupation"
              placeholder="Enter occupation"
              value={draft.guardian.occupation}
              onChangeText={(text) => {
                updateGuardian({ occupation: text });
                clearError("guardianOccupation");
              }}
              error={errors.guardianOccupation ?? ""}
              helperText="Optional"
              autoCapitalize="words"
            />
            <RegistrationTextField
              label="Parent / Guardian Contact Number"
              placeholder="917 555 0188"
              value={draft.guardian.contact}
              onChangeText={(text) => {
                updateGuardian({ contact: formatMobileNational(text) });
                clearError("guardianContact");
              }}
              error={errors.guardianContact ?? ""}
              prefix="+63"
              maxLength={MOBILE_NUMBER_MAX_LENGTH}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
          </SectionCard>
        </>
      ) : null}
    </>
  );
};
