import { apiClient, resolveApiAssetUrl } from "./client";
import {
  mockContracts,
  mockDashboard,
  mockElevators,
  mockInvoices,
  mockLoginResponse,
  mockNotifications,
  mockTracking,
  mockVisits,
} from "./mockData";
import {
  getMockStoreCheckout,
  getMockStoreProductById,
  mockStoreHomeData,
  mockStoreOrder,
} from "./storeMockData";
import {
  Contract,
  ContractRequestOptions,
  CreateContractRequestPayload,
  CustomerInfo,
  CustomerRegisterPayload,
  CustomerContractRequest,
  DashboardSummary,
  Elevator,
  AuthUser,
  CustomerProfile,
  EmergencyReportPayload,
  EmergencyReportResponse,
  Invoice,
  IssuePayload,
  LoginPayload,
  LoginResponse,
  NotificationItem,
  StoreCart,
  StoreCheckoutData,
  StoreHomeData,
  StoreOrder,
  StorePlaceOrderPayload,
  StoreProduct,
  StoreProductPage,
  TrackingPoint,
  StoreDeliveryLiveLocation,
  UpdateCustomerProfilePayload,
  Visit,
  VisitDetail,
} from "../types/models";

const useMocks = (process.env.EXPO_PUBLIC_USE_MOCKS ?? "true") !== "false";

function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), ms);
  });
}

interface BackendTokenResponse {
  access_token: string;
  refresh_token?: string;
}

interface BackendDemoRegisterResponse {
  email: string;
  phone: string;
  password: string;
  customerAccount?: {
    email: string;
    phone: string;
    password: string;
    label?: string;
    customer_id?: string;
  };
}

interface BackendAuthUser {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  roles: string[];
}

type CustomerProfileResponse = CustomerProfile;

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as {
      response?: { data?: { detail?: unknown } };
    }).response;
    const detail = response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function mapAuthUser(authUser: BackendAuthUser, profile?: CustomerProfileResponse): AuthUser {
  return {
    id: authUser.id,
    name: profile?.user?.name ?? authUser.full_name,
    email: authUser.email,
    phone: profile?.user?.phone ?? authUser.phone,
    roles: profile?.user?.roles ?? authUser.roles,
    companyName: profile?.companyName,
    customerId: profile?.customerId,
    customer: profile?.customer as CustomerInfo | undefined,
  };
}

function withResolvedProductImage(product: StoreProduct): StoreProduct {
  const imageUrl = resolveApiAssetUrl(product.imageUrl);
  const thumbnailUrl = resolveApiAssetUrl(product.thumbnailUrl);
  return {
    ...product,
    imageUrl,
    thumbnailUrl,
    image: product.image ?? (thumbnailUrl || imageUrl ? { uri: thumbnailUrl ?? imageUrl } : undefined),
  };
}

function withResolvedOrderImages(order: StoreOrder | null | undefined): StoreOrder | null | undefined {
  if (!order) return order;

  return {
    ...order,
    items: order.items.map((item) => {
      const imageUrl = resolveApiAssetUrl(item.imageUrl);
      const thumbnailUrl = resolveApiAssetUrl(item.thumbnailUrl);
      return {
        ...item,
        imageUrl,
        thumbnailUrl,
        image: item.image ?? (thumbnailUrl || imageUrl ? { uri: thumbnailUrl ?? imageUrl } : undefined),
      };
    }),
  };
}

function withResolvedCartImages(cart: StoreCart): StoreCart {
  return {
    ...cart,
    items: cart.items.map((item) => {
      const imageUrl = resolveApiAssetUrl(item.imageUrl);
      const thumbnailUrl = resolveApiAssetUrl(item.thumbnailUrl);
      return {
        ...item,
        imageUrl,
        thumbnailUrl,
        image: item.image ?? (thumbnailUrl || imageUrl ? { uri: thumbnailUrl ?? imageUrl } : undefined),
      };
    }),
  };
}

function withResolvedProductPageImages(page: StoreProductPage): StoreProductPage {
  return {
    ...page,
    items: page.items.map(withResolvedProductImage),
  };
}

function withResolvedHomeImages(home: StoreHomeData): StoreHomeData {
  return {
    ...home,
    featuredProducts: home.featuredProducts.map(withResolvedProductImage),
    quickReorderProducts: home.quickReorderProducts.map(withResolvedProductImage),
    activeOrder: withResolvedOrderImages(home.activeOrder) ?? null,
  };
}

