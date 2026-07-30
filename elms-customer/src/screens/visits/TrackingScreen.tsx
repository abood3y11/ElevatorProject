import { RouteProp, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getTracking } from "../../api/customerApi";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { TrackingMap } from "../../components/visits/TrackingMap";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../theme/useAppTheme";


type TrackingRoute = RouteProp<AppStackParamList, "Tracking">;

export function TrackingScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  const route = useRoute<TrackingRoute>();
  const trackingQuery = useQuery({
    queryKey: ["tracking", route.params.visitId],
    queryFn: () => getTracking(route.params.visitId),
    refetchInterval: 15000,
  });

  const isLive = trackingQuery.data?.isLive === true;
  const showNoTracking = !trackingQuery.isLoading && (!trackingQuery.data || !isLive);

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <SectionTitle subtitle="US-03: متابعة موقع الفني لحظياً">تتبع الفني</SectionTitle>

      {trackingQuery.isLoading ? <LoadingState /> : null}

      {showNoTracking ? (
        <View style={styles.noTrackingWrap}>
          <Text style={styles.noTrackingText}>لا يمكن تتبع موقع الفني</Text>
        </View>
      ) : null}

      {isLive && trackingQuery.data ? (
        <View style={styles.mapWrap}>
          <TrackingMap
            lat={trackingQuery.data.lat}
            lng={trackingQuery.data.lng}
            destinationLat={trackingQuery.data.destinationLat ?? undefined}
            destinationLng={trackingQuery.data.destinationLng ?? undefined}
            workerTitle={trackingQuery.data.technicianName || "موقع الفني"}
            destinationTitle={trackingQuery.data.destinationLabel || "موقع العميل"}
            style={styles.map}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    content: {
      flex: 1,
      gap: appTheme.spacing.md,
    },
    mapWrap: {
      flex: 1,
      borderRadius: appTheme.radius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: appTheme.colors.border,
    },
    map: {
      width: "100%",
      height: "100%",
    },
    noTrackingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    noTrackingText: {
      color: appTheme.colors.textSecondary,
      fontSize: 16,
      textAlign: "center",
      writingDirection: "rtl",
    },
  });
}
