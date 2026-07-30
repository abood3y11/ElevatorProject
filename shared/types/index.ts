// ============================================
// Admin Portal - Shared Types
// ============================================

// -------------------- Enums --------------------

export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  OPERATIONS_MANAGER = 'operations_manager',
  MAINTENANCE_SUPERVISOR = 'maintenance_supervisor',
  INSTALLATION_SUPERVISOR = 'installation_supervisor',
  TECHNICIAN_MAINTENANCE = 'technician_maintenance',
  TECHNICIAN_INSTALLATION = 'technician_installation',
  CUSTOMER = 'customer',
  CUSTOMER_SERVICE = 'customer_service',
  COMPLIANCE_OFFICER = 'compliance_officer',
}

export enum ContractType {
  MAINTENANCE = 'maintenance',
  INSTALLATION = 'installation',
  MIXED = 'mixed',
}

export enum ContractStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum ElevatorStatus {
  IN_SERVICE = 'in_service',
  OUT_OF_SERVICE = 'out_of_service',
  UNDER_INSTALLATION = 'under_installation',
  DECOMMISSIONED = 'decommissioned',
  Operational = 'Operational',
}

export enum ElevatorUsageType {
  PASSENGER = 'passenger',
  FREIGHT = 'freight',
  HOSPITAL = 'hospital',
  FIREFIGHTING = 'firefighting',
  ACCESSIBLE_EGRESS = 'accessible_egress',
}

export enum BuildingType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  HOSPITAL = 'hospital',
  SCHOOL = 'school',
  GOVERNMENT = 'government',
  INDUSTRIAL = 'industrial',
}

export enum WorkOrderType {
  MAINTENANCE_VISIT = 'maintenance_visit',
  BREAKDOWN = 'breakdown',
  INSTALLATION_TASK = 'installation_task',
  INSPECTION_SUPPORT = 'inspection_support',
}

export enum WorkOrderStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  WAITING_PARTS = 'waiting_parts',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum WorkOrderPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// -------------------- Base Interfaces --------------------

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------- User & Auth --------------------

