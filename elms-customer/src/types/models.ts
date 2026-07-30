import type { ImageSourcePropType } from "react-native";

export type ElevatorStatus = "operational" | "warning" | "down" | "maintenance" | "under_installation";
export type VisitStatus = "scheduled" | "in_progress" | "completed";
export type ContractStatus = "active" | "expiring" | "expired";
export type ContractRequestStatus =
  | "pending_review"
  | "contacted"
  | "quoted"
  | "approved"
  | "rejected"
  | "cancelled";
export type InvoiceStatus = "paid" | "pending" | "overdue" | "cancelled";
export type SeverityLevel = "high" | "medium" | "low";
export type NotificationType = "warning" | "info" | "success" | "danger";
export type StoreOrderStatus = "processing" | "ready_to_ship" | "in_transit" | "delivered" | "cancelled";
export type StorePaymentMethodType = "mada" | "visa" | "apple_pay" | "invoice";
export type StoreBadgeTone = "accent" | "info" | "warn" | "danger";
export type StoreOrderStepState = "completed" | "current" | "upcoming" | "warning";
export type EmergencyIssueType =
  | "stuck_passengers"
  | "breakdown"
  | "noise"
  | "door_issue"
  | "other";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles?: string[];
  companyName?: string;
  customerId?: string;
  customer?: CustomerInfo;
}

export interface CustomerInfo {
  id: string;
  name: string;
  customerType?: string;
  commercialRegistrationNo?: string;
  nationalId?: string;
  taxNumber?: string;
  contactPersonName?: string;
  contactPhone?: string;
  contactEmail?: string;
  addressText?: string;
  city?: string;
  region?: string;
  notes?: string;
  status?: string;
  totalSites?: number;
  totalElevators?: number;
}

export interface DashboardSummary {
  totalSites?: number;
  totalElevators: number;
  operationalCount: number;
  warningCount: number;
  downCount: number;
  upcomingVisits: number;
  activeContracts: number;
  unpaidInvoices: number;
}

export interface ElevatorFloor {
  id: string;
  label: string;
  order: number;
  y?: number;
}

export interface ElevatorInstallationTask {
  id: string;
  name: string;
  description?: string;
  phase?: string;
  phaseLabel?: string;
  taskKind?: "task" | "section" | string;
  parentTaskId?: string | null;
  parentTaskName?: string | null;
  status: string;
  statusLabel?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  blockingReason?: string;
  teamName?: string;
  teamMembers: string[];
  plannedCost: number;
  actualCost: number;
  currency: string;
  workOrderNumber?: string;
  workOrderStatus?: string;
}

export interface ElevatorInstallationPhaseSummary {
  phase: string;
  phaseLabel: string;
  status: string;
  statusLabel?: string;
  taskCount: number;
  completedTaskCount: number;
  inProgressTaskCount: number;
  blockedTaskCount: number;
  teamNames: string[];
  teamMembers: string[];
  plannedCost: number;
  actualCost: number;
  currency: string;
  tasks: ElevatorInstallationTask[];
}

export interface ElevatorInstallationTeam {
  id: string;
  name: string;
  members: string[];
  activeTaskCount: number;
}

export interface ElevatorInstallationOverview {
  projectId: string;
  projectCode: string;
  projectName: string;
  status: string;
  statusLabel: string;
  progressPercentage: number;
  currentPhase?: string | null;
  currentPhaseLabel?: string | null;
  totalPlannedCost: number;
  currency: string;
}

export interface ElevatorInstallationProject {
  id: string;
  projectCode: string;
  projectName: string;
  description?: string;
  notes?: string;
  status: string;
  statusLabel: string;
  currentPhase?: string | null;
  currentPhaseLabel?: string | null;
  progressPercentage: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  contractNumber?: string;
  contractTotalValue: number;
  currency: string;
  totalPlannedCost: number;
  totalActualCost: number;
  customerName?: string;
  siteName?: string;
  siteAddress?: string;
  teams: ElevatorInstallationTeam[];
  phaseSummaries: ElevatorInstallationPhaseSummary[];
}

