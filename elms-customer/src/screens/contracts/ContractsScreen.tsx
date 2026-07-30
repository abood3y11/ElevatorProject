import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import {
  getContractPdf,
  getContractRequests,
  getContracts,
  getInvoices,
} from "../../api/customerApi";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Screen } from "../../components/common/Screen";
import { SectionTitle } from "../../components/common/SectionTitle";
import { StatusPill } from "../../components/common/StatusPill";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../theme/useAppTheme";
import { Contract, Invoice } from "../../types/models";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/format";
import { arabicFontStyles } from "../../utils/typography";

type ContractView = "contracts" | "invoices";
type FilterValue = "all" | string;
const MONTH_OPTIONS = [
  { value: "01", label: "يناير" },
  { value: "02", label: "فبراير" },
  { value: "03", label: "مارس" },
  { value: "04", label: "أبريل" },
  { value: "05", label: "مايو" },
  { value: "06", label: "يونيو" },
  { value: "07", label: "يوليو" },
  { value: "08", label: "أغسطس" },
  { value: "09", label: "سبتمبر" },
  { value: "10", label: "أكتوبر" },
  { value: "11", label: "نوفمبر" },
  { value: "12", label: "ديسمبر" },
];

function getDateParts(value?: string): { year: string; month: string } {
  if (!value) {
    return { year: "", month: "" };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { year: "", month: "" };
  }

  return {
    year: String(parsed.getFullYear()),
    month: String(parsed.getMonth() + 1).padStart(2, "0"),
  };
}

function filterByDate<T extends Contract | Invoice>(
  items: T[],
  getDateValue: (item: T) => string | undefined,
  year: FilterValue,
  month: FilterValue,
): T[] {
  return items.filter((item) => {
    const parts = getDateParts(getDateValue(item));
    const yearMatch = year === "all" || parts.year === year;
    const monthMatch = month === "all" || parts.month === month;
    return yearMatch && monthMatch;
  });
}

