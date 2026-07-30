import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getDashboard, getElevators, getStoreHome, getVisits } from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { StatCard } from "../../components/common/StatCard";
import { StatusPill } from "../../components/common/StatusPill";
import { IssueReportModal } from "../../components/issues/IssueReportModal";
import { AppStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { useAppTheme } from "../../theme/useAppTheme";
import { formatDateTime } from "../../utils/format";

export function HomeScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  const user = useAuthStore((state) => state.user);
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [issueModalVisible, setIssueModalVisible] = useState(false);

  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
  const visitsQuery = useQuery({ queryKey: ["visits"], queryFn: getVisits });
  const elevatorsQuery = useQuery({ queryKey: ["elevators"], queryFn: getElevators });
  const storeQuery = useQuery({ queryKey: ["store-home"], queryFn: getStoreHome });

  const upcomingVisits = useMemo(
    () => (visitsQuery.data ?? []).filter((item) => item.status !== "completed").slice(0, 3),
    [visitsQuery.data],
  );

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroName}>مرحباً، {user?.name ?? "عميل ELMS"}</Text>
        <Text style={styles.heroCompany}>{user?.companyName ?? "شركة العميل"}</Text>
        <Text style={styles.heroSubtitle}>لوحة مراقبة مباشرة لمصاعدك، العقود، والزيارات الفنية.</Text>
        <Pressable style={styles.profileShortcut} onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.profileShortcutText}>إدارة الحساب والملف الشخصي</Text>
        </Pressable>
      </View>

      {dashboardQuery.isLoading ? (
        <LoadingState />
      ) : dashboardQuery.data ? (
        <View style={styles.statsGrid}>
          <StatCard title="إجمالي المواقع" value={dashboardQuery.data.totalSites ?? 0} tone="default" />
          <StatCard title="إجمالي المصاعد" value={dashboardQuery.data.totalElevators} tone="accent" />
          <StatCard title="تشغيل طبيعي" value={dashboardQuery.data.operationalCount} />
          <StatCard title="تحذيرات" value={dashboardQuery.data.warningCount} tone="warn" />
          <StatCard title="أعطال" value={dashboardQuery.data.downCount} tone="danger" />
        </View>
      ) : (
        <EmptyState title="لا توجد بيانات حالياً" subtitle="تعذر تحميل ملخص لوحة التحكم." />
      )}

      <View style={styles.actionRow}>
        <Pressable style={[styles.actionButton, styles.dangerAction]} onPress={() => setIssueModalVisible(true)}>
          <Text style={styles.actionText}>بلاغ عطل طارئ</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate("ElevatorDetail", { elevatorId: elevatorsQuery.data?.[0]?.id ?? "elv-1" })}
        >
          <Text style={styles.actionText}>أول مصعد بالتفصيل</Text>
        </Pressable>
      </View>

      <View style={styles.storeCard}>
        <View style={styles.storeHeader}>
          <View style={styles.storeBadge}>
            <Text style={styles.storeBadgeText}>Store</Text>
          </View>
          <View style={styles.storeHeaderText}>
            <Text style={styles.storeTitle}>متجر قطع الغيار</Text>
            <Text style={styles.storeSubtitle}>
              شراء مباشر، دفع منظم، وتتبع للشحنة داخل التطبيق.
            </Text>
          </View>
        </View>

        {storeQuery.data?.activeOrder ? (
          <Text style={styles.storeMeta}>
            طلب نشط: {storeQuery.data.activeOrder.number} • {storeQuery.data.activeOrder.progress}%
          </Text>
        ) : null}

        <View style={styles.storeActions}>
          <Pressable
            style={styles.storeSecondaryButton}
            onPress={() =>
              storeQuery.data?.activeOrder &&
              navigation.navigate("StoreOrderTracking", {
                orderId: storeQuery.data.activeOrder.id,
              })
            }
          >
            <Text style={styles.storeSecondaryText}>تتبع الشراء</Text>
          </Pressable>
          <Pressable
            style={styles.storePrimaryButton}
            onPress={() => navigation.navigate("MainTabs", { screen: "Store" })}
          >
            <Text style={styles.storePrimaryText}>ادخل المتجر</Text>
          </Pressable>
        </View>
      </View>

      <SectionTitle subtitle="US-02 و US-03">الزيارات القادمة</SectionTitle>
      {upcomingVisits.length === 0 ? (
        <EmptyState title="لا توجد زيارات قادمة" subtitle="سيظهر الجدول هنا عند إضافة زيارات فنية." />
      ) : (
        upcomingVisits.map((visit) => (
          <View style={styles.listCard} key={visit.id}>
            <View style={styles.cardHeader}>
              <StatusPill status={visit.status} />
              <Text style={styles.cardTitle}>{visit.elevatorName}</Text>
            </View>
            <Text style={styles.cardInfo}>الموعد: {formatDateTime(visit.scheduledAt)}</Text>
            <Text style={styles.cardInfo}>الفني: {visit.technicianName}</Text>
            <Pressable style={styles.inlineButton} onPress={() => navigation.navigate("Tracking", { visitId: visit.id })}>
              <Text style={styles.inlineButtonText}>تتبع الفني</Text>
            </Pressable>
          </View>
        ))
      )}
      <IssueReportModal visible={issueModalVisible} onClose={() => setIssueModalVisible(false)} elevators={elevatorsQuery.data ?? []} />
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    hero: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.lg,
      gap: 6,
    },
    heroName: {
      color: appTheme.colors.textPrimary,
      fontSize: 23,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroCompany: {
      color: appTheme.colors.accent,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroSubtitle: {
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "right",
      writingDirection: "rtl",
    },
    profileShortcut: {
      alignSelf: "flex-end",
      marginTop: 6,
      backgroundColor: `${appTheme.colors.accent}18`,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}55`,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    profileShortcutText: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    statsGrid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 10,
    },
    actionRow: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    actionButton: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: `${appTheme.colors.info}22`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.info}99`,
      alignItems: "center",
      paddingVertical: 10,
    },
    dangerAction: {
      backgroundColor: `${appTheme.colors.danger}22`,
      borderColor: `${appTheme.colors.danger}88`,
    },
    actionText: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    storeCard: {
      backgroundColor: appTheme.colors.surface,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}55`,
      padding: appTheme.spacing.md,
      gap: 12,
    },
    storeHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
    },
    storeBadge: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: `${appTheme.colors.accent}22`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}77`,
      alignItems: "center",
      justifyContent: "center",
    },
    storeBadgeText: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center",
    },
    storeHeaderText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    storeTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    storeSubtitle: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "right",
      writingDirection: "rtl",
    },
    storeMeta: {
      color: appTheme.colors.info,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    storeActions: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    storePrimaryButton: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: appTheme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 11,
    },
    storeSecondaryButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${appTheme.colors.info}88`,
      backgroundColor: `${appTheme.colors.info}18`,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 11,
    },
    storePrimaryText: {
      color: "#052B1F",
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center",
      writingDirection: "rtl",
    },
    storeSecondaryText: {
      color: appTheme.colors.info,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center",
      writingDirection: "rtl",
    },
    listCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 6,
    },
    cardHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    cardInfo: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    inlineButton: {
      alignSelf: "flex-start",
      backgroundColor: `${appTheme.colors.accent}22`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}88`,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    inlineButtonText: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
