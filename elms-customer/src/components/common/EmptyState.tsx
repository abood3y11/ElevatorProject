import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";
import { arabicFontStyles } from "../../utils/typography";

interface EmptyStateProps {
  title: string;
  subtitle: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    card: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.lg,
      gap: 6,
    },
    title: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 16,
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
