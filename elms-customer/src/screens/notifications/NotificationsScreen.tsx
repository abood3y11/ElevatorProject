import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getNotifications } from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { StatusPill } from "../../components/common/StatusPill";
import { NotificationItem } from "../../types/models";
import { useAppTheme } from "../../theme/useAppTheme";
import { formatDateTime } from "../../utils/format";

export function NotificationsScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  const notificationsQuery = useQuery({ queryKey: ["notifications"], queryFn: getNotifications });
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    setItems(notificationsQuery.data ?? []);
  }, [notificationsQuery.data]);

  const markAllAsRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  return (
    <Screen>
      <View style={styles.header}>
        <SectionTitle subtitle="US-02: التنبيهات الذكية">الإشعارات</SectionTitle>
        <Pressable onPress={markAllAsRead}>
          <Text style={styles.readAll}>تحديد الكل كمقروء</Text>
        </Pressable>
      </View>

      {notificationsQuery.isLoading ? <LoadingState /> : null}
      {!notificationsQuery.isLoading && items.length === 0 ? (
        <EmptyState title="لا توجد إشعارات" subtitle="كل شيء هادئ حالياً." />
      ) : null}

      {items.map((item) => (
        <View key={item.id} style={[styles.card, !item.read && styles.cardUnread]}>
          <View style={styles.rowBetween}>
            <StatusPill status={item.type} />
            <Text style={styles.title}>{item.title}</Text>
          </View>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
        </View>
      ))}
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    readAll: {
      color: appTheme.colors.info,
      fontSize: 12,
      textDecorationLine: "underline",
      textAlign: "right",
      writingDirection: "rtl",
    },
    card: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 6,
    },
    cardUnread: {
      borderColor: `${appTheme.colors.info}99`,
      backgroundColor: `${appTheme.colors.info}12`,
    },
    rowBetween: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
      flexShrink: 1,
    },
    body: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
      lineHeight: 18,
    },
    time: {
      color: appTheme.colors.textMuted,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
