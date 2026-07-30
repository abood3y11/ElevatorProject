import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";

interface TrackingMapProps {
  lat: number;
  lng: number;
  destinationLat?: number;
  destinationLng?: number;
  workerTitle?: string;
  destinationTitle?: string;
  style?: StyleProp<ViewStyle>;
}

export function TrackingMap({
  lat,
  lng,
  destinationLat,
  destinationLng,
  workerTitle = "موقع الفني",
  destinationTitle = "موقع العميل",
  style,
}: TrackingMapProps) {
  const appTheme = useAppTheme();

  return (
    <View
      style={[
        styles.base,
        {
          borderColor: appTheme.colors.border,
          backgroundColor: appTheme.colors.card,
        },
        style,
      ]}
    >
      <Text style={[styles.title, { color: appTheme.colors.textPrimary }]}>
        عرض الخريطة التفاعلية غير مدعوم بالكامل على الويب
      </Text>
      <Text style={[styles.text, { color: appTheme.colors.textSecondary }]}>
        {workerTitle}: {lat}, {lng}
      </Text>
      {destinationLat != null && destinationLng != null ? (
        <Text style={[styles.text, { color: appTheme.colors.textSecondary }]}>
          {destinationTitle}: {destinationLat}, {destinationLng}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 280,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  text: {
    fontSize: 13,
    textAlign: "center",
  },
});
