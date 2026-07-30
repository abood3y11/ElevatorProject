import { LinearGradient } from "expo-linear-gradient";
import React, { PropsWithChildren } from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/useAppTheme";

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(appTheme);
  const baseContentStyle = {
    paddingTop: appTheme.spacing.sm,
    paddingBottom: appTheme.spacing.xxl + Math.max(insets.bottom, 12) + 64,
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <LinearGradient
        colors={appTheme.gradients.screen}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, baseContentStyle, contentStyle]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, baseContentStyle, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: appTheme.colors.bg,
    },
    content: {
      paddingHorizontal: appTheme.spacing.lg,
      paddingTop: 0,
      paddingBottom: 0,
      gap: appTheme.spacing.md,
    },
  });
}
