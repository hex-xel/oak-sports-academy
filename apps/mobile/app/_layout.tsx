/**
 * @file apps/mobile/app/_layout.tsx
 * Root application layout and navigation gate for Oak Sports Academy mobile app.
 *
 * Implements the base Expo Router Stack layout with:
 * - Seamless screen transitions without header flicker
 * - Authentication routing gate (Phase 2 UI placeholder routing to `/login`)
 * - Global StatusBar configuration
 * - Prepares the architecture for Phase 4 where `auth-context.tsx` and SecureStore
 *   will control authenticated vs. unauthenticated routing dynamically.
 */

import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";

/**
 * Root Layout Component
 *
 * @returns Root Stack navigation hierarchy
 */
export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  // In Phase 2 UI Design phase, isAuthenticated is false by default so developers
  // land directly on the login screen to verify visual fidelity against mockups.
  const [isAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // In Phase 2, if unauthenticated and not already on the login screen, route to login.
    const inAuthGroup = segments[0] === "login";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login");
    }
  }, [isAuthenticated, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
