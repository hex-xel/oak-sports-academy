/**
 * @file apps/mobile/features/auth/LoginForm.tsx
 * Customer login form component for Oak Sports Academy mobile client.
 *
 * Implements the interactive form states depicted in:
 * `docs/design/mobile/high-fidelity/login.png`
 * - State 1: Empty input fields, button disabled
 * - State 2: Active input typing with clear focus outlines
 * - State 3 & 4: Password character masking and eye visibility toggle
 * - State 5 & 6: Client-side validation inline errors
 * - Remember me persistence flag & Forgot password navigation stub
 * - Footer register link for unauthenticated visitors
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TextField } from "../../components/TextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Colors, Typography, Spacing } from "../../constants/theme";

export interface LoginFormProps {
  /**
   * Submission handler invoked when the form passes client-side validation.
   * In Phase 2, this triggers a mock/console action; in Phase 4, it connects to useLogin.
   */
  onSubmit?: (credentials: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => void;
  /** Whether authentication network request is actively in progress */
  isLoading?: boolean;
  /** General server error message returned by API (e.g. rate limit, bad credentials) */
  serverError?: string;
  /** Callback triggered when user taps 'Forgot password?' */
  onForgotPasswordPress?: () => void;
  /** Callback triggered when user taps 'Register' */
  onRegisterPress?: () => void;
}

/**
 * Validates basic email formatting before sending to server.
 * Ensures the user entered an @ symbol and top-level domain without performing
 * excessive regex overhead on the mobile UI thread.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Customer login form component.
 *
 * @param props - Form configuration and action callbacks
 * @returns Complete mobile login form with validation and accessibility
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  isLoading = false,
  serverError,
  onForgotPasswordPress,
  onRegisterPress,
}) => {
  // Form input state
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Field validation error messages
  const [emailError, setEmailError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");

  /**
   * Validates form inputs and dispatches the submission callback.
   * Emits user-friendly error copy matching the Figma high-fidelity mockups.
   */
  const handleLoginSubmit = () => {
    let hasValidationError = false;

    // Reset previous client errors
    setEmailError("");
    setPasswordError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("Email address is required.");
      hasValidationError = true;
    } else if (!isValidEmail(trimmedEmail)) {
      setEmailError("Incorrect email address. Check it and try again.");
      hasValidationError = true;
    }

    if (!password) {
      setPasswordError("Password is required.");
      hasValidationError = true;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    if (onSubmit) {
      onSubmit({
        email: trimmedEmail,
        password,
        rememberMe,
      });
    } else {
      // Phase 2 Default Mock Behavior: logs values for visual review
      console.log("[LoginForm Mock Submit]", {
        email: trimmedEmail,
        passwordLength: password.length,
        rememberMe,
      });
      Alert.alert(
        "Phase 2 UI Preview",
        `Form submitted successfully with mock email: ${trimmedEmail}`
      );
    }
  };

  // Button is disabled when both fields are empty (matches Mockup State 1)
  const isFormEmpty = email.trim().length === 0 || password.length === 0;

  return (
    <View style={styles.formContainer}>
      {/* Title */}
      <Text style={styles.title}>Log in</Text>

      {/* Global / Server Error Banner */}
      {serverError ? (
        <View style={styles.serverErrorBanner}>
          <Ionicons name="warning-outline" size={18} color={Colors.error} />
          <Text style={styles.serverErrorText}>{serverError}</Text>
        </View>
      ) : null}

      {/* Email Input */}
      <TextField
        label="Email"
        placeholder="Enter your email address"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (emailError) setEmailError(""); // Clear error upon typing
        }}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        disabled={isLoading}
        testID="input-login-email"
      />

      {/* Password Input with character masking toggle */}
      <TextField
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (passwordError) setPasswordError("");
        }}
        error={passwordError}
        isPassword={true}
        disabled={isLoading}
        testID="input-login-password"
      />

      {/* Options Row: Remember Me & Forgot Password */}
      <View style={styles.optionsRow}>
        <TouchableOpacity
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: rememberMe }}
          accessibilityLabel="Remember my login credentials on this device"
          activeOpacity={0.7}
        >
          <Ionicons
            name={rememberMe ? "checkbox" : "square-outline"}
            size={20}
            color={rememberMe ? Colors.brandForestGreen : Colors.textMuted}
          />
          <Text style={styles.rememberMeText}>Remember me</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            onForgotPasswordPress ??
            (() =>
              Alert.alert(
                "Forgot Password",
                "Password recovery will be implemented in the password reset feature."
              ))
          }
          accessibilityRole="button"
          accessibilityLabel="Forgot password recovery options"
          activeOpacity={0.7}
        >
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      {/* Action Button */}
      <PrimaryButton
        label="Log in"
        onPress={handleLoginSubmit}
        disabled={isFormEmpty || isLoading}
        loading={isLoading}
        style={styles.submitButton}
        testID="btn-login-submit"
      />

      {/* Registration Footer - Centered and stacked matching login.png */}
      <View style={styles.registerFooter}>
        <Text style={styles.registerPrompt}>New to Oak Sports Academy?</Text>
        <TouchableOpacity
          onPress={
            onRegisterPress ??
            (() =>
              Alert.alert(
                "Register",
                "Account registration will be wired in the customer registration feature."
              ))
          }
          accessibilityRole="link"
          accessibilityLabel="Register a new Oak Sports Academy account"
          activeOpacity={0.7}
          style={styles.registerLinkButton}
        >
          <Text style={styles.registerLink}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    width: "100%",
    minWidth: 320, // Satisfies minimum 360dp phone viewport layout constraint
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  serverErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.errorBackground,
    borderColor: Colors.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  serverErrorText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    fontWeight: Typography.fontWeight.medium,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  rememberMeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLink,
    fontWeight: Typography.fontWeight.semibold,
  },
  submitButton: {
    marginBottom: Spacing.xl,
  },
  registerFooter: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
    paddingBottom: Spacing.base,
  },
  registerPrompt: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: "center",
  },
  registerLinkButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  registerLink: {
    fontSize: Typography.fontSize.sm,
    color: Colors.brandForestGreen,
    fontWeight: Typography.fontWeight.bold,
    textAlign: "center",
  },
});
