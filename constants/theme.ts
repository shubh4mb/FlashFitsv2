

export const BrandColors = {
  primary: "#00C2E8",             // Vibrant Pure Cyan (Micro-nudge toward cyan)
  secondary: "#28DCF4",           // Luminous Sky Cyan Highlight
  electricCyan: "#00F5FF",        // Glowing Neon Cyan (Center Dial Ring & Accents)
  darkCyan: "#0088B8",            // Deep Rich Cyan (Lower Shadows & Contrast)
  primaryDark: "#0088B8",         // Rich darker shade of theme color for buttons & high contrast
  primaryDeep: "#046684",         // Deep Ocean Cyan for maximum contrast
  gradient: ["#00C2E8", "#28DCF4"] as const, // Signature Image Cyan Gradient
  buttonGradient: ["#00C2E8", "#0088B8"] as readonly [string, string], // Signature Button Gradient (Theme color to deep shade)
  buttonGradientDark: ["#00C2E8", "#046684"] as readonly [string, string], // High-contrast Button Gradient
  electricGradient: ["#00F5FF", "#00C2E8"] as readonly [string, string], // Neon Electric Glow Gradient
  heroGradient: ["#28DCF4", "#00C2E8", "#0088B8"] as readonly [string, string, string], // Image Hero Triple Gradient
  softCyan: "#E1FAFE",           // Soft Cyan surface/pill background
  softCyanBorder: "#AEEFFA",     // Soft Cyan subtle border
  cyanDeep: "#0088B8",           // Deep cyan for high-contrast text on soft cyan
  offWhite: "#F8FAFC",           // Premium Clean Off-White Background
  offWhiteAlt: "#F1F5F9",        // Secondary Off-White/Light Gray
  surface: "#FFFFFF",            // Pure White Card Surface
  matteBlack: "#111418",         // Obsidian Satin Matte Black (From Hanger Body)
  matteBlackLight: "#1A1E24",    // Light Matte Black / Charcoal
  charcoal: "#242932",           // Dark Neutral Charcoal
  textPrimary: "#111418",        // Matte Black Text
  textSecondary: "#4B5563",      // Secondary Slate Text
  textMuted: "#6B7280",          // Muted Text
  textLight: "#FFFFFF",          // White Text
  border: "#E2E8F0",             // Standard Soft Border
  borderLight: "#F1F5F9",        // Ultra-light Border
};

export const Palette = {
  primary: BrandColors.primary,
  primaryDark: BrandColors.primaryDark,
  buttonGradient: BrandColors.buttonGradient,
  secondary: BrandColors.secondary,
  brandCyan: BrandColors.primary,
  brandCyanLight: BrandColors.secondary,
  electricCyan: BrandColors.electricCyan,
  accent: BrandColors.primary,
  background: BrandColors.offWhite,
  surface: BrandColors.surface,
  matteBlack: BrandColors.matteBlack,
  error: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  text: {
    primary: BrandColors.textPrimary,
    secondary: BrandColors.textSecondary,
    inverse: BrandColors.textLight,
    muted: BrandColors.textMuted,
  },
  border: BrandColors.border,
};

export const GenderThemes = {
  Men: {
    primary: BrandColors.primary,
    primaryDark: BrandColors.primaryDark,
    buttonGradient: BrandColors.buttonGradient,
    secondary: BrandColors.secondary,
    background: BrandColors.offWhite,
    text: BrandColors.textPrimary,
    accent: BrandColors.primary,
    dark: BrandColors.matteBlack,
  },
  Women: {
    primary: BrandColors.primary,
    primaryDark: BrandColors.primaryDark,
    buttonGradient: BrandColors.buttonGradient,
    secondary: BrandColors.secondary,
    background: BrandColors.offWhite,
    text: BrandColors.textPrimary,
    accent: BrandColors.primary,
    dark: BrandColors.matteBlack,
  },
  Kids: {
    primary: BrandColors.primary,
    primaryDark: BrandColors.primaryDark,
    buttonGradient: BrandColors.buttonGradient,
    secondary: BrandColors.secondary,
    background: BrandColors.offWhite,
    text: BrandColors.textPrimary,
    accent: BrandColors.primary,
    dark: BrandColors.matteBlack,
  },
};

