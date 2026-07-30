import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { loginCustomer, loginDemoAdmin, registerCustomer } from "../api/customerApi";
import { AuthUser, CustomerRegisterPayload, LoginPayload } from "../types/models";

type AuthStatus = "idle" | "loading" | "authenticated" | "error";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  loginAsAdmin: () => Promise<boolean>;
  register: (payload: CustomerRegisterPayload) => Promise<boolean>;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      status: "idle",
      error: null,
      login: async (payload) => {
        set({ status: "loading", error: null });
        try {
          const response = await loginCustomer(payload);
          set({
            token: response.accessToken,
            refreshToken: response.refreshToken ?? null,
            user: response.user,
            status: "authenticated",
            error: null,
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : "فشل تسجيل الدخول";
          set({
            status: "error",
            error: message,
          });
          return false;
        }
      },
      loginAsAdmin: async () => {
        set({ status: "loading", error: null });
        try {
          const response = await loginDemoAdmin();
          set({
            token: response.accessToken,
            refreshToken: response.refreshToken ?? null,
            user: response.user,
            status: "authenticated",
            error: null,
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : "فشل دخول المدير";
          set({
            status: "error",
            error: message,
          });
          return false;
        }
      },
      register: async (payload) => {
        set({ status: "loading", error: null });
        try {
          await registerCustomer(payload);
          const response = await loginCustomer({
            phone: payload.email.trim().toLowerCase(),
            password: payload.password,
          });
          set({
            token: response.accessToken,
            refreshToken: response.refreshToken ?? null,
            user: response.user,
            status: "authenticated",
            error: null,
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : "فشل تسجيل العميل";
          set({
            status: "error",
            error: message,
          });
          return false;
        }
      },
      setUser: (user) => {
        set({ user });
      },
      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          status: "idle",
          error: null,
        });
      },
    }),
    {
      name: "elms-customer-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        status: state.status === "authenticated" ? "authenticated" : "idle",
      }),
    },
  ),
);
