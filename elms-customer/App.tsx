import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { LinkingOptions, NavigationContainer, Theme as NavigationTheme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { I18nManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { AppStackParamList } from "./src/navigation/types";
import { applyTypographyDefaults } from "./src/theme/applyTypography";
import { useAppTheme } from "./src/theme/useAppTheme";

I18nManager.allowRTL(true);
applyTypographyDefaults();

export default function App() {
  const appTheme = useAppTheme();

  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  const queryClient = useMemo(() => new QueryClient(), []);

  const navigationTheme = useMemo<NavigationTheme>(
    () => ({
      dark: appTheme.isDark,
      colors: {
        primary: appTheme.colors.accent,
        background: appTheme.colors.bg,
        card: appTheme.colors.surface,
        text: appTheme.colors.textPrimary,
        border: appTheme.colors.border,
        notification: appTheme.colors.warn,
      },
      fonts: {
        regular: {
          fontFamily: appTheme.typography.regular,
          fontWeight: "400",
        },
        medium: {
          fontFamily: appTheme.typography.medium,
          fontWeight: "500",
        },
        bold: {
          fontFamily: appTheme.typography.bold,
          fontWeight: "700",
        },
        heavy: {
          fontFamily: appTheme.typography.bold,
          fontWeight: "800",
        },
      },
    }),
    [appTheme],
  );

  const linking = useMemo<LinkingOptions<AppStackParamList>>(
    () => ({
      prefixes: ["elmscustomer://"],
      config: {
        screens: {
          MainTabs: {
            screens: {
              Home: "home",
              Store: "store",
              Elevators: "elevators",
              Visits: "visits",
              Contracts: "contracts",
            },
          },
          VisitDetail: "visit/:visitId",
          StoreProductDetail: "store/product/:productId",
          StoreCart: "store/cart",
          StoreOrders: "store/orders",
          StoreOrderTracking: "store/orders/:orderId",
          ContractRequest: "contracts/request",
        },
      },
    }),
    [],
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: appTheme.colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer theme={navigationTheme} linking={linking}>
            <StatusBar style={appTheme.isDark ? "light" : "dark"} />
            <RootNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
