/**
 * @file apps/mobile/features/registration/components/SelectField.tsx
 * Dropdown selector for the registration wizard.
 *
 * React Native has no native picker, so the control renders the same bordered box as a
 * text field and opens a bottom sheet listing the options. Chosen values are announced
 * with their label rather than the raw stored value.
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
import { OutlineButton } from "../../../components/OutlineButton";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  /** Caption above the control. */
  label: string;
  /** Currently selected value, or null while unset. */
  value: string | null;
  /** Choices shown in the sheet. */
  options: ReadonlyArray<SelectOption>;
  /** Shown inside the box while nothing is selected. */
  placeholder: string;
  /** Called with the chosen option's value. */
  onChange: (value: string) => void;
  /** Inline error message. */
  error?: string | undefined;
  /** Neutral helper text. */
  hint?: string | undefined;
}

/**
 * Pressable select control with an accessible options sheet.
 *
 * @param props - Label, value, options, placeholder, change handler and messages.
 * @returns Closed select box plus its modal sheet.
 */
export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  placeholder,
  onChange,
  error,
  hint,
}) => {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const selected = options.find((option) => option.value === value) ?? null;
  const hasError = Boolean(error && error.trim().length > 0);

  return (
    <FieldShell label={label} error={error} hint={hint}>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.box, hasError && styles.boxError]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? selected.label : placeholder}`}
        accessibilityHint="Opens the list of options"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.valueText, selected ? styles.valueFilled : styles.valuePlaceholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={RegistrationColors.progressRemaining} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.scrim}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close options"
        >
          <Pressable style={[styles.sheet, { paddingBottom: Spacing.xl + insets.bottom }]} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView style={styles.optionList} keyboardShouldPersistTaps="handled">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.option,
                      pressed && styles.optionPressed,
                      isSelected && styles.optionSelected,
                    ]}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={option.label}
                  >
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color={RegistrationColors.forest} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
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
    maxHeight: "80%",
  },
  sheetTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
    marginBottom: Spacing.md,
  },
  optionList: {
    marginBottom: Spacing.base,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.input,
  },
  optionPressed: {
    backgroundColor: RegistrationColors.page,
  },
  optionSelected: {
    backgroundColor: RegistrationColors.successSurface,
  },
  optionLabel: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: RegistrationColors.navy,
  },
  optionLabelSelected: {
    fontWeight: Typography.fontWeight.semibold,
  },
});
