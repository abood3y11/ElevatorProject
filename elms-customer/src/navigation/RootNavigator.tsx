import React from "react";
import { AppNavigator } from "./AppNavigator";
import { AuthNavigator } from "./AuthNavigator";
import { useAuthStore } from "../store/authStore";

export function RootNavigator() {
  const token = useAuthStore((state) => state.token);
  return token ? <AppNavigator /> : <AuthNavigator />;
}
