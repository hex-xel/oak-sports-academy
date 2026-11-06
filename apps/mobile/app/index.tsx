import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { SessionGate } from "../features/auth/SessionGate";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../constants/theme";
import { PrimaryButton } from "../components/PrimaryButton";

/**
 * Protected Student landing placeholder with current-device sign-out; full Home is separate.
 *
 * @returns Protected dashboard placeholder view
 */
export default function HomeScreen() {
  const auth = useAuth();
  if (auth.status === "restoring" || auth.logoutPending || auth.logoutCleanupFailed) return <SessionGate />;
  if (auth.status !== "signedIn" || auth.user?.role !== "STUDENT" || auth.user.status !== "ACTIVE") return <Redirect href={{ pathname: "/login", params: { returnTo: "/" } }} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingTitle}>Welcome Back!</Text>
            <Text style={styles.greetingSubtitle}>Oak Sports Academy</Text>
          </View>
          <View style={styles.profileBadge}>
            <Image source={require("../assets/images/logo.png")} style={{ width: 32, height: 36 }} resizeMode="contain" accessibilityLabel="Oak Sports Academy Crest" />
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.cardTitle}>Signed in</Text>
          </View>

          <Text style={styles.cardDescription}>
            Welcome, {auth.user.displayName ?? auth.user.email}.
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account:</Text>
            <Text style={styles.infoValue}>Student</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>Active</Text>
          </View>
        </View>

        <PrimaryButton label="Sign out" variant="neutral" testID="btn-sign-out"
          onPress={() => { void auth.signOut().catch(() => { /* The shared cleanup gate exposes deletion failure and retry. */ }); }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.pageBackground,
  },
  container: {
    padding: Spacing.screenPadding,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  greetingTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  greetingSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  profileBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.brandForestGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  cardDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.normal,
    marginBottom: Spacing.base,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
});
