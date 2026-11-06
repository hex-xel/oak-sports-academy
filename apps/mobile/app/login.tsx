/**
 * @file apps/mobile/app/login.tsx
 * Customer login route for Oak Sports Academy mobile application.
 *
 * Implements the full screen visual hierarchy from:
 * `docs/design/mobile/high-fidelity/login.png`
 * - Forest Green hero banner at the top displaying the academy's emblem and branding
 * - White card container with rounded top corners housing the login form
 * - Full KeyboardAvoidingView and ScrollView support for virtual keyboard management
 * - Responsive layout verified across standard Android densities (>= 360dp)
 */

import React from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { recoveryDestination, SESSION_ENDED_MESSAGE } from "../features/auth/messages";
import { useAuth } from "../lib/auth-context";
import { SessionGate } from "../features/auth/SessionGate";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLogin } from "../features/auth/useLogin";
import { LoginForm } from "../features/auth/LoginForm";
import { Colors, Typography, Spacing } from "../constants/theme";

/**
 * Login screen route.
 *
 * Implements the exact visual layout from docs/design/mobile/high-fidelity/login.png:
 * - Brand Forest Green header with white "Oak Sport Academy" title
 * - Centered high-resolution Oak Sports Academy shield crest logo
 * - Form surface card with rounded top corners
 *
 * @returns Complete mobile login view with branded header and scroll container
 */
export default function LoginScreen() {
  const login = useLogin();
  const auth = useAuth();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  if (auth.status === "restoring" || auth.logoutPending || auth.logoutCleanupFailed) return <SessionGate />;
  const destination = recoveryDestination(returnTo, auth.user);
  if (auth.status === "signedIn" && destination) return <Redirect href={destination} />;
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Brand Banner matching docs/design/mobile/high-fidelity/login.png */}
          <View style={styles.heroBanner}>
            <Text style={styles.academyTitle}>Oak Sport Academy</Text>

            {/* Official Shield Logo */}
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Oak Sports Academy Crest"
            />
          </View>

          {/* Form Surface Card (Overlaps the bottom of the hero banner) */}
          <View style={styles.formCard}>
            {auth.sessionEnded && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.logoutNotice}>
              {SESSION_ENDED_MESSAGE}
            </Text>}
            {auth.logoutRemoteFailed && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.logoutNotice}>
              Signed out on this device. Server sign-out could not be confirmed; that session may remain active until it expires.
            </Text>}
            <LoginForm onSubmit={login.submit} isLoading={login.pending} serverError={login.error} retrySeconds={login.remaining} onRegisterPress={() => router.push("/register")} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logoutNotice: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.normal,
    marginBottom: Spacing.base,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.brandForestGreen,
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: Colors.brandForestGreen,
  },
  heroBanner: {
    backgroundColor: Colors.brandForestGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Platform.OS === "android" ? Spacing.xl + 8 : Spacing.base,
    paddingBottom: Spacing.xl + 4,
    paddingHorizontal: Spacing.screenPadding,
  },
  academyTitle: {
    fontSize: Typography.fontSize.xl + 2,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textOnDark,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  logoImage: {
    width: 105,
    height: 120,
  },
  formCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xl + 4,
    paddingBottom: Spacing.xxl,
    minHeight: 520, // Ensures smooth visual continuity on all screen sizes
  },
});
