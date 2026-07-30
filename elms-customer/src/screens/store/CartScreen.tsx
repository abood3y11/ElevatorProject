import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  clearStoreCart,
  getStoreCart,
  placeStoreOrder,
  removeStoreCartItem,
  updateStoreCartItem,
} from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../theme/useAppTheme";
import { formatCurrency } from "../../utils/format";

export function CartScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const cartQuery = useQuery({ queryKey: ["store-cart"], queryFn: getStoreCart });

  const refreshCart = () => {
    queryClient.invalidateQueries({ queryKey: ["store-cart"] });
    queryClient.invalidateQueries({ queryKey: ["store-home"] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateStoreCartItem(itemId, quantity),
    onSuccess: refreshCart,
  });
  const removeMutation = useMutation({
    mutationFn: removeStoreCartItem,
    onSuccess: refreshCart,
  });
  const clearMutation = useMutation({
    mutationFn: clearStoreCart,
    onSuccess: refreshCart,
  });
  const checkoutMutation = useMutation({
    mutationFn: () =>
      placeStoreOrder({
        productId: cartQuery.data?.items[0]?.productId ?? "",
        quantity: 1,
        paymentMethod: "invoice",
        useCart: true,
      }),
    onSuccess: (order) => {
      refreshCart();
      navigation.navigate("StoreOrderTracking", { orderId: order.id });
    },
    onError: (error) => {
      Alert.alert("تعذر إرسال الطلب", error instanceof Error ? error.message : "حاول مرة أخرى.");
    },
  });

  if (cartQuery.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const cart = cartQuery.data;
  const isEmpty = !cart || cart.items.length === 0;

  return (
    <Screen>
      <SectionTitle subtitle="راجع الكميات قبل إنشاء طلب فاتورة الشركة">السلة</SectionTitle>

      {isEmpty ? (
        <EmptyState
          title="السلة فارغة"
          subtitle="أضف قطع الغيار من المتجر ثم ارجع لإتمام طلب واحد بكل العناصر."
        />
      ) : null}

      {cart?.items.map((item) => (
        <View key={item.id} style={styles.itemCard}>
          {item.image ? (
            <Image source={item.image} style={styles.itemImage} resizeMode="contain" />
          ) : (
            <View style={[styles.itemIcon, { backgroundColor: `${item.accentColor}22` }]}>
              <Ionicons name={item.icon as React.ComponentProps<typeof Ionicons>["name"]} size={22} color={item.accentColor} />
            </View>
          )}
          <View style={styles.itemBody}>
            <Text style={styles.itemTitle}>{item.productName}</Text>
            <Text style={styles.itemMeta}>{formatCurrency(item.unitPrice)}</Text>
            <View style={styles.quantityRow}>
              <Pressable
                style={styles.quantityButton}
                onPress={() =>
                  item.quantity <= 1
                    ? removeMutation.mutate(item.id)
                    : updateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                }
              >
                <Ionicons name="remove" size={16} color={appTheme.colors.textPrimary} />
              </Pressable>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <Pressable
                style={styles.quantityButton}
                onPress={() => updateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
              >
                <Ionicons name="add" size={16} color={appTheme.colors.textPrimary} />
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.deleteButton} onPress={() => removeMutation.mutate(item.id)}>
            <Ionicons name="trash-outline" size={18} color={appTheme.colors.danger} />
          </Pressable>
        </View>
      ))}

      {!isEmpty && cart ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{formatCurrency(cart.subtotal)}</Text>
            <Text style={styles.summaryLabel}>القطع</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{formatCurrency(cart.shipping)}</Text>
            <Text style={styles.summaryLabel}>التوصيل</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{formatCurrency(cart.tax)}</Text>
            <Text style={styles.summaryLabel}>الضريبة</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalValue}>{formatCurrency(cart.total)}</Text>
            <Text style={styles.totalLabel}>الإجمالي</Text>
          </View>
          <View style={styles.actionsRow}>
            <Pressable style={styles.secondaryButton} onPress={() => clearMutation.mutate()}>
              <Text style={styles.secondaryText}>تفريغ السلة</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, checkoutMutation.isPending && styles.disabledButton]}
              disabled={checkoutMutation.isPending}
              onPress={() => checkoutMutation.mutate()}
            >
              <Text style={styles.primaryText}>
                {checkoutMutation.isPending ? "جار إرسال الطلب..." : "إتمام طلب السلة"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
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
    itemImage: {
      width: 74,
      height: 74,
      borderRadius: 14,
      backgroundColor: appTheme.colors.surface,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}88`,
    },
    itemIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    itemBody: {
      flex: 1,
      alignItems: "flex-end",
      gap: 7,
    },
    itemTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    itemMeta: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
    },
    quantityRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },
    quantityButton: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: appTheme.colors.surface,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    quantityText: {
      minWidth: 24,
      color: appTheme.colors.textPrimary,
      textAlign: "center",
      fontWeight: "800",
    },
    deleteButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: `${appTheme.colors.danger}14`,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryCard: {
      backgroundColor: appTheme.colors.surface,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}55`,
      padding: appTheme.spacing.md,
      gap: 10,
    },
    summaryRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    summaryLabel: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    summaryValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: `${appTheme.colors.border}88`,
      paddingTop: 10,
    },
    totalLabel: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    totalValue: {
      color: appTheme.colors.accent,
      fontSize: 18,
      fontWeight: "800",
    },
    actionsRow: {
      flexDirection: "row-reverse",
      gap: 10,
      marginTop: 4,
    },
    primaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: appTheme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: {
      color: "#052B1F",
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      writingDirection: "rtl",
    },
    secondaryText: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      writingDirection: "rtl",
    },
    disabledButton: {
      opacity: 0.7,
    },
  });
}
