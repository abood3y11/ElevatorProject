export type ThemeMode = "dark" | "light" | "system";

export interface ColorPalette {
  bg: string;
  surface: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  info: string;
  warn: string;
  danger: string;
  success: string;
  white: string;
  black: string;
}

export interface ThemeGradients {
  screen: [string, string, string];
  hero: [string, string, string];
}

export interface AppPalette {
  mode: Exclude<ThemeMode, "system">;
  colors: ColorPalette;
  gradients: ThemeGradients;
}

export const darkPalette: AppPalette = {
  mode: "dark",
  colors: {
    bg: "#0f1714",
    surface: "#16211d",
    card: "#1b2823",
    border: "#28433a",
    textPrimary: "#f3fbf8",
    textSecondary: "#b7cbc3",
    textMuted: "#7e978d",
    accent: "#5cc3aa",
    info: "#8bb7d8",
    warn: "#F59E0B",
    danger: "#EF4444",
    success: "#34b57c",
    white: "#FFFFFF",
    black: "#000000",
  },
  gradients: {
    screen: ["#0f1714", "#15211d", "#1a2823"],
    hero: ["#1a2823", "#1c322c", "#234039"],
  },
};

export const lightPalette: AppPalette = {
  mode: "light",
  colors: {
    bg: "#eef4f1",
    surface: "#ffffff",
    card: "#ffffff",
    border: "#d8e5de",
    textPrimary: "#13211c",
    textSecondary: "#40544b",
    textMuted: "#5d6c64",
    accent: "#0f6b5c",
    info: "#16324a",
    warn: "#D97706",
    danger: "#DC2626",
    success: "#1b7f52",
    white: "#FFFFFF",
    black: "#000000",
  },
  gradients: {
    screen: ["#eef4f1", "#f7faf8", "#dce9e3"],
    hero: ["#ffffff", "#f7faf8", "#dce9e3"],
  },
};
