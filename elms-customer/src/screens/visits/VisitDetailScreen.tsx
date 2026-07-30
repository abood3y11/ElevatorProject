import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  addVisitRecommendedPartsToCart,
  getVisitById,
  setVisitRecommendedPartDecision,
  setVisitRecommendedPartsBulkDecision,
} from "../../api/customerApi";
import { resolveProtectedPathUrl } from "../../api/client";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { StatusPill } from "../../components/common/StatusPill";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../theme/useAppTheme";
import { formatDateTime } from "../../utils/format";

type VisitDetailRoute = RouteProp<AppStackParamList, "VisitDetail">;

const urgencyLabels: Record<string, string> = {
  low: "عادي",
  medium: "متوسط",
  high: "عاجل",
};

const recommendationStatusLabels: Record<string, string> = {
  pending: "بانتظار قرارك",
  approved: "تمت الموافقة",
  added_to_cart: "في السلة",
  ordered: "تم الطلب",
  done: "تمت",
  ignored: "تم التجاهل",
};

export function VisitDetailScreen() {
  const route = useRoute<VisitDetailRoute>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  const urgencyBadgeStyle = (urgency: string) => {
    if (urgency === "high") return styles.urgencyHigh;
    if (urgency === "low") return styles.urgencyLow;
    return styles.urgencyMedium;
  };

  const recommendationStatusStyle = (status: string) => {
    if (status === "done") return styles.statusDone;
    if (status === "ordered") return styles.statusOrdered;
    if (status === "added_to_cart") return styles.statusCart;
    if (status === "approved") return styles.statusApproved;
    if (status === "ignored") return styles.statusIgnored;
    return styles.statusPending;
  };

  const visitQuery = useQuery({
    queryKey: ["visit-detail", route.params.visitId],
    queryFn: () => getVisitById(route.params.visitId),
  });

  const addAllMutation = useMutation({
    mutationFn: () => addVisitRecommendedPartsToCart(route.params.visitId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["store-cart"] });
      await queryClient.invalidateQueries({ queryKey: ["visit-detail", route.params.visitId] });
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      navigation.navigate("StoreCart");
    },
  });

  const decisionMutation = useMutation({
    mutationFn: ({ recommendationId, decision }: { recommendationId: string; decision: "approved" | "ignored" }) =>
      setVisitRecommendedPartDecision(route.params.visitId, recommendationId, decision),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["visit-detail", route.params.visitId] });
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });
  const bulkDecisionMutation = useMutation({
    mutationFn: (decision: "approved" | "ignored") => setVisitRecommendedPartsBulkDecision(route.params.visitId, decision),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["visit-detail", route.params.visitId] });
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });

  if (visitQuery.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  const visit = visitQuery.data;
  if (!visit) {
    return (
      <Screen>
        <Text style={styles.emptyText}>تعذر تحميل تفاصيل الزيارة.</Text>
      </Screen>
    );
  }

  const hasApprovedRecommendations = visit.recommendedParts.some(
    (item) => item.customerActionStatus === "approved" || item.customerActionStatus === "added_to_cart",
  );
  const hasPendingRecommendations = visit.recommendedParts.some((item) => item.customerActionStatus === "pending");

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <StatusPill status={visit.status} />
            <View style={styles.heroText}>
              <Text style={styles.title}>{visit.elevatorName}</Text>
              <Text style={styles.subtitle}>{formatDateTime(visit.scheduledAt)}</Text>
            </View>
          </View>
          {visit.siteName ? <Text style={styles.meta}>الموقع: {visit.siteName}</Text> : null}
          {visit.siteAddress ? <Text style={styles.meta}>{visit.siteAddress}</Text> : null}
          <Text style={styles.meta}>الفني: {visit.technicianName}</Text>
          {visit.technicianPhone ? <Text style={styles.meta}>الهاتف: {visit.technicianPhone}</Text> : null}
          {visit.status !== "completed" ? (
            <Pressable style={styles.trackButton} onPress={() => navigation.navigate("Tracking", { visitId: visit.id })}>
              <Text style={styles.trackText}>تتبع الفني</Text>
            </Pressable>
          ) : null}
        </View>

        {visit.resolutionNotes ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>ملخص الزيارة</Text>
            <Text style={styles.paragraph}>{visit.resolutionNotes}</Text>
          </View>
        ) : null}

        {visit.recommendationsText ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>تعليمات الفني</Text>
            <Text style={styles.paragraph}>{visit.recommendationsText}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            {hasApprovedRecommendations ? (
              <Pressable style={styles.bulkButton} onPress={() => addAllMutation.mutate()} disabled={addAllMutation.isPending}>
                <Text style={styles.bulkButtonText}>{addAllMutation.isPending ? "جارٍ الإضافة..." : "إضافة الموافق عليه إلى السلة"}</Text>
              </Pressable>
            ) : null}
            <Text style={styles.sectionTitle}>القطع المقترحة</Text>
          </View>

          {hasPendingRecommendations ? (
            <View style={styles.bulkDecisionRow}>
              <Pressable
                style={[styles.secondaryButton, bulkDecisionMutation.isPending && styles.disabledButton]}
                onPress={() => bulkDecisionMutation.mutate("ignored")}
                disabled={bulkDecisionMutation.isPending}
              >
                <Text style={styles.secondaryButtonText}>تجاهل الكل</Text>
              </Pressable>
              <Pressable
                style={[styles.approveButton, bulkDecisionMutation.isPending && styles.disabledButton]}
                onPress={() => bulkDecisionMutation.mutate("approved")}
                disabled={bulkDecisionMutation.isPending}
              >
                <Text style={styles.approveButtonText}>قبول الكل</Text>
              </Pressable>
            </View>
          ) : null}

          {visit.recommendedParts.length === 0 ? (
            <Text style={styles.paragraph}>لا توجد قطع مقترحة لهذه الزيارة حتى الآن.</Text>
          ) : (
            visit.recommendedParts.map((part) => {
              const isLocked = part.customerActionStatus === "pending" || part.customerActionStatus === "ignored" || part.customerActionStatus === "done";
              return (
                <View key={part.id} style={styles.productCard}>
                  <View style={styles.productHead}>
                    <View style={[styles.urgencyBadge, urgencyBadgeStyle(part.urgency)]}>
                      <Text style={styles.urgencyText}>{urgencyLabels[part.urgency] ?? "متوسط"}</Text>
                    </View>
                    <View style={styles.productText}>
                      <Text style={styles.productName}>{part.name}</Text>
                      <Text style={styles.productMeta}>
                        {part.sku} • الكمية المقترحة {part.quantityRecommended}
                      </Text>
                    </View>
                  </View>

                  {part.reason ? <Text style={styles.productReason}>{part.reason}</Text> : null}

                  <View style={styles.actionRow}>
                    <View style={[styles.statusBadge, recommendationStatusStyle(part.customerActionStatus)]}>
                      <Text style={styles.statusBadgeText}>
                        {recommendationStatusLabels[part.customerActionStatus] ?? "بانتظار قرارك"}
                      </Text>
                    </View>

                    {part.customerActionStatus === "pending" ? (
                      <View style={styles.decisionButtons}>
                        <Pressable
                          style={[styles.secondaryButton, decisionMutation.isPending && styles.disabledButton]}
                          onPress={() => decisionMutation.mutate({ recommendationId: part.id, decision: "ignored" })}
                          disabled={decisionMutation.isPending}
                        >
                          <Text style={styles.secondaryButtonText}>تجاهل</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.approveButton, decisionMutation.isPending && styles.disabledButton]}
                          onPress={() => decisionMutation.mutate({ recommendationId: part.id, decision: "approved" })}
                          disabled={decisionMutation.isPending}
                        >
                          <Text style={styles.approveButtonText}>قبول</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {part.quoteUrl ? (
                      <Pressable
                        style={styles.quoteButton}
                        onPress={() => {
                          const url = resolveProtectedPathUrl(part.quoteUrl);
                          if (!url) return;
                          navigation.navigate("StoreInvoiceViewer", {
                            title: "عرض السعر",
                            url,
                          });
                        }}
                      >
                        <Text style={styles.quoteButtonText}>عرض السعر</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>{part.price.toFixed(2)} ر.س</Text>
                    <Pressable
                      style={[styles.buyButton, isLocked && styles.disabledButton]}
                      onPress={() => navigation.navigate("StoreProductDetail", { productId: part.productId })}
                      disabled={isLocked}
                    >
                      <Text style={styles.buyText}>{part.customerActionStatus === "done" ? "تمت التوصية" : "شراء من المتجر"}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  const urgencyBase = {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  } as const;

  return StyleSheet.create({
    content: {
      gap: appTheme.spacing.md,
      paddingBottom: appTheme.spacing.xl,
    },
    heroCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.lg,
      gap: 8,
      shadowColor: "#0f6b5c",
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    heroTop: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    heroText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 2,
    },
    title: {
      color: appTheme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    subtitle: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    meta: {
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      textAlign: "right",
      writingDirection: "rtl",
    },
    sectionCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.lg,
      gap: 12,
    },
    sectionHeaderRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    bulkButton: {
      borderRadius: 12,
      backgroundColor: appTheme.colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    bulkButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
    paragraph: {
      color: appTheme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 23,
      textAlign: "right",
      writingDirection: "rtl",
    },
    trackButton: {
      alignSelf: "flex-start",
      borderRadius: 12,
      backgroundColor: appTheme.colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    trackText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "700",
    },
    productCard: {
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surface,
      padding: appTheme.spacing.md,
      gap: 10,
    },
    productHead: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
    },
    productText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 2,
    },
    productName: {
      color: appTheme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    productMeta: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    productReason: {
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 21,
      textAlign: "right",
      writingDirection: "rtl",
    },
    actionRow: {
      gap: 10,
    },
    decisionButtons: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    bulkDecisionRow: {
      flexDirection: "row-reverse",
      gap: 10,
      justifyContent: "flex-start",
    },
    approveButton: {
      borderRadius: 12,
      backgroundColor: appTheme.colors.success,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    approveButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
    secondaryButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surface,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    secondaryButtonText: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    quoteButton: {
      alignSelf: "flex-end",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}35`,
      backgroundColor: `${appTheme.colors.accent}12`,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    quoteButtonText: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "700",
    },
    statusBadge: {
      alignSelf: "flex-end",
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    statusPending: {
      backgroundColor: `${appTheme.colors.warn}18`,
    },
    statusApproved: {
      backgroundColor: `${appTheme.colors.success}18`,
    },
    statusCart: {
      backgroundColor: `${appTheme.colors.accent}18`,
    },
    statusOrdered: {
      backgroundColor: `${appTheme.colors.info}18`,
    },
    statusDone: {
      backgroundColor: `${appTheme.colors.success}22`,
    },
    statusIgnored: {
      backgroundColor: `${appTheme.colors.textSecondary}16`,
    },
    statusBadgeText: {
      color: appTheme.colors.textPrimary,
      fontSize: 11,
      fontWeight: "700",
    },
    productFooter: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    productPrice: {
      color: appTheme.colors.accent,
      fontSize: 15,
      fontWeight: "700",
    },
    buyButton: {
      borderRadius: 12,
      backgroundColor: appTheme.colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    buyText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
    disabledButton: {
      opacity: 0.55,
    },
    urgencyBadge: urgencyBase,
    urgencyLow: {
      ...urgencyBase,
      backgroundColor: `${appTheme.colors.info}1A`,
    },
    urgencyMedium: {
      ...urgencyBase,
      backgroundColor: `${appTheme.colors.warn}1A`,
    },
    urgencyHigh: {
      ...urgencyBase,
      backgroundColor: `${appTheme.colors.danger}16`,
    },
    urgencyText: {
      color: appTheme.colors.textPrimary,
      fontSize: 11,
      fontWeight: "700",
    },
    emptyText: {
      color: appTheme.colors.textSecondary,
      textAlign: "center",
      marginTop: 24,
    },
  });
}
