/**
 * @file apps/mobile/app/index.tsx
 * Customer home screen placeholder for Oak Sports Academy mobile client.
 *
 * Serves as the landing destination upon successful sign-in (User Story 1 acceptance).
 * In Phase 2 (UI Scaffold), this renders a placeholder dashboard with customer session details
 * and a sign-out button stub that navigates back to `/login`.
 * In Phase 4, this screen receives genuine user session data from `auth-context.tsx`.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../components/PrimaryButton";
import { Colors, Typography, Spacing, BorderRadius } from "../constants/theme";

/**
 * Customer home screen component.
 *
 * @returns Protected dashboard placeholder view
 */
export default function HomeScreen() {
  const router = useRouter();

  const handleSignOutStub = () => {
    // In Phase 2 UI testing, routes back to the login screen
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingTitle}>Welcome Back!</Text>
            <Text style={styles.greetingSubtitle}>Oak Sports Academy Dashboard</Text>
          </View>
          <View style={styles.profileBadge}>
            <Ionicons name="person" size={20} color={Colors.brandGold} />
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.cardTitle}>Signed In (UI Preview)</Text>
          </View>

          <Text style={styles.cardDescription}>
            This is the protected home screen specified in User Story 1 (T037).
            In Phase 4, genuine user session context will populate this view.
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Active Client:</Text>
            <Text style={styles.infoValue}>Mobile App (Expo)</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Branch:</Text>
            <Text style={styles.infoValue}>Taguig Branch</Text>
          </View>
        </View>

        {/* Sign Out Action Button */}
        <View style={styles.actionContainer}>
          <PrimaryButton
            label="Sign Out (UI Stub)"
            onPress={handleSignOutStub}
            style={styles.signOutButton}
          />
        </View>
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
  actionContainer: {
    marginTop: Spacing.base,
  },
  signOutButton: {
    backgroundColor: Colors.brandForestGreen,
  },
});