export interface Elevator {
  id: string;
  code: string;
  name: string;
  status: ElevatorStatus;
  floorCount?: number;
  floors?: ElevatorFloor[];
  initialFloorId?: string;
  serialNumber: string;
  brand: string;
  model: string;
  location: string;
  lastServiceDate: string;
  nextServiceDate: string;
  customerName?: string;
  siteName?: string;
  siteAddress?: string;
  activeInstallationCount?: number;
  hasActiveInstallation?: boolean;
  installationOverview?: ElevatorInstallationOverview | null;
  installationProjects?: ElevatorInstallationProject[];
}

export interface Visit {
  id: string;
  elevatorId: string;
  elevatorName: string;
  scheduledAt: string;
  status: VisitStatus;
  technicianName: string;
  technicianPhone: string;
  recommendationCount?: number;
  completionSummary?: string;
}

export interface VisitRecommendedPart {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantityRecommended: number;
  reason?: string;
  urgency: "low" | "medium" | "high";
  shouldReplaceNow: boolean;
  customerActionStatus: string;
  price: number;
  stockAvailable: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  quoteUrl?: string;
}

export interface VisitDetail extends Visit {
  completedAt?: string;
  siteName?: string;
  siteAddress?: string;
  description?: string;
  resolutionNotes?: string;
  recommendationsText?: string;
  recommendedParts: VisitRecommendedPart[];
}

export interface TrackingPoint {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  updatedAt: string;
  isLive?: boolean;
  technicianName?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  destinationLabel?: string | null;
}

export interface StoreDeliveryLiveLocation {
  orderId: string;
  workerId: string;
  workerName: string;
  workerPhone?: string;
  lat: number;
  lng: number;
  accuracy: number;
  status: string;
  updatedAt: number | string;
  isOnline: boolean;
  destination?: {
    label: string;
    address?: string;
    lat: number;
    lng: number;
  } | null;
}

export interface Contract {
  id: string;
  contractNumber: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  coveredElevators: number;
  annualPrice: number;
  pdfUrl: string;
}

