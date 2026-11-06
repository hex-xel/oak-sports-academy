import type { ConfigContext, ExpoConfig } from "expo/config";

/** Builds public API configuration; EXPO_PUBLIC_API_URL contains a URL only, never secrets. */
export default function appConfig({ config }: ConfigContext): ExpoConfig {
  if (!config.name || !config.slug) throw new Error("Expo name and slug must be configured.");
  return { ...config, name: config.name, slug: config.slug, extra: { ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? config.extra?.["apiUrl"],
  } };
}
