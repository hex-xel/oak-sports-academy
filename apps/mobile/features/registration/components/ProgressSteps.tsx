/**
 * @file apps/mobile/features/registration/components/ProgressSteps.tsx
 * Step header for the registration wizard.
 *
 * Matches the sticker sheet "Registration / Step N progress" component: white card,
 * "Step 2 of 6 · Account Credentials" on the left, percentage on the right, and one
 * segment per step (dark gold for reached steps, gray-green for the rest).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  RegistrationColors,
} from "../../../constants/theme";

export interface ProgressStepsProps {
  /** Zero-based index of the step currently shown. */
  stepIndex: number;
  /** Total number of steps in the wizard. */
  totalSteps: number;
  /** Human-readable step name shown after the separator. */
  title: string;
}

/**
 * Renders the progress card for the active registration step.
 *
 * @param props - Current index, total, and the step title.
 * @returns Accessible progress card with segmented indicator.
 */
export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  stepIndex,
  totalSteps,
  title,
}) => {
  const current = stepIndex + 1;
  const percent = Math.round((current / totalSteps) * 100);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${totalSteps}, ${title}`}
      accessibilityValue={{ min: 1, max: totalSteps, now: current, text: `${percent}% complete` }}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          Step {current} of {totalSteps} · {title}
        </Text>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              index === totalSteps - 1 ? styles.segmentLast : null,
              index <= stepIndex ? styles.segmentReached : styles.segmentUpcoming,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: RegistrationColors.card,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: RegistrationColors.divider,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm + 2,
  },
  title: {
    flexShrink: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
  },
  percent: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  track: {
    flexDirection: "row",
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: BorderRadius.full,
    marginRight: 6,
  },
  segmentLast: {
    marginRight: 0,
  },
  segmentReached: {
    backgroundColor: RegistrationColors.goldDeep,
  },
  segmentUpcoming: {
    backgroundColor: RegistrationColors.progressRemaining,
  },
});
