import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getElevators } from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { StatusPill } from "../../components/common/StatusPill";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../theme/useAppTheme";
import { Elevator } from "../../types/models";
import { formatCurrency } from "../../utils/format";

type ElevatorSection = "operational" | "installation";

export function ElevatorsScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [searchText, setSearchText] = useState("");
  const [activeSection, setActiveSection] = useState<ElevatorSection>("operational");
  const elevatorsQuery = useQuery({ queryKey: ["elevators"], queryFn: getElevators });

  const filteredElevators = useMemo(() => {
    const items = elevatorsQuery.data ?? [];
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [
        item.name,
        item.code,
        item.location,
        item.siteName,
        item.installationOverview?.projectName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [elevatorsQuery.data, searchText]);

  const installationElevators = filteredElevators.filter(
    (item) => item.hasActiveInstallation || item.status === "under_installation"
  );
  const operationalElevators = filteredElevators.filter(
    (item) => !installationElevators.some((candidate) => candidate.id === item.id)
  );
  const showingInstallation = activeSection === "installation";
  const visibleElevators = showingInstallation ? installationElevators : operationalElevators;

  const openOperationalElevator = (elevatorId: string) => {
    navigation.navigate("ElevatorDetail", { elevatorId });
  };

  const openInstallationMonitoring = (elevator: Elevator) => {
    navigation.navigate("InstallationMonitoring", {
      elevatorId: elevator.id,
      projectId: elevator.installationProjects?.[0]?.id,
    });
  };

  return (
    <Screen>
      <SectionTitle subtitle="تنقل أوضح بين المصاعد التشغيلية ومصاعد التركيب">
        قائمة المصاعد
      </SectionTitle>

      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="ابحث بالكود أو الموقع أو اسم المشروع..."
        placeholderTextColor={appTheme.colors.textMuted}
        style={styles.search}
        textAlign="right"
      />

      <View style={styles.filterTabs}>
        <Pressable
          style={[styles.filterTab, !showingInstallation && styles.filterTabActive]}
          onPress={() => setActiveSection("operational")}
        >
          <Text style={[styles.filterTabText, !showingInstallation && styles.filterTabTextActive]}>
            قيد التشغيل
          </Text>
          <Text style={[styles.filterTabCount, !showingInstallation && styles.filterTabCountActive]}>
            {operationalElevators.length}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterTab, showingInstallation && styles.filterTabActive]}
          onPress={() => setActiveSection("installation")}
        >
          <Text style={[styles.filterTabText, showingInstallation && styles.filterTabTextActive]}>
            قيد التركيب
          </Text>
          <Text style={[styles.filterTabCount, showingInstallation && styles.filterTabCountActive]}>
            {installationElevators.length}
          </Text>
        </Pressable>
      </View>

      {elevatorsQuery.isLoading ? <LoadingState /> : null}

      {!elevatorsQuery.isLoading && filteredElevators.length === 0 ? (
        <EmptyState title="لا توجد نتائج" subtitle="جرّب كلمة بحث مختلفة أو أزل التصفية." />
      ) : null}

      {!elevatorsQuery.isLoading && filteredElevators.length > 0 ? (
        <View style={styles.sectionWrap}>
          <SectionTitle subtitle={`${visibleElevators.length} مصعد`}>
            {showingInstallation ? "مصاعد قيد التركيب" : "مصاعد قيد التشغيل"}
          </SectionTitle>

          {visibleElevators.length === 0 ? (
            <EmptyMiniCard
              styles={styles}
              text={
                showingInstallation
                  ? "لا توجد مشاريع تركيب مطابقة للتصفية الحالية."
                  : "لا توجد مصاعد تشغيلية مطابقة للتصفية الحالية."
              }
            />
          ) : showingInstallation ? (
            visibleElevators.map((elevator) => (
              <Pressable
                key={elevator.id}
                style={styles.installationCard}
                onPress={() => openInstallationMonitoring(elevator)}
              >
                <View style={styles.header}>
                  <StatusPill status="under_installation" />
                  <View style={styles.headerText}>
                    <Text style={styles.title}>{elevator.name}</Text>
                    <Text style={styles.subtitle}>{elevator.code}</Text>
                  </View>
                </View>

                <Text style={styles.projectTitle}>
                  {elevator.installationOverview?.projectName || "مشروع تركيب نشط"}
                </Text>
                <Text style={styles.projectMeta}>
                  {elevator.installationOverview?.currentPhaseLabel ||
                    elevator.installationOverview?.statusLabel ||
                    "قيد المتابعة"}{" "}
                  • {elevator.installationOverview?.progressPercentage ?? 0}%
                </Text>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.max(
                          6,
                          Math.min(100, elevator.installationOverview?.progressPercentage ?? 0)
                        )}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>
                      {formatCurrency(
                        elevator.installationOverview?.totalPlannedCost ?? 0,
                        elevator.installationOverview?.currency || "SAR"
                      )}
                    </Text>
                    <Text style={styles.metricLabel}>قيمة المراحل</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{elevator.activeInstallationCount ?? 0}</Text>
                    <Text style={styles.metricLabel}>مشروع نشط</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.footerTextAccent}>فتح شاشة متابعة التركيب</Text>
                </View>
              </Pressable>
            ))
          ) : (
            visibleElevators.map((elevator) => (
              <Pressable
                key={elevator.id}
                style={styles.operationalCard}
                onPress={() => openOperationalElevator(elevator.id)}
              >
                <View style={styles.header}>
                  <StatusPill status={elevator.status} />
                  <View style={styles.headerText}>
                    <Text style={styles.title}>{elevator.name}</Text>
                    <Text style={styles.subtitle}>{elevator.code}</Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <InfoBlock styles={styles} label="الموقع" value={elevator.location} />
                  <InfoBlock
                    styles={styles}
                    label="النوع"
                    value={`${elevator.brand} ${elevator.model}`}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.footerText}>فتح تفاصيل المصعد</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function EmptyMiniCard({
  styles,
  text,
}: {
  styles: ReturnType<typeof createStyles>;
  text: string;
}) {
  return (
    <View style={styles.emptyMiniCard}>
      <Text style={styles.emptyMiniText}>{text}</Text>
    </View>
  );
}

function InfoBlock({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    sectionWrap: {
      gap: appTheme.spacing.sm,
    },
    search: {
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.card,
      borderRadius: 14,
      color: appTheme.colors.textPrimary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      writingDirection: "rtl",
    },
    filterTabs: {
      flexDirection: "row-reverse",
      gap: appTheme.spacing.sm,
    },
    filterTab: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}CC`,
      backgroundColor: appTheme.colors.card,
      paddingHorizontal: appTheme.spacing.md,
      paddingVertical: appTheme.spacing.sm,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
    },
    filterTabActive: {
      borderColor: appTheme.colors.accent,
      backgroundColor: `${appTheme.colors.accent}18`,
    },
    filterTabText: {
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    filterTabTextActive: {
      color: appTheme.colors.textPrimary,
    },
    filterTabCount: {
      color: appTheme.colors.textMuted,
      fontSize: 12,
      fontWeight: "800",
    },
    filterTabCountActive: {
      color: appTheme.colors.accent,
    },
    emptyMiniCard: {
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}BB`,
      backgroundColor: `${appTheme.colors.card}D8`,
      padding: appTheme.spacing.md,
    },
    emptyMiniText: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    header: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    headerText: {
      alignItems: "flex-end",
      gap: 2,
      flexShrink: 1,
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
    operationalCard: {
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.card,
      padding: appTheme.spacing.md,
      gap: 12,
    },
    installationCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}44`,
      backgroundColor: `${appTheme.colors.accent}12`,
      padding: appTheme.spacing.md,
      gap: 10,
    },
    infoGrid: {
      flexDirection: "row-reverse",
      gap: appTheme.spacing.sm,
    },
    infoBlock: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: `${appTheme.colors.surface}D8`,
      padding: appTheme.spacing.sm,
      gap: 4,
      alignItems: "flex-end",
    },
    infoValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    infoLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 10,
      textAlign: "right",
      writingDirection: "rtl",
    },
    projectTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    projectMeta: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: `${appTheme.colors.border}B0`,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: appTheme.colors.accent,
    },
    metricRow: {
      flexDirection: "row-reverse",
      gap: appTheme.spacing.sm,
    },
    metricCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: `${appTheme.colors.card}E6`,
      padding: appTheme.spacing.sm,
      gap: 4,
      alignItems: "flex-end",
    },
    metricValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    metricLabel: {
      color: appTheme.colors.textSecondary,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
    cardFooter: {
      borderTopWidth: 1,
      borderTopColor: `${appTheme.colors.border}99`,
      paddingTop: 10,
      alignItems: "flex-end",
    },
    footerText: {
      color: appTheme.colors.info,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    footerTextAccent: {
      color: appTheme.colors.accent,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
