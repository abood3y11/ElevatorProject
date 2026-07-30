import React, { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";
import { arabicFontStyles } from "../../utils/typography";

interface SectionTitleProps extends PropsWithChildren {
  subtitle?: string;
}

export function SectionTitle({ children, subtitle }: SectionTitleProps) {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    wrap: {
      gap: 4,
    },
    title: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 20,
      textAlign: "right",
      writingDirection: "rtl",
    },
    subtitle: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
