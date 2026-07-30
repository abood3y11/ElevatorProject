import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

interface DeliveryProgressBarProps {
  /** 0–100 */
  progress: number;
  /** Gradient stops for the fill. */
  colors?: readonly [string, string, ...string[]];
  trackColor?: string;
  height?: number;
  /** Show the moving "loading" shimmer (while the order is still in motion). */
  animating?: boolean;
}

/**
 * A noon-style delivery progress bar: an animated gradient fill that eases to the
 * target percentage, with a moving shimmer highlight while the delivery is still
 * in progress — the "linear loading" feel.
 */
export function DeliveryProgressBar({
  progress,
  colors = ["#7C3AED", "#A855F7"],
  trackColor = "rgba(255,255,255,0.25)",
  height = 10,
  animating = true,
}: DeliveryProgressBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const pct = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, widthAnim]);

  useEffect(() => {
    if (!animating) return;
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animating, shimmer]);

  const widthInterpolate = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  const shimmerTranslate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-80, 260] });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
      <Animated.View style={[styles.fill, { width: widthInterpolate, borderRadius: height / 2 }]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {animating ? (
          <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}>
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden" },
  fill: { height: "100%", overflow: "hidden" },
  shimmer: { position: "absolute", top: 0, bottom: 0, width: 80 },
});

export default DeliveryProgressBar;