export interface User extends BaseEntity {
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  roles: UserRole[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// -------------------- Customer --------------------

export interface Customer extends BaseEntity {
  name: string;
  commercialRegistrationNo?: string;
  nationalId?: string;
  taxNumber?: string;
  contactPersonName: string;
  contactPhone: string;
  contactEmail: string;
  addressText: string;
  city: string;
  region: string;
  notes?: string;
}

// -------------------- Site --------------------

export interface Site extends BaseEntity {
  customerId: string;
  districtId?: string;
  districtName?: string;
  customerName?: string;
  siteName?: string; // ✅ Added for compatibility
  name?: string; // ✅ Keep both for backward compatibility
  siteCode?: string;
  addressText: string;
  city?: string;
  region?: string;
  district?: string; // ✅ Legacy field
  postalCode?: string;
  buildingType?: BuildingType | string; // ✅ Allow string for flexibility
  floorsCount?: number;
  basementsCount?: number;
  elevatorCount?: number;
  hasFirefightingSystem?: boolean;
  hasEmergencyGenerator?: boolean;
  googleMapsLink?: string;
  latitude?: number;
  longitude?: number;
  siteContactName?: string;
  siteContactPhone?: string;
  siteContactEmail?: string;
  siteContactPhone2?: string;
  notes?: string;
  isActive?: boolean;
  customerAvailability?: 'always' | 'needs_coordination' | 'specific_times';
  preferredVisitTimeStart?: string;
  preferredVisitTimeEnd?: string;
  preferredVisitDays?: string[] | string; // ✅ Allow both array and string
}

// -------------------- Elevator --------------------

export interface Elevator extends BaseEntity {
  siteId: string;
  siteName?: string;
  customerName?: string;
  code: string;
  serialNumber: string;
  brand: string;
  model: string;
  capacityKg: number;
  capacityPersons: number;
  speedMps: number;
  stopsCount: number;
  doorsCount?: number;
  manufactureYear: number;
  elevatorType?: string;
  status: ElevatorStatus;
  usageType: ElevatorUsageType;
  notes?: string;
}

// -------------------- Contracts --------------------

export interface Contract extends BaseEntity {
  // IDs - From Python Model
  customerId: string; // customer_id - Required
  siteId: string; // site_id - Required
  
  // Computed/Frontend fields (not in Python model)
  contractId?: string; // Alias for id
  customerName?: string; // Joined from Customer
  siteName?: string; // Joined from Site

  // Contract Info - From Python Model
  contractNumber: string; // contract_number - Required
  contractType: 'maintenance' | 'inspection' | 'repair' | 'installation'; // contract_type - Required

  // Dates - From Python Model
  startDate: string; // start_date - Required (Date in Python)
  endDate: string; // end_date - Required (Date in Python)
  signatureDate?: string; // signature_date - Optional (Date in Python)

  // Financials - From Python Model
  totalValue?: number; // total_value - Optional (Numeric in Python)
  currency?: string; // currency - Optional, default "SAR"
  billingCycle?: 'monthly' | 'quarterly' | 'yearly' | 'per_visit'; // billing_cycle - Optional

  // Status - From Python Model
  status: 'draft' | 'pending_approval' | 'active' | 'expired' | 'cancelled' | 'suspended'; // status - Required, default "draft"

  // Additional - From Python Model
  notes?: string; // notes - Optional (Text in Python)
  termsAndConditions?: string; // terms_and_conditions - Optional (Text in Python)

  // Computed Properties (from Python @property)
  isActive?: boolean; // is_active property

  // Maintenance Contract Details (from relationship - populated when joined)
  maintenanceFrequency?: 'monthly' | 'bi_monthly' | 'quarterly'; // From MaintenanceContract.visit_frequency
  visitsPerYear?: number; // From MaintenanceContract.visits_per_year
  coverageType?: 'full' | 'preventive_only' | 'labor_only' | 'parts_included' | 'parts_excluded'; // From MaintenanceContract.coverage_type
  emergencyCallIncluded?: boolean; // From MaintenanceContract.emergency_call_included
  responseTimeSlaMins?: number; // From MaintenanceContract.response_time_sla_minutes
  includeParts?: boolean; // From MaintenanceContract.include_parts
  includeMajorRepairs?: boolean; // From MaintenanceContract.include_major_repairs
  maxEmergencyCallsPerMonth?: number; // From MaintenanceContract.max_emergency_calls_per_month

  // Frontend-only fields (for UI, not in Python model)
  installationType?: string; // For installation contracts (frontend use)
  maintenanceYears?: number | string; // For installation contracts (frontend use)
}

export interface MaintenanceContract extends BaseEntity {
  // From Python Model
  contractId: string; // contract_id - Required
  
  // Coverage Type - From Python Model
  coverageType: 'full' | 'preventive_only' | 'labor_only' | 'parts_included' | 'parts_excluded'; // coverage_type - Required
  
  // Visit Frequency - From Python Model
  visitFrequency: 'monthly' | 'bi_monthly' | 'quarterly'; // visit_frequency - Required
  visitsPerYear: number; // visits_per_year - default 12
  
  // Emergency Support - From Python Model
  emergencyCallIncluded: boolean; // emergency_call_included - default True
  responseTimeSlaMins?: number; // response_time_sla_minutes - Optional
  
  // Additional Coverage - From Python Model
  includeParts?: boolean; // include_parts - default False
  includeMajorRepairs?: boolean; // include_major_repairs - default False
  maxEmergencyCallsPerMonth?: number; // max_emergency_calls_per_month - Optional

  // Frontend-only fields (not in Python model)
  contractName?: string; // For display purposes
  elevatorIds?: string[]; // For frontend reference
}

// -------------------- Work Orders --------------------

export interface WorkOrder extends BaseEntity {
  type: WorkOrderType;
  workOrderNumber?: string;
  relatedMaintenanceVisitId?: string;
  relatedInstallationTaskId?: string;
  contractId?: string;
  elevatorId: string;
  elevatorCode?: string;
  siteId: string;
  customerId: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedTeamId: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  createdBy: string;
  description: string;
  customerContactOnSite?: string;
  elevator?: Elevator;
  site?: Site;
  customer?: Customer;
}

// -------------------- Technicians & Teams --------------------

export interface Technician extends BaseEntity {
  userId: string;
  technicianType: 'maintenance' | 'installation' | 'both';
  hireDate: string;
  isActive: boolean;
  notes?: string;
  user?: User;
  // Additional fields from backend
  name?: string; // Computed from user.fullName for compatibility
  employeeNumber?: string;
  specializations?: string;
  workingDaysPerMonth?: number;
  maxDailyVisits?: number;
  minDailyVisits?: number;
  districts?: Array<{ id: string; name: string }>;
}

export interface TechnicianTeam extends BaseEntity {
  name: string;
  supervisorId: string;
  isActive: boolean;
}

// -------------------- Dashboard Stats --------------------

export interface AdminDashboardStats {
  totalCustomers: number;
  totalElevators: number;
  activeMaintenanceContracts: number;
  monthlyVisitsTotal: number;
  monthlyVisitsDone: number;
  ongoingInstallationProjects: number;
  criticalWorkOrders: number;
  expiringCertificates: number;
}

// -------------------- API Response Types --------------------

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// -------------------- Districts --------------------

export interface District extends BaseEntity {
  name?: string; // ✅ Generic name field (can be nameAr or nameEn based on locale)
  nameAr: string; // ✅ Arabic name
  nameEn: string; // ✅ English name
  districtName?: string; // ✅ Alias for compatibility
  city: string;
  region: string;
  latitude?: number; // ✅ Added for mapping
  longitude?: number; // ✅ Added for mapping
  isActive?: boolean; // ✅ Added for status tracking
  sitesCount?: number;
  elevatorsCount?: number;
  techniciansCount?: number;
  teamsCount?: number;
}

export interface TechnicianDistrict extends BaseEntity {
  technicianId: string;
  districtId: string;
  isPrimaryDistrict: boolean;
  priority: number;
  maxDailyVisits: number;
  technician?: Technician;
  district?: District;
}

export interface TeamDistrict extends BaseEntity {
  teamId: string;
  districtId: string;
  priority: number;
  team?: TechnicianTeam;
  district?: District;
}

// -------------------- Maintenance Stats --------------------

export interface MonthlyStats {
  month: string;
  year: number;
  total: number;
  completed: number;
  inProgress: number;
  scheduled: number;
  cancelled: number;
}

export interface StatusDistribution {
  completed: number;
  inProgress: number;
  scheduled: number;
  cancelled: number;
}

export interface TeamCapacity {
  teamId: string;
  teamName: string;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  utilizationPercent: number;
  members: {
    technicianId: string;
    technicianName: string;
    assignedVisits: number;
    maxDailyVisits: number;
  }[];
}

// -------------------- Work Order Status Summary (Phase 1) --------------------

export interface WorkOrderStatusSummary {
  new: number;
  assigned: number;
  pending: number; // قيد الانتظار - Technician acknowledged
  inProgress: number;
  overdue: number; // متأخرة - Not completed on time
  completed: number;
  month: string;
  year: number;
  total: number;
}

// -------------------- Elevator Distribution (Phase 2) --------------------

export interface ElevatorForDistribution {
  id: string;
  code: string;
  brand: string;
  model?: string;
  nextMaintenanceDate: string;
}

export interface LocationWithElevators {
  id: string;
  name: string;
  customerName: string;
  elevatorsCount: number;
  elevators: ElevatorForDistribution[];
}

export interface DistrictWithElevators {
  id: string;
  name: string;
  nameAr?: string; // ✅ Added
  nameEn?: string; // ✅ Added
  locations: LocationWithElevators[];
  totalElevators: number;
}

export interface UnassignedElevatorsResponse {
  districts: DistrictWithElevators[];
  totalUnassigned: number;
}

// Response from /maintenance/by-district endpoint
export interface DistributionWorkOrder {
  id: string;
  workOrderNumber: string;
  status: string;
  scheduledDate: string | null;
}

export interface DistributionElevator {
  id: string;
  code: string;
  brand: string;
  model: string;
}

export interface DistributionSite {
  id: string;
  name: string;
  address: string;
  elevators: DistributionElevator[];
  workOrders: DistributionWorkOrder[];
}

export interface DistributionCustomer {
  id: string;
  name: string;
  sites: DistributionSite[];
  totalElevators: number;
  totalWorkOrders: number;
}

export interface DistributionDistrict {
  id: string;
  name: string;
  nameAr?: string; // ✅ Added
  nameEn: string;
  suggestedTechnician: SuggestedTechnician | null;
  customers: DistributionCustomer[];
  totalElevators: number;
  totalWorkOrders: number;
}

export interface DistributionByDistrictResponse {
  month: number;
  year: number;
  onlyUnassigned: boolean;
  districts: DistributionDistrict[];
  summary: {
    totalDistricts: number;
    totalCustomers: number;
    totalElevators: number;
    totalWorkOrders: number;
  };
}

// Response from /maintenance/assign endpoint (distribute existing work orders)
export interface DistributeToTechnicianResponse {
  success: boolean;
  assignedCount: number;
  technicianId: string;
  technicianName: string;
  message: string;
  errors?: string[] | null;
}

export interface BulkAssignRequest {
  elevatorIds: string[];
  technicianId: string;
  month: number;
  year: number;
}

export interface BulkAssignResponse {
  success: boolean;
  workOrdersCreated: number;
  technicianName: string;
  message: string;
  errors?: string[] | null;
}

// Phase 3: Technician Workload & Assignment View
export interface TechnicianStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export interface TechnicianWorkload {
  id: string;
  name: string;
  phone: string;
  districts: string[];
  stats: TechnicianStats;
  completionPercentage: number;
}

export interface TechnicianWorkloadResponse {
  technicians: TechnicianWorkload[];
}

export interface WorkOrderWithDetails {
  id: string;
  workOrderNumber: string;
  elevator: {
    id: string;
    code: string;
    brand: string;
    floorsCount: number;
  };
  site: {
    id: string;
    name: string;
    district: string;
  };
  status: string;
  scheduledDate: string;
  startedAt?: string;
}

export interface TechnicianWorkOrdersResponse {
  technician: {
    id: string;
    name: string;
    districts: string[];
  };
  stats: TechnicianStats;
  workOrders: WorkOrderWithDetails[];
}

export interface ReassignRequest {
  newTechnicianId: string;
  reason?: string;
}

export interface ReassignResponse {
  success: boolean;
  message: string;
  oldTechnician: string;
  newTechnician: string;
}

// -------------------- Phase 4: Auto Distribution & Templates --------------------

export enum DistributionType {
  BY_DISTRICT = 'by_district',
  BALANCED = 'balanced',
  GEOGRAPHIC = 'geographic',
}

export interface AutoDistributeRequest {
  month: number;
  year: number;
  distributionType: DistributionType;
  preview: boolean;
}

export interface TechnicianDistribution {
  technicianId: string;
  technicianName: string;
  districts: string[];
  elevatorsCount: number;
  elevators: {
    id: string;
    code: string;
    site: string;
  }[];
}

export interface UnassignedElevator {
  elevatorId: string;
  code: string;
  site: string;
  district: string;
  reason: string;
}

export interface DistributionResult {
  preview: boolean;
  success?: boolean;
  workOrdersCreated?: number;
  distribution: TechnicianDistribution[];
  unassigned: UnassignedElevator[];
  summary: {
    totalElevators: number;
    assigned: number;
    unassigned: number;
    techniciansUsed: number;
  };
}

export interface DistributionTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  assignments: {
    technicianId: string;
    districtIds: string[];
  }[];
  createdAt: string;
  lastUsedAt?: string;
}

// ============================================
// Phase 5: Emergency & Real-time Updates
// ============================================

export enum EmergencyIssueType {
  STUCK_PASSENGERS = 'stuck_passengers',
  BREAKDOWN = 'breakdown',
  NOISE = 'noise',
  DOOR_ISSUE = 'door_issue',
  OTHER = 'other',
}

export interface EmergencyWorkOrderCreate {
  elevatorId: string;
  issueType: EmergencyIssueType;
  description: string;
  reporterName: string;
  reporterPhone: string;
  priority?: 'critical' | 'high' | 'normal' | 'low';
}

export interface SuggestedTechnician {
  id: string;
  name: string;
  isEmergencyTech: boolean;
  distanceKm: number;
  currentStatus: 'available' | 'busy' | 'on_visit';
  currentWork?: {
    siteName: string;
    elevatorCode: string;
  };
}

export interface EmergencyWorkOrderResponse {
  success: boolean;
  workOrderId: string;
  workOrderNumber: string;
  status: string;
  priority: string;
  slaDeadline: string;
  suggestedTechnicians: SuggestedTechnician[];
}

export interface WebSocketMessage {
  type: 'work_order_started' | 'work_order_completed' | 'emergency_created' | 'status_updated';
  data: Record<string, unknown>;
  timestamp: string;
}

export interface SLABreach {
  workOrderId: string;
  workOrderNumber: string;
  priority: string;
  slaDeadline: string;
  breachMinutes: number;
  assignedTechnician: string;
  status: string;
}

export interface SLABreachResponse {
  success: boolean;
  breaches: SLABreach[];
  atRisk: {
    workOrderId: string;
    timeRemainingMinutes: number;
  }[];
}