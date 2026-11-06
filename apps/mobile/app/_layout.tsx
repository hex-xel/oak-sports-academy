import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../lib/auth-context";
import { Colors } from "../constants/theme";

/** Mounts the real auth lifecycle; each route gates content until storage/server confirmation. */
export default function RootLayout() {
  return <AuthProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
    <Stack.Screen name="login" /><Stack.Screen name="register" /><Stack.Screen name="index" />
  </Stack></AuthProvider>;
}
