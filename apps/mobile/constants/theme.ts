/**
 * @file apps/mobile/constants/theme.ts
 * Design system tokens for Oak Sports Academy mobile client.
 *
 * Extracted directly from the mobile sticker sheet:
 * `docs/design/mobile/sticker-sheet/sticker-sheet.png`
 * and high-fidelity login mockups:
 * `docs/design/mobile/high-fidelity/login.png`.
 *
 * Using centralized tokens ensures visual consistency across all mobile screens
 * and prevents hard-coded color or dimension drift across developer sessions.
 */

export const Colors = {
  // Brand Primary & Accent
  brandForestGreen: "#0B3026",      // Deep green used for mobile header banners and brand accents
  brandForestGreenDark: "#062117",  // Darkest background variant
  brandGold: "#D4AF37",             // Gold highlight / crest accent
  brandGoldLight: "#F5E8C7",        // Subtle gold background tint

  // Neutral & Surfaces
  background: "#FFFFFF",            // White card and form container surface
  pageBackground: "#F8FAF9",        // Subtle off-white page background
  cardBackground: "#FFFFFF",
  border: "#D1D5DB",                // Standard input and container border (gray-300)
  borderFocused: "#0B3026",         // Focused input border color

  // Typography
  textPrimary: "#111827",           // Primary headings and input values (gray-900)
  textSecondary: "#6B7280",         // Labels, placeholders, and descriptive copy (gray-500)
  textMuted: "#9CA3AF",             // Disabled or subtle helper text (gray-400)
  textOnDark: "#FFFFFF",            // Text placed on brand dark green backgrounds
  textLink: "#0B3026",              // Interactive text link color

  // Buttons
  buttonDark: "#0D1B2A",            // Active primary button fill
  buttonDisabled: "#E5E7EB",        // Disabled button fill (gray-200)
  buttonTextDisabled: "#9CA3AF",    // Disabled button label color (gray-400)

  // Status & Feedback
  error: "#DC2626",                 // Validation error text and border highlight (red-600)
  errorBackground: "#FEF2F2",       // Light red alert container tint
  success: "#16A34A",               // Verified / completed badge color (green-600)
  warning: "#D97706",               // Pending badge / warning indicator (amber-600)
} as const;

export const Typography = {
  // Font sizes in density-independent pixels (dp)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 28,
  },
  // Font weights matching system fallbacks and Poppins typography spec
  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeight: {
    tight: 18,
    normal: 22,
    relaxed: 26,
    heading: 32,
  },
} as const;

export const Spacing = {
  // Spacing scale based on 4dp/8dp grid system
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  screenPadding: 24,
} as const;

export const BorderRadius = {
  // Rounded corner geometry from sticker sheet
  input: 8,                         // Text input fields
  button: 8,                        // Action buttons
  card: 16,                         // Bottom-sheet and content cards
  full: 9999,                       // Circular avatars and pills
} as const;