export const Typography = {
  fontFamily: {
    light: "Manrope_300Light",
    regular: "Manrope_400Regular",
    medium: "Manrope_500Medium",
    semiBold: "Manrope_600SemiBold",
    bold: "Manrope_700Bold",
    extraBold: "Manrope_800ExtraBold",
    serif: "WorkSans_400Regular",
    serifMedium: "WorkSans_500Medium",
    serifSemiBold: "WorkSans_600SemiBold",
    serifBold: "WorkSans_700Bold",
    serifExtraBold: "WorkSans_800ExtraBold",
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
};

export const Colors = {
  light: {
    text: Palette.text.primary,
    background: Palette.background,
    tint: BrandColors.matteBlack,
    icon: Palette.text.muted,
    tabIconDefault: "#94A3B8",
    tabIconSelected: BrandColors.matteBlack,
  },
  dark: {
    text: Palette.text.inverse,
    background: BrandColors.matteBlack,
    tint: BrandColors.primary,
    icon: Palette.text.muted,
    tabIconDefault: Palette.text.muted,
    tabIconSelected: BrandColors.primary,
  },
};

export const SectionHeaderStyles = {
  title: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: -0.2,
    color: BrandColors.matteBlack,
  },
  subtitle: {
    fontSize: 11,
    color: BrandColors.textMuted,
    marginTop: 2,
    fontFamily: Typography.fontFamily.medium,
    letterSpacing: 0.1,
  },
  viewAll: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.1,
    color: BrandColors.matteBlack,
  },
};

export const AppPalette = {
  appPrimary: BrandColors.primary,          // Brand Cyan
  appPrimaryDark: BrandColors.primaryDark,  // Deep Rich Cyan
  appButtonGradient: BrandColors.buttonGradient, // Button Gradient
  appSecondary: BrandColors.secondary,      // Light Cyan
  appBackground: BrandColors.offWhite,      // Clean Off-White Background
  appSurface: BrandColors.surface,          // Pure White Surface
  appWarmWhite: BrandColors.offWhite,       // Backward compatibility
  appWarmWhiteSoft: BrandColors.offWhiteAlt,// Soft Off-White
  appCream: BrandColors.softCyan,           // Soft Cyan tint
  appMatteBlack: BrandColors.matteBlack,    // Matte Black
  appMatteBlackLight: BrandColors.matteBlackLight,
  appCharcoal: BrandColors.charcoal,        // Charcoal
  appText: BrandColors.textPrimary,         // Matte Black Text
  appTextMuted: BrandColors.textMuted,      // Muted Text
  appTextLight: BrandColors.textLight,      // White Text
  appAccent: BrandColors.primary,           // Cyan Accent
  appBorder: BrandColors.border,            // Soft Border
  appCardBg: BrandColors.surface,           // White Card Background
  appSoftCyan: BrandColors.softCyan,        // Soft Cyan Pill
};

export const AppTheme = {
  appPrimary: AppPalette.appPrimary,
  appPrimaryDark: AppPalette.appPrimaryDark,
  appButtonGradient: AppPalette.appButtonGradient,
  appSecondary: AppPalette.appSecondary,
  appBackground: AppPalette.appBackground,
  appSurface: AppPalette.appSurface,
  appWarmWhite: AppPalette.appWarmWhite,
  appMatteBlack: AppPalette.appMatteBlack,
  appText: AppPalette.appText,
  appTextMuted: AppPalette.appTextMuted,
  appTextLight: AppPalette.appTextLight,
  appAccent: AppPalette.appAccent,
  appBorder: AppPalette.appBorder,
  appCardBg: AppPalette.appCardBg,
};

// Aliases for compatibility
export const PremiumPalette = AppPalette;
export const PremiumTheme = AppTheme;

export default {
  BrandColors,
  Palette,
  GenderThemes,
  Typography,
  Colors,
  SectionHeaderStyles,
  AppPalette,
  AppTheme,
  PremiumPalette,
  PremiumTheme,
};