function buildYearOptions(contracts: Contract[], invoices: Invoice[]): string[] {
  const years = new Set<string>();
  [...contracts, ...invoices].forEach((item) => {
    const dateValue = "startDate" in item ? item.startDate : item.dueDate;
    const year = getDateParts(dateValue).year;
    if (year) {
      years.add(year);
    }
  });
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

export function ContractsScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [activeView, setActiveView] = useState<ContractView>("contracts");
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [selectedYear, setSelectedYear] = useState<FilterValue>("all");
  const [selectedMonth, setSelectedMonth] = useState<FilterValue>("all");

  const contractsQuery = useQuery({ queryKey: ["contracts"], queryFn: getContracts });
  const contractRequestsQuery = useQuery({
    queryKey: ["contract-requests"],
    queryFn: getContractRequests,
  });
  const invoicesQuery = useQuery({ queryKey: ["invoices"], queryFn: getInvoices });

  const contracts = contractsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const contractRequests = contractRequestsQuery.data ?? [];

  const yearOptions = useMemo(() => buildYearOptions(contracts, invoices), [contracts, invoices]);

  const filteredContracts = useMemo(
    () => filterByDate(contracts, (item) => item.startDate, selectedYear, selectedMonth),
    [contracts, selectedYear, selectedMonth],
  );
  const filteredInvoices = useMemo(
    () => filterByDate(invoices, (item) => item.dueDate, selectedYear, selectedMonth),
    [invoices, selectedYear, selectedMonth],
  );

  const openContractPdf = async (id: string) => {
    try {
      const url = await getContractPdf(id);
      await Linking.openURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "لا يوجد ملف PDF لهذا العقد حاليًا.";
      Alert.alert("ملف العقد", message);
    }
  };

  const currentFilterLabel = useMemo(() => {
    const monthLabel = MONTH_OPTIONS.find((item) => item.value === selectedMonth)?.label;
    if (selectedYear === "all" && selectedMonth === "all") {
      return "كل الفترات";
    }
    if (selectedYear !== "all" && selectedMonth === "all") {
      return `سنة ${selectedYear}`;
    }
    if (selectedYear === "all" && selectedMonth !== "all") {
      return monthLabel ?? selectedMonth;
    }
    return `${monthLabel ?? selectedMonth} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  const renderDateFilters = () => (
    <View style={styles.filterCard}>
      <Pressable style={styles.filterHeader} onPress={() => setShowDateFilters((value) => !value)}>
        <Text style={styles.filterHeaderIcon}>{showDateFilters ? "−" : "+"}</Text>
        <View style={styles.filterHeaderTextWrap}>
          <Text style={styles.filterHeaderTitle}>فلترة التاريخ</Text>
          <Text style={styles.filterHeaderSubtitle}>{currentFilterLabel}</Text>
        </View>
      </Pressable>

      {showDateFilters ? (
        <View style={styles.filterBody}>
          <View style={styles.filterSummaryRow}>
            <Text style={styles.filterSummaryText}>{currentFilterLabel}</Text>
            <Pressable
              style={styles.resetChip}
              onPress={() => {
                setSelectedYear("all");
                setSelectedMonth("all");
              }}
            >
              <Text style={styles.resetChipText}>إعادة ضبط</Text>
            </Pressable>
          </View>

          <View style={styles.chipRow}>
            <Pressable
              style={[styles.filterChip, selectedYear === "all" && styles.filterChipActive]}
              onPress={() => setSelectedYear("all")}
            >
              <Text style={[styles.filterChipText, selectedYear === "all" && styles.filterChipTextActive]}>
                كل السنوات
              </Text>
            </Pressable>
            {yearOptions.map((year) => (
              <Pressable
                key={year}
                style={[styles.filterChip, selectedYear === year && styles.filterChipActive]}
                onPress={() => setSelectedYear(year)}
              >
                <Text style={[styles.filterChipText, selectedYear === year && styles.filterChipTextActive]}>
                  {year}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.chipRow}>
            <Pressable
              style={[styles.filterChip, selectedMonth === "all" && styles.filterChipActive]}
              onPress={() => setSelectedMonth("all")}
            >
              <Text style={[styles.filterChipText, selectedMonth === "all" && styles.filterChipTextActive]}>
                كل الشهور
              </Text>
            </Pressable>
            {MONTH_OPTIONS.map((item) => {
              const month = item.value;
              return (
                <Pressable
                  key={month}
                  style={[styles.filterChip, selectedMonth === month && styles.filterChipActive]}
                  onPress={() => setSelectedMonth(month)}
                >
                  <Text style={[styles.filterChipText, selectedMonth === month && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <SectionTitle subtitle="عقودك وفواتيرك في مكان واحد.">العقود</SectionTitle>

      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("ContractRequest")}>
          <Text style={styles.primaryButtonText}>طلب عقد</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeView === "contracts" && styles.tabButtonActive]}
          onPress={() => setActiveView("contracts")}
        >
          <Text style={[styles.tabButtonText, activeView === "contracts" && styles.tabButtonTextActive]}>
            العقود
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeView === "invoices" && styles.tabButtonActive]}
          onPress={() => setActiveView("invoices")}
        >
          <Text style={[styles.tabButtonText, activeView === "invoices" && styles.tabButtonTextActive]}>
            الفواتير
          </Text>
        </Pressable>
      </View>

      {renderDateFilters()}

      {contractRequests.length > 0 ? (
        <View style={styles.requestCard}>
          <View style={styles.rowBetween}>
            <StatusPill status="pending" />
            <View style={styles.alignEnd}>
              <Text style={styles.requestTitle}>طلباتك قيد المتابعة</Text>
              <Text style={styles.requestSub}>{`${contractRequests.length} طلب`}</Text>
            </View>
          </View>

          {contractRequests.slice(0, 2).map((request) => (
            <View key={request.id} style={styles.requestItem}>
              <View style={styles.rowBetween}>
                <Text style={styles.requestMeta}>{formatDateTime(request.createdAt)}</Text>
                <Text style={styles.requestNumber}>{request.requestNumber}</Text>
              </View>
              <Text style={styles.requestMeta}>{request.siteName}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {activeView === "contracts" ? (
        <>
          {contractsQuery.isLoading ? <LoadingState /> : null}
          {!contractsQuery.isLoading && filteredContracts.length === 0 ? (
            <EmptyState title="لا توجد عقود" subtitle="لن تظهر العقود هنا إلا بعد اعتمادها." />
          ) : null}

          {filteredContracts.map((contract) => (
            <View key={contract.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <StatusPill status={contract.status} />
                <View style={styles.alignEnd}>
                  <Text style={styles.title}>{contract.contractNumber}</Text>
                  <Text style={styles.sub}>{`${contract.coveredElevators} مصعد`}</Text>
                </View>
              </View>

              <Text style={styles.sub}>
                {`من ${formatDate(contract.startDate)} إلى ${formatDate(contract.endDate)}`}
              </Text>
              <Text style={styles.value}>{formatCurrency(contract.annualPrice)}</Text>

              <Pressable style={styles.secondaryButton} onPress={() => openContractPdf(contract.id)}>
                <Text style={styles.secondaryButtonText}>تحميل PDF</Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : (
        <>
          {invoicesQuery.isLoading ? <LoadingState /> : null}
          {!invoicesQuery.isLoading && filteredInvoices.length === 0 ? (
            <EmptyState title="لا توجد فواتير" subtitle="لن تظهر الفواتير هنا إلا عند إصدارها." />
          ) : null}

          {filteredInvoices.map((invoice) => (
            <View key={invoice.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <StatusPill status={invoice.status} />
                <Text style={styles.title}>{invoice.number}</Text>
              </View>
              <Text style={styles.sub}>{`الاستحقاق: ${formatDate(invoice.dueDate)}`}</Text>
              <Text style={styles.value}>{formatCurrency(invoice.amount)}</Text>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    actionRow: {
      flexDirection: "row-reverse",
      gap: 10,
      alignItems: "center",
    },
    primaryButton: {
      flex: 1.2,
      minHeight: 48,
      borderRadius: appTheme.radius.md,
      backgroundColor: appTheme.colors.accent,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#0f6b5c",
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    primaryButtonText: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.white,
      fontSize: 14,
      textAlign: "center",
      writingDirection: "rtl",
    },
    tabButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    tabButtonActive: {
      borderColor: `${appTheme.colors.accent}55`,
      backgroundColor: `${appTheme.colors.accent}12`,
    },
    tabButtonText: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.textSecondary,
      fontSize: 13,
      textAlign: "center",
      writingDirection: "rtl",
    },
    tabButtonTextActive: {
      color: appTheme.colors.accent,
    },
    filterCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      overflow: "hidden",
    },
    filterHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: appTheme.spacing.md,
      paddingVertical: 14,
    },
    filterHeaderIcon: {
      ...arabicFontStyles.bold,
      width: 24,
      color: appTheme.colors.accent,
      fontSize: 18,
      textAlign: "center",
    },
    filterHeaderTextWrap: {
      flex: 1,
      alignItems: "flex-end",
      gap: 2,
    },
    filterHeaderTitle: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      textAlign: "right",
      writingDirection: "rtl",
    },
    filterHeaderSubtitle: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    filterBody: {
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 10,
    },
    filterSummaryRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    filterSummaryText: {
      ...arabicFontStyles.medium,
      flex: 1,
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    chipRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    filterChip: {
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    filterChipActive: {
      borderColor: `${appTheme.colors.accent}44`,
      backgroundColor: `${appTheme.colors.accent}14`,
    },
    filterChipText: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "center",
      writingDirection: "rtl",
    },
    filterChipTextActive: {
      color: appTheme.colors.accent,
    },
    resetChip: {
      minHeight: 32,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}44`,
      backgroundColor: `${appTheme.colors.accent}10`,
      justifyContent: "center",
      alignItems: "center",
    },
    resetChipText: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.accent,
      fontSize: 11,
      textAlign: "center",
      writingDirection: "rtl",
    },
    requestCard: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 10,
    },
    requestTitle: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 14,
      textAlign: "right",
      writingDirection: "rtl",
    },
    requestSub: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    requestItem: {
      borderTopWidth: 1,
      borderTopColor: appTheme.colors.border,
      paddingTop: 10,
      gap: 4,
    },
    requestNumber: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.textPrimary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    requestMeta: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 11,
      textAlign: "right",
      writingDirection: "rtl",
    },
    card: {
      backgroundColor: appTheme.colors.card,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      padding: appTheme.spacing.md,
      gap: 8,
      shadowColor: "#0f6b5c",
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    rowBetween: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    alignEnd: {
      flex: 1,
      alignItems: "flex-end",
      gap: 2,
    },
    title: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.textPrimary,
      fontSize: 15,
      textAlign: "right",
      writingDirection: "rtl",
    },
    sub: {
      ...arabicFontStyles.regular,
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    value: {
      ...arabicFontStyles.bold,
      color: appTheme.colors.accent,
      fontSize: 16,
      textAlign: "right",
      writingDirection: "rtl",
    },
    secondaryButton: {
      alignSelf: "flex-start",
      minHeight: 36,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}44`,
      backgroundColor: `${appTheme.colors.accent}12`,
      justifyContent: "center",
      alignItems: "center",
    },
    secondaryButtonText: {
      ...arabicFontStyles.medium,
      color: appTheme.colors.accent,
      fontSize: 12,
      textAlign: "center",
      writingDirection: "rtl",
    },
  });
}
