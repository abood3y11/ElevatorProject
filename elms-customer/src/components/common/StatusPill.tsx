import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  ContractStatus,
  ElevatorStatus,
  InvoiceStatus,
  NotificationType,
  StoreOrderStatus,
  VisitStatus,
} from "../../types/models";
import { useAppTheme } from "../../theme/useAppTheme";
import { arabicFontStyles } from "../../utils/typography";

type Status =
  | ElevatorStatus
  | VisitStatus
  | ContractStatus
  | InvoiceStatus
  | NotificationType
  | StoreOrderStatus;

const labelByStatus: Record<Status, string> = {
  operational: "تشغيل طبيعي",
  warning: "تحذير",
  down: "متوقف",
  maintenance: "صيانة",
  under_installation: "قيد التركيب",
  scheduled: "مجدولة",
  in_progress: "جارية",
  completed: "مكتملة",
  active: "نشط",
  expiring: "قريب الانتهاء",
  expired: "منتهي",
  paid: "مدفوعة",
  pending: "معلقة",
  overdue: "متأخرة",
  info: "معلومة",
  success: "نجاح",
  danger: "خطر",
  processing: "قيد المعالجة",
  ready_to_ship: "جاهز للشحن",
  in_transit: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

interface StatusPillProps {
  status: Status;
}

export function StatusPill({ status }: StatusPillProps) {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  const colorByStatus: Record<Status, string> = {
    operational: appTheme.colors.success,
    warning: appTheme.colors.warn,
    down: appTheme.colors.danger,
    maintenance: appTheme.colors.info,
    under_installation: appTheme.colors.accent,
    scheduled: appTheme.colors.info,
    in_progress: appTheme.colors.warn,
    completed: appTheme.colors.success,
    active: appTheme.colors.success,
    expiring: appTheme.colors.warn,
    expired: appTheme.colors.danger,
    paid: appTheme.colors.success,
    pending: appTheme.colors.warn,
    overdue: appTheme.colors.danger,
    info: appTheme.colors.info,
    success: appTheme.colors.success,
    danger: appTheme.colors.danger,
    processing: appTheme.colors.info,
    ready_to_ship: appTheme.colors.warn,
    in_transit: appTheme.colors.accent,
    delivered: appTheme.colors.success,
    cancelled: appTheme.colors.danger,
  };

  const color = colorByStatus[status];

  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}22` }]}>
      <Text style={[styles.text, { color }]}>{labelByStatus[status]}</Text>
    </View>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    badge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: "flex-start",
    },
    text: {
      ...arabicFontStyles.medium,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
