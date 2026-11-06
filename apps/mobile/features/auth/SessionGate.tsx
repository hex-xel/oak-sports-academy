import React from "react";
import { ActivityIndicator, Image, SafeAreaView, Text, StyleSheet } from "react-native";
import { useAuth } from "../../lib/auth-context";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Colors, Spacing, Typography } from "../../constants/theme";

/** Holds content during restore/logout; failed secure cleanup requires explicit retry before login. */
export function SessionGate() {
  const auth = useAuth();
  const failed = auth.logoutCleanupFailed || auth.storageError || auth.restoreError;
  return <SafeAreaView style={styles.container}>
    <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" accessibilityLabel="Oak Sports Academy Crest" />
    {!failed && <ActivityIndicator color={Colors.brandForestGreen} accessibilityLabel={auth.logoutPending ? "Signing out" : "Checking your session"} />}
    <Text style={styles.message} accessibilityLiveRegion="polite" accessibilityRole={failed ? "alert" : "text"}>
      {auth.logoutCleanupFailed ? "The saved session could not be removed securely. Retry cleanup before leaving this device."
        : auth.logoutPending ? "Signing out…"
        : auth.storageError ? "Secure storage is unavailable. Please try again."
        : auth.restoreError ? "Unable to confirm your session. Check your connection and try again." : "Checking your session…"}
    </Text>
    {failed && <PrimaryButton label={auth.logoutCleanupFailed ? "Retry secure cleanup" : "Try again"}
      onPress={() => { void (auth.logoutCleanupFailed ? auth.retryLogoutCleanup() : auth.retryStorageRead()).catch(() => { /* Observable state retains safe recovery feedback. */ }); }} />}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.screenPadding, gap: Spacing.xl, backgroundColor: Colors.background },
  logo: { width: 105, height: 120 },
  message: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, textAlign: "center" },
});
