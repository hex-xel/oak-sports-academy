/**
 * @file apps/mobile/features/registration/components/OtpInput.tsx
 * Six-box one-time-code input from the sticker sheet OTP pattern.
 *
 * A single transparent `TextInput` owns the value and the six boxes are display only.
 * That keeps native autofill, paste, caret handling and screen-reader support working
 * while matching the designed segmented look.
 */

import React, { useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { TextInputInstance } from "react-native";
import {
  Typography,
  BorderRadius,
  RegistrationColors,
} from "../../../constants/theme";

export interface OtpInputProps {
  /** Current digits; the parent owns the value so it can verify/reset it. */
  value: string;
  /** Called with digits only, capped at six characters. */
  onChange: (value: string) => void;
  /** Renders every box with the invalid border (incorrect or expired code). */
  invalid?: boolean;
  /** Blocks typing once the code has expired. */
  disabled?: boolean;
}

const CODE_LENGTH = 6;

/**
 * Segmented one-time-code input.
 *
 * @param props - Value, change handler and invalid/disabled flags.
 * @returns Six boxes backed by one hidden accessible text input.
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  invalid = false,
  disabled = false,
}) => {
  const inputRef = useRef<TextInputInstance>(null);
  const digits = value.split("");
  const activeIndex = Math.min(value.length, CODE_LENGTH - 1);

  return (
    <Pressable
      style={styles.container}
      onPress={() => inputRef.current?.focus()}
      accessible={false}
    >
      {Array.from({ length: CODE_LENGTH }, (_, index) => {
        const digit = digits[index] ?? "";
        const isActive = !disabled && index === activeIndex && value.length < CODE_LENGTH;
        return (
          <View
            key={index}
            style={[
              styles.box,
              isActive && styles.boxActive,
              invalid && styles.boxInvalid,
              disabled && styles.boxDisabled,
            ]}
          >
            <Text style={styles.digit}>{digit}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, CODE_LENGTH))}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        editable={!disabled}
        autoFocus
        textContentType="oneTimeCode"
        accessibilityLabel="Six-digit verification code"
        style={styles.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  box: {
    flex: 1,
    height: 56,
    marginHorizontal: 3,
    borderWidth: 1.5,
    borderColor: RegistrationColors.fieldBorder,
    borderRadius: BorderRadius.input,
    backgroundColor: RegistrationColors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: {
    borderColor: RegistrationColors.forest,
  },
  boxInvalid: {
    borderColor: RegistrationColors.error,
  },
  boxDisabled: {
    backgroundColor: RegistrationColors.page,
  },
  digit: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: RegistrationColors.navy,
  },
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
});
