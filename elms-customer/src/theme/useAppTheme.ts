import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { useThemeStore } from "../store/themeStore";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { darkPalette, lightPalette } from "./palettes";

export function useAppTheme() {
  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const setMode = useThemeStore((state) => state.setMode);
  const systemColorScheme = useColorScheme();

  return useMemo(() => {
    const resolvedMode =
      mode === "system" ? (systemColorScheme === "dark" ? "dark" : "light") : mode;
    const palette = resolvedMode === "dark" ? darkPalette : lightPalette;

    return {
      mode,
      resolvedMode,
      isDark: resolvedMode === "dark",
      colors: palette.colors,
      gradients: palette.gradients,
      spacing,
      typography,
      radius: {
        sm: 10,
        md: 14,
        lg: 18,
        xl: 24,
      },
      toggleMode,
      setMode,
    };
  }, [mode, setMode, systemColorScheme, toggleMode]);
}