function withResolvedCheckoutImages(checkout: StoreCheckoutData): StoreCheckoutData {
  return {
    ...checkout,
    product: withResolvedProductImage(checkout.product),
  };
}

export async function loginCustomer(payload: LoginPayload): Promise<LoginResponse> {
  if (useMocks) {
    if (!payload.phone || !payload.password) {
      throw new Error("الرجاء إدخال رقم الجوال وكلمة المرور");
    }
    return delay(mockLoginResponse);
  }

  try {
    const formData = new URLSearchParams();
    formData.append("username", payload.phone);
    formData.append("password", payload.password);
    formData.append("grant_type", "password");

    const tokenResponse = await apiClient.post<BackendTokenResponse>("/auth/login", formData.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const authHeaders = {
      Authorization: `Bearer ${tokenResponse.data.access_token}`,
    };

    const [meResponse, profileResponse] = await Promise.all([
      apiClient.get<BackendAuthUser>("/auth/me", { headers: authHeaders }),
      apiClient.get<CustomerProfileResponse>("/customer/profile", { headers: authHeaders }),
    ]);

    return {
      accessToken: tokenResponse.data.access_token,
      refreshToken: tokenResponse.data.refresh_token,
      user: mapAuthUser(meResponse.data, profileResponse.data),
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "تعذر تسجيل الدخول. تحقق من رقم الجوال وكلمة المرور."));
  }
}

export async function loginDemoAdmin(): Promise<LoginResponse> {
  if (useMocks) {
    return delay({
      ...mockLoginResponse,
      user: {
        ...mockLoginResponse.user,
        name: "System Administrator",
        email: "admin@example.com",
        phone: "0501234567",
        roles: ["admin", "customer"],
      },
    });
  }

  const demoResponse = await apiClient.post<BackendDemoRegisterResponse>("/auth/register-demo");
  const customerAccount = demoResponse.data.customerAccount;

  return loginCustomer({
    phone: customerAccount?.email ?? demoResponse.data.email,
    password: customerAccount?.password ?? demoResponse.data.password,
  });
}

export async function registerCustomer(payload: CustomerRegisterPayload): Promise<void> {
  await apiClient.post("/auth/register-customer", {
    full_name: payload.fullName,
    company_name: payload.companyName,
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    password: payload.password,
    city: payload.city?.trim() || undefined,
    region: payload.region?.trim() || undefined,
  });
}

export async function getDashboard(): Promise<DashboardSummary> {
  if (useMocks) {
    return delay(mockDashboard);
  }
  const response = await apiClient.get<DashboardSummary>("/customer/dashboard");
  return response.data;
}

export async function getCustomerProfile(): Promise<CustomerProfile> {
  if (useMocks) {
    return delay({
      customerId: "customer-01",
      companyName: mockLoginResponse.user.companyName ?? "شركة الأبراج المتقدمة",
      contactPersonName: mockLoginResponse.user.name,
      contactPhone: mockLoginResponse.user.phone,
      contactEmail: mockLoginResponse.user.email,
      user: {
        id: mockLoginResponse.user.id,
        name: mockLoginResponse.user.name,
        email: mockLoginResponse.user.email,
        phone: mockLoginResponse.user.phone,
        roles: mockLoginResponse.user.roles ?? ["customer"],
      },
    });
  }
  const response = await apiClient.get<CustomerProfile>("/customer/profile");
  return response.data;
}

export async function updateCustomerProfile(payload: UpdateCustomerProfilePayload): Promise<CustomerProfile> {
  const response = await apiClient.post<CustomerProfile>("/customer/profile/update", payload);
  return response.data;
}

export async function getElevators(): Promise<Elevator[]> {
  if (useMocks) {
    return delay(mockElevators);
  }
  const response = await apiClient.get<Elevator[]>("/customer/elevators");
  return response.data;
}

export async function getElevatorById(id: string): Promise<Elevator> {
  if (useMocks) {
    const elevator = mockElevators.find((item) => item.id === id) ?? mockElevators[0];
    return delay(elevator);
  }
  const response = await apiClient.get<Elevator>(`/customer/elevators/${id}`);
  return response.data;
}

export async function getVisits(): Promise<Visit[]> {
  if (useMocks) {
    return delay(mockVisits);
  }
  const response = await apiClient.get<Visit[]>("/customer/visits");
  return response.data;
}

export async function getVisitById(visitId: string): Promise<VisitDetail> {
  const response = await apiClient.get<VisitDetail>(`/customer/visits/${visitId}`);
  return {
    ...response.data,
    recommendedParts: (response.data.recommendedParts ?? []).map((item) => ({
      ...item,
      imageUrl: resolveApiAssetUrl(item.imageUrl),
      thumbnailUrl: resolveApiAssetUrl(item.thumbnailUrl),
    })),
  };
}

