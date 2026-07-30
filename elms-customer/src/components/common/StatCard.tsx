import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";

interface StatCardProps {
  title: string;
  value: string | number;
  tone?: "default" | "accent" | "warn" | "danger";
}

export function StatCard({ title, value, tone = "default" }: StatCardProps) {
  const appTheme = useAppTheme();
  const toneColor = {
    default: appTheme.colors.info,
    accent: appTheme.colors.accent,
    warn: appTheme.colors.warn,
    danger: appTheme.colors.danger,
  } as const;
  const styles = createStyles(appTheme);

  return (
    <View style={[styles.card, { borderColor: `${toneColor[tone]}66` }]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 145,
      backgroundColor: appTheme.colors.card,
      borderWidth: 1,
      borderRadius: appTheme.radius.md,
      paddingVertical: appTheme.spacing.md,
      paddingHorizontal: appTheme.spacing.md,
      gap: 4,
    },
    value: {
      color: appTheme.colors.textPrimary,
      fontSize: 22,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    title: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
