import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { buildCustomerOrdersWebSocketUrl } from "../../api/client";
import { cancelStoreOrder, getStoreOrders } from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { StatusPill } from "../../components/common/StatusPill";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../theme/useAppTheme";
import { formatCurrency, formatDate } from "../../utils/format";

export function OrderHistoryScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const [hideDelivered, setHideDelivered] = useState(true);
  const [importantOnly, setImportantOnly] = useState(false);
  const ordersQuery = useQuery({
    queryKey: ["store-orders"],
    queryFn: getStoreOrders,
    refetchOnWindowFocus: true,
  });
  const cancelMutation = useMutation({
    mutationFn: cancelStoreOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      queryClient.invalidateQueries({ queryKey: ["store-home"] });
    },
  });

  useEffect(() => {
    const url = buildCustomerOrdersWebSocketUrl();
    if (!url) return;

    const socket = new WebSocket(url);
    socket.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      queryClient.invalidateQueries({ queryKey: ["store-home"] });
    };

    return () => {
      socket.close();
    };
  }, [queryClient]);

  if (ordersQuery.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const orders = (ordersQuery.data ?? [])
    .filter((order) => (hideDelivered ? order.status !== "delivered" : true))
    .filter((order) => {
      if (!importantOnly) return true;
      return order.status !== "delivered" || order.steps.some((step) => step.state === "warning");
    })
    .sort((left, right) => {
      const leftTimestamp = new Date(left.currentStep?.timestamp || left.steps[left.steps.length - 1]?.timestamp || left.placedAt).getTime();
      const rightTimestamp = new Date(right.currentStep?.timestamp || right.steps[right.steps.length - 1]?.timestamp || right.placedAt).getTime();
      return rightTimestamp - leftTimestamp;
    });

  return (
    <Screen>
      <SectionTitle subtitle="كل طلبات قطع الغيار المرتبطة بحساب العميل">طلبات المتجر</SectionTitle>
      <View style={styles.filterRow}>
        <Pressable style={[styles.filterChip, hideDelivered ? styles.filterChipActive : null]} onPress={() => setHideDelivered((value) => !value)}>
          <Text style={[styles.filterChipText, hideDelivered ? styles.filterChipTextActive : null]}>إخفاء تم التسليم</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, importantOnly ? styles.filterChipActive : null]} onPress={() => setImportantOnly((value) => !value)}>
          <Text style={[styles.filterChipText, importantOnly ? styles.filterChipTextActive : null]}>الأهم أولاً</Text>
        </Pressable>
      </View>

      {orders.length === 0 ? (
        <EmptyState
          title="لا توجد طلبات بعد"
          subtitle="عند إنشاء طلب من المتجر سيظهر هنا مع التتبع والفاتورة."
        />
      ) : null}

      {orders.map((order) => {
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const canCancel = order.status === "processing" || order.status === "ready_to_ship";
        const activeStep =
          order.currentStep ?? order.steps.find((step) => step.state === "current" || step.state === "warning");
        const isStopped = activeStep?.state === "warning";
        return (
          <Pressable
            key={order.id}
            style={styles.orderCard}
            onPress={() => navigation.navigate("StoreOrderTracking", { orderId: order.id })}
          >
            <View style={styles.orderHeader}>
              <StatusPill status={order.status} />
              <View style={styles.orderTitleWrap}>
                <Text style={styles.orderNumber}>{order.number}</Text>
                <Text style={styles.orderMeta}>
                  {itemCount} قطع • {formatDate(order.placedAt)}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${order.progress}%` }]} />
            </View>

            {activeStep ? (
              <View style={[styles.stepBanner, isStopped ? styles.stepBannerWarning : null]}>
                <Text style={[styles.stepBannerTitle, isStopped ? styles.stepBannerTitleWarning : null]}>
                  {isStopped ? `متوقف عند: ${activeStep.label}` : `المرحلة الحالية: ${activeStep.label}`}
                </Text>
                <Text style={styles.stepBannerDescription}>{activeStep.description}</Text>
              </View>
            ) : null}

            <View style={styles.orderFooter}>
              <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
              <View style={styles.footerActions}>
                {canCancel ? (
                  <Pressable
                    style={styles.cancelButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      cancelMutation.mutate(order.id);
                    }}
                  >
                    <Text style={styles.cancelText}>إلغاء</Text>
                  </Pressable>
                ) : null}
                <View style={styles.footerAction}>
                  <Text style={styles.footerActionText}>تتبع</Text>
                  <Ionicons name="chevron-back" size={16} color={appTheme.colors.accent} />
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    filterRow: {
      flexDirection: "row-reverse",
      gap: 8,
      marginBottom: 12,
      flexWrap: "wrap",
    },
    filterChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}CC`,
      backgroundColor: appTheme.colors.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterChipActive: {
      borderColor: `${appTheme.colors.accent}44`,
      backgroundColor: `${appTheme.colors.accent}12`,
    },
    filterChipText: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      writingDirection: "rtl",
    },
    filterChipTextActive: {
      color: appTheme.colors.accent,
    },
    orderCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 12,
    },
    orderHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    orderTitleWrap: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    orderNumber: {
      color: appTheme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
      textAlign: "right",
    },
    orderMeta: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: `${appTheme.colors.border}AA`,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: appTheme.colors.accent,
    },
    orderFooter: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    orderTotal: {
      color: appTheme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      textAlign: "right",
    },
    stepBanner: {
      borderRadius: appTheme.radius.md,
      backgroundColor: `${appTheme.colors.accent}10`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}24`,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    stepBannerWarning: {
      backgroundColor: `${appTheme.colors.warn}14`,
      borderColor: `${appTheme.colors.warn}30`,
    },
    stepBannerTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    stepBannerTitleWarning: {
      color: appTheme.colors.warn,
    },
    stepBannerDescription: {
      color: appTheme.colors.textSecondary,
      fontSize: 11,
      lineHeight: 16,
      textAlign: "right",
      writingDirection: "rtl",
    },
    footerAction: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 4,
    },
    footerActions: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },
    footerActionText: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    cancelButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${appTheme.colors.danger}77`,
      backgroundColor: `${appTheme.colors.danger}14`,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    cancelText: {
      color: appTheme.colors.danger,
      fontSize: 11,
      fontWeight: "800",
      writingDirection: "rtl",
    },
  });
}
