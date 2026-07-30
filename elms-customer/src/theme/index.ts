import { lightPalette } from "./palettes";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const theme = {
  colors: lightPalette.colors,
  spacing,
  typography,
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
} as const;

export type Theme = typeof theme;
