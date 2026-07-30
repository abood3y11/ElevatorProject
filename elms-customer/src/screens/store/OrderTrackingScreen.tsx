import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { buildCustomerOrdersWebSocketUrl, resolveProtectedDocumentUrl, resolveProtectedPdfUrl } from "../../api/client";
import { getStoreOrderById, getStoreOrderDeliveryLocation } from "../../api/customerApi";
import { DeliveryProgressBar } from "../../components/common/DeliveryProgressBar";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { StatusPill } from "../../components/common/StatusPill";
import { TrackingMap } from "../../components/visits/TrackingMap.native";
import { AppStackParamList } from "../../navigation/types";
import { StoreOrderStepState } from "../../types/models";
import { useAppTheme } from "../../theme/useAppTheme";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/format";

export function OrderTrackingScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "StoreOrderTracking">>();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ["store-order", route.params.orderId],
    queryFn: () => getStoreOrderById(route.params.orderId),
    refetchOnWindowFocus: true,
  });

  const deliveryLocationQuery = useQuery({
    queryKey: ["store-order-delivery-location", route.params.orderId],
    queryFn: () => getStoreOrderDeliveryLocation(route.params.orderId),
    enabled:
      !!orderQuery.data?.deliveryWorker?.id &&
      ["ready_to_ship", "in_transit"].includes(orderQuery.data?.status ?? ""),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    const url = buildCustomerOrdersWebSocketUrl(route.params.orderId);
    if (!url) return;

    const socket = new WebSocket(url);
    socket.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["store-order", route.params.orderId] });
      queryClient.invalidateQueries({ queryKey: ["store-order-delivery-location", route.params.orderId] });
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      queryClient.invalidateQueries({ queryKey: ["store-home"] });
    };

    return () => socket.close();
  }, [queryClient, route.params.orderId]);

  if (orderQuery.isLoading || !orderQuery.data) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  const order = orderQuery.data;
  const deliveryLocation = deliveryLocationQuery.data;
  const activeStep =
    order.currentStep ?? order.steps.find((step) => step.state === "current" || step.state === "warning");
  const isDelayed = activeStep?.state === "warning";

  return (
    <Screen>
      <LinearGradient
        colors={appTheme.gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroHeader}>
          <StatusPill status={order.status} />
          <View style={styles.heroHeaderText}>
            <Text style={styles.orderNumber}>{order.number}</Text>
            <Text style={styles.orderMeta}>تم إنشاء الطلب في {formatDateTime(order.placedAt)}</Text>
          </View>
        </View>

        <DeliveryProgressBar
          progress={order.progress}
          height={10}
          colors={["#FFFFFF", "#EDE9FE"]}
          trackColor={appTheme.isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.28)"}
          animating={["ready_to_ship", "in_transit"].includes(order.status ?? "")}
        />

        <View style={styles.progressMetaRow}>
          <Text style={styles.progressMetaText}>{order.progress}% مكتمل</Text>
          <Text style={styles.progressMetaText}>الوصول المتوقع {formatDate(order.etaDate)}</Text>
        </View>

        {activeStep ? (
          <View style={[styles.liveStepCard, isDelayed ? styles.liveStepCardWarning : null]}>
            <Text style={[styles.liveStepTitle, isDelayed ? styles.liveStepTitleWarning : null]}>
              {isDelayed ? `الطلب متوقف عند ${activeStep.label}` : `المرحلة الحالية: ${activeStep.label}`}
            </Text>
            <Text style={styles.liveStepDescription}>{activeStep.description}</Text>
          </View>
        ) : null}

        <View style={styles.deliveryInfoGrid}>
          <View style={styles.deliveryInfoCard}>
            <Text style={styles.deliveryInfoValue}>{order.courierName || "قيد التحديد"}</Text>
            <Text style={styles.deliveryInfoLabel}>شركة التوصيل</Text>
          </View>
          <View style={styles.deliveryInfoCard}>
            <Text style={styles.deliveryInfoValue}>{order.trackingCode || "لم يصدر بعد"}</Text>
            <Text style={styles.deliveryInfoLabel}>رقم التتبع</Text>
          </View>
          <View style={styles.deliveryInfoCard}>
            <Text style={styles.deliveryInfoValue}>{order.deliveryWindow}</Text>
            <Text style={styles.deliveryInfoLabel}>نافذة الوصول</Text>
          </View>
        </View>

        <View style={styles.workerCard}>
          <Text style={styles.workerTitle}>المندوب المسؤول</Text>
          <Text style={styles.workerName}>{order.deliveryWorker?.name || "لم يتم تعيين مندوب بعد"}</Text>
          <Text style={styles.workerPhone}>{order.deliveryWorker?.phone || "سيظهر الرقم بعد تعيين المندوب"}</Text>
        </View>

        {deliveryLocation?.isOnline ? (
          <Pressable
            style={styles.liveLocationCard}
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${deliveryLocation.lat},${deliveryLocation.lng}`)}
          >
            <View style={styles.liveLocationHeader}>
              <Ionicons name="navigate-circle-outline" size={18} color={appTheme.colors.accent} />
              <Text style={styles.liveLocationHeaderText}>موقع المندوب الآن</Text>
            </View>
            {deliveryLocation.destination ? (
              <Text style={styles.liveLocationCaption}>الوجهة: {deliveryLocation.destination.label}</Text>
            ) : null}
            <TrackingMap
              lat={deliveryLocation.lat}
              lng={deliveryLocation.lng}
              destinationLat={deliveryLocation.destination?.lat}
              destinationLng={deliveryLocation.destination?.lng}
              workerTitle="موقع المندوب"
              destinationTitle={deliveryLocation.destination?.label || "موقع العميل"}
              style={styles.liveLocationMap}
            />
          </Pressable>
        ) : order.deliveryWorker?.id && ["ready_to_ship", "in_transit"].includes(order.status ?? "") ? (
          <View style={styles.noTrackingCard}>
            <Text style={styles.noTrackingText}>لا يمكن تتبع موقع الفني</Text>
          </View>
        ) : null}
      </LinearGradient>

      <SectionTitle subtitle="من تجهيز الطلب حتى الاستلام في الموقع">خطوات الطلب</SectionTitle>
      <View style={styles.timelineWrap}>
        {order.steps.map((step) => (
          <View key={step.id} style={styles.timelineRow}>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>{step.label}</Text>
              <Text style={styles.timelineDescription}>{step.description}</Text>
              <Text style={styles.timelineTime}>{formatDateTime(step.timestamp)}</Text>
            </View>
            <View style={styles.timelineIndicatorWrap}>
              <View style={[styles.timelineIndicator, { backgroundColor: stepColor(appTheme, step.state) }]} />
              {step.id !== order.steps[order.steps.length - 1]?.id ? <View style={styles.timelineLine} /> : null}
            </View>
          </View>
        ))}
      </View>

      <SectionTitle subtitle="العناصر الموجودة داخل هذه الشحنة">عناصر الطلب</SectionTitle>
      {order.items.map((item) => (
        <Pressable
          key={`${item.productId}-${item.quantity}`}
          style={styles.itemCard}
          onPress={() => navigation.navigate("StoreProductDetail", { productId: item.productId })}
        >
          {item.image ? (
            <Image source={item.image} style={styles.itemImage} resizeMode="contain" />
          ) : (
            <View
              style={[
                styles.itemIconWrap,
                { backgroundColor: `${item.accentColor}22`, borderColor: `${item.accentColor}66` },
              ]}
            >
              <Ionicons
                name={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={20}
                color={item.accentColor}
              />
            </View>
          )}

          <View style={styles.itemTextWrap}>
            <Text style={styles.itemTitle}>{item.productName}</Text>
            <Text style={styles.itemSubtitle}>{item.productSubtitle}</Text>
            <Text style={styles.itemMeta}>
              {item.quantity} × {formatCurrency(item.unitPrice)}
            </Text>
          </View>
        </Pressable>
      ))}

      <SectionTitle subtitle="قيمة الطلب وحالة الفاتورة">الدفع</SectionTitle>
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <StatusPill status={order.paymentStatus} />
          <Text style={styles.summaryHeaderTitle}>الفاتورة المرتبطة بالطلب</Text>
        </View>
        {order.invoice ? (
          <Pressable
            style={styles.invoiceButton}
            onPress={() => {
              const url = resolveProtectedDocumentUrl(order.invoice?.pdfUrl);
              const downloadUrl = resolveProtectedPdfUrl(order.invoice?.pdfUrl);
              if (!url) return;
              navigation.navigate("StoreInvoiceViewer", {
                title: "الفاتورة الضريبية",
                url,
                downloadUrl,
              });
            }}
          >
            <Text style={styles.invoiceButtonText}>عرض الفاتورة الضريبية</Text>
          </Pressable>
        ) : null}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>{formatCurrency(order.subtotal)}</Text>
          <Text style={styles.summaryLabel}>القطع</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>{formatCurrency(order.shipping)}</Text>
          <Text style={styles.summaryLabel}>التوصيل</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>{formatCurrency(order.tax)}</Text>
          <Text style={styles.summaryLabel}>الضريبة</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
          <Text style={styles.totalLabel}>الإجمالي</Text>
        </View>
      </View>

      <View style={styles.addressCard}>
        <Text style={styles.addressTitle}>{order.addressLabel}</Text>
        <Text style={styles.addressText}>{order.addressDetails}</Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("MainTabs", { screen: "Store" })}>
          <Text style={styles.secondaryButtonText}>العودة للمتجر</Text>
        </Pressable>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate("StoreProductDetail", { productId: order.items[0].productId })}
        >
          <Text style={styles.primaryButtonText}>إعادة شراء قطعة</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function stepColor(appTheme: ReturnType<typeof useAppTheme>, state: StoreOrderStepState) {
  switch (state) {
    case "completed":
      return appTheme.colors.success;
    case "current":
      return appTheme.colors.accent;
    case "warning":
      return appTheme.colors.warn;
    case "upcoming":
      return appTheme.colors.border;
    default:
      return appTheme.colors.border;
  }
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    hero: {
      borderRadius: appTheme.radius.xl,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}CC`,
      padding: appTheme.spacing.lg,
      gap: 14,
      shadowColor: appTheme.colors.accent,
      shadowOpacity: appTheme.isDark ? 0.16 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: appTheme.isDark ? 0 : 4,
    },
    heroHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    heroHeaderText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    orderNumber: {
      color: appTheme.colors.textPrimary,
      fontSize: 20,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    orderMeta: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: appTheme.isDark ? "rgba(255,255,255,0.14)" : `${appTheme.colors.border}CC`,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: appTheme.colors.accent,
    },
    progressMetaRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    progressMetaText: {
      color: appTheme.colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    liveStepCard: {
      borderRadius: 18,
      backgroundColor: appTheme.isDark ? "rgba(255,255,255,0.10)" : `${appTheme.colors.accent}10`,
      borderWidth: 1,
      borderColor: appTheme.isDark ? "rgba(255,255,255,0.12)" : `${appTheme.colors.accent}16`,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 6,
      alignItems: "flex-end",
    },
    liveStepCardWarning: {
      backgroundColor: "rgba(245,158,11,0.16)",
      borderColor: "rgba(245,158,11,0.30)",
    },
    liveStepTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    liveStepTitleWarning: {
      color: "#FDE68A",
    },
    liveStepDescription: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "right",
      writingDirection: "rtl",
    },
    deliveryInfoGrid: {
      flexDirection: "row-reverse",
      gap: 10,
      justifyContent: "space-between",
    },
    deliveryInfoCard: {
      flex: 1,
      borderRadius: 16,
      backgroundColor: appTheme.isDark ? "rgba(255,255,255,0.08)" : `${appTheme.colors.accent}10`,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: "center",
      gap: 4,
    },
    deliveryInfoValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center",
    },
    deliveryInfoLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 10,
      fontWeight: "700",
      textAlign: "center",
    },
    workerCard: {
      borderRadius: 16,
      backgroundColor: appTheme.isDark ? "rgba(255,255,255,0.08)" : `${appTheme.colors.accent}10`,
      borderWidth: 1,
      borderColor: appTheme.isDark ? "rgba(255,255,255,0.10)" : `${appTheme.colors.accent}16`,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
      alignItems: "flex-end",
    },
    workerTitle: {
      color: appTheme.colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    workerName: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    workerPhone: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    liveLocationCard: {
      borderRadius: 16,
      backgroundColor: appTheme.isDark ? "rgba(255,255,255,0.08)" : `${appTheme.colors.surface}F2`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}22`,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
      alignItems: "stretch",
    },
    liveLocationHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 6,
    },
    liveLocationHeaderText: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    liveLocationCaption: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    liveLocationMap: {
      height: 190,
      borderRadius: 14,
      overflow: "hidden",
    },
    timelineWrap: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 10,
    },
    timelineRow: {
      flexDirection: "row-reverse",
      alignItems: "stretch",
      gap: 12,
    },
    timelineContent: {
      flex: 1,
      backgroundColor: `${appTheme.colors.surface}CC`,
      borderRadius: 14,
      padding: 12,
      gap: 6,
      alignItems: "flex-end",
    },
    timelineTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    timelineDescription: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "right",
      writingDirection: "rtl",
    },
    timelineTime: {
      color: appTheme.colors.textMuted,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
    timelineIndicatorWrap: {
      width: 24,
      alignItems: "center",
    },
    timelineIndicator: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginTop: 12,
    },
    timelineLine: {
      flex: 1,
      width: 2,
      backgroundColor: `${appTheme.colors.border}CC`,
      marginVertical: 4,
    },
    itemCard: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
    },
    itemIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    itemImage: {
      width: 58,
      height: 58,
      borderRadius: 14,
      backgroundColor: appTheme.colors.surface,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}88`,
    },
    itemTextWrap: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    itemTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    itemSubtitle: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    itemMeta: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    summaryCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 10,
    },
    summaryHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 2,
    },
    summaryHeaderTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    invoiceButton: {
      alignSelf: "flex-end",
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}33`,
      backgroundColor: `${appTheme.colors.accent}12`,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 8,
    },
    invoiceButtonText: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    summaryRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    summaryValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    summaryLabel: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      writingDirection: "rtl",
    },
    totalRow: {
      marginTop: 6,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: `${appTheme.colors.border}88`,
    },
    totalValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
    },
    totalLabel: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    addressCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 6,
      alignItems: "flex-end",
    },
    addressTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    addressText: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
      lineHeight: 18,
    },
    actionsRow: {
      flexDirection: "row-reverse",
      gap: 12,
    },
    secondaryButton: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.card,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButton: {
      flex: 1,
      borderRadius: 16,
      backgroundColor: appTheme.colors.accent,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    primaryButtonText: {
      color: appTheme.colors.white,
      fontSize: 13,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    noTrackingCard: {
      borderRadius: 16,
      backgroundColor: appTheme.isDark ? "rgba(255,255,255,0.06)" : `${appTheme.colors.surface}F2`,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      paddingVertical: 24,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    noTrackingText: {
      color: appTheme.colors.textSecondary,
      fontSize: 14,
      textAlign: "center",
      writingDirection: "rtl",
    },
  });
}
