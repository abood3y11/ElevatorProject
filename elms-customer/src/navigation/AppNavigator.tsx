import { Ionicons } from "@expo/vector-icons";
import { getFocusedRouteNameFromRoute, ParamListBase, RouteProp } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ContractRequestScreen } from "../screens/contracts/ContractRequestScreen";
import { ElevatorDetailScreen } from "../screens/elevators/ElevatorDetailScreen";
import { InstallationMonitoringScreen } from "../screens/elevators/InstallationMonitoringScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { CompanyProfileScreen } from "../screens/profile/CompanyProfileScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { CartScreen } from "../screens/store/CartScreen";
import { CheckoutScreen } from "../screens/store/CheckoutScreen";
import { InvoiceViewerScreen } from "../screens/store/InvoiceViewerScreen";
import { OrderHistoryScreen } from "../screens/store/OrderHistoryScreen";
import { OrderTrackingScreen } from "../screens/store/OrderTrackingScreen";
import { ProductDetailScreen } from "../screens/store/ProductDetailScreen";
import { TrackingScreen } from "../screens/visits/TrackingScreen";
import { VisitDetailScreen } from "../screens/visits/VisitDetailScreen";
import { useAppTheme } from "../theme/useAppTheme";
import { AppTabs } from "./AppTabs";
import { AppStackParamList, MainTabParamList } from "./types";

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: appTheme.colors.surface },
        headerTintColor: appTheme.colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: appTheme.colors.bg },
        headerTitleStyle: {
          fontWeight: "700",
        },
        headerBackTitleVisible: false,
        headerLeft: () =>
          navigation.canGoBack() ? (
            <Pressable onPress={navigation.goBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color={appTheme.colors.textPrimary} />
              <Text style={styles.backText}></Text>
            </Pressable>
          ) : null,
        headerRight: () => (
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => {
                const state = navigation.getState();
                const activeRoute = state.routes[state.index]?.name;
                if (activeRoute !== "Notifications") {
                  navigation.navigate("Notifications");
                }
              }}
              style={styles.notifyButton}
            >
              <Ionicons name="notifications-outline" size={20} color={appTheme.colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => {
                const state = navigation.getState();
                const activeRoute = state.routes[state.index]?.name;
                if (activeRoute !== "Profile") {
                  navigation.navigate("Profile");
                }
              }}
              style={styles.profileButton}
            >
              <Ionicons name="person-outline" size={20} color={appTheme.colors.textPrimary} />
            </Pressable>
          </View>
        ),
      })}
    >
      <Stack.Screen
        name="MainTabs"
        component={AppTabs}
        options={({ route }) => ({
          title: tabTitleFromRoute(route),
        })}
      />
      <Stack.Screen
        name="ElevatorDetail"
        component={ElevatorDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InstallationMonitoring"
        component={InstallationMonitoringScreen}
        options={{
          title: "متابعة التركيب",
          contentStyle: { backgroundColor: "#eef4f1" },
        }}
      />
      <Stack.Screen
        name="VisitDetail"
        component={VisitDetailScreen}
        options={{ title: "تفاصيل الزيارة" }}
      />
      <Stack.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{ title: "تتبع الفني" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "الإشعارات" }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "الحساب الشخصي" }}
      />
      <Stack.Screen
        name="CompanyProfile"
        component={CompanyProfileScreen}
        options={{ title: "بيانات الشركة" }}
      />
      <Stack.Screen
        name="StoreProductDetail"
        component={ProductDetailScreen}
        options={{ title: "تفاصيل القطعة" }}
      />
      <Stack.Screen
        name="StoreCheckout"
        component={CheckoutScreen}
        options={{ title: "الدفع وإتمام الطلب" }}
      />
      <Stack.Screen
        name="StoreCart"
        component={CartScreen}
        options={{ title: "سلة قطع الغيار" }}
      />
      <Stack.Screen
        name="StoreOrders"
        component={OrderHistoryScreen}
        options={{ title: "طلبات المتجر" }}
      />
      <Stack.Screen
        name="StoreOrderTracking"
        component={OrderTrackingScreen}
        options={{ title: "تتبع الشراء" }}
      />
      <Stack.Screen
        name="StoreInvoiceViewer"
        component={InvoiceViewerScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <Stack.Screen
        name="ContractRequest"
        component={ContractRequestScreen}
        options={{ title: "طلب العقود" }}
      />
    </Stack.Navigator>
  );
}

function tabTitleFromRoute(route: RouteProp<ParamListBase, string>) {
  const focused = (getFocusedRouteNameFromRoute(route) as keyof MainTabParamList | undefined) ?? "Home";

  const labels: Record<keyof MainTabParamList, string> = {
    Home: "الرئيسية",
    Store: "المتجر",
    Elevators: "المصاعد",
    Visits: "الزيارات",
    Contracts: "العقود",
  };

  return labels[focused];
}

function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    notifyButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: `${appTheme.colors.accent}66`,
      backgroundColor: `${appTheme.colors.accent}1A`,
      alignItems: "center",
      justifyContent: "center",
    },
    profileButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: `${appTheme.colors.border}AA`,
      backgroundColor: appTheme.colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    backText: {
      color: appTheme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
