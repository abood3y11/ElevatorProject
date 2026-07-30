import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  DimensionValue,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";

// This app renders Arabic (RTL) by default, so the shimmer sweeps from the
// trailing (right) edge toward the leading (left) edge to feel natural in RTL.
const RTL = true;

type AppTheme = ReturnType<typeof useAppTheme>;

function useSkeletonColors(appTheme: AppTheme) {
  return useMemo(() => {
    const base = appTheme.isDark
      ? "rgba(255,255,255,0.07)"
      : "rgba(19,33,28,0.07)";
    const sheen = appTheme.isDark
      ? "rgba(255,255,255,0.24)"
      : "rgba(255,255,255,0.85)";
    return { base, sheen };
  }, [appTheme.isDark]);
}

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A placeholder block with a real moving shimmer. The sheen is a translucent
 * LinearGradient that translates across a base block on a repeating loop.
 * Falls back to an opacity pulse if expo-linear-gradient is unavailable.
 */
export function Skeleton({ width = "100%", height = 16, radius, style }: SkeletonProps) {
  const appTheme = useAppTheme();
  const { base, sheen } = useSkeletonColors(appTheme);
  const progress = useRef(new Animated.Value(0)).current;
  const [blockWidth, setBlockWidth] = React.useState(0);

  const hasLinearGradient = typeof LinearGradient === "function";
  const resolvedRadius = radius ?? appTheme.radius.sm;

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 850,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const containerStyle: ViewStyle = {
    width,
    height,
    borderRadius: resolvedRadius,
    backgroundColor: base,
    overflow: "hidden",
  };

  if (!hasLinearGradient) {
    // Fallback: opacity pulse between 0.4 and 1.
    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.4, 1, 0.4],
    });
    return <Animated.View style={[containerStyle, { opacity }, style]} />;
  }

  const sheenWidth = Math.max(blockWidth * 0.6, 64);
  // Travel from off one edge to off the other; direction depends on RTL.
  const travel = blockWidth + sheenWidth;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: RTL ? [travel, -sheenWidth] : [-sheenWidth, travel],
  });

  return (
    <View
      style={[containerStyle, style]}
      onLayout={(event) => setBlockWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ translateX }], width: sheenWidth },
        ]}
      >
        <LinearGradient
          colors={["transparent", sheen, "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: DimensionValue;
  lineHeight?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
  lineHeight = 12,
  gap = 8,
  style,
}: SkeletonTextProps) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        return (
          <Skeleton
            key={index}
            height={lineHeight}
            width={isLast && lines > 1 ? lastLineWidth : "100%"}
            radius={6}
          />
        );
      })}
    </View>
  );
}

interface SkeletonCardProps {
  style?: StyleProp<ViewStyle>;
  lines?: number;
}

export function SkeletonCard({ style, lines = 2 }: SkeletonCardProps) {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderText}>
          <Skeleton height={14} width="55%" radius={6} />
          <Skeleton height={11} width="35%" radius={6} />
        </View>
        <Skeleton width={44} height={44} radius={appTheme.radius.md} />
      </View>
      <SkeletonText lines={lines} lineHeight={11} lastLineWidth="45%" />
    </View>
  );
}

export function SkeletonListItem({ style }: { style?: StyleProp<ViewStyle> }) {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <View style={[styles.listItem, style]}>
      <Skeleton width={48} height={48} radius={appTheme.radius.md} />
      <View style={styles.listItemText}>
        <Skeleton height={13} width="60%" radius={6} />
        <Skeleton height={10} width="40%" radius={6} />
      </View>
    </View>
  );
}

interface SkeletonListProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonList({ count = 4, style }: SkeletonListProps) {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <View style={[styles.list, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonDetail({ style }: { style?: StyleProp<ViewStyle> }) {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <View style={[styles.detail, style]}>
      <Skeleton height={150} radius={appTheme.radius.lg} />
      <View style={styles.card}>
        <Skeleton height={18} width="50%" radius={6} />
        <SkeletonText lines={3} lineHeight={12} lastLineWidth="55%" />
      </View>
      <View style={styles.card}>
        <Skeleton height={16} width="40%" radius={6} />
        <SkeletonText lines={4} lineHeight={12} lastLineWidth="65%" />
      </View>
    </View>
  );
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    list: {
      gap: appTheme.spacing.md,
    },
    card: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.lg,
      gap: appTheme.spacing.md,
    },
    cardHeaderRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: appTheme.spacing.md,
    },
    cardHeaderText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 6,
    },
    listItem: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: appTheme.spacing.md,
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
    },
    listItemText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 6,
    },
    detail: {
      gap: appTheme.spacing.md,
    },
  });
}
