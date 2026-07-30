import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { getElevatorById } from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { StatusPill } from "../../components/common/StatusPill";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../theme/useAppTheme";
import {
  ElevatorInstallationPhaseSummary,
  ElevatorInstallationProject,
  ElevatorInstallationTask,
} from "../../types/models";
import { formatCurrency, formatDate } from "../../utils/format";

type InstallationMonitoringRoute = RouteProp<AppStackParamList, "InstallationMonitoring">;

export function InstallationMonitoringScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const route = useRoute<InstallationMonitoringRoute>();

  const elevatorQuery = useQuery({
    queryKey: ["elevator", route.params.elevatorId],
    queryFn: () => getElevatorById(route.params.elevatorId),
  });

  if (elevatorQuery.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (!elevatorQuery.data) {
    return (
      <Screen>
        <EmptyState
          title="تعذر تحميل مشروع التركيب"
          subtitle="تأكد من اتصال الإنترنت وحاول مرة أخرى."
        />
      </Screen>
    );
  }

  const elevator = elevatorQuery.data;
  const orderedProjects = [...(elevator.installationProjects ?? [])].sort((left, right) => {
    const selectedId = route.params.projectId;
    if (selectedId && left.id === selectedId) return -1;
    if (selectedId && right.id === selectedId) return 1;
    return (right.progressPercentage ?? 0) - (left.progressPercentage ?? 0);
  });

  return (
    <Screen>
      <InstallationMotionHero
        styles={styles}
        title={elevator.name}
        subtitle={`${elevator.code} • ${elevator.siteName || elevator.location}`}
      />

      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <StatusPill status="under_installation" />
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>{elevator.name}</Text>
            <Text style={styles.heroSubtitle}>{elevator.location}</Text>
          </View>
        </View>

        <View style={styles.heroFacts}>
          <FactBadge styles={styles} label="الموقع" value={elevator.location} />
          <FactBadge styles={styles} label="العميل" value={elevator.customerName || "غير محدد"} />
          <FactBadge
            styles={styles}
            label="المشاريع النشطة"
            value={String(elevator.activeInstallationCount ?? 0)}
          />
        </View>
      </View>

      <SectionTitle subtitle="متابعة حيّة لمراحل التركيب والعناوين والمهام الفرعية">
        مراحل التركيب
      </SectionTitle>

      {orderedProjects.length === 0 ? (
        <EmptyState
          title="لا يوجد مشروع تركيب نشط"
          subtitle="لم يتم العثور على بيانات تركيب لهذا المصعد."
        />
      ) : (
        orderedProjects.map((project) => (
          <ProjectMonitoringCard key={project.id} project={project} styles={styles} />
        ))
      )}
    </Screen>
  );
}

