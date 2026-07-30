import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getElevatorById } from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { StatusPill } from "../../components/common/StatusPill";
import { ElevatorThreeScene } from "../../components/elevators/ElevatorThreeScene";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../theme/useAppTheme";
import { ElevatorFloor } from "../../types/models";
import { formatDate } from "../../utils/format";

type ElevatorDetailRoute = RouteProp<AppStackParamList, "ElevatorDetail">;

export function ElevatorDetailScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const route = useRoute<ElevatorDetailRoute>();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const elevatorQuery = useQuery({
    queryKey: ["elevator", route.params.elevatorId],
    queryFn: () => getElevatorById(route.params.elevatorId),
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: isInfoOpen ? 1 : 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
      }),
      Animated.timing(overlayAnim, {
        toValue: isInfoOpen ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isInfoOpen, overlayAnim, slideAnim]);

  if (elevatorQuery.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (!elevatorQuery.data) {
    return (
      <Screen>
        <EmptyState title="تعذر تحميل المصعد" subtitle="تأكد من اتصال الإنترنت وحاول مرة أخرى." />
      </Screen>
    );
  }

  const elevator = elevatorQuery.data;
  const sceneFloors = elevator.floors?.length
    ? elevator.floors
    : buildFallbackFloors(elevator.floorCount ?? 3);
  const drawerWidth = Math.min(width * 0.84, 360);
  const drawerTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [drawerWidth + 24, 0],
  });

  const infoItems = [
    { label: "عدد الأدوار", value: String(sceneFloors.length), icon: "layers-outline" },
    { label: "الرقم التسلسلي", value: elevator.serialNumber, icon: "barcode-outline" },
    { label: "الموقع", value: elevator.location, icon: "location-outline" },
    { label: "الماركة / الموديل", value: `${elevator.brand} / ${elevator.model}`, icon: "build-outline" },
    { label: "آخر صيانة", value: formatDateOrDash(elevator.lastServiceDate), icon: "time-outline" },
    { label: "الصيانة القادمة", value: formatDateOrDash(elevator.nextServiceDate), icon: "calendar-outline" },
    { label: "العميل", value: elevator.customerName || "غير محدد", icon: "business-outline" },
    { label: "الموقع التفصيلي", value: elevator.siteAddress || elevator.siteName || "غير محدد", icon: "map-outline" },
  ];

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.sceneWrap}>
        <ElevatorThreeScene
          floors={sceneFloors}
          elevatorName={elevator.name}
          initialFloorId={elevator.initialFloorId}
          showTopHud={false}
        />

        <Pressable
          style={[styles.backButton, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-forward" size={22} color={appTheme.colors.white} />
        </Pressable>

        <View style={[styles.topBadge, { top: insets.top + 12 }]}>
          <StatusPill status={elevator.status} />
          <View style={styles.topBadgeTextWrap}>
            <Text style={styles.title}>{elevator.name}</Text>
            <Text style={styles.subtitle}>{elevator.code}</Text>
          </View>
        </View>

        <Pressable style={styles.infoButton} onPress={() => setIsInfoOpen(true)}>
          <Ionicons name="information-circle-outline" size={24} color={appTheme.colors.textPrimary} />
        </Pressable>

        {isInfoOpen ? (
          <Animated.View
            pointerEvents={isInfoOpen ? "auto" : "none"}
            style={[styles.overlay, { opacity: overlayAnim }]}
          >
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsInfoOpen(false)} />
          </Animated.View>
        ) : null}

        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              paddingTop: insets.top + 20,
              paddingBottom: Math.max(insets.bottom, 20) + 20,
              transform: [{ translateX: drawerTranslateX }],
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <Pressable style={styles.closeButton} onPress={() => setIsInfoOpen(false)}>
              <Ionicons name="close-outline" size={22} color={appTheme.colors.textPrimary} />
            </Pressable>
            <View style={styles.drawerHeaderText}>
              <Text style={styles.drawerTitle}>معلومات المصعد</Text>
            </View>
          </View>

          <View style={styles.drawerList}>
            {infoItems.map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <View style={styles.infoRowText}>
                  <Text style={styles.infoValue}>{item.value}</Text>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                </View>
                <View style={styles.infoIconWrap}>
                  <Ionicons name={item.icon as never} size={18} color={appTheme.colors.accent} />
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}

function formatDateOrDash(value?: string | null) {
  return value ? formatDate(value) : "غير محدد";
}

function buildFallbackFloors(floorCount: number): ElevatorFloor[] {
  const total = Math.max(2, floorCount);

  return Array.from({ length: total }, (_, index) => ({
    id: `f${index + 1}`,
    label: String(index + 1),
    order: index + 1,
    y: index * 3,
  }));
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    screenContent: {
      flex: 1,
      paddingTop: 0,
      paddingBottom: 0,
      paddingHorizontal: 0,
      gap: 0,
    },
    sceneWrap: {
      flex: 1,
      width: "100%",
      height: "100%",
      backgroundColor: appTheme.colors.card,
      overflow: "hidden",
    },
    topBadge: {
      position: "absolute",
      right: 14,
      left: 72,
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: "rgba(13, 20, 32, 0.48)",
      paddingHorizontal: 12,
      paddingVertical: 10,
      zIndex: 20,
      elevation: 8,
    },
    backButton: {
      position: "absolute",
      left: 14,
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: "rgba(13, 20, 32, 0.58)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 22,
      elevation: 9,
    },
    topBadgeTextWrap: {
      alignItems: "flex-end",
      flexShrink: 1,
      gap: 2,
    },
    title: {
      color: appTheme.colors.white,
      fontSize: 18,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    subtitle: {
      color: "rgba(232, 240, 254, 0.84)",
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    infoButton: {
      position: "absolute",
      left: 14,
      top: "50%",
      marginTop: -28,
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: "rgba(13, 20, 32, 0.58)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 20,
      elevation: 8,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(7, 11, 20, 0.34)",
      zIndex: 25,
      elevation: 10,
    },
    drawer: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: 24,
      borderBottomLeftRadius: 24,
      borderLeftWidth: 1,
      borderColor: `${appTheme.colors.border}CC`,
      backgroundColor: "rgba(13, 20, 32, 0.94)",
      paddingHorizontal: 16,
      gap: 18,
      zIndex: 30,
      elevation: 12,
    },
    drawerHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: "rgba(255,255,255,0.06)",
      alignItems: "center",
      justifyContent: "center",
    },
    drawerHeaderText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 2,
    },
    drawerTitle: {
      color: appTheme.colors.white,
      fontSize: 17,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    drawerSubtitle: {
      color: "rgba(232, 240, 254, 0.72)",
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
    drawerList: {
      gap: 10,
    },
    infoRow: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(216, 229, 222, 0.16)",
      backgroundColor: "rgba(255,255,255,0.04)",
      padding: 12,
    },
    infoRowText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 3,
    },
    infoIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(15, 107, 92, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    infoValue: {
      color: appTheme.colors.white,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    infoLabel: {
      color: "rgba(232, 240, 254, 0.7)",
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
