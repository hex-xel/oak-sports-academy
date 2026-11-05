/**
 * @file apps/mobile/features/registration/steps/RequirementsStep.tsx
 * Step 5 — 2×2 photo and valid ID.
 *
 * The device picker is not wired yet, so pressing a dropzone explains that instead of
 * pretending a file was attached. The wizard can still pass this step while uploads are
 * unavailable; `uploadsRequired` switches the blocking validation back on later.
 */

import React, { useState } from "react";
import { Text, StyleSheet } from "react-native";
import {
  Colors,
  Typography,
  Spacing,
} from "../../../constants/theme";
import { SectionCard } from "../components/SectionCard";
import { UploadTile } from "../components/UploadTile";
import { SelectField } from "../components/SelectField";
import { InlineNotice } from "../components/InlineNotice";
import { VALID_ID_OPTIONS } from "../types";
import type { StepProps } from "./step-props";

const UPLOAD_NOTICE =
  "Uploads aren't connected yet. This tile will open the device picker once registration is wired.";

/**
 * Document cards with the placeholder upload behaviour.
 *
 * @param props - Draft, inline errors and update helpers from the wizard.
 * @returns Photo and valid-ID cards.
 */
export const RequirementsStep: React.FC<StepProps> = ({ draft, errors, update, clearError }) => {
  const [noticeSlot, setNoticeSlot] = useState<"photo2x2" | "validId" | null>(null);

  return (
    <>
      <SectionCard title="2×2 Photo">
        <UploadTile
          title="Upload 2×2 Photo"
          description="JPG or PNG · plain background, face clearly visible"
          error={errors.photo2x2}
          onPress={() => setNoticeSlot("photo2x2")}
        />
        {noticeSlot === "photo2x2" ? <InlineNotice tone="warning" message={UPLOAD_NOTICE} /> : null}
      </SectionCard>

      <SectionCard title="Valid ID">
        <SelectField
          label="ID Type"
          placeholder="Select an ID type"
          value={draft.validIdType}
          options={VALID_ID_OPTIONS}
          onChange={(value) => {
            update((previous) => ({ ...previous, validIdType: value }));
            clearError("validId");
          }}
        />
        <UploadTile
          title="Upload front of ID"
          description="JPG, PNG or PDF · all details must be readable"
          error={errors.validId}
          onPress={() => setNoticeSlot("validId")}
        />
        {noticeSlot === "validId" ? <InlineNotice tone="warning" message={UPLOAD_NOTICE} /> : null}
        <Text style={styles.footnote}>
          The academy reviews these documents privately; they are never shown publicly.
        </Text>
      </SectionCard>
    </>
  );
};

const styles = StyleSheet.create({
  footnote: {
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.lineHeight.normal,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
