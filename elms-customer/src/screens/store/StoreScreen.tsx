import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { addStoreCartItem, getStoreHome, getStoreProducts } from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { StatusPill } from "../../components/common/StatusPill";
import { AppStackParamList } from "../../navigation/types";
import { StoreBadgeTone } from "../../types/models";
import { useAppTheme } from "../../theme/useAppTheme";
import { formatCurrency, formatDate } from "../../utils/format";

const ALL_CATEGORY_ID = "all";
const PRODUCT_PAGE_SIZE = 12;

export function StoreScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_CATEGORY_ID);

  const storeQuery = useQuery({ queryKey: ["store-home"], queryFn: getStoreHome });
  const productQuery = useInfiniteQuery({
    queryKey: ["store-products", activeCategoryId, searchText.trim()],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getStoreProducts({
        categoryId: activeCategoryId === ALL_CATEGORY_ID ? undefined : activeCategoryId,
        search: searchText.trim() || undefined,
        limit: PRODUCT_PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.items.length : undefined,
  });

  const visibleProducts = useMemo(
    () => productQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [productQuery.data?.pages],
  );
  const totalProductCount = productQuery.data?.pages[0]?.total ?? visibleProducts.length;
  const remainingProductCount = Math.max(totalProductCount - visibleProducts.length, 0);

  const quickReorderProducts = storeQuery.data?.quickReorderProducts ?? [];
  const activeOrder = storeQuery.data?.activeOrder;
  const activeOrderCount =
    activeOrder?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const featuredCheckoutProductId =
    visibleProducts[0]?.id ?? storeQuery.data?.featuredProducts[0]?.id;
  const addCartMutation = useMutation({
    mutationFn: (productId: string) => addStoreCartItem(productId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-cart"] });
    },
  });

  return (
    <Screen>
      <LinearGradient
        colors={appTheme.gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroMetricsRow}>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>24h</Text>
            <Text style={styles.heroMetricLabel}>توصيل سريع</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>+72</Text>
            <Text style={styles.heroMetricLabel}>قطعة معتمدة</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>VAT</Text>
            <Text style={styles.heroMetricLabel}>فاتورة جاهزة</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>متجر قطع الغيار الذكي</Text>
        <Text style={styles.heroSubtitle}>
          تجربة شراء أسرع للمباني: قطع أصلية، خيارات دفع واضحة، وتتبع شحن مباشر حتى موقع
          المصعد.
        </Text>

        <View style={styles.heroActionRow}>
          <Pressable
            disabled={!activeOrder}
            style={[styles.heroSecondaryButton, !activeOrder && styles.disabledButton]}
            onPress={() =>
              activeOrder &&
              navigation.navigate("StoreOrderTracking", { orderId: activeOrder.id })
            }
          >
            <Text style={styles.heroSecondaryText}>تتبّع آخر طلب</Text>
          </Pressable>
          <Pressable
            disabled={!featuredCheckoutProductId}
            style={[styles.heroPrimaryButton, !featuredCheckoutProductId && styles.disabledButton]}
            onPress={() =>
              featuredCheckoutProductId &&
              navigation.navigate("StoreCheckout", { productId: featuredCheckoutProductId })
            }
          >
            <Text style={styles.heroPrimaryText}>دفع سريع</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={appTheme.colors.textMuted} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="ابحث بالقطعة، الشركة، أو موديل المصعد..."
          placeholderTextColor={appTheme.colors.textMuted}
          style={styles.searchInput}
          textAlign="right"
        />
      </View>

      <View style={styles.storeShortcutRow}>
        <Pressable style={styles.storeShortcutButton} onPress={() => navigation.navigate("StoreOrders")}>
          <Ionicons name="receipt-outline" size={18} color={appTheme.colors.accent} />
          <Text style={styles.storeShortcutText}>طلبات المتجر</Text>
        </Pressable>
        <Pressable style={styles.storeShortcutButton} onPress={() => navigation.navigate("StoreCart")}>
          <Ionicons name="cart-outline" size={18} color={appTheme.colors.accent} />
          <Text style={styles.storeShortcutText}>السلة</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        <Pressable
          style={[
            styles.categoryChip,
            activeCategoryId === ALL_CATEGORY_ID && styles.categoryChipActive,
          ]}
          onPress={() => setActiveCategoryId(ALL_CATEGORY_ID)}
        >
          <Text
            style={[
              styles.categoryChipText,
              activeCategoryId === ALL_CATEGORY_ID && styles.categoryChipTextActive,
            ]}
          >
            الكل
          </Text>
        </Pressable>

        {(storeQuery.data?.categories ?? []).map((category) => {
          const isActive = activeCategoryId === category.id;

          return (
            <Pressable
              key={category.id}
              style={[
                styles.categoryChip,
                isActive && {
                  borderColor: category.accentColor,
                  backgroundColor: `${category.accentColor}26`,
                },
              ]}
              onPress={() => setActiveCategoryId(category.id)}
            >
              <Ionicons
                name={category.icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={14}
                color={isActive ? category.accentColor : appTheme.colors.textMuted}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  isActive && { color: category.accentColor },
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle subtitle="واجهة شراء سريعة مثل المتاجر الحديثة ولكن موجهة للمصاعد">
        قطع غيار مختارة
      </SectionTitle>

      {storeQuery.isLoading || productQuery.isLoading ? <LoadingState /> : null}
      {!productQuery.isLoading && visibleProducts.length === 0 ? (
        <EmptyState
          title="لا توجد نتائج مطابقة"
          subtitle="جرّب تغيير التصنيف أو استخدام اسم موديل مختلف."
        />
      ) : null}

      {visibleProducts.map((product) => (
        <Pressable
          key={product.id}
          style={styles.productCard}
          onPress={() =>
            navigation.navigate("StoreProductDetail", { productId: product.id })
          }
        >
          {product.image ? (
            <View style={styles.productImageFrame}>
              <Image source={product.image} style={styles.productImage} resizeMode="contain" />
              <View style={[styles.productImageBadge, { backgroundColor: `${product.accentColor}E6` }]}>
                <Text style={styles.productImageBadgeText}>{product.brand}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.productTopRow}>
            <View
              style={[
                styles.productIconWrap,
                { backgroundColor: `${product.accentColor}22`, borderColor: `${product.accentColor}66` },
              ]}
            >
              <Ionicons
                name={product.icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={22}
                color={product.accentColor}
              />
            </View>

            <View style={styles.productTitleWrap}>
              <Text style={styles.productTitle}>{product.name}</Text>
              <Text style={styles.productSubtitle}>{product.subtitle}</Text>
            </View>
          </View>

          <View style={styles.badgesRow}>
            {product.badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.productBadge,
                  {
                    borderColor: `${toneColor(appTheme, badge.tone)}88`,
                    backgroundColor: `${toneColor(appTheme, badge.tone)}22`,
                  },
                ]}
              >
                <Text
                  style={[styles.productBadgeText, { color: toneColor(appTheme, badge.tone) }]}
                >
                  {badge.label}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.productSummary}>{product.summary}</Text>

          {/* The star and review count are gone: the rating was 4.60 on every
              product and there is no reviews table for a customer to write into.
              Delivery is a real fact, so it stays. */}
          <View style={styles.ratingRow}>
            <Text style={styles.metaText}>{product.deliveryLabel}</Text>
          </View>

          <Text style={styles.compatibilityText}>
            مناسب لـ {product.compatibleWith.slice(0, 2).join(" + ")}
          </Text>

          <View style={styles.productBottomRow}>
            <Pressable
              style={styles.productCartButton}
              onPress={() => addCartMutation.mutate(product.id)}
            >
              <Ionicons name="cart-outline" size={16} color={appTheme.colors.accent} />
              <Text style={styles.productActionText}>أضف للسلة</Text>
            </Pressable>

            <Pressable
              style={styles.productActionButton}
              onPress={() =>
                navigation.navigate("StoreCheckout", { productId: product.id })
              }
            >
              <Text style={styles.productActionText}>اشترِ الآن</Text>
            </Pressable>

            <View style={styles.priceWrap}>
              {/* No struck-through "was" price: it was this price times 1.08. */}
              <Text style={styles.currentPrice}>{formatCurrency(product.price)}</Text>
            </View>
          </View>
        </Pressable>
      ))}

      {remainingProductCount > 0 ? (
        <Pressable
          style={styles.showMoreButton}
          onPress={() => productQuery.fetchNextPage()}
          disabled={productQuery.isFetchingNextPage}
        >
          <Ionicons name="chevron-down-outline" size={18} color={appTheme.colors.accent} />
          <Text style={styles.showMoreText}>
            {productQuery.isFetchingNextPage
              ? "Loading..."
              : `Show 12 more (${remainingProductCount} left)`}
          </Text>
        </Pressable>
      ) : null}

      {activeOrder ? (
        <>
          <SectionTitle subtitle="آخر شحنة مرتبطة بحساب العميل">الطلب الحالي</SectionTitle>
          <Pressable
            style={styles.orderCard}
            onPress={() =>
              navigation.navigate("StoreOrderTracking", { orderId: activeOrder.id })
            }
          >
            <View style={styles.orderHeader}>
              <StatusPill status={activeOrder.status} />
              <View style={styles.orderHeaderText}>
                <Text style={styles.orderNumber}>{activeOrder.number}</Text>
                <Text style={styles.orderMeta}>
                  {activeOrderCount} قطع • التسليم المتوقع {formatDate(activeOrder.etaDate)}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${activeOrder.progress}%` }]}
              />
            </View>

            <View style={styles.orderFooter}>
              <Text style={styles.orderFooterText}>
                {activeOrder.progress}% من الرحلة اكتملت
              </Text>
              <Text style={styles.orderFooterText}>{activeOrder.deliveryWindow}</Text>
            </View>
          </Pressable>
        </>
      ) : null}

      <SectionTitle subtitle="قطع تقترحها المنصة بناءً على الطلبات المتكررة">
        إعادة الطلب السريع
      </SectionTitle>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRow}
      >
        {quickReorderProducts.map((product) => (
          <Pressable
            key={product.id}
            style={styles.quickCard}
            onPress={() =>
              navigation.navigate("StoreProductDetail", { productId: product.id })
            }
          >
            {product.image ? (
              <Image source={product.image} style={styles.quickImage} resizeMode="contain" />
            ) : (
              <View
                style={[
                  styles.quickIconWrap,
                  { backgroundColor: `${product.accentColor}22` },
                ]}
              >
                <Ionicons
                  name={product.icon as React.ComponentProps<typeof Ionicons>["name"]}
                  size={18}
                  color={product.accentColor}
                />
              </View>
            )}
            <Text style={styles.quickTitle}>{product.name}</Text>
            <Text style={styles.quickMeta}>{product.stockLabel}</Text>
            <Text style={styles.quickPrice}>{formatCurrency(product.price)}</Text>
          </Pressable>
        ))}
      </ScrollView>
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
      borderColor: `${appTheme.colors.border}CC`,
      padding: appTheme.spacing.lg,
      gap: 14,
      overflow: "hidden",
      shadowColor: appTheme.colors.accent,
      shadowOpacity: appTheme.isDark ? 0.16 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: appTheme.isDark ? 0 : 4,
    },
    heroMetricsRow: {
      flexDirection: "row-reverse",
      gap: 10,
      justifyContent: "space-between",
    },
    heroMetric: {
      flex: 1,
      borderRadius: 16,
      backgroundColor: appTheme.isDark ? "rgba(255,255,255,0.08)" : `${appTheme.colors.accent}10`,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: "center",
      gap: 4,
    },
    heroMetricValue: {
      color: appTheme.isDark ? appTheme.colors.white : appTheme.colors.accent,
      fontSize: 16,
      fontWeight: "800",
    },
    heroMetricLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "center",
    },
    heroTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 24,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroSubtitle: {
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 21,
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroActionRow: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    heroPrimaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: appTheme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    heroSecondaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}30`,
      backgroundColor: appTheme.isDark ? "rgba(255,255,255,0.08)" : `${appTheme.colors.accent}10`,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    heroPrimaryText: {
      color: appTheme.colors.white,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      writingDirection: "rtl",
    },
    heroSecondaryText: {
      color: appTheme.isDark ? appTheme.colors.white : appTheme.colors.accent,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      writingDirection: "rtl",
    },
    disabledButton: {
      opacity: 0.5,
    },
    searchWrap: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.card,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    searchInput: {
      flex: 1,
      color: appTheme.colors.textPrimary,
      paddingVertical: 10,
      writingDirection: "rtl",
    },
    storeShortcutRow: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    storeShortcutButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}66`,
      backgroundColor: `${appTheme.colors.accent}14`,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 12,
    },
    storeShortcutText: {
      color: appTheme.colors.accent,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      writingDirection: "rtl",
    },
    categoryRow: {
      gap: 10,
      paddingRight: 2,
      paddingLeft: 2,
    },
    categoryChip: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.card,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    categoryChipActive: {
      borderColor: appTheme.colors.accent,
      backgroundColor: `${appTheme.colors.accent}22`,
    },
    categoryChipText: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    categoryChipTextActive: {
      color: appTheme.colors.accent,
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
    showMoreButton: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}88`,
      backgroundColor: `${appTheme.colors.accent}14`,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
    },
    showMoreText: {
      color: appTheme.colors.accent,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
    },
    productTopRow: {
      flexDirection: "row-reverse",
      gap: 12,
      alignItems: "center",
    },
    productImageFrame: {
      height: 180,
      borderRadius: 16,
      backgroundColor: appTheme.colors.surface,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}99`,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    productImage: {
      width: "100%",
      height: "100%",
    },
    productImageBadge: {
      position: "absolute",
      right: 10,
      top: 10,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    productImageBadgeText: {
      color: appTheme.colors.white,
      fontSize: 10,
      fontWeight: "800",
      textAlign: "center",
    },
    productIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    productTitleWrap: {
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
    badgesRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    productBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    productBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    productSummary: {
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "right",
      writingDirection: "rtl",
    },
    ratingRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
    },
    ratingText: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    metaText: {
      color: appTheme.colors.info,
      fontSize: 12,
      fontWeight: "700",
      marginRight: 8,
      textAlign: "right",
      writingDirection: "rtl",
    },
    compatibilityText: {
      color: appTheme.colors.textMuted,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    productBottomRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    productActionButton: {
      borderRadius: 12,
      backgroundColor: `${appTheme.colors.accent}22`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}88`,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    productCartButton: {
      borderRadius: 12,
      backgroundColor: appTheme.colors.card,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}88`,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
    },
    productActionText: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    priceWrap: {
      alignItems: "flex-end",
      gap: 2,
    },
    originalPrice: {
      color: appTheme.colors.textMuted,
      fontSize: 11,
      textDecorationLine: "line-through",
      textAlign: "right",
      writingDirection: "rtl",
    },
    currentPrice: {
      color: appTheme.colors.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    orderCard: {
      backgroundColor: appTheme.colors.surface,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}55`,
      padding: appTheme.spacing.md,
      gap: 12,
      shadowColor: appTheme.colors.accent,
      shadowOpacity: appTheme.isDark ? 0 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: appTheme.isDark ? 0 : 3,
    },
    orderHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    orderHeaderText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    orderNumber: {
      color: appTheme.colors.textPrimary,
      fontSize: 15,
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
      height: 8,
      borderRadius: 999,
      backgroundColor: `${appTheme.colors.border}CC`,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: appTheme.colors.accent,
    },
    orderFooter: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      gap: 12,
    },
    orderFooterText: {
      color: appTheme.colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    quickRow: {
      gap: 12,
      paddingHorizontal: 2,
    },
    quickCard: {
      width: 220,
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 10,
      shadowColor: appTheme.colors.accent,
      shadowOpacity: appTheme.isDark ? 0 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: appTheme.isDark ? 0 : 3,
    },
    quickIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-end",
    },
    quickImage: {
      width: "100%",
      height: 110,
      borderRadius: 14,
      backgroundColor: appTheme.colors.surface,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}88`,
      alignSelf: "stretch",
    },
    quickTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    quickMeta: {
      color: appTheme.colors.textSecondary,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
    quickPrice: {
      color: appTheme.colors.accent,
      fontSize: 15,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
