import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getStoreCheckout, placeStoreOrder } from "../../api/customerApi";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { AppStackParamList } from "../../navigation/types";
import { StorePaymentMethodType } from "../../types/models";
import { useAppTheme } from "../../theme/useAppTheme";
import { formatCurrency } from "../../utils/format";

export function CheckoutScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "StoreCheckout">>();
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

  const checkoutQuery = useQuery({
    queryKey: ["store-checkout", route.params.productId],
    queryFn: () => getStoreCheckout(route.params.productId),
  });
  const placeOrderMutation = useMutation({
    mutationFn: placeStoreOrder,
  });

  useEffect(() => {
    if (!checkoutQuery.data || selectedMethodId) return;
    const defaultMethod =
      checkoutQuery.data.paymentMethods.find((method) => method.isDefault) ??
      checkoutQuery.data.paymentMethods[0];
    setSelectedMethodId(defaultMethod?.id ?? null);
  }, [checkoutQuery.data, selectedMethodId]);

  if (checkoutQuery.isLoading || !checkoutQuery.data) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  const checkout = checkoutQuery.data;

  const handleCheckout = () => {
    const selectedMethod =
      checkout.paymentMethods.find((method) => method.id === selectedMethodId) ??
      checkout.paymentMethods[0];

    if (!selectedMethod) {
      Alert.alert("تعذر إتمام الطلب", "لا توجد طريقة دفع متاحة حالياً.");
      return;
    }

    placeOrderMutation.mutate(
      {
        productId: checkout.product.id,
        quantity: checkout.quantity,
        addressId: checkout.address.id,
        paymentMethod: selectedMethod.type,
        note: checkout.note,
      },
      {
        onSuccess: (order) => {
          Alert.alert(
            "تم إرسال الطلب",
            selectedMethod.type === "invoice"
              ? "تم إنشاء طلب حقيقي وربطه بمسار اعتماد فاتورة الشركة."
              : "تم إنشاء الطلب بنجاح.",
            [
              {
                text: "تتبّع الطلب",
                onPress: () =>
                  navigation.navigate("StoreOrderTracking", {
                    orderId: order.id,
                  }),
              },
              { text: "إغلاق", style: "cancel" },
            ],
          );
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "تعذر إرسال الطلب.";
          Alert.alert("تعذر إتمام الطلب", message);
        },
      },
    );
  };

  const checkoutButtonLabel = placeOrderMutation.isPending
    ? "جاري إنشاء الطلب..."
    : "إتمام الدفع والانتقال للتتبع";

  return (
    <Screen>
      <LinearGradient
        colors={appTheme.gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEyebrow}>Secure Checkout</Text>
        <Text style={styles.heroTitle}>دفع واضح ومهني لفريق العميل</Text>
        <Text style={styles.heroSubtitle}>
          العرض يشمل تكلفة القطعة، رسوم التوصيل، الضريبة، وطريقة السداد المعتمدة قبل تأكيد
          الطلب.
        </Text>
      </LinearGradient>

      <SectionTitle subtitle="ملخص سريع للقطعة المختارة">الطلب</SectionTitle>
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          {checkout.product.image ? (
            <Image source={checkout.product.image} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View
              style={[
                styles.productIconWrap,
                {
                  backgroundColor: `${checkout.product.accentColor}22`,
                  borderColor: `${checkout.product.accentColor}66`,
                },
              ]}
            >
              <Ionicons
                name={checkout.product.icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={22}
                color={checkout.product.accentColor}
              />
            </View>
          )}
          <View style={styles.productTextWrap}>
            <Text style={styles.productTitle}>{checkout.product.name}</Text>
            <Text style={styles.productSubtitle}>{checkout.product.subtitle}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaValue}>{checkout.quantity}</Text>
          <Text style={styles.metaLabel}>الكمية</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaValue}>{checkout.product.deliveryLabel}</Text>
          <Text style={styles.metaLabel}>الوصول المتوقع</Text>
        </View>
      </View>

      <SectionTitle subtitle="عنوان الاستلام المرتبط بالموقع">العنوان</SectionTitle>
      <View style={styles.addressCard}>
        <Text style={styles.addressTitle}>{checkout.address.title}</Text>
        <Text style={styles.addressLine}>{checkout.address.receiverName}</Text>
        <Text style={styles.addressLine}>{checkout.address.phone}</Text>
        <Text style={styles.addressLine}>{checkout.address.line1}</Text>
        <Text style={styles.addressLine}>{checkout.address.area}</Text>
        <View style={styles.windowChip}>
          <Text style={styles.windowChipText}>{checkout.address.estimatedWindow}</Text>
        </View>
      </View>

      <SectionTitle subtitle="اختر المسار المالي المناسب للعميل">طرق الدفع</SectionTitle>
      <View style={styles.methodsWrap}>
        {checkout.paymentMethods.map((method) => {
          const isSelected = method.id === selectedMethodId;
          return (
            <Pressable
              key={method.id}
              style={[
                styles.methodCard,
                isSelected && styles.methodCardSelected,
              ]}
              onPress={() => setSelectedMethodId(method.id)}
            >
              <View
                style={[
                  styles.methodIndicator,
                  isSelected && styles.methodIndicatorSelected,
                ]}
              />
              <View style={styles.methodTextWrap}>
                <Text style={styles.methodTitle}>{method.label}</Text>
                <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
              </View>
              <Ionicons
                name={paymentMethodIcon(method.type)}
                size={20}
                color={isSelected ? appTheme.colors.accent : appTheme.colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      <SectionTitle subtitle="القيمة النهائية قبل الإرسال">ملخص الدفع</SectionTitle>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>{formatCurrency(checkout.subtotal)}</Text>
          <Text style={styles.summaryLabel}>القطعة</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>{formatCurrency(checkout.shipping)}</Text>
          <Text style={styles.summaryLabel}>التوصيل</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>{formatCurrency(checkout.tax)}</Text>
          <Text style={styles.summaryLabel}>ضريبة القيمة المضافة</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalValue}>{formatCurrency(checkout.total)}</Text>
          <Text style={styles.totalLabel}>الإجمالي</Text>
        </View>
      </View>

      <View style={styles.noteCard}>
        <Ionicons name="receipt-outline" size={18} color={appTheme.colors.info} />
        <Text style={styles.noteText}>{checkout.note}</Text>
      </View>

      <Pressable
        style={[styles.checkoutButton, placeOrderMutation.isPending && styles.checkoutButtonDisabled]}
        onPress={handleCheckout}
        disabled={placeOrderMutation.isPending}
      >
        <Text style={styles.checkoutButtonText}>{checkoutButtonLabel}</Text>
      </Pressable>
    </Screen>
  );
}

function paymentMethodIcon(type: StorePaymentMethodType): React.ComponentProps<typeof Ionicons>["name"] {
  switch (type) {
    case "mada":
      return "card-outline";
    case "visa":
      return "card-outline";
    case "apple_pay":
      return "phone-portrait-outline";
    case "invoice":
      return "document-text-outline";
    default:
      return "wallet-outline";
  }
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    hero: {
      borderRadius: appTheme.radius.xl,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}CC`,
      padding: appTheme.spacing.lg,
      gap: 10,
      shadowColor: appTheme.colors.accent,
      shadowOpacity: appTheme.isDark ? 0.16 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: appTheme.isDark ? 0 : 4,
    },
    heroEyebrow: {
      color: appTheme.colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
      textAlign: "right",
    },
    heroTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 23,
      fontWeight: "800",
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
    productCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 12,
      shadowColor: appTheme.colors.accent,
      shadowOpacity: appTheme.isDark ? 0 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: appTheme.isDark ? 0 : 3,
    },
    productHeader: {
      flexDirection: "row-reverse",
      gap: 12,
      alignItems: "center",
    },
    productIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    productImage: {
      width: 82,
      height: 82,
      borderRadius: 16,
      backgroundColor: appTheme.colors.surface,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}88`,
    },
    productTextWrap: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    productTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    productSubtitle: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "right",
      writingDirection: "rtl",
    },
    metaRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: `${appTheme.colors.border}66`,
    },
    metaLabel: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    metaValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "left",
    },
    addressCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 8,
      alignItems: "flex-end",
    },
    addressTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    addressLine: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    windowChip: {
      borderRadius: 999,
      backgroundColor: `${appTheme.colors.accent}22`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}77`,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginTop: 4,
    },
    windowChipText: {
      color: appTheme.colors.accent,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    methodsWrap: {
      gap: 10,
    },
    methodCard: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
    },
    methodCardSelected: {
      borderColor: `${appTheme.colors.accent}99`,
      backgroundColor: `${appTheme.colors.accent}12`,
    },
    methodIndicator: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: appTheme.colors.border,
    },
    methodIndicatorSelected: {
      borderColor: appTheme.colors.accent,
      backgroundColor: appTheme.colors.accent,
    },
    methodTextWrap: {
      flex: 1,
      alignItems: "flex-end",
      gap: 2,
    },
    methodTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    methodSubtitle: {
      color: appTheme.colors.textSecondary,
      fontSize: 11,
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
      textAlign: "left",
    },
    totalRow: {
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: `${appTheme.colors.border}66`,
    },
    totalLabel: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    totalValue: {
      color: appTheme.colors.accent,
      fontSize: 18,
      fontWeight: "800",
      textAlign: "left",
    },
    noteCard: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
      backgroundColor: `${appTheme.colors.info}14`,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: `${appTheme.colors.info}55`,
      padding: appTheme.spacing.md,
    },
    noteText: {
      flex: 1,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 19,
      textAlign: "right",
      writingDirection: "rtl",
    },
    checkoutButton: {
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: appTheme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
    },
    checkoutButtonDisabled: {
      opacity: 0.7,
    },
    checkoutButtonText: {
      color: appTheme.colors.white,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "center",
      writingDirection: "rtl",
    },
  });
}
