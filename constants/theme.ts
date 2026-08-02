export const Palette = {
  primary: "#1A1A1A",
  secondary: "#64748B",
  accent: "#EF4444",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  error: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  text: {
    primary: "#0F172A",
    secondary: "#64748B",
    inverse: "#FFFFFF",
    muted: "#94A3B8",
  },
  border: "#E2E8F0",
};

export const GenderThemes = {
  Men: {
    primary: "#011441",
    secondary: "#012258ff",
    background: "#01184eff",
    text: "#FFFFFF",
    accent: "#38BDF8",
    dark: "#00081d",
  },
  Women: {
    primary: "#DB2777",
    secondary: "#BE185D",
    background: "#DB2777",
    text: "#FFFFFF",
    accent: "#F472B6",
    dark: "#4c0525",
  },
  Kids: {
    primary: "#df4300ff",
    secondary: "#d95e06ff",
    background: "#f5650bff",
    text: "#FFFFFF",
    accent: "#fb6c24ff",
    dark: "#471200",
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
    tint: Palette.primary,
    icon: Palette.secondary,
    tabIconDefault: Palette.secondary,
    tabIconSelected: Palette.primary,
  },
  dark: {
    text: Palette.text.inverse,
    background: Palette.primary,
    tint: Palette.surface,
    icon: Palette.text.muted,
    tabIconDefault: Palette.text.muted,
    tabIconSelected: Palette.surface,
  },
};

export const SectionHeaderStyles = {
  title: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: 0.1, // Increased from -0.8 to create more distance/breathing room
    color: '#1C1917', // Warm black
  },
  subtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontFamily: Typography.fontFamily.medium,
    letterSpacing: 0.1,
  },
  viewAll: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.2,
    color: '#1C1917', // Warm black
  },
};



export default {
  Palette,
  GenderThemes,
  Typography,
  Colors,
  SectionHeaderStyles,
};