export async function addVisitRecommendedPartsToCart(visitId: string): Promise<StoreCart> {
  const response = await apiClient.post<{ cart: StoreCart }>(`/customer/visits/${visitId}/recommended-parts/add-to-cart`);
  return withResolvedCartImages(response.data.cart);
}

export async function setVisitRecommendedPartDecision(
  visitId: string,
  recommendationId: string,
  decision: "approved" | "ignored",
): Promise<{ visitId: string; recommendationId: string; status: string }> {
  const response = await apiClient.post<{ visitId: string; recommendationId: string; status: string }>(
    `/customer/visits/${visitId}/recommended-parts/${recommendationId}/decision`,
    { decision },
  );
  return response.data;
}

export async function setVisitRecommendedPartsBulkDecision(
  visitId: string,
  decision: "approved" | "ignored",
): Promise<{ visitId: string; status: string; updatedCount: number }> {
  const response = await apiClient.post<{ visitId: string; status: string; updatedCount: number }>(
    `/customer/visits/${visitId}/recommended-parts/decision`,
    { decision },
  );
  return response.data;
}

export async function getTracking(visitId: string): Promise<TrackingPoint> {
  if (useMocks) {
    return delay({ ...mockTracking, updatedAt: new Date().toISOString() });
  }
  const response = await apiClient.get<TrackingPoint>(`/customer/visits/${visitId}/tracking`);
  return response.data;
}

export async function getStoreOrderDeliveryLocation(orderId: string): Promise<StoreDeliveryLiveLocation> {
  const response = await apiClient.get<StoreDeliveryLiveLocation>(`/customer/store/orders/${orderId}/delivery-location`);
  return response.data;
}

export async function getContracts(): Promise<Contract[]> {
  if (useMocks) {
    return delay(mockContracts);
  }
  const response = await apiClient.get<Contract[]>("/customer/contracts");
  return response.data;
}

export async function getContractRequestOptions(): Promise<ContractRequestOptions> {
  const response = await apiClient.get<ContractRequestOptions>("/customer/contracts/request-options");
  return response.data;
}

export async function getContractRequests(): Promise<CustomerContractRequest[]> {
  const response = await apiClient.get<CustomerContractRequest[]>("/customer/contracts/requests");
  return response.data;
}

export async function createContractRequest(payload: CreateContractRequestPayload): Promise<{
  id: string;
  requestNumber: string;
  status: string;
  siteId?: string | null;
}> {
  const response = await apiClient.post<{
    id: string;
    requestNumber: string;
    status: string;
    siteId?: string | null;
  }>("/customer/contracts/requests", payload);
  return response.data;
}

export async function getContractPdf(contractId: string): Promise<string> {
  if (useMocks) {
    const contract = mockContracts.find((item) => item.id === contractId) ?? mockContracts[0];
    return delay(contract.pdfUrl);
  }
  const response = await apiClient.get<{ url: string }>(`/customer/contracts/${contractId}/pdf`);
  return response.data.url;
}

export async function submitIssue(payload: IssuePayload): Promise<{ success: boolean; id: string }> {
  if (useMocks) {
    return delay({ success: true, id: `IS-${Date.now()}` });
  }
  const response = await apiClient.post<{ success: boolean; id: string }>("/customer/issues", payload);
  return response.data;
}

export async function submitEmergencyReport(
  payload: EmergencyReportPayload,
): Promise<EmergencyReportResponse> {
  // Emergency reports always hit the live backend even when the rest of the
  // customer app is running on mock data.
  const response = await apiClient.post<EmergencyReportResponse>(
    "/work-orders/emergency",
    {
      elevator_id: payload.elevatorId,
      issue_type: payload.issueType,
      description: payload.description,
      reporter_name: payload.reporterName,
      reporter_phone: payload.reporterPhone,
      priority: payload.priority,
    },
  );
  return response.data;
}

export async function getInvoices(): Promise<Invoice[]> {
  if (useMocks) {
    return delay(mockInvoices);
  }
  const response = await apiClient.get<Invoice[]>("/customer/invoices");
  return response.data;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  if (useMocks) {
    return delay(mockNotifications);
  }
  const response = await apiClient.get<NotificationItem[]>("/customer/notifications");
  return response.data;
}

