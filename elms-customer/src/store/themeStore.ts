import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ThemeMode } from "../theme/palettes";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "system",
      setMode: (mode) => set({ mode }),
      toggleMode: () => {
        const next: ThemeMode = get().mode === "light" ? "dark" : "light";
        set({ mode: next });
      },
    }),
    {
      name: "elms-customer-theme",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
