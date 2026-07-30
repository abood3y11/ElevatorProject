import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useAuthStore } from "../store/authStore";

const configuredBaseURL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const API_PORT = "8000";

function getExpoHost(): string | undefined {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    Constants.manifest?.debuggerHost;

  if (typeof hostUri !== "string") return undefined;
  return hostUri.split(":")[0];
}

function resolveBaseURL(url: string): string {
  if (Platform.OS === "web") return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      return url;
    }

    const expoHost = getExpoHost();
    if (!expoHost) {
      if (Platform.OS === "android") {
        parsed.hostname = "10.0.2.2";
        parsed.port = API_PORT;
        return parsed.toString().replace(/\/$/, "");
      }
      return url;
    }

    parsed.hostname = expoHost;
    parsed.port = API_PORT;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export const baseURL = resolveBaseURL(configuredBaseURL);

function buildStoreAssetProxyUrl(path: string): string {
  const apiRoot = baseURL.replace(/\/api\/v\d+\/?$/i, "").replace(/\/$/, "");
  return `${apiRoot}/api/v1/assets/store-image?src=${encodeURIComponent(path)}`;
}

export function resolveApiAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) {
    if (/amazonaws\.com/i.test(path)) {
      return buildStoreAssetProxyUrl(path);
    }
    return path;
  }

  if (path.startsWith("/uploads/spare-parts/")) {
    return buildStoreAssetProxyUrl(path);
  }

  const apiRoot = baseURL.replace(/\/api\/v\d+\/?$/i, "").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiRoot}${normalizedPath}`;
}

export function resolveApiPathUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiRoot = baseURL.replace(/\/api\/v\d+\/?$/i, "").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiRoot}${normalizedPath}`;
}

export function resolveProtectedDocumentUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const token = useAuthStore.getState().token;
  const publicPath = path.replace(/\/invoice$/, "/invoice-public");
  const basePath = resolveApiPathUrl(publicPath);
  if (!basePath || !token) {
    return basePath;
  }
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}access_token=${encodeURIComponent(token)}`;
}

export function resolveProtectedPdfUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const token = useAuthStore.getState().token;
  const publicPath = path.replace(/\/invoice$/, "/invoice-pdf-public");
  const basePath = resolveApiPathUrl(publicPath);
  if (!basePath || !token) {
    return basePath;
  }
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}access_token=${encodeURIComponent(token)}`;
}

export function resolveProtectedPathUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const token = useAuthStore.getState().token;
  const basePath = resolveApiPathUrl(path);
  if (!basePath || !token) {
    return basePath;
  }
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}access_token=${encodeURIComponent(token)}`;
}

export function buildCustomerOrdersWebSocketUrl(orderId?: string): string | undefined {
  const token = useAuthStore.getState().token;
  if (!token) return undefined;

  const apiRoot = baseURL.replace(/\/api\/v\d+\/?$/i, "").replace(/\/$/, "");
  const wsRoot = apiRoot.replace(/^http/i, "ws");
  const suffix = orderId ? `/ws/customer/orders/${orderId}` : "/ws/customer/orders";
  return `${wsRoot}${suffix}?access_token=${encodeURIComponent(token)}`;
}

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

let refreshRequest: Promise<string | null> | null = null;

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const requestUrl = String(originalRequest.url ?? "");
    const isRefreshRequest = requestUrl.includes("/auth/refresh");
    const isLoginRequest = requestUrl.includes("/auth/login");

    if (status !== 401 || originalRequest._retry || isRefreshRequest || isLoginRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const authState = useAuthStore.getState();
    if (!authState.refreshToken) {
      authState.logout();
      return Promise.reject(error);
    }

    if (!refreshRequest) {
      refreshRequest = axios
        .post(
          `${baseURL}/auth/refresh`,
          { refresh_token: authState.refreshToken },
          { timeout: 15000 },
        )
        .then((response) => {
          const nextAccessToken = response.data?.access_token as string | undefined;
          const nextRefreshToken = (response.data?.refresh_token as string | undefined) ?? authState.refreshToken;

          if (!nextAccessToken) {
            throw new Error("Missing refreshed access token");
          }

          useAuthStore.setState({
            token: nextAccessToken,
            refreshToken: nextRefreshToken,
            status: "authenticated",
            error: null,
          });

          return nextAccessToken;
        })
        .catch((refreshError) => {
          useAuthStore.getState().logout();
          throw refreshError;
        })
        .finally(() => {
          refreshRequest = null;
        });
    }

    const nextToken = await refreshRequest;
    if (!nextToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${nextToken}`;
    return apiClient(originalRequest);
  },
);
