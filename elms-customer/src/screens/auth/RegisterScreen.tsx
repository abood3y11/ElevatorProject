import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../components/common/Screen";
import { useAuthStore } from "../../store/authStore";
import { useAppTheme } from "../../theme/useAppTheme";
import { AuthStackParamList } from "../../navigation/types";
import { arabicFontStyles, englishFontStyles } from "../../utils/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  const register = useAuthStore((state) => state.register);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");

  const isLoading = status === "loading";

  const onSubmit = async () => {
    if (!fullName.trim() || !companyName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert("بيانات ناقصة", "أكمل الاسم واسم الشركة والبريد والجوال وكلمة المرور.");
      return;
    }

    const success = await register({
      fullName: fullName.trim(),
      companyName: companyName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      city: city.trim() || undefined,
      region: region.trim() || undefined,
    });

    if (!success) {
      return;
    }

    Alert.alert("تم إنشاء الحساب", "تم تسجيل العميل وربط الحساب بالتطبيق بنجاح.");
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>ELMS Customer</Text>
        <Text style={styles.title}>إنشاء حساب عميل</Text>
        <Text style={styles.subtitle}>سجّل شركتك ليتمكن العميل من طلب العقود وشراء القطع ومتابعة الخدمات.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>الاسم الكامل</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          placeholder="اسم المسؤول"
          placeholderTextColor={appTheme.colors.textMuted}
          textAlign="right"
        />

        <Text style={styles.label}>اسم الشركة</Text>
        <TextInput
          value={companyName}
          onChangeText={setCompanyName}
          style={styles.input}
          placeholder="اسم الشركة أو المنشأة"
          placeholderTextColor={appTheme.colors.textMuted}
          textAlign="right"
        />

        <Text style={styles.label}>البريد الإلكتروني</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={[styles.input, styles.englishInput]}
          placeholder="name@company.com"
          placeholderTextColor={appTheme.colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          textAlign="left"
        />

        <Text style={styles.label}>رقم الجوال</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          placeholder="05xxxxxxxx"
          placeholderTextColor={appTheme.colors.textMuted}
          keyboardType="phone-pad"
          textAlign="right"
        />

        <Text style={styles.label}>كلمة المرور</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={[styles.input, styles.englishInput]}
          placeholder="••••••••"
          placeholderTextColor={appTheme.colors.textMuted}
          secureTextEntry
          textAlign="left"
        />

        <View style={styles.row}>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>المنطقة</Text>
            <TextInput
              value={region}
              onChangeText={setRegion}
              style={styles.input}
              placeholder="المنطقة"
              placeholderTextColor={appTheme.colors.textMuted}
              textAlign="right"
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>المدينة</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              style={styles.input}
              placeholder="المدينة"
              placeholderTextColor={appTheme.colors.textMuted}
              textAlign="right"
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.submitButton} onPress={onSubmit} disabled={isLoading}>
          <Text style={styles.submitText}>{isLoading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()} disabled={isLoading}>
          <Text style={styles.secondaryText}>لديك حساب بالفعل؟ تسجيل الدخول</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    content: {
      gap: appTheme.spacing.lg,
    },
    header: {
      gap: 8,
    },
    badge: {
      ...englishFontStyles.bold,
      alignSelf: "flex-end",
      color: appTheme.colors.accent,
      fontSize: 12,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}55`,
      backgroundColor: `${appTheme.colors.accent}12`,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
      overflow: "hidden",
    },
    title: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 28,
      textAlign: "right",
      writingDirection: "rtl",
    },
    subtitle: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "right",
      writingDirection: "rtl",
    },
    formCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.lg,
      gap: 8,
    },
    label: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    input: {
      ...arabicFontStyles.regular,
      backgroundColor: appTheme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: appTheme.colors.textPrimary,
      writingDirection: "rtl",
    },
    englishInput: {
      ...englishFontStyles.regular,
      writingDirection: "ltr",
    },
    row: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    fieldHalf: {
      flex: 1,
      gap: 8,
    },
    error: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.danger,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
      marginTop: 4,
    },
    submitButton: {
      marginTop: 8,
      backgroundColor: appTheme.colors.accent,
      borderRadius: 12,
      alignItems: "center",
      paddingVertical: 13,
    },
    submitText: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.white,
      fontSize: 14,
      textAlign: "center",
      writingDirection: "rtl",
    },
    secondaryButton: {
      backgroundColor: appTheme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      alignItems: "center",
      paddingVertical: 12,
    },
    secondaryText: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      textAlign: "center",
      writingDirection: "rtl",
    },
  });
}
