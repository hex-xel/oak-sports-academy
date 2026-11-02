/**
 * @file apps/mobile/components/TextField.tsx
 * Reusable form input primitive for Oak Sports Academy mobile application.
 *
 * Implements the input specification from the design system:
 * - Label placed above the input container
 * - 8dp rounded border with focus and error transitions
 * - Optional inline toggle for obscured passwords (eye / eye-off)
 * - Clear inline error state with warning badge below the field
 * - Adheres to Android accessibility guidelines (touch target min 48dp, screen reader labels)
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../constants/theme";

export interface TextFieldProps extends Omit<TextInputProps, "secureTextEntry"> {
  /** Label displayed directly above the input field */
  label: string;
  /** Current text value */
  value: string;
  /** Callback invoked when the user types or alters input */
  onChangeText: (text: string) => void;
  /** Validation error message; renders red border and inline alert text when non-empty */
  error?: string;
  /** Whether the field should mask entered characters (e.g., for passwords) */
  isPassword?: boolean;
  /** Accessible description announced by screen readers (TalkBack / VoiceOver) */
  accessibilityLabel?: string;
  /** Helper text displayed beneath the field when no error is present */
  helperText?: string;
  /** Prevents user editing when set to true */
  disabled?: boolean;
}

/**
 * Text field component adhering to the Oak Sports Academy mobile design spec.
 *
 * @param props - Component configuration properties
 * @returns Rendered text input with label, container, and feedback text
 */
export const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChangeText,
  error,
  isPassword = false,
  accessibilityLabel,
  helperText,
  disabled = false,
  placeholder,
  autoCapitalize = "none",
  keyboardType = "default",
  ...restInputProps
}) => {
  // Tracks user focus to apply active border styling per design spec
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // When isPassword is true, user can toggle character masking via the eye icon
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);

  const hasError = Boolean(error && error.trim().length > 0);

  return (
    <View style={styles.container}>
      {/* Field Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Input Box Wrapper (Encapsulates TextInput and trailing eye icon) */}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          hasError && styles.inputWrapperError,
          disabled && styles.inputWrapperDisabled,
        ]}
      >
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isPassword && !isPasswordVisible}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={hasError ? `Error: ${error}` : undefined}
          accessibilityState={{ disabled }}
          aria-invalid={hasError}
          {...restInputProps}
        />

        {/* Password Visibility Toggle */}
        {isPassword && (
          <TouchableOpacity
            style={styles.trailingIcon}
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
            accessibilityHint="Toggles password character visibility"
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Inline Feedback / Error Message */}
      {hasError ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={Colors.error}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: Spacing.base,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 48, // Meets Android accessibility standard for interactive touch boundaries
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  inputWrapperFocused: {
    borderColor: Colors.borderFocused,
    borderWidth: 1.5,
  },
  inputWrapperError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  inputWrapperDisabled: {
    backgroundColor: Colors.pageBackground,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  inputDisabled: {
    color: Colors.textMuted,
  },
  trailingIcon: {
    padding: Spacing.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  errorIcon: {
    marginRight: 4,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    fontWeight: Typography.fontWeight.regular,
  },
  helperText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