function InstallationMotionHero({
  styles,
  title,
  subtitle,
}: {
  styles: ReturnType<typeof createStyles>;
  title: string;
  subtitle: string;
}) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const rotateLoop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.92,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    rotateLoop.start();
    pulseLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
    };
  }, [pulse, rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.motionHero}>
      <Animated.View
        style={[
          styles.motionHalo,
          {
            transform: [{ scale: pulse }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.motionRing,
          {
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <View style={styles.motionRingGap} />
      </Animated.View>
      <View style={styles.motionCore}>
        <Ionicons name="construct-outline" size={34} color="#FFFFFF" />
      </View>
      <View style={styles.motionTextWrap}>
        <Text style={styles.motionTitle}>قيد التركيب</Text>
        <Text style={styles.motionSubtitle}>{title}</Text>
        <Text style={styles.motionMeta}>{subtitle}</Text>
      </View>
    </View>
  );
}

function ProjectMonitoringCard({
  project,
  styles,
}: {
  project: ElevatorInstallationProject;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{project.statusLabel}</Text>
        </View>
        <View style={styles.projectHeaderText}>
          <Text style={styles.projectTitle}>{project.projectName}</Text>
          <Text style={styles.projectCode}>{project.projectCode}</Text>
        </View>
      </View>

      <Text style={styles.projectDescription}>
        {project.description || project.notes || "لا توجد ملاحظات إضافية لهذا المشروع."}
      </Text>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressValue}>{project.progressPercentage}%</Text>
          <Text style={styles.progressLabel}>نسبة الإنجاز</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(6, Math.min(100, project.progressPercentage || 0))}%` },
            ]}
          />
        </View>
        <Text style={styles.currentPhaseText}>
          المرحلة الحالية: {project.currentPhaseLabel || project.statusLabel}
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          styles={styles}
          label="قيمة المشروع"
          value={formatCurrency(
            project.contractTotalValue || project.totalPlannedCost || 0,
            project.currency || "SAR"
          )}
        />
        <MetricCard
          styles={styles}
          label="قيمة المراحل"
          value={formatCurrency(project.totalPlannedCost || 0, project.currency || "SAR")}
        />
        <MetricCard
          styles={styles}
          label="منفذ حتى الآن"
          value={formatCurrency(project.totalActualCost || 0, project.currency || "SAR")}
        />
        <MetricCard
          styles={styles}
          label="رقم العقد"
          value={project.contractNumber || "غير محدد"}
        />
      </View>

      <View style={styles.datePanel}>
        <LineItem styles={styles} label="بداية الخطة" value={formatDateOrDash(project.plannedStartDate)} />
        <LineItem styles={styles} label="نهاية الخطة" value={formatDateOrDash(project.plannedEndDate)} />
        <LineItem styles={styles} label="البداية الفعلية" value={formatDateOrDash(project.actualStartDate)} />
        <LineItem
          styles={styles}
          label="نهاية التنفيذ"
          value={formatDateOrDash(project.actualEndDate || project.plannedEndDate)}
        />
      </View>

      {project.teams.length ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionMiniTitle}>الفرق الحالية</Text>
          {project.teams.map((team) => (
            <View key={team.id} style={styles.teamCard}>
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamMeta}>المهام النشطة: {team.activeTaskCount}</Text>
              <Text style={styles.teamMembers}>
                {team.members.join(" - ") || "لا توجد أسماء مسجلة"}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionMiniTitle}>مراحل التركيب</Text>
        {project.phaseSummaries.map((phase, phaseIndex) => (
          <PhaseCard
            key={`${project.id}-${phase.phase}`}
            phase={phase}
            phaseIndex={phaseIndex}
            styles={styles}
          />
        ))}
      </View>
    </View>
  );
}

function PhaseCard({
  phase,
  phaseIndex,
  styles,
}: {
  phase: ElevatorInstallationPhaseSummary;
  phaseIndex: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const appTheme = useAppTheme();
  const [expanded, setExpanded] = useState(phaseIndex === 0);

  const taskGroups = useMemo(() => {
    return phase.tasks.reduce<Record<string, ElevatorInstallationTask[]>>((acc, task) => {
      const groupName = task.parentTaskName || "مهام المرحلة";
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(task);
      return acc;
    }, {});
  }, [phase.tasks]);

  return (
    <View style={styles.phaseCard}>
      <Pressable style={styles.phaseHeader} onPress={() => setExpanded((value) => !value)}>
        <View style={styles.phaseHeaderBadges}>
          <Ionicons
            name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
            size={18}
            color={appTheme.colors.textSecondary}
          />
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseBadgeText}>{phase.statusLabel || phase.status}</Text>
          </View>
          <View style={styles.phaseStepBadge}>
            <Text style={styles.phaseStepText}>#{phaseIndex + 1}</Text>
          </View>
        </View>

        <View style={styles.phaseHeaderText}>
          <Text style={styles.phaseTitle}>{phase.phaseLabel}</Text>
          <Text style={styles.phaseMeta}>
            {phase.taskCount} مهمة - {phase.completedTaskCount} مكتملة - {phase.inProgressTaskCount} جارية
          </Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.phaseBody}>
          <View style={styles.phaseMetrics}>
            <MetricCard
              styles={styles}
              label="سعر المرحلة"
              value={formatCurrency(phase.plannedCost || 0, phase.currency || "SAR")}
            />
            <MetricCard
              styles={styles}
              label="التكلفة الحالية"
              value={formatCurrency(phase.actualCost || 0, phase.currency || "SAR")}
            />
          </View>

          <Text style={styles.phaseTeams}>
            الفريق: {phase.teamNames.join(" - ") || "لم يتم تعيين فريق بعد"}
          </Text>

          {Object.entries(taskGroups).map(([groupTitle, tasks]) => (
            <View key={`${phase.phase}-${groupTitle}`} style={styles.groupCard}>
              <Text style={styles.groupTitle}>{groupTitle}</Text>
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} styles={styles} />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.phaseCollapsedHint}>اضغط لعرض تفاصيل هذه المرحلة</Text>
      )}
    </View>
  );
}

function TaskCard({
  task,
  styles,
}: {
  task: ElevatorInstallationTask;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskBadge}>
          <Text style={styles.taskBadgeText}>{task.statusLabel || task.status}</Text>
        </View>
        <View style={styles.taskHeaderText}>
          <Text style={styles.taskTitle}>{task.name}</Text>
          <Text style={styles.taskMeta}>{task.teamName || "بدون فريق"}</Text>
        </View>
      </View>

      <Text style={styles.taskDescription}>
        {task.description || "لا يوجد وصف إضافي لهذه المهمة."}
      </Text>

      <View style={styles.taskFactsGrid}>
        <MetricCard
          styles={styles}
          label="سعر المهمة"
          value={formatCurrency(task.plannedCost || 0, task.currency || "SAR")}
        />
        <MetricCard
          styles={styles}
          label="منفذ حتى الآن"
          value={formatCurrency(task.actualCost || 0, task.currency || "SAR")}
        />
        <MetricCard
          styles={styles}
          label="بداية الخطة"
          value={formatDateOrDash(task.plannedStartDate)}
        />
        <MetricCard
          styles={styles}
          label="نهاية الخطة"
          value={formatDateOrDash(task.plannedEndDate)}
        />
        <MetricCard
          styles={styles}
          label="بداية التنفيذ"
          value={formatDateOrDash(task.actualStartDate)}
        />
        <MetricCard
          styles={styles}
          label="أمر العمل"
          value={task.workOrderNumber || "غير مربوط"}
        />
      </View>

      <Text style={styles.taskMembers}>
        أعضاء الفريق: {task.teamMembers.join(" - ") || "لا توجد أسماء مسجلة"}
      </Text>

      {task.blockingReason ? (
        <View style={styles.blockedNotice}>
          <Text style={styles.blockedTitle}>سبب التعطيل</Text>
          <Text style={styles.blockedBody}>{task.blockingReason}</Text>
        </View>
      ) : null}
    </View>
  );
}

function FactBadge({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.factBadge}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

function MetricCard({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function LineItem({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.lineItem}>
      <Text style={styles.lineValue}>{value}</Text>
      <Text style={styles.lineLabel}>{label}</Text>
    </View>
  );
}

function formatDateOrDash(value?: string | null) {
  return value ? formatDate(value) : "غير محدد";
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    motionHero: {
      minHeight: 250,
      borderRadius: 28,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}44`,
      backgroundColor: `${appTheme.colors.accent}10`,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: appTheme.spacing.lg,
      gap: appTheme.spacing.md,
    },
    motionHalo: {
      position: "absolute",
      width: 196,
      height: 196,
      borderRadius: 999,
      backgroundColor: `${appTheme.colors.accent}18`,
    },
    motionRing: {
      width: 148,
      height: 148,
      borderRadius: 999,
      borderWidth: 10,
      borderColor: `${appTheme.colors.accent}22`,
      alignItems: "center",
      justifyContent: "center",
    },
    motionRingGap: {
      position: "absolute",
      top: -10,
      width: 34,
      height: 34,
      borderRadius: 999,
      backgroundColor: appTheme.colors.accent,
    },
    motionCore: {
      position: "absolute",
      width: 90,
      height: 90,
      borderRadius: 999,
      backgroundColor: appTheme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: appTheme.colors.accent,
      shadowOpacity: 0.28,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    motionTextWrap: {
      alignItems: "center",
      gap: 4,
    },
    motionTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 22,
      fontWeight: "800",
      textAlign: "center",
      writingDirection: "rtl",
    },
    motionSubtitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
      writingDirection: "rtl",
    },
    motionMeta: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "center",
      writingDirection: "rtl",
    },
    heroCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: appTheme.colors.card,
      padding: appTheme.spacing.md,
      gap: appTheme.spacing.md,
    },
    heroHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    heroTextWrap: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    heroTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroSubtitle: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    heroFacts: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: appTheme.spacing.sm,
    },
    factBadge: {
      minWidth: "31%",
      flexGrow: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: `${appTheme.colors.surface}E0`,
      padding: appTheme.spacing.sm,
      alignItems: "flex-end",
      gap: 3,
    },
    factValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    factLabel: {
      color: appTheme.colors.textMuted,
      fontSize: 10,
      textAlign: "right",
      writingDirection: "rtl",
    },
    projectCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: appTheme.colors.card,
      padding: appTheme.spacing.md,
      gap: appTheme.spacing.md,
    },
    projectHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    projectHeaderText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: `${appTheme.colors.accent}18`,
    },
    statusBadgeText: {
      color: appTheme.colors.accent,
      fontSize: 11,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    projectTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    projectCode: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
    },
    projectDescription: {
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 22,
      textAlign: "right",
      writingDirection: "rtl",
    },
    progressCard: {
      borderRadius: 20,
      backgroundColor: `${appTheme.colors.surface}D0`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}99`,
      padding: appTheme.spacing.md,
      gap: appTheme.spacing.sm,
    },
    progressHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 22,
      fontWeight: "800",
    },
    progressLabel: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      writingDirection: "rtl",
    },
    progressTrack: {
      height: 12,
      borderRadius: 999,
      backgroundColor: `${appTheme.colors.border}AA`,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: appTheme.colors.accent,
    },
    currentPhaseText: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    metricsGrid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: appTheme.spacing.sm,
    },
    metricCard: {
      minWidth: "47%",
      flexGrow: 1,
      borderRadius: 16,
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
    datePanel: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}99`,
      backgroundColor: `${appTheme.colors.surface}C8`,
      padding: appTheme.spacing.sm,
      gap: appTheme.spacing.xs,
    },
    lineItem: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    lineValue: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    lineLabel: {
      color: appTheme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      textAlign: "right",
      writingDirection: "rtl",
    },
    sectionBlock: {
      gap: appTheme.spacing.sm,
    },
    sectionMiniTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    teamCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: `${appTheme.colors.surface}D5`,
      padding: appTheme.spacing.sm,
      gap: 5,
      alignItems: "flex-end",
    },
    teamName: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    teamMeta: {
      color: appTheme.colors.textSecondary,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
    teamMembers: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    phaseCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: `${appTheme.colors.card}F0`,
      padding: appTheme.spacing.sm,
      gap: appTheme.spacing.sm,
    },
    phaseHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    phaseHeaderBadges: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
    },
    phaseBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: `${appTheme.colors.info}18`,
    },
    phaseBadgeText: {
      color: appTheme.colors.info,
      fontSize: 10,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    phaseStepBadge: {
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${appTheme.colors.accent}18`,
    },
    phaseStepText: {
      color: appTheme.colors.accent,
      fontSize: 11,
      fontWeight: "800",
    },
    phaseHeaderText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    phaseTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    phaseMeta: {
      color: appTheme.colors.textSecondary,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
    phaseBody: {
      gap: appTheme.spacing.sm,
    },
    phaseMetrics: {
      flexDirection: "row-reverse",
      gap: appTheme.spacing.sm,
    },
    phaseTeams: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    phaseCollapsedHint: {
      color: appTheme.colors.textSecondary,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
    groupCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}88`,
      backgroundColor: `${appTheme.colors.surface}CA`,
      padding: appTheme.spacing.sm,
      gap: appTheme.spacing.sm,
    },
    groupTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    taskCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}77`,
      backgroundColor: appTheme.colors.card,
      padding: appTheme.spacing.sm,
      gap: appTheme.spacing.sm,
    },
    taskHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    taskBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: `${appTheme.colors.accent}16`,
    },
    taskBadgeText: {
      color: appTheme.colors.accent,
      fontSize: 10,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    taskHeaderText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 3,
    },
    taskTitle: {
      color: appTheme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    taskMeta: {
      color: appTheme.colors.textSecondary,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
    taskDescription: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 20,
      textAlign: "right",
      writingDirection: "rtl",
    },
    taskFactsGrid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: appTheme.spacing.sm,
    },
    taskMembers: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    blockedNotice: {
      borderRadius: 14,
      backgroundColor: `${appTheme.colors.danger}14`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.danger}33`,
      padding: appTheme.spacing.sm,
      gap: 4,
    },
    blockedTitle: {
      color: appTheme.colors.danger,
      fontSize: 11,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    blockedBody: {
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
  });
}