export async function getStoreHome(): Promise<StoreHomeData> {
  if (useMocks) {
    return delay(mockStoreHomeData, 220);
  }
  const response = await apiClient.get<StoreHomeData>("/customer/store");
  return withResolvedHomeImages(response.data);
}

export async function getStoreProducts(params?: {
  categoryId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<StoreProductPage> {
  if (useMocks) {
    const pageSize = params?.limit ?? 8;
    const offset = params?.offset ?? 0;
    const query = params?.search?.trim().toLowerCase();
    const filtered = mockStoreHomeData.featuredProducts.filter((product) => {
      const matchesCategory = !params?.categoryId || product.categoryId === params.categoryId;
      const matchesSearch =
        !query ||
        [product.name, product.subtitle, product.brand, product.sku, ...product.compatibleWith]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
    return delay({
      items: filtered.slice(offset, offset + pageSize),
      total: filtered.length,
      limit: pageSize,
      offset,
      hasMore: offset + pageSize < filtered.length,
    });
  }

  const response = await apiClient.get<StoreProductPage>("/customer/store/products", {
    params: {
      category_id: params?.categoryId,
      search: params?.search,
      limit: params?.limit ?? 8,
      offset: params?.offset ?? 0,
    },
  });
  return withResolvedProductPageImages(response.data);
}

export async function getStoreProductById(productId: string): Promise<StoreProduct> {
  if (useMocks) {
    return delay(getMockStoreProductById(productId), 180);
  }
  const response = await apiClient.get<StoreProduct>(`/customer/store/products/${productId}`);
  return withResolvedProductImage(response.data);
}

export async function getStoreCheckout(productId: string): Promise<StoreCheckoutData> {
  if (useMocks) {
    return delay(getMockStoreCheckout(productId), 180);
  }
  const response = await apiClient.get<StoreCheckoutData>(`/customer/store/products/${productId}/checkout`);
  return withResolvedCheckoutImages(response.data);
}

export async function getStoreOrderById(orderId: string): Promise<StoreOrder> {
  if (useMocks) {
    return delay(mockStoreOrder, 220);
  }
  const response = await apiClient.get<StoreOrder>(`/customer/store/orders/${orderId}`);
  return withResolvedOrderImages(response.data) ?? response.data;
}

export async function getStoreOrders(): Promise<StoreOrder[]> {
  if (useMocks) {
    return delay([mockStoreOrder], 180);
  }
  const response = await apiClient.get<StoreOrder[]>("/customer/store/orders");
  return response.data.map((order) => withResolvedOrderImages(order) ?? order);
}

export async function getStoreCart(): Promise<StoreCart> {
  if (useMocks) {
    return delay({
      id: "mock-cart",
      status: "active",
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
    });
  }
  const response = await apiClient.get<StoreCart>("/customer/store/cart");
  return withResolvedCartImages(response.data);
}

export async function addStoreCartItem(productId: string, quantity = 1): Promise<StoreCart> {
  if (useMocks) {
    return getStoreCart();
  }
  const response = await apiClient.post<StoreCart>("/customer/store/cart/items", { productId, quantity });
  return withResolvedCartImages(response.data);
}

export async function updateStoreCartItem(itemId: string, quantity: number): Promise<StoreCart> {
  const response = await apiClient.put<StoreCart>(`/customer/store/cart/items/${itemId}`, { quantity });
  return withResolvedCartImages(response.data);
}

export async function removeStoreCartItem(itemId: string): Promise<StoreCart> {
  const response = await apiClient.delete<StoreCart>(`/customer/store/cart/items/${itemId}`);
  return withResolvedCartImages(response.data);
}

export async function clearStoreCart(): Promise<StoreCart> {
  const response = await apiClient.post<StoreCart>("/customer/store/cart/clear");
  return withResolvedCartImages(response.data);
}

export async function cancelStoreOrder(orderId: string): Promise<StoreOrder> {
  const response = await apiClient.post<StoreOrder>(`/customer/store/orders/${orderId}/cancel`);
  return withResolvedOrderImages(response.data) ?? response.data;
}

export async function placeStoreOrder(payload: StorePlaceOrderPayload): Promise<StoreOrder> {
  if (useMocks) {
    return delay(
      {
        ...mockStoreOrder,
        id: `order-${Date.now()}`,
        number: `ELMS-SP-${Date.now().toString().slice(-6)}`,
        paymentStatus: payload.paymentMethod === "invoice" ? "pending" : "paid",
      },
      220,
    );
  }
  const response = await apiClient.post<StoreOrder>("/customer/store/checkout/place-order", payload);
  return withResolvedOrderImages(response.data) ?? response.data;
}
