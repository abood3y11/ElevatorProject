import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getVisits } from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { StatusPill } from "../../components/common/StatusPill";
import { AppStackParamList } from "../../navigation/types";
import { Visit } from "../../types/models";
import { useAppTheme } from "../../theme/useAppTheme";
import { formatDateTime } from "../../utils/format";

function getMonthKey(dateValue: string) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(dateValue: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    month: "long",
    year: "numeric",
  }).format(new Date(dateValue));
}

function VisitCard({
  visit,
  styles,
  navigation,
}: {
  visit: Visit;
  styles: ReturnType<typeof createStyles>;
  navigation: NavigationProp<AppStackParamList>;
}) {
  return (
    <View style={styles.card} key={visit.id}>
      <View style={styles.rowBetween}>
        <StatusPill status={visit.status} />
        <View style={styles.alignEnd}>
          <Text style={styles.title}>{visit.elevatorName}</Text>
          <Text style={styles.subtitle}>{formatDateTime(visit.scheduledAt)}</Text>
        </View>
      </View>
      <Text style={styles.info}>الفني: {visit.technicianName}</Text>
      <Text style={styles.info}>الهاتف: {visit.technicianPhone}</Text>
      {visit.recommendationCount ? (
        <Text style={styles.recommendationInfo}>يوجد {visit.recommendationCount} قطعة مقترحة لهذه الزيارة</Text>
      ) : null}
      <View style={styles.actionsRow}>
        <Pressable style={styles.detailButton} onPress={() => navigation.navigate("VisitDetail", { visitId: visit.id })}>
          <Text style={styles.detailText}>تفاصيل الزيارة</Text>
        </Pressable>
        {visit.status !== "completed" ? (
          <Pressable style={styles.trackButton} onPress={() => navigation.navigate("Tracking", { visitId: visit.id })}>
            <Text style={styles.trackText}>تتبع الفني</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function VisitsScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const visitsQuery = useQuery({ queryKey: ["visits"], queryFn: getVisits });

  const { currentVisits, previousMonthGroups } = useMemo(() => {
    const visits = visitsQuery.data ?? [];
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const current: Visit[] = [];
    const previousCompleted = new Map<string, { label: string; visits: Visit[] }>();

    for (const visit of visits) {
      const visitMonthKey = getMonthKey(visit.scheduledAt);
      const isPreviousCompleted = visit.status === "completed" && visitMonthKey !== currentMonthKey;

      if (!isPreviousCompleted) {
        current.push(visit);
        continue;
      }

      if (!previousCompleted.has(visitMonthKey)) {
        previousCompleted.set(visitMonthKey, {
          label: getMonthLabel(visit.scheduledAt),
          visits: [],
        });
      }
      previousCompleted.get(visitMonthKey)?.visits.push(visit);
    }

    const previousGroups = Array.from(previousCompleted.entries())
      .map(([key, value]) => ({ key, label: value.label, visits: value.visits }))
      .sort((a, b) => b.key.localeCompare(a.key));

    return {
      currentVisits: current,
      previousMonthGroups: previousGroups,
    };
  }, [visitsQuery.data]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((current) => ({
      ...current,
      [monthKey]: !current[monthKey],
    }));
  };

  return (
    <Screen>
      <SectionTitle subtitle="متابعة الزيارات الحالية والسجل السابق">الزيارات الفنية</SectionTitle>

      {visitsQuery.isLoading ? <LoadingState /> : null}
      {!visitsQuery.isLoading && (visitsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState title="لا توجد زيارات" subtitle="سيظهر سجل الزيارات عند توفر بيانات مجدولة أو مكتملة." />
      ) : null}

      {currentVisits.length > 0 ? (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>الزيارات الحالية</Text>
          {currentVisits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} styles={styles} navigation={navigation} />
          ))}
        </View>
      ) : null}

      {previousMonthGroups.length > 0 ? (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>الزيارات السابقة</Text>
          {previousMonthGroups.map((group) => {
            const isExpanded = expandedMonths[group.key] ?? false;
            return (
              <View key={group.key} style={styles.monthWrap}>
                <Pressable style={styles.monthHeader} onPress={() => toggleMonth(group.key)}>
                  <View style={styles.monthHeaderStart}>
                    <Ionicons
                      name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"}
                      size={18}
                      color={appTheme.colors.accent}
                    />
                    <Text style={styles.monthCount}>{group.visits.length}</Text>
                  </View>
                  <Text style={styles.monthTitle}>{group.label}</Text>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.monthContent}>
                    {group.visits.map((visit) => (
                      <VisitCard key={visit.id} visit={visit} styles={styles} navigation={navigation} />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    sectionWrap: {
      gap: 10,
    },
    sectionLabel: {
      color: appTheme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    monthWrap: {
      gap: 8,
    },
    monthHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      paddingHorizontal: appTheme.spacing.md,
      paddingVertical: 12,
    },
    monthHeaderStart: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
    },
    monthTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    monthCount: {
      minWidth: 24,
      textAlign: "center",
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "800",
    },
    monthContent: {
      gap: 10,
    },
    card: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 6,
    },
    rowBetween: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    alignEnd: {
      alignItems: "flex-end",
      gap: 2,
      flex: 1,
    },
    title: {
      color: appTheme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    subtitle: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    info: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    recommendationInfo: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    actionsRow: {
      flexDirection: "row-reverse",
      gap: 10,
      marginTop: 4,
      alignSelf: "flex-start",
    },
    detailButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}66`,
      backgroundColor: `${appTheme.colors.accent}14`,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    detailText: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    trackButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: `${appTheme.colors.info}99`,
      backgroundColor: `${appTheme.colors.info}22`,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    trackText: {
      color: appTheme.colors.info,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
