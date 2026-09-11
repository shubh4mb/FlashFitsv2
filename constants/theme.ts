export const BrandColors = {
  primary: "#2ED3E6",             // Vibrant Brand Cyan
  secondary: "#5EE9F4",           // Light Brand Cyan
  darkCyan: "#0891B2",            // Deep Rich Cyan for Tab Icons & High Contrast
  gradient: ["#2ED3E6", "#5EE9F4"] as const, // Signature Cyan Gradient
  softCyan: "#EBFDFF",           // Soft Cyan surface/pill background
  softCyanBorder: "#BCEEFA",     // Soft Cyan subtle border
  cyanDeep: "#0891B2",           // Deep cyan for high-contrast text on soft cyan
  offWhite: "#F8F9FA",           // Premium Clean Off-White Background
  offWhiteAlt: "#F1F5F9",        // Secondary Off-White/Light Gray
  surface: "#FFFFFF",            // Pure White Card Surface
  matteBlack: "#121212",         // Matte Black for Titles, Dark CTAs & Logo
  matteBlackLight: "#1E1E1E",    // Light Matte Black / Charcoal
  charcoal: "#27272A",           // Dark Neutral Charcoal
  textPrimary: "#121212",        // Matte Black Text
  textSecondary: "#52525B",      // Secondary Slate Text
  textMuted: "#71717A",          // Muted Text
  textLight: "#FFFFFF",          // White Text
  border: "#E5E7EB",             // Standard Soft Border
  borderLight: "#F1F5F9",        // Ultra-light Border
};

export const Palette = {
  primary: BrandColors.primary,
  secondary: BrandColors.secondary,
  brandCyan: BrandColors.primary,
  brandCyanLight: BrandColors.secondary,
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
    secondary: BrandColors.secondary,
    background: BrandColors.offWhite,
    text: BrandColors.textPrimary,
    accent: BrandColors.primary,
    dark: BrandColors.matteBlack,
  },
  Women: {
    primary: BrandColors.primary,
    secondary: "#BE185D",
    background: BrandColors.offWhite,
    text: BrandColors.textPrimary,
    accent: BrandColors.primary,
    dark: BrandColors.matteBlack,
  },
  Kids: {
    primary: BrandColors.primary,
    secondary: "#d95e06ff",
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
    color: BrandColors.primary,
  },
};

export const AppPalette = {
  appPrimary: BrandColors.primary,          // Brand Cyan
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
