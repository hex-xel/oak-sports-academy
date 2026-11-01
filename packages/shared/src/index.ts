/**
 * @file packages/shared/src/index.ts
 * Single entry point for the shared package.
 *
 * Only types and pure utility functions belong here — no Node.js built-ins,
 * no browser APIs, no expo-specific imports. This package is consumed by
 * apps/api (Node) and apps/mobile (React Native), so it must remain
 * environment-agnostic.
 *
 * Auth types and error codes are added in Phase 3 (T028).
 * This stub exists so the workspace resolves @oak/shared during Phase 1.
 */

export const SHARED_VERSION = "0.0.1";
