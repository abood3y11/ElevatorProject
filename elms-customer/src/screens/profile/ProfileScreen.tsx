import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { getCustomerProfile } from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { AppStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { useAppTheme } from "../../theme/useAppTheme";
import { arabicFontStyles, englishFontStyles } from "../../utils/typography";

export function ProfileScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const logout = useAuthStore((state) => state.logout);
  const fallbackUser = useAuthStore((state) => state.user);

  const profileQuery = useQuery({
    queryKey: ["customer-profile"],
    queryFn: getCustomerProfile,
  });

  const profile = profileQuery.data;
  const user = profile?.user ?? {
    id: fallbackUser?.id ?? "user",
    name: fallbackUser?.name ?? "عميل ELMS",
    email: fallbackUser?.email ?? "-",
    phone: fallbackUser?.phone,
    roles: fallbackUser?.roles ?? ["customer"],
  };

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const totalSites = profile?.customer?.totalSites ?? profile?.sites?.length ?? 0;
  const totalElevators =
    profile?.customer?.totalElevators ??
    (profile?.sites ?? []).reduce((sum, site) => sum + site.elevatorCount, 0);

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل تريد إنهاء الجلسة الحالية؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <Screen>
      <LinearGradient
        colors={appTheme.gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "CU"}</Text>
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroName}>{user.name}</Text>
            <Text style={styles.heroCompany}>{profile?.companyName ?? fallbackUser?.companyName ?? "شركة العميل"}</Text>
            <Text style={styles.heroSubtitle}>ملخص الحساب، وبيانات الشركة، والمواقع في تجربة أوضح وأرتب.</Text>
          </View>
        </View>

        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillValue}>{totalElevators}</Text>
            <Text style={styles.heroPillLabel}>إجمالي المصاعد</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillValue}>{totalSites}</Text>
            <Text style={styles.heroPillLabel}>عدد المواقع</Text>
          </View>
        </View>
      </LinearGradient>

      {profileQuery.isLoading ? <LoadingState /> : null}
      {!profileQuery.isLoading && !profile ? (
        <EmptyState title="تعذر تحميل الملف الشخصي" subtitle="ما زال بإمكانك تسجيل الخروج من هذه الشاشة." />
      ) : null}

      <SectionTitle subtitle="ملخص سريع، مع صفحة مستقلة لتحديث كل بيانات الشركة.">
        بيانات العميل
      </SectionTitle>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>البيانات الأساسية</Text>
          <Pressable style={styles.companyButton} onPress={() => navigation.navigate("CompanyProfile")}>
            <Ionicons name="business-outline" size={16} color={appTheme.colors.accent} />
            <Text style={styles.companyButtonText}>بيانات الشركة</Text>
          </Pressable>
        </View>
        <ProfileRow label="اسم الشركة" value={profile?.companyName ?? fallbackUser?.companyName ?? "-"} styles={styles} />
        <ProfileRow label="مسؤول التواصل" value={profile?.contactPersonName ?? user.name} styles={styles} />
        <ProfileRow label="رقم الجوال" value={profile?.contactPhone ?? user.phone ?? "-"} styles={styles} />
        <ProfileRow label="البريد الإلكتروني" value={profile?.contactEmail ?? user.email ?? "-"} styles={styles} />
        <ProfileRow label="السجل التجاري" value={profile?.customer?.commercialRegistrationNo ?? "-"} styles={styles} />
        <ProfileRow label="الرقم الضريبي" value={profile?.customer?.taxNumber ?? "-"} styles={styles} noBorder />
      </View>

      <SectionTitle subtitle="عرض سريع للمواقع الحالية، مع تفاصيل أوسع وفتح العنوان داخل صفحة بيانات الشركة.">
        مواقع العميل
      </SectionTitle>
      <View style={styles.card}>
        <ProfileRow label="عدد المواقع" value={String(totalSites)} styles={styles} />
        <ProfileRow
          label="إجمالي المصاعد"
          value={String(totalElevators)}
          styles={styles}
          noBorder={!(profile?.sites?.length)}
        />
        {(profile?.sites ?? []).slice(0, 2).map((site, index, array) => (
          <View key={site.id} style={[styles.siteCard, index === array.length - 1 && styles.siteCardLast]}>
            <View style={styles.siteHeader}>
              <Text style={styles.siteValue}>{`${site.elevatorCount} مصعد`}</Text>
              <Text style={styles.siteTitle}>{site.city ? `${site.name} - ${site.city}` : site.name}</Text>
            </View>
            <Text style={styles.siteAddress}>{site.addressText || "لا يوجد عنوان محفوظ"}</Text>
          </View>
        ))}
        <Pressable style={styles.companyLinkButton} onPress={() => navigation.navigate("CompanyProfile")}>
          <Text style={styles.companyLinkText}>فتح بيانات الشركة والمواقع</Text>
          <Ionicons name="arrow-back-outline" size={16} color={appTheme.colors.accent} />
        </Pressable>
      </View>

      <SectionTitle subtitle="بيانات تسجيل الدخول المستخدمة داخل التطبيق.">معلومات المستخدم</SectionTitle>
      <View style={styles.card}>
        <ProfileRow label="الاسم" value={user.name} styles={styles} />
        <ProfileRow label="البريد الإلكتروني" value={user.email || "-"} styles={styles} />
        <ProfileRow label="رقم الجوال" value={user.phone || "-"} styles={styles} noBorder />
      </View>

      <SectionTitle subtitle="اختصارات سريعة من شاشة الحساب.">إدارة الحساب</SectionTitle>
      <View style={styles.actionsWrap}>
        <Pressable style={styles.secondaryAction} onPress={appTheme.toggleMode}>
          <Ionicons name={appTheme.isDark ? "sunny-outline" : "moon-outline"} size={18} color={appTheme.colors.info} />
          <Text style={styles.secondaryActionText}>
            {appTheme.isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
          </Text>
        </Pressable>

        <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate("Notifications")}>
          <Ionicons name="notifications-outline" size={18} color={appTheme.colors.info} />
          <Text style={styles.secondaryActionText}>فتح الإشعارات</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={appTheme.colors.white} />
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </Pressable>
    </Screen>
  );
}

