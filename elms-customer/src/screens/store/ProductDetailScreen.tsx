import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { addStoreCartItem, getStoreProductById } from "../../api/customerApi";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { AppStackParamList } from "../../navigation/types";
import { StoreBadgeTone } from "../../types/models";
import { useAppTheme } from "../../theme/useAppTheme";
import { formatCurrency } from "../../utils/format";

export function ProductDetailScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<AppStackParamList, "StoreProductDetail">>();
  const productId = route.params.productId;

  const productQuery = useQuery({
    queryKey: ["store-product", productId],
    queryFn: () => getStoreProductById(productId),
  });

  const addCartMutation = useMutation({
    mutationFn: () => addStoreCartItem(productId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-cart"] });
      navigation.navigate("StoreCart");
    },
  });

  if (productQuery.isLoading || !productQuery.data) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  const product = productQuery.data;
  const useLightHeroText = !appTheme.isDark;
  // `inStock` is absent on older payloads; treat that as available rather than
  // hiding the buy button on every product the moment the app runs against an
  // API that has not been deployed yet.
  const soldOut = product.inStock === false;

  return (
    <Screen>
      <LinearGradient
        colors={
          appTheme.isDark
            ? [product.accentColor, appTheme.colors.surface, appTheme.colors.card]
            : [`${product.accentColor}22`, appTheme.colors.surface, appTheme.colors.card]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTopRow}>
          <View style={[styles.skuBadge, useLightHeroText && styles.skuBadgeLight]}>
            <Text style={[styles.skuText, useLightHeroText && styles.skuTextLight]}>{product.sku}</Text>
          </View>
          <View style={[styles.heroIconWrap, useLightHeroText && styles.heroIconWrapLight]}>
            <Ionicons
              name={product.icon as React.ComponentProps<typeof Ionicons>["name"]}
              size={26}
              color={useLightHeroText ? appTheme.colors.accent : appTheme.colors.white}
            />
          </View>
        </View>

        {product.image || product.imageUrl ? (
          <View style={styles.heroImageFrame}>
            <Image
              source={product.imageUrl ? { uri: product.imageUrl } : product.image}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>
        ) : null}

        <Text style={[styles.heroTitle, useLightHeroText && styles.heroTitleLight]}>{product.name}</Text>
        <Text style={[styles.heroSubtitle, useLightHeroText && styles.heroSubtitleLight]}>{product.subtitle}</Text>

        <View style={styles.badgesRow}>
          {product.badges.map((badge) => (
            <View
              key={badge.id}
              style={[
                styles.badge,
                {
                  borderColor: `${toneColor(appTheme, badge.tone)}99`,
                  backgroundColor: `${toneColor(appTheme, badge.tone)}22`,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: toneColor(appTheme, badge.tone) }]}>
                {badge.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.heroMetaRow}>
          <Text style={[styles.heroMetaText, useLightHeroText && styles.heroMetaTextLight]}>{product.deliveryLabel}</Text>
          <Text style={[styles.heroMetaText, useLightHeroText && styles.heroMetaTextLight]}>{product.stockLabel}</Text>
        </View>
      </LinearGradient>

      <View style={styles.priceCard}>
        {/* The star chip and the struck-through "was" price were removed: the
            rating was 4.60 on every product in the catalogue, the review count
            was invented, there is no reviews table anywhere in the schema, and
            the old price was the current one times 1.08. None of it was data. */}
        <View style={styles.priceHeader}>
          <View style={styles.priceWrap}>
            <Text style={styles.currentPrice}>{formatCurrency(product.price)}</Text>
          </View>
        </View>
        <Text style={styles.summaryText}>{product.summary}</Text>
      </View>

      <SectionTitle subtitle="الموديلات التي يغطيها هذا الجزء">التوافق الفني</SectionTitle>
      <View style={styles.compatibilityCard}>
        <View style={styles.compatibilityRow}>
          {product.compatibleWith.map((item) => (
            <View key={item} style={styles.compatibilityChip}>
              <Text style={styles.compatibilityChipText}>{item}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.supportText}>
          يمكن ربط الطلب برقم المصعد داخل ELMS لإرسال القطعة مباشرة إلى موقع التشغيل الصحيح.
        </Text>
      </View>

      <SectionTitle subtitle="المواصفات الأساسية قبل الشراء">بطاقة المواصفات</SectionTitle>
      <View style={styles.specCard}>
        {product.specs.map((spec) => (
          <View key={spec.label} style={styles.specRow}>
            <Text style={styles.specValue}>{spec.value}</Text>
            <Text style={styles.specLabel}>{spec.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.purchaseCard}>
        <Text style={styles.purchaseTitle}>جاهز للشراء أو طلب فاتورة مؤسسية</Text>
        <Text style={styles.purchaseSubtitle}>
          واجهة الدفع التالية تعرض العنوان، طريقة السداد، والتقدير الكامل للتوصيل والضريبة.
        </Text>
        {soldOut ? (
          <Text style={styles.soldOutNotice}>
            هذه القطعة غير متوفرة في المخزون حالياً. تواصل مع فريق المبيعات لطلب توريدها.
          </Text>
        ) : null}
        <View style={styles.purchaseActions}>
          <Pressable
            style={[styles.secondaryButton, soldOut && styles.buttonDisabled]}
            disabled={soldOut}
            accessibilityState={{ disabled: soldOut }}
            onPress={() => addCartMutation.mutate()}
          >
            <Text style={styles.secondaryButtonText}>
              {addCartMutation.isPending ? "جار الإضافة..." : "أضف للسلة"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, soldOut && styles.buttonDisabled]}
            disabled={soldOut}
            accessibilityState={{ disabled: soldOut }}
            onPress={() => navigation.navigate("StoreCheckout", { productId: product.id })}
          >
            <Text style={styles.primaryButtonText}>انتقل للدفع</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function toneColor(appTheme: ReturnType<typeof useAppTheme>, tone: StoreBadgeTone) {
  switch (tone) {
    case "accent":
      return appTheme.colors.accent;
    case "info":
      return appTheme.colors.info;
    case "warn":
      return appTheme.colors.warn;
    case "danger":
      return appTheme.colors.danger;
    default:
      return appTheme.colors.accent;
  }
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    hero: {
      borderRadius: appTheme.radius.xl,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}B3`,
      padding: appTheme.spacing.lg,
      gap: 14,
    },
    heroTopRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    heroImageFrame: {
      height: 260,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.94)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.34)",
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    heroIconWrap: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    skuBadge: {
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.18)",
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    skuBadgeLight: {
      backgroundColor: `${appTheme.colors.accent}14`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}24`,
    },
    skuText: {
      color: appTheme.colors.white,
      fontSize: 11,
      fontWeight: "800",
      textAlign: "center",
    },
    skuTextLight: {
      color: appTheme.colors.textPrimary,
    },
    heroTitle: {
      color: appTheme.colors.white,
      fontSize: 24,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroTitleLight: {
      color: appTheme.colors.textPrimary,
    },
    heroSubtitle: {
      color: "rgba(255,255,255,0.86)",
      fontSize: 13,
      lineHeight: 20,
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroSubtitleLight: {
      color: appTheme.colors.textSecondary,
    },
    badgesRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    badge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroMetaRow: {
      gap: 6,
      alignItems: "flex-end",
    },
    heroMetaText: {
      color: "rgba(255,255,255,0.82)",
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroMetaTextLight: {
      color: appTheme.colors.textSecondary,
    },
    heroIconWrapLight: {
      backgroundColor: `${appTheme.colors.accent}14`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}24`,
    },
    priceCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 12,
    },
    priceHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    ratingChip: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: `${appTheme.colors.surface}E6`,
    },
    ratingChipText: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    priceWrap: {
      alignItems: "flex-end",
      gap: 2,
    },
    originalPrice: {
      color: appTheme.colors.textMuted,
      fontSize: 12,
      textDecorationLine: "line-through",
      textAlign: "right",
      writingDirection: "rtl",
    },
    currentPrice: {
      color: appTheme.colors.textPrimary,
      fontSize: 24,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    summaryText: {
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 21,
      textAlign: "right",
      writingDirection: "rtl",
    },
    compatibilityCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 12,
    },
    compatibilityRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    compatibilityChip: {
      borderRadius: 999,
      backgroundColor: `${appTheme.colors.info}1E`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.info}66`,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    compatibilityChipText: {
      color: appTheme.colors.info,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    supportText: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 19,
      textAlign: "right",
      writingDirection: "rtl",
    },
    specCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 10,
    },
    specRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: `${appTheme.colors.border}66`,
    },
    specLabel: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    specValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "left",
    },
    purchaseCard: {
      backgroundColor: appTheme.colors.surface,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}55`,
      padding: appTheme.spacing.md,
      gap: 12,
    },
    purchaseTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    purchaseSubtitle: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 19,
      textAlign: "right",
      writingDirection: "rtl",
    },
    purchaseActions: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    soldOutNotice: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 19,
      textAlign: "right",
      writingDirection: "rtl",
    },
    buttonDisabled: {
      opacity: 0.45,
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
    primaryButtonText: {
      color: "#052B1F",
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      writingDirection: "rtl",
    },
    secondaryButtonText: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
      writingDirection: "rtl",
    },
  });
}
