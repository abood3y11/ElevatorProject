import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../components/common/Screen";
import { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { useAppTheme } from "../../theme/useAppTheme";
import { arabicFontStyles, englishFontStyles } from "../../utils/typography";

// §0.1: the "دخول المدير مباشرة" shortcut uses the register-demo backdoor (seeds
// real privileged accounts). Hidden unless a dev/demo build opts in; never in prod.
const DEMO_LOGIN_ENABLED = process.env.EXPO_PUBLIC_ALLOW_DEMO_LOGIN === "true";

export function LoginScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const login = useAuthStore((state) => state.login);
  const loginAsAdmin = useAuthStore((state) => state.loginAsAdmin);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const onSubmit = async () => {
    await login({
      phone: phone.trim(),
      password: password.trim(),
    });
  };

  const onAdminSubmit = async () => {
    setAdminLoading(true);
    try {
      await loginAsAdmin();
    } finally {
      setAdminLoading(false);
    }
  };

  const isLoading = status === "loading";

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>ELMS Customer</Text>
        <Text style={styles.title}>بوابة العميل</Text>
        <Text style={styles.subtitle}>سجّل الدخول لمتابعة المصاعد والعقود وطلبات المتجر من مكان واحد.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>اسم المستخدم أو رقم الجوال</Text>
        <TextInput
          keyboardType="default"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          placeholder="email@example.com أو 05xxxxxxxx"
          placeholderTextColor={appTheme.colors.textMuted}
          textAlign="right"
          autoCapitalize="none"
        />

        <Text style={styles.label}>كلمة المرور</Text>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={appTheme.colors.textMuted}
          textAlign="right"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.submitButton} onPress={onSubmit} disabled={isLoading}>
          <Text style={styles.submitText}>{isLoading && !adminLoading ? "جاري الدخول..." : "تسجيل الدخول"}</Text>
        </Pressable>

        {DEMO_LOGIN_ENABLED && (
          <Pressable
            style={[styles.adminButton, isLoading ? styles.disabledButton : null]}
            onPress={onAdminSubmit}
            disabled={isLoading}
          >
            <Text style={styles.adminText}>{adminLoading ? "جاري دخول المدير..." : "دخول المدير مباشرة"}</Text>
          </Pressable>
        )}

        <Pressable style={styles.registerButton} onPress={() => navigation.navigate("Register")} disabled={isLoading}>
          <Text style={styles.registerText}>تسجيل عميل جديد</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    content: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: "transparent",
      gap: appTheme.spacing.xl,
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
      borderColor: `${appTheme.colors.accent}66`,
      backgroundColor: `${appTheme.colors.accent}1A`,
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
      paddingVertical: 12,
    },
    adminButton: {
      backgroundColor: appTheme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: appTheme.colors.accent,
      alignItems: "center",
      paddingVertical: 12,
    },
    registerButton: {
      borderRadius: 12,
      alignItems: "center",
      paddingVertical: 8,
    },
    disabledButton: {
      opacity: 0.6,
    },
    submitText: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.white,
      fontSize: 14,
      textAlign: "right",
      writingDirection: "rtl",
    },
    adminText: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.accent,
      fontSize: 14,
      textAlign: "right",
      writingDirection: "rtl",
    },
    registerText: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
