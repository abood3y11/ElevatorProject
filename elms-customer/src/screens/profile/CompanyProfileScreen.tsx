import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getCustomerProfile, updateCustomerProfile } from "../../api/customerApi";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { useAuthStore } from "../../store/authStore";
import { useAppTheme } from "../../theme/useAppTheme";
import { arabicFontStyles, englishFontStyles } from "../../utils/typography";

export function CompanyProfileScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const queryClient = useQueryClient();
  const fallbackUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [companyName, setCompanyName] = useState("");
  const [commercialRegistrationNo, setCommercialRegistrationNo] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [addressText, setAddressText] = useState("");
  const [notes, setNotes] = useState("");

  const profileQuery = useQuery({
    queryKey: ["customer-profile"],
    queryFn: getCustomerProfile,
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setCompanyName(profile.customer?.name ?? profile.companyName ?? "");
    setCommercialRegistrationNo(profile.customer?.commercialRegistrationNo ?? "");
    setTaxNumber(profile.customer?.taxNumber ?? "");
    setNationalId(profile.customer?.nationalId ?? "");
    setContactPersonName(profile.customer?.contactPersonName ?? profile.contactPersonName ?? "");
    setContactPhone(profile.customer?.contactPhone ?? profile.contactPhone ?? "");
    setContactEmail(profile.customer?.contactEmail ?? profile.contactEmail ?? "");
    setCity(profile.customer?.city ?? "");
    setRegion(profile.customer?.region ?? "");
    setAddressText(profile.customer?.addressText ?? "");
    setNotes(profile.customer?.notes ?? "");
  }, [profileQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: updateCustomerProfile,
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["customer-profile"], updatedProfile);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setUser({
        id: updatedProfile.user?.id ?? fallbackUser?.id ?? "user",
        name: updatedProfile.user?.name ?? contactPersonName,
        email: updatedProfile.user?.email ?? contactEmail,
        phone: updatedProfile.user?.phone ?? contactPhone,
        roles: updatedProfile.user?.roles ?? fallbackUser?.roles ?? ["customer"],
        companyName: updatedProfile.companyName,
        customerId: updatedProfile.customerId,
        customer: updatedProfile.customer,
      });
      Alert.alert("تم الحفظ", "تم تحديث بيانات الشركة وربطها بملف العميل.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "تعذر تحديث بيانات الشركة.";
      Alert.alert("بيانات الشركة", message);
    },
  });

  const profile = profileQuery.data;

  const handleSave = () => {
    updateProfileMutation.mutate({
      companyName: companyName.trim(),
      commercialRegistrationNo: commercialRegistrationNo.trim(),
      taxNumber: taxNumber.trim(),
      nationalId: nationalId.trim(),
      contactPersonName: contactPersonName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      city: city.trim(),
      region: region.trim(),
      addressText: addressText.trim(),
      notes: notes.trim(),
    });
  };

  const openSiteAddress = async (siteName: string, address?: string, city?: string) => {
    const query = encodeURIComponent([siteName, address, city].filter(Boolean).join(" - "));
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  if (profileQuery.isLoading || !profile) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle subtitle="حدث بيانات الشركة الرسمية ومعلومات التواصل والمستندات التجارية من التطبيق مباشرة.">
        بيانات الشركة
      </SectionTitle>

      <View style={styles.card}>
        <InputField label="اسم الشركة" value={companyName} onChangeText={setCompanyName} styles={styles} />
        <View style={styles.inlineFields}>
          <InputField label="السجل التجاري" value={commercialRegistrationNo} onChangeText={setCommercialRegistrationNo} styles={styles} compact english />
          <InputField label="الرقم الضريبي" value={taxNumber} onChangeText={setTaxNumber} styles={styles} compact english />
        </View>
        <InputField label="الهوية / الرقم الموحد" value={nationalId} onChangeText={setNationalId} styles={styles} english />
        <InputField label="مسؤول التواصل" value={contactPersonName} onChangeText={setContactPersonName} styles={styles} />
        <InputField label="رقم الجوال" value={contactPhone} onChangeText={setContactPhone} styles={styles} keyboardType="phone-pad" />
        <InputField label="البريد الإلكتروني" value={contactEmail} onChangeText={setContactEmail} styles={styles} keyboardType="email-address" english />
        <View style={styles.inlineFields}>
          <InputField label="المنطقة" value={region} onChangeText={setRegion} styles={styles} compact />
          <InputField label="المدينة" value={city} onChangeText={setCity} styles={styles} compact />
        </View>
        <InputField label="العنوان" value={addressText} onChangeText={setAddressText} styles={styles} multiline />
        <InputField label="ملاحظات" value={notes} onChangeText={setNotes} styles={styles} multiline />

        <Pressable style={styles.primaryAction} onPress={handleSave} disabled={updateProfileMutation.isPending}>
          <Text style={styles.primaryActionText}>
            {updateProfileMutation.isPending ? "جاري حفظ بيانات الشركة..." : "حفظ بيانات الشركة"}
          </Text>
        </Pressable>
      </View>

      <SectionTitle subtitle="هذه المواقع مرتبطة بملف العميل الرئيسي، وتظهر هنا مباشرة بعد أي طلب عقد جديد.">
        مواقع العميل
      </SectionTitle>
      <View style={styles.sitesWrap}>
        {(profile.sites ?? []).map((site) => (
          <View key={site.id} style={styles.siteCard}>
            <View style={styles.siteHeader}>
              <View style={styles.siteCountBadge}>
                <Text style={styles.siteCountText}>{site.elevatorCount}</Text>
              </View>
              <View style={styles.siteTextWrap}>
                <Text style={styles.siteTitle}>{site.city ? `${site.name} - ${site.city}` : site.name}</Text>
                <Text style={styles.siteSubtitle}>{site.addressText || "لا يوجد عنوان محفوظ"}</Text>
              </View>
            </View>
            <Pressable style={styles.openAddressButton} onPress={() => openSiteAddress(site.name, site.addressText, site.city)}>
              <Ionicons name="navigate-outline" size={16} color={appTheme.colors.accent} />
              <Text style={styles.openAddressText}>فتح العنوان</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  styles,
  multiline = false,
  compact = false,
  english = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  styles: ReturnType<typeof createStyles>;
  multiline?: boolean;
  compact?: boolean;
  english?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
}) {
  return (
    <View style={[styles.fieldWrap, compact && styles.compactFieldWrap]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.inputMultiline, english && styles.inputEnglish]}
        multiline={multiline}
        keyboardType={keyboardType}
        textAlign={english ? "left" : "right"}
        autoCapitalize={english ? "none" : "sentences"}
      />
    </View>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    card: {
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
    fieldWrap: {
      gap: 6,
    },
    compactFieldWrap: {
      flex: 1,
    },
    inlineFields: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    fieldLabel: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    input: {
      ...arabicFontStyles.regular,
      backgroundColor: appTheme.colors.surface,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      color: appTheme.colors.textPrimary,
      borderRadius: appTheme.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      textAlignVertical: "center",
    },
    inputEnglish: {
      ...englishFontStyles.regular,
      writingDirection: "ltr",
    },
    inputMultiline: {
      minHeight: 88,
      textAlignVertical: "top",
    },
    primaryAction: {
      marginTop: 4,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: appTheme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryActionText: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.white,
      fontSize: 14,
      textAlign: "center",
      writingDirection: "rtl",
    },
    sitesWrap: {
      gap: 12,
    },
    siteCard: {
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
    siteHeader: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      gap: 12,
    },
    siteCountBadge: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: `${appTheme.colors.accent}14`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}22`,
      alignItems: "center",
      justifyContent: "center",
    },
    siteCountText: {
      ...englishFontStyles.bold,
      color: appTheme.colors.accent,
      fontSize: 16,
      textAlign: "center",
    },
    siteTextWrap: {
      flex: 1,
      gap: 4,
      alignItems: "flex-end",
    },
    siteTitle: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      textAlign: "right",
      writingDirection: "rtl",
    },
    siteSubtitle: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "right",
      writingDirection: "rtl",
    },
    openAddressButton: {
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
    openAddressText: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.accent,
      fontSize: 12,
      textAlign: "center",
      writingDirection: "rtl",
    },
  });
}
