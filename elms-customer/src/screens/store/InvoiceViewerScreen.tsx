import React, { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { WebView } from "react-native-webview";

import { Screen } from "../../components/common/Screen";
import { Skeleton, SkeletonText } from "../../components/common/Skeleton";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../theme/useAppTheme";

export function InvoiceViewerScreen() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const route = useRoute<RouteProp<AppStackParamList, "StoreInvoiceViewer">>();
  const [loading, setLoading] = useState(true);

  return (
    <Screen>
      <View style={styles.actionsRow}>
        <Pressable style={styles.downloadButton} onPress={() => route.params.downloadUrl ? Linking.openURL(route.params.downloadUrl) : undefined}>
          <Text style={styles.downloadButtonText}>تنزيل PDF</Text>
        </Pressable>
      </View>
      <View style={styles.viewerWrap}>
        {loading ? (
          <View style={styles.loadingOverlay}>
            <View style={styles.invoiceSkeletonHeader}>
              <View style={styles.invoiceSkeletonHeaderText}>
                <Skeleton height={18} width="55%" radius={6} />
                <Skeleton height={12} width="35%" radius={6} />
              </View>
              <Skeleton width={56} height={56} radius={appTheme.radius.md} />
            </View>
            <SkeletonText lines={3} lineHeight={12} lastLineWidth="45%" />
            <Skeleton height={1} radius={0} />
            <SkeletonText lines={5} lineHeight={12} lastLineWidth="60%" />
            <View style={styles.invoiceSkeletonTotalRow}>
              <Skeleton width="30%" height={16} radius={6} />
              <Skeleton width="22%" height={16} radius={6} />
            </View>
          </View>
        ) : null}
        <WebView
          source={{ uri: route.params.url }}
          onLoadEnd={() => setLoading(false)}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => <View />}
        />
      </View>
    </Screen>
  );
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    actionsRow: {
      flexDirection: "row-reverse",
      marginBottom: 12,
    },
    downloadButton: {
      borderRadius: appTheme.radius.md,
      backgroundColor: `${appTheme.colors.accent}14`,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}33`,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    downloadButtonText: {
      color: appTheme.colors.accent,
      fontSize: 13,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    viewerWrap: {
      flex: 1,
      overflow: "hidden",
      borderRadius: appTheme.radius.xl,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.card,
      minHeight: 520,
    },
    webview: {
      flex: 1,
      backgroundColor: "#ffffff",
    },
    loadingOverlay: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 2,
      padding: 20,
      gap: 14,
      backgroundColor: appTheme.colors.card,
    },
    invoiceSkeletonHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
    },
    invoiceSkeletonHeaderText: {
      flex: 1,
      alignItems: "flex-end",
      gap: 8,
    },
    invoiceSkeletonTotalRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
  });
}
