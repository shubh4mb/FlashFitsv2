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
    primary: "#011441ff",
    secondary: "#012258ff",
    background: "#01184eff",
    text: "#FFFFFF",
    accent: "#38BDF8",
  },
  Women: {
    primary: "#DB2777",
    secondary: "#BE185D",
    background: "#DB2777",
    text: "#FFFFFF",
    accent: "#F472B6",
  },
  Kids: {
    primary: "#F59E0B",
    secondary: "#D97706",
    background: "#F59E0B",
    text: "#FFFFFF",
    accent: "#FBBF24",
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

export default {
  Palette,
  GenderThemes,
  Typography,
  Colors,
};
