/**
 * @file apps/mobile/features/registration/components/DateField.tsx
 * Date-of-birth control for the registration wizard.
 *
 * The design calls for a calendar affordance rather than free text, and the app ships no
 * date-picker dependency. This control therefore opens a three-column day/month/year
 * sheet styled with registration tokens, which keeps the value a real calendar date
 * (no ambiguous `03/04/2002`) and stays usable with a screen reader.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  RegistrationColors,
} from "../../../constants/theme";
import { FieldShell } from "./FieldShell";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { OutlineButton } from "../../../components/OutlineButton";
import { formatDateOfBirth } from "../validation";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export interface DateFieldProps {
  /** Caption above the control. */
  label: string;
  /** Selected date as `yyyy-mm-dd`, or null while unset. */
  value: string | null;
  /** Called with the confirmed ISO date. */
  onChange: (iso: string) => void;
  /** Inline error message. */
  error?: string | undefined;
  /** Neutral helper text (for example the computed age). */
  hint?: string | undefined;
}

/**
 * Calendar-style date field with a day/month/year selection sheet.
 *
 * @param props - Label, current date, change handler and messages.
 * @returns Pressable field that opens the picker sheet.
 */
export const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  error,
  hint,
}) => {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const hasError = Boolean(error && error.trim().length > 0);
  const displayValue = value ? formatDateOfBirth(value) : "";

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, index) => currentYear - index);
  const daysInMonth = month !== null && year !== null
    ? new Date(Date.UTC(year, month, 0)).getUTCDate()
    : 31;
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const openPicker = () => {
    const parsed = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
    if (parsed) {
      setYear(Number(parsed[1]));
      setMonth(Number(parsed[2]));
      setDay(Number(parsed[3]));
    } else {
      setYear(null);
      setMonth(null);
      setDay(null);
    }
    setOpen(true);
  };

  const selectMonth = (next: number) => {
    setMonth(next);
    const limit = year !== null ? new Date(Date.UTC(year, next, 0)).getUTCDate() : 31;
    if (day !== null && day > limit) setDay(limit);
  };

  const selectYear = (next: number) => {
    setYear(next);
    if (month !== null) {
      const limit = new Date(Date.UTC(next, month, 0)).getUTCDate();
      if (day !== null && day > limit) setDay(limit);
    }
  };

  const canConfirm = day !== null && month !== null && year !== null;

  const confirm = () => {
    if (day === null || month === null || year === null) return;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
  };

  return (
    <FieldShell label={label} error={error} hint={hint}>
      <Pressable
        onPress={openPicker}
        style={[styles.box, hasError && styles.boxError]}
        accessibilityRole="button"
        accessibilityLabel={displayValue ? `${label}: ${displayValue}` : label}
        accessibilityHint="Opens a day, month and year picker"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.valueText, displayValue ? styles.valueFilled : styles.valuePlaceholder]}>
          {displayValue || "Select date of birth"}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={RegistrationColors.progressRemaining} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.scrim}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close date picker"
        >
          <Pressable style={[styles.sheet, { paddingBottom: Spacing.xl + insets.bottom }]} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <View style={styles.columns}>
              <View style={styles.column}>
                <Text style={styles.columnHeader}>Day</Text>
                <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                  {days.map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.cell, day === option && styles.cellSelected]}
                      onPress={() => setDay(option)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: day === option }}
                      accessibilityLabel={`Day ${option}`}
                    >
                      <Text style={[styles.cellText, day === option && styles.cellTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.columnWide}>
                <Text style={styles.columnHeader}>Month</Text>
                <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((name, index) => {
                    const option = index + 1;
                    return (
                      <Pressable
                        key={name}
                        style={[styles.cell, month === option && styles.cellSelected]}
                        onPress={() => selectMonth(option)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: month === option }}
                        accessibilityLabel={name}
                      >
                        <Text style={[styles.cellText, month === option && styles.cellTextSelected]}>
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.column}>
                <Text style={styles.columnHeader}>Year</Text>
                <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                  {years.map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.cell, year === option && styles.cellSelected]}
                      onPress={() => selectYear(option)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: year === option }}
                      accessibilityLabel={`Year ${option}`}
                    >
                      <Text style={[styles.cellText, year === option && styles.cellTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
            <PrimaryButton
              label="Set date"
              onPress={confirm}
              variant="forest"
              disabled={!canConfirm}
              style={styles.confirmButton}
            />
            <OutlineButton label="Cancel" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </FieldShell>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    borderWidth: 1,
    borderColor: RegistrationColors.fieldBorder,
    borderRadius: BorderRadius.input,
    backgroundColor: RegistrationColors.card,
    paddingHorizontal: Spacing.md,
  },
  boxError: {
    borderColor: RegistrationColors.error,
    borderWidth: 1.5,
  },
  valueText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    paddingRight: Spacing.sm,
  },
  valueFilled: {
    color: RegistrationColors.navy,
  },
  valuePlaceholder: {
    color: Colors.textMuted,
  },
  scrim: {
    flex: 1,
    backgroundColor: RegistrationColors.scrim,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: RegistrationColors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  sheetTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
    marginBottom: Spacing.md,
  },
  columns: {
    flexDirection: "row",
    marginBottom: Spacing.base,
  },
  column: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  columnWide: {
    flex: 1.6,
    marginRight: Spacing.sm,
  },
  columnHeader: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },
  columnScroll: {
    height: 190,
    borderWidth: 1,
    borderColor: RegistrationColors.divider,
    borderRadius: BorderRadius.input,
  },
  cell: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  cellSelected: {
    backgroundColor: RegistrationColors.successSurface,
  },
  cellText: {
    fontSize: Typography.fontSize.sm + 1,
    color: RegistrationColors.navy,
  },
  cellTextSelected: {
    fontWeight: Typography.fontWeight.bold,
  },
  confirmButton: {
    marginBottom: Spacing.md,
  },
});
