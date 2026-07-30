import { TextStyle } from "react-native";

type FontWeightKey = "regular" | "medium" | "bold";

export const fontFamily = {
  english: {
    regular: "SpaceGrotesk_400Regular",
    medium: "SpaceGrotesk_500Medium",
    bold: "SpaceGrotesk_700Bold",
  },
  arabic: {
    regular: "IBMPlexSansArabic_400Regular",
    medium: "IBMPlexSansArabic_500Medium",
    bold: "IBMPlexSansArabic_700Bold",
  },
} as const;

export function containsArabic(value?: string | null) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value ?? "");
}

export function resolveFontFamily(value: string | undefined | null, weight: FontWeightKey = "regular") {
  return containsArabic(value) ? fontFamily.arabic[weight] : fontFamily.english[weight];
}

export function textStyleFor(value: string | undefined | null, weight: FontWeightKey = "regular"): TextStyle {
  return { fontFamily: resolveFontFamily(value, weight) };
}

export const arabicFontStyles = {
  regular: { fontFamily: fontFamily.arabic.regular } satisfies TextStyle,
  medium: { fontFamily: fontFamily.arabic.medium } satisfies TextStyle,
  bold: { fontFamily: fontFamily.arabic.bold } satisfies TextStyle,
} as const;

export const englishFontStyles = {
  regular: { fontFamily: fontFamily.english.regular } satisfies TextStyle,
  medium: { fontFamily: fontFamily.english.medium } satisfies TextStyle,
  bold: { fontFamily: fontFamily.english.bold } satisfies TextStyle,
} as const;
