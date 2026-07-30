import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import axios from "axios";
import { submitEmergencyReport } from "../../api/customerApi";
import { useAuthStore } from "../../store/authStore";
import { useAppTheme } from "../../theme/useAppTheme";
import { Elevator, EmergencyIssueType } from "../../types/models";

interface IssueReportModalProps {
  visible: boolean;
  elevators: Elevator[];
  onClose: () => void;
}

const issueTypeOptions: EmergencyIssueType[] = [
  "stuck_passengers",
  "breakdown",
  "door_issue",
  "noise",
  "other",
];

const issueTypeLabel: Record<EmergencyIssueType, string> = {
  stuck_passengers: "احتجاز ركاب",
  breakdown: "تعطل",
  door_issue: "مشكلة باب",
  noise: "ضوضاء",
  other: "أخرى",
};

export function IssueReportModal({ visible, elevators, onClose }: IssueReportModalProps) {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const user = useAuthStore((state) => state.user);

  const [selectedElevatorId, setSelectedElevatorId] = useState<string>("");
  const [issueType, setIssueType] = useState<EmergencyIssueType>("breakdown");
  const [reporterPhone, setReporterPhone] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const normalizedElevatorId = selectedElevatorId || elevators[0]?.id || "";

  useEffect(() => {
    if (visible) {
      setReporterPhone(user?.phone ?? "");
    }
  }, [visible, user?.phone]);

  const submit = async () => {
    if (!normalizedElevatorId || !reporterPhone.trim() || !description.trim()) {
      setMessage("اختر المصعد، أدخل رقم الجوال، واكتب وصف البلاغ.");
      return;
    }

    if (!isUuid(normalizedElevatorId)) {
      setMessage("الإبلاغ المباشر يحتاج مصعدًا حقيقيًا من الخادم وليس بيانات mock.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const result = await submitEmergencyReport({
        elevatorId: normalizedElevatorId,
        issueType,
        description: description.trim(),
        reporterName: user?.name ?? "عميل ELMS",
        reporterPhone: reporterPhone.trim(),
        priority: "critical",
      });

      const reference =
        result.work_order_number ?? result.work_order_id ?? "تم الإنشاء";
      setMessage(`تم إرسال بلاغ الطوارئ إلى الخادم. المرجع: ${reference}`);
      setDescription("");
      setSelectedElevatorId("");
      setIssueType("breakdown");
      setReporterPhone("");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        setMessage(
          typeof detail === "string" ? detail : "تعذر إرسال بلاغ الطوارئ إلى الخادم.",
        );
      } else {
        setMessage("تعذر إرسال بلاغ الطوارئ إلى الخادم.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dragger} />
            <Text style={styles.title}>بلاغ طوارئ مباشر</Text>

            <Text style={styles.label}>اختر المصعد</Text>
            <View style={styles.optionsWrap}>
              {elevators.map((elevator) => (
                <Pressable
                  key={elevator.id}
                  onPress={() => setSelectedElevatorId(elevator.id)}
                  style={[
                    styles.chip,
                    normalizedElevatorId === elevator.id && styles.chipActive,
                  ]}
                >
                  <Text style={styles.chipText}>{elevator.code}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>نوع الطوارئ</Text>
            <View style={styles.optionsWrap}>
              {issueTypeOptions.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setIssueType(type)}
                  style={[styles.chip, issueType === type && styles.chipActive]}
                >
                  <Text style={styles.chipText}>{issueTypeLabel[type]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>المبلّغ</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{user?.name ?? "عميل ELMS"}</Text>
            </View>

            <Text style={styles.label}>رقم جوال المبلّغ</Text>
            <TextInput
              value={reporterPhone}
              onChangeText={setReporterPhone}
              placeholder="05xxxxxxxx"
              placeholderTextColor={appTheme.colors.textMuted}
              style={styles.singleLineInput}
              keyboardType="phone-pad"
              returnKeyType="done"
              textAlign="right"
            />

            <Text style={styles.label}>وصف المشكلة</Text>
            <TextInput
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="اكتب تفاصيل العطل..."
              placeholderTextColor={appTheme.colors.textMuted}
              style={styles.textArea}
              blurOnSubmit
              returnKeyType="done"
              textAlign="right"
            />

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable onPress={submit} disabled={submitting} style={styles.submitButton}>
              <Text style={styles.submitText}>
                {submitting ? "جاري الإرسال..." : "إرسال الطوارئ للخادم"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    sheet: {
      backgroundColor: appTheme.colors.surface,
      borderTopRightRadius: appTheme.radius.xl,
      borderTopLeftRadius: appTheme.radius.xl,
      borderTopColor: appTheme.colors.border,
      borderTopWidth: 1,
      maxHeight: "88%",
      overflow: "hidden",
    },
    sheetContent: {
      paddingHorizontal: appTheme.spacing.lg,
      paddingVertical: appTheme.spacing.md,
      gap: appTheme.spacing.sm,
      paddingBottom: appTheme.spacing.xl,
    },
    dragger: {
      width: 48,
      height: 4,
      borderRadius: 100,
      backgroundColor: appTheme.colors.border,
      alignSelf: "center",
      marginBottom: appTheme.spacing.sm,
    },
    title: {
      color: appTheme.colors.textPrimary,
      fontSize: 20,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    label: {
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      marginTop: appTheme.spacing.sm,
      textAlign: "right",
      writingDirection: "rtl",
    },
    optionsWrap: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipActive: {
      borderColor: appTheme.colors.accent,
      backgroundColor: `${appTheme.colors.accent}22`,
    },
    chipText: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
      textAlign: "right",
      writingDirection: "rtl",
    },
    readOnlyField: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      borderRadius: 12,
      paddingHorizontal: appTheme.spacing.md,
      justifyContent: "center",
      backgroundColor: `${appTheme.colors.card}CC`,
    },
    readOnlyText: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      textAlign: "right",
      writingDirection: "rtl",
    },
    singleLineInput: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      borderRadius: 12,
      paddingHorizontal: appTheme.spacing.md,
      backgroundColor: appTheme.colors.card,
      color: appTheme.colors.textPrimary,
      writingDirection: "rtl",
    },
    textArea: {
      minHeight: 92,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      borderRadius: 12,
      padding: appTheme.spacing.md,
      backgroundColor: appTheme.colors.card,
      color: appTheme.colors.textPrimary,
      textAlignVertical: "top",
      writingDirection: "rtl",
    },
    message: {
      color: appTheme.colors.warn,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    submitButton: {
      marginTop: appTheme.spacing.sm,
      backgroundColor: `${appTheme.colors.danger}33`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.danger}99`,
      borderRadius: 12,
      alignItems: "center",
      paddingVertical: 12,
    },
    submitText: {
      color: appTheme.colors.danger,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
