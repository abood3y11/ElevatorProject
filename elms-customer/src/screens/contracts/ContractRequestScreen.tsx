import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { createContractRequest, getContractRequestOptions } from "../../api/customerApi";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../theme/useAppTheme";
import { arabicFontStyles } from "../../utils/typography";

export function ContractRequestScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [contractType, setContractType] = useState<"maintenance" | "installation">("maintenance");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("new");
  const [siteName, setSiteName] = useState("");
  const [city, setCity] = useState("");
  const [addressText, setAddressText] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [floorsCount, setFloorsCount] = useState("");
  const [elevatorsCount, setElevatorsCount] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");

  const contractRequestOptionsQuery = useQuery({
    queryKey: ["contract-request-options"],
    queryFn: getContractRequestOptions,
  });

  const selectedSite =
    contractRequestOptionsQuery.data?.sites.find((site) => site.id === selectedSiteId) ?? null;

  const resetForm = () => {
    setSelectedSiteId("new");
    setSiteName("");
    setCity("");
    setAddressText("");
    setBuildingType("");
    setFloorsCount("");
    setElevatorsCount("");
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setNotes("");
  };

  const createRequestMutation = useMutation({
    mutationFn: createContractRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["contract-requests"] });
      queryClient.invalidateQueries({ queryKey: ["contract-request-options"] });
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      resetForm();
      Alert.alert("تم إرسال الطلب", `رقم الطلب: ${response.requestNumber}`, [
        {
          text: "ممتاز",
          onPress: () => navigation.goBack(),
        },
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "تعذر إرسال طلب العقد حاليًا.";
      Alert.alert("طلب العقد", message);
    },
  });

  const handleSubmitRequest = () => {
    if (selectedSiteId === "new" && (!siteName.trim() || !city.trim() || !addressText.trim())) {
      Alert.alert("بيانات الموقع", "أدخل اسم الموقع والمدينة والعنوان قبل الإرسال.");
      return;
    }

    createRequestMutation.mutate({
      contractType,
      siteId: selectedSiteId !== "new" ? selectedSiteId : undefined,
      siteName: selectedSiteId === "new" ? siteName.trim() : undefined,
      city: selectedSiteId === "new" ? city.trim() : undefined,
      addressText: selectedSiteId === "new" ? addressText.trim() : undefined,
      buildingType: selectedSiteId === "new" ? buildingType.trim() || undefined : undefined,
      floorsCount: floorsCount ? Number(floorsCount) : undefined,
      elevatorsCount: elevatorsCount ? Number(elevatorsCount) : undefined,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      notes: notes.trim() || undefined,
      instructionsAcknowledged: true,
    });
  };

  return (
    <Screen>
      <SectionTitle subtitle="اختر النوع وأدخل بيانات الموقع.">طلب عقد</SectionTitle>

      {contractRequestOptionsQuery.isLoading ? <LoadingState /> : null}

      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>نوع العقد</Text>
        <View style={styles.typeRow}>
          {(contractRequestOptionsQuery.data?.contractTypes ?? []).map((type) => {
            const active = contractType === type.id;
            return (
              <Pressable
                key={type.id}
                style={[styles.typeCard, active && styles.typeCardActive]}
                onPress={() => setContractType(type.id)}
              >
                <Text style={[styles.typeTitle, active && styles.typeTitleActive]}>{type.label}</Text>
                <Text style={[styles.typeSubtitle, active && styles.typeSubtitleActive]}>{type.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>الموقع</Text>
        <View style={styles.siteChoiceWrap}>
          <Pressable
            style={[styles.siteChip, selectedSiteId === "new" && styles.siteChipActive]}
            onPress={() => setSelectedSiteId("new")}
          >
            <Text style={[styles.siteChipText, selectedSiteId === "new" && styles.siteChipTextActive]}>
              موقع جديد
            </Text>
          </Pressable>
          {(contractRequestOptionsQuery.data?.sites ?? []).map((site) => {
            const active = selectedSiteId === site.id;
            return (
              <Pressable
                key={site.id}
                style={[styles.siteChip, active && styles.siteChipActive]}
                onPress={() => setSelectedSiteId(site.id)}
              >
                <Text style={[styles.siteChipText, active && styles.siteChipTextActive]}>{site.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {selectedSite ? (
          <View style={styles.siteCard}>
            <Text style={styles.siteTitle}>{selectedSite.name}</Text>
            <Text style={styles.siteMeta}>{selectedSite.addressText || "لا يوجد عنوان محفوظ"}</Text>
            <Text style={styles.siteMeta}>
              {`${selectedSite.elevatorsCount ?? 0} مصعد • ${selectedSite.floorsCount ?? 0} أدوار`}
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              value={siteName}
              onChangeText={setSiteName}
              placeholder="اسم الموقع"
              placeholderTextColor={appTheme.colors.textMuted}
              style={styles.input}
              textAlign="right"
            />
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="المدينة"
              placeholderTextColor={appTheme.colors.textMuted}
              style={styles.input}
              textAlign="right"
            />
            <TextInput
              value={addressText}
              onChangeText={setAddressText}
              placeholder="العنوان"
              placeholderTextColor={appTheme.colors.textMuted}
              style={[styles.input, styles.inputMultiline]}
              textAlign="right"
              multiline
            />
            <TextInput
              value={buildingType}
              onChangeText={setBuildingType}
              placeholder={contractType === "maintenance" ? "نوع المبنى" : "نوع المشروع"}
              placeholderTextColor={appTheme.colors.textMuted}
              style={styles.input}
              textAlign="right"
            />
          </>
        )}

        <View style={styles.inlineFields}>
          <TextInput
            value={elevatorsCount}
            onChangeText={setElevatorsCount}
            placeholder="عدد المصاعد"
            keyboardType="number-pad"
            placeholderTextColor={appTheme.colors.textMuted}
            style={[styles.input, styles.inlineInput]}
            textAlign="right"
          />
          <TextInput
            value={floorsCount}
            onChangeText={setFloorsCount}
            placeholder="عدد الأدوار"
            keyboardType="number-pad"
            placeholderTextColor={appTheme.colors.textMuted}
            style={[styles.input, styles.inlineInput]}
            textAlign="right"
          />
        </View>

        <Text style={styles.sectionLabel}>بيانات التواصل</Text>
        <TextInput
          value={contactName}
          onChangeText={setContactName}
          placeholder="اسم المسؤول"
          placeholderTextColor={appTheme.colors.textMuted}
          style={styles.input}
          textAlign="right"
        />
        <TextInput
          value={contactPhone}
          onChangeText={setContactPhone}
          placeholder="رقم الجوال"
          placeholderTextColor={appTheme.colors.textMuted}
          style={styles.input}
          textAlign="right"
        />
        <TextInput
          value={contactEmail}
          onChangeText={setContactEmail}
          placeholder="البريد الإلكتروني"
          placeholderTextColor={appTheme.colors.textMuted}
          style={styles.input}
          textAlign="right"
          autoCapitalize="none"
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="ملاحظات"
          placeholderTextColor={appTheme.colors.textMuted}
          style={[styles.input, styles.inputMultiline]}
          textAlign="right"
          multiline
        />

        <Pressable style={styles.submitButton} onPress={handleSubmitRequest} disabled={createRequestMutation.isPending}>
          <Text style={styles.submitButtonText}>
            {createRequestMutation.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    formCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 12,
      shadowColor: "#0f6b5c",
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    sectionLabel: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      textAlign: "right",
      writingDirection: "rtl",
    },
    typeRow: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    typeCard: {
      flex: 1,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surface,
      padding: 12,
      gap: 4,
      alignItems: "flex-end",
    },
    typeCardActive: {
      borderColor: `${appTheme.colors.accent}44`,
      backgroundColor: `${appTheme.colors.accent}12`,
    },
    typeTitle: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      textAlign: "right",
      writingDirection: "rtl",
    },
    typeTitleActive: {
      color: appTheme.colors.accent,
    },
    typeSubtitle: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    typeSubtitleActive: {
      color: appTheme.colors.textPrimary,
    },
    siteChoiceWrap: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    siteChip: {
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    siteChipActive: {
      borderColor: `${appTheme.colors.accent}44`,
      backgroundColor: `${appTheme.colors.accent}12`,
    },
    siteChipText: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "center",
      writingDirection: "rtl",
    },
    siteChipTextActive: {
      color: appTheme.colors.accent,
    },
    siteCard: {
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: `${appTheme.colors.accent}08`,
      padding: 12,
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
    siteMeta: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    input: {
      minHeight: 48,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surface,
      paddingHorizontal: 14,
      color: appTheme.colors.textPrimary,
      ...arabicFontStyles.regular,
    },
    inputMultiline: {
      minHeight: 92,
      paddingTop: 14,
      textAlignVertical: "top",
    },
    inlineFields: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    inlineInput: {
      flex: 1,
    },
    submitButton: {
      minHeight: 50,
      borderRadius: appTheme.radius.md,
      backgroundColor: appTheme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    submitButtonText: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.white,
      fontSize: 14,
      textAlign: "center",
      writingDirection: "rtl",
    },
  });
}
