import { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Store: undefined;
  Elevators: undefined;
  Visits: undefined;
  Contracts: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ElevatorDetail: { elevatorId: string };
  InstallationMonitoring: { elevatorId: string; projectId?: string };
  VisitDetail: { visitId: string };
  Tracking: { visitId: string };
  Notifications: undefined;
  Profile: undefined;
  CompanyProfile: undefined;
  StoreProductDetail: { productId: string };
  StoreCheckout: { productId: string };
  StoreCart: undefined;
  StoreOrders: undefined;
  StoreOrderTracking: { orderId: string };
  StoreInvoiceViewer: { title: string; url: string; downloadUrl?: string };
  ContractRequest: undefined;
};