function ProfileRow({
  label,
  value,
  styles,
  noBorder = false,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.row, noBorder && styles.rowNoBorder]}>
      <Text style={styles.rowValue}>{value}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    hero: {
      borderRadius: appTheme.radius.xl,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}CC`,
      padding: appTheme.spacing.lg,
      gap: 16,
      shadowColor: appTheme.colors.accent,
      shadowOpacity: appTheme.isDark ? 0.16 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: appTheme.isDark ? 0 : 4,
    },
    heroTopRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 14,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: appTheme.isDark ? "rgba(255,255,255,0.12)" : `${appTheme.colors.accent}14`,
      borderWidth: 1,
      borderColor: appTheme.isDark ? "rgba(255,255,255,0.18)" : `${appTheme.colors.accent}22`,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      ...englishFontStyles.bold,
      color: appTheme.isDark ? appTheme.colors.white : appTheme.colors.accent,
      fontSize: 24,
      textAlign: "center",
    },
    heroTextWrap: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    heroName: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 22,
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroCompany: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textSecondary,
      fontSize: 14,
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroSubtitle: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroPills: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    heroPill: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: appTheme.isDark ? "rgba(255,255,255,0.08)" : `${appTheme.colors.accent}10`,
      borderWidth: 1,
      borderColor: appTheme.isDark ? "rgba(255,255,255,0.14)" : `${appTheme.colors.accent}18`,
      alignItems: "flex-end",
      gap: 4,
    },
    heroPillValue: {
      ...englishFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 16,
      textAlign: "right",
    },
    heroPillLabel: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textMuted,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
    card: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      paddingHorizontal: appTheme.spacing.md,
      paddingVertical: appTheme.spacing.sm,
      shadowColor: appTheme.colors.accent,
      shadowOpacity: appTheme.isDark ? 0 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: appTheme.isDark ? 0 : 3,
    },
    cardHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      marginBottom: 6,
    },
    cardHeaderTitle: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 15,
      textAlign: "right",
      writingDirection: "rtl",
    },
    companyButton: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}55`,
      backgroundColor: `${appTheme.colors.accent}12`,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    companyButtonText: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.accent,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    row: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: `${appTheme.colors.border}66`,
    },
    rowNoBorder: {
      borderBottomWidth: 0,
    },
    rowLabel: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    rowValue: {
      flex: 1,
      ...arabicFontStyles.medium,
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      textAlign: "left",
    },
    siteCard: {
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: `${appTheme.colors.border}44`,
    },
    siteCardLast: {
      paddingBottom: 4,
    },
    siteHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    siteTitle: {
      flex: 1,
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      textAlign: "right",
      writingDirection: "rtl",
    },
    siteValue: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.accent,
      fontSize: 12,
      textAlign: "left",
    },
    siteAddress: {
      marginTop: 5,
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "right",
      writingDirection: "rtl",
    },
    companyLinkButton: {
      marginTop: 8,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}35`,
      backgroundColor: `${appTheme.colors.accent}10`,
      paddingVertical: 12,
    },
    companyLinkText: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.accent,
      fontSize: 13,
      textAlign: "center",
      writingDirection: "rtl",
    },
    actionsWrap: {
      gap: 10,
    },
    secondaryAction: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
      backgroundColor: `${appTheme.colors.info}16`,
      borderColor: `${appTheme.colors.info}55`,
      borderWidth: 1,
      borderRadius: appTheme.radius.md,
      paddingVertical: 14,
      paddingHorizontal: appTheme.spacing.md,
    },
    secondaryActionText: {
      flex: 1,
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      textAlign: "right",
      writingDirection: "rtl",
    },
    logoutButton: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: appTheme.colors.danger,
      borderRadius: appTheme.radius.lg,
      paddingVertical: 16,
      marginBottom: appTheme.spacing.xl,
    },
    logoutText: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.white,
      fontSize: 14,
      textAlign: "center",
      writingDirection: "rtl",
    },
  });
}
