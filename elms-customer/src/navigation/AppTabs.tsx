import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContractsScreen } from "../screens/contracts/ContractsScreen";
import { ElevatorsScreen } from "../screens/elevators/ElevatorsScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { StoreScreen } from "../screens/store/StoreScreen";
import { VisitsScreen } from "../screens/visits/VisitsScreen";
import { useAppTheme } from "../theme/useAppTheme";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function AppTabs() {
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const floatingBottom = isIOS ? Math.max(insets.bottom, 1) : Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: isIOS ? 'auto' : 64 + Math.max(insets.bottom, 8),
          paddingTop: isIOS ? 6 : 10,
          paddingBottom: isIOS ? 6 : 10,
          borderRadius: 20,
          position: "absolute",
          left: isIOS ? 0 : 18,
          right: isIOS ? 0 : 18,
          bottom: isIOS ? 0 : 12,
        },
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              styles.tabBarBackground,
              {
                backgroundColor: appTheme.colors.surface,
                borderColor: appTheme.colors.border,
              },
            ]}
          />
        ),
        tabBarActiveTintColor: appTheme.colors.accent,
        tabBarInactiveTintColor: appTheme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: isIOS ? 2 : 5,
        },
        tabBarButton: (props) => {
          const { style, ...rest } = props;
          return (
            <Pressable
              {...(rest as React.ComponentProps<typeof Pressable>)}
              style={({ pressed }) => [
                style,
                isIOS && styles.iosTabButton,
                isIOS && pressed && {
                  backgroundColor: `${appTheme.colors.accent}12`,
                },
              ]}
            />
          );
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={tabIconName(route.name)} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "الرئيسية" }} />
      <Tab.Screen name="Store" component={StoreScreen} options={{ title: "المتجر" }} />
      <Tab.Screen name="Elevators" component={ElevatorsScreen} options={{ title: "المصاعد" }} />
      <Tab.Screen name="Visits" component={VisitsScreen} options={{ title: "الزيارات" }} />
      <Tab.Screen name="Contracts" component={ContractsScreen} options={{ title: "العقود" }} />
    </Tab.Navigator>
  );
}

function tabIconName(routeName: keyof MainTabParamList): React.ComponentProps<typeof Ionicons>["name"] {
  switch (routeName) {
    case "Home":
      return "home-outline";
    case "Store":
      return "storefront-outline";
    case "Elevators":
      return "business-outline";
    case "Visits":
      return "calendar-outline";
    case "Contracts":
      return "document-text-outline";
    default:
      return "ellipse-outline";
  }
}

const styles = StyleSheet.create({
  tabBarBackground: {
    borderRadius: 20,
    borderWidth: 1,
  },
  iosTabButton: {
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 2,
  },
});