export interface ContractRequestSiteOption {
  id: string;
  name: string;
  city?: string;
  addressText?: string;
  buildingType?: string;
  floorsCount?: number;
  basementsCount?: number;
  elevatorsCount?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface ContractRequestTypeOption {
  id: "maintenance" | "installation";
  label: string;
  description: string;
}

export interface ContractRequestOptions {
  contractTypes: ContractRequestTypeOption[];
  instructions: string[];
  sites: ContractRequestSiteOption[];
}

export interface CustomerContractRequest {
  id: string;
  requestNumber: string;
  contractType: "maintenance" | "installation";
  status: ContractRequestStatus;
  siteName: string;
  city?: string;
  addressText: string;
  buildingType?: string;
  floorsCount?: number;
  basementsCount?: number;
  elevatorsCount?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  requestedStartDate?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateContractRequestPayload {
  contractType: "maintenance" | "installation";
  siteId?: string;
  siteName?: string;
  city?: string;
  region?: string;
  addressText?: string;
  buildingType?: string;
  floorsCount?: number;
  basementsCount?: number;
  elevatorsCount?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  requestedStartDate?: string;
  notes?: string;
  instructionsAcknowledged: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface CustomerProfileUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
}

export interface CustomerSiteSummary {
  id: string;
  name: string;
  city?: string;
  addressText?: string;
  elevatorCount: number;
}

export interface CustomerProfile {
  customerId: string;
  companyName: string;
  contactPersonName?: string;
  contactPhone?: string;
  contactEmail?: string;
  customer?: CustomerInfo;
  sites?: CustomerSiteSummary[];
  user?: CustomerProfileUser;
}

export interface UpdateCustomerProfilePayload {
  companyName?: string;
  commercialRegistrationNo?: string;
  taxNumber?: string;
  nationalId?: string;
  contactPersonName?: string;
  contactPhone?: string;
  contactEmail?: string;
  addressText?: string;
  city?: string;
  region?: string;
  notes?: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  itemCount: number;
}

export interface StoreBadge {
  id: string;
  label: string;
  tone: StoreBadgeTone;
}

export interface StoreSpec {
  label: string;
  value: string;
}

export interface StoreProduct {
  id: string;
  categoryId: string;
  name: string;
  subtitle: string;
  brand: string;
  sku: string;
  icon: string;
  image?: ImageSourcePropType;
  imageUrl?: string;
  thumbnailUrl?: string;
  accentColor: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  stockLabel: string;
  deliveryLabel: string;
  summary: string;
  compatibleWith: string[];
  badges: StoreBadge[];
  specs: StoreSpec[];
}

export interface StoreOrderItem {
  productId: string;
  productName: string;
  productSubtitle: string;
  icon: string;
  image?: ImageSourcePropType;
  imageUrl?: string;
  thumbnailUrl?: string;
  accentColor: string;
  quantity: number;
  unitPrice: number;
}

export interface StoreOrderStep {
  id: string;
  label: string;
  description: string;
  timestamp: string;
  state: StoreOrderStepState;
}

export interface StoreDeliveryWorker {
  id: string;
  name: string;
  phone?: string;
}

export interface StoreOrderInvoice {
  id: string;
  number: string;
  status: string;
  invoiceDate?: string;
  dueDate?: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  pdfUrl: string;
}

export interface StoreOrder {
  id: string;
  number: string;
  status: StoreOrderStatus;
  paymentStatus: InvoiceStatus;
  placedAt: string;
  etaDate: string;
  deliveryWindow: string;
  addressLabel: string;
  addressDetails: string;
  courierName: string;
  trackingCode: string;
  deliveryWorker?: StoreDeliveryWorker | null;
  progress: number;
  items: StoreOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  invoice?: StoreOrderInvoice | null;
  steps: StoreOrderStep[];
  currentStep?: StoreOrderStep | null;
}

export interface StorePaymentMethod {
  id: string;
  label: string;
  subtitle: string;
  type: StorePaymentMethodType;
  isDefault: boolean;
}

export interface StoreDeliveryAddress {
  id: string;
  title: string;
  receiverName: string;
  phone: string;
  line1: string;
  area: string;
  estimatedWindow: string;
}

export interface StoreCheckoutData {
  product: StoreProduct;
  quantity: number;
  address: StoreDeliveryAddress;
  paymentMethods: StorePaymentMethod[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  note: string;
  trackingOrderId: string;
}

export interface StorePlaceOrderPayload {
  productId: string;
  quantity: number;
  addressId?: string;
  paymentMethod: StorePaymentMethodType;
  note?: string;
  useCart?: boolean;
}

export interface StoreHomeData {
  categories: StoreCategory[];
  featuredProducts: StoreProduct[];
  quickReorderProducts: StoreProduct[];
  activeOrder?: StoreOrder | null;
}

export interface StoreProductPage {
  items: StoreProduct[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface StoreCartItem extends StoreOrderItem {
  id: string;
  lineTotal: number;
}

export interface StoreCart {
  id: string;
  status: string;
  items: StoreCartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface CustomerRegisterPayload {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  password: string;
  city?: string;
  region?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export interface IssuePayload {
  elevatorId: string;
  severity: SeverityLevel;
  description: string;
}

export interface EmergencyReportPayload {
  elevatorId: string;
  issueType: EmergencyIssueType;
  description: string;
  reporterName: string;
  reporterPhone: string;
  priority?: "critical" | "high" | "normal" | "low";
}

export interface EmergencyReportResponse {
  success: boolean;
  work_order_id?: string;
  work_order_number?: string;
  status?: string;
  priority?: string;
  sla_deadline?: string;
}
