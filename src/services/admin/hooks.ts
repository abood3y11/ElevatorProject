import { useState, useEffect, useCallback } from 'react';
import { 
  contractsService, 
  dashboardService, 
  inventoryService, 
  reportsService, 
  usersService 
} from './index';
import {
  Contract,
  ContractSummary,
  Building,
  Customer,
  InventoryItem,
  InventorySummary,
  User,
  UserSummary,
  MaintenanceData,
  RevenueData,
  StatusData,
  Technician,
  ExpiringContract,
  LowStockItem,
  ActivityLog,
  KeyMetric,
  DashboardSummary
} from './types';

// Enhanced generic hook for loading data with refetch functionality
export function useServiceCall<T>(
  serviceMethod: () => Promise<{ data: T | null; error: any; count?: number | null }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await serviceMethod();
      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
        if (result.count !== undefined) {
          setCount(result.count);
        }
        setError(null);
      }
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, dependencies);

  // Return refetch function along with data
  return { 
    data, 
    isLoading, 
    error, 
    count, 
    refetch: fetchData 
  };
}

// Dashboard hooks
export function useDashboardSummary() {
  return useServiceCall<DashboardSummary>(dashboardService.getDashboardSummary);
}

export function useMaintenanceData() {
  return useServiceCall<MaintenanceData[]>(dashboardService.getMaintenanceData);
}

export function useRevenueData() {
  return useServiceCall<RevenueData[]>(dashboardService.getRevenueData);
}

export function useElevatorStatusData() {
  return useServiceCall<StatusData[]>(dashboardService.getElevatorStatusData);
}

export function useTechnicianStatus() {
  return useServiceCall<Technician[]>(dashboardService.getTechnicianStatus);
}

export function useExpiringContracts(limit: number = 3) {
  return useServiceCall<ExpiringContract[]>(
    () => dashboardService.getExpiringContracts(limit),
    [limit]
  );
}

export function useLowStockItems(limit: number = 3) {
  return useServiceCall<LowStockItem[]>(
    () => dashboardService.getLowStockItems(limit),
    [limit]
  );
}

export function useRecentActivities(limit: number = 5) {
  return useServiceCall<ActivityLog[]>(
    () => dashboardService.getRecentActivities(limit),
    [limit]
  );
}

export function useKeyMetrics() {
  return useServiceCall<KeyMetric[]>(dashboardService.getKeyMetrics);
}

// Contracts hooks with proper refetch
export function useContracts(
  searchTerm?: string, 
  status?: string, 
  page: number = 1, 
  limit: number = 10
) {
  // Create a memoized fetch function
  const fetchContracts = useCallback(() => {
    // Validate and sanitize inputs
    const sanitizedSearchTerm = searchTerm?.trim() || '';
    const sanitizedStatus = status?.trim() || '';
    
    return contractsService.getContracts(
      sanitizedSearchTerm, 
      sanitizedStatus, 
      page, 
      limit
    );
  }, [searchTerm, status, page, limit]);

  // Use the service call hook with the memoized fetch function
  return useServiceCall<Contract[]>(fetchContracts, [
    searchTerm, 
    status, 
    page, 
    limit
  ]);
}


export function useContractStatuses() {
  return useServiceCall<string[]>(contractsService.getContractStatuses);
}

export function useContractById(id: string) {
  return useServiceCall<Contract>(() => contractsService.getContractById(id), [id]);
}

export function useContractSummary() {
  return useServiceCall<ContractSummary>(contractsService.getContractSummary);
}

export function useBuildings() {
  return useServiceCall<Building[]>(contractsService.getBuildings);
}

export function useCustomers() {
  return useServiceCall<Customer[]>(contractsService.getCustomers);
}

export function useCustomerById(id: string) {
  return useServiceCall<Customer>(() => contractsService.getCustomerById(id), [id]);
}

export function useBuildingById(id: string) {
  return useServiceCall<Building>(() => contractsService.getBuildingById(id), [id]);
}

// Inventory hooks
export function useInventoryItems(searchTerm?: string, category?: string, page: number = 1, limit: number = 10) {
  const fetch = useCallback(() => {
    return inventoryService.getInventoryItems(searchTerm, category, page, limit);
  }, [searchTerm, category, page, limit]);
  
  return useServiceCall<InventoryItem[]>(fetch, [searchTerm, category, page, limit]);
}

export function useInventoryItemById(id: string) {
  return useServiceCall<InventoryItem>(() => inventoryService.getInventoryItemById(id), [id]);
}

export function useInventorySummary() {
  return useServiceCall<InventorySummary>(inventoryService.getInventorySummary);
}

export function useInventoryCategories() {
  return useServiceCall<string[]>(inventoryService.getCategories);
}

// Users hooks
export function useUsers(searchTerm?: string, role?: string, page: number = 1, limit: number = 10) {
  const fetch = useCallback(() => {
    return usersService.getUsers(searchTerm, role, page, limit);
  }, [searchTerm, role, page, limit]);
  
  return useServiceCall<User[]>(fetch, [searchTerm, role, page, limit]);
}

export function useUserById(id: string) {
  return useServiceCall<User>(() => usersService.getUserById(id), [id]);
}

export function useUserSummary() {
  return useServiceCall<UserSummary>(usersService.getUserSummary);
}

export function useUserRoles() {
  return useServiceCall<string[]>(usersService.getUserRoles);
}

// Reports hooks
export function useReportMaintenanceData(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'month') {
  const fetch = useCallback(() => {
    return reportsService.getMaintenanceData(startDate, endDate, groupBy);
  }, [startDate, endDate, groupBy]);
  
  return useServiceCall<MaintenanceData[]>(fetch, [startDate, endDate, groupBy]);
}

export function useReportRevenueData(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'month') {
  const fetch = useCallback(() => {
    return reportsService.getRevenueData(startDate, endDate, groupBy);
  }, [startDate, endDate, groupBy]);
  
  return useServiceCall<RevenueData[]>(fetch, [startDate, endDate, groupBy]);
}

export function useReportCustomerSatisfaction(startDate: string, endDate: string) {
  const fetch = useCallback(() => {
    return reportsService.getCustomerSatisfactionData(startDate, endDate);
  }, [startDate, endDate]);
  
  return useServiceCall<StatusData[]>(fetch, [startDate, endDate]);
}

export function useReportKeyMetrics(
  currentPeriodStart: string,
  currentPeriodEnd: string,
  previousPeriodStart: string,
  previousPeriodEnd: string
) {
  const fetch = useCallback(() => {
    return reportsService.getKeyMetrics(
      currentPeriodStart,
      currentPeriodEnd,
      previousPeriodStart,
      previousPeriodEnd
    );
  }, [currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd]);
  
  return useServiceCall<KeyMetric[]>(fetch, [currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd]);
}

// Enhanced mutation hooks for Contracts with proper mutate function
export function useCreateContract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const mutate = async (contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await contractsService.createContract(contract);
      if (error) {
        setError(error);
        throw error;
      }
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { mutate, isLoading, error };
}

export function useUpdateContract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const mutate = async ({ id, data }: { id: string; data: Partial<Contract> }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await contractsService.updateContract(id, data);
      if (result.error) {
        setError(result.error);
        throw result.error;
      }
      return result.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { mutate, isLoading, error };
}

export function useDeleteContract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const mutate = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await contractsService.deleteContract(id);
      if (error) {
        setError(error);
        throw error;
      }
      return true;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { mutate, isLoading, error };
}

// Enhanced mutation hooks for Inventory
export function useCreateInventoryItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const mutate = async (item: Omit<InventoryItem, 'id'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await inventoryService.createInventoryItem(item);
      if (error) {
        setError(error);
        throw error;
      }
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { mutate, isLoading, error };
}

export function useUpdateInventoryItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const mutate = async ({ id, data }: { id: string; data: Partial<InventoryItem> }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await inventoryService.updateInventoryItem(id, data);
      if (result.error) {
        setError(result.error);
        throw result.error;
      }
      return result.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { mutate, isLoading, error };
}

export function useRestockInventoryItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const mutate = async ({ id, quantity }: { id: string; quantity: number }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await inventoryService.restockItem(id, quantity);
      if (error) {
        setError(error);
        throw error;
      }
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { mutate, isLoading, error };
}

// Enhanced mutation hooks for Users
export function useCreateUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const mutate = async (user: Omit<User, 'id'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await usersService.createUser(user);
      if (error) {
        setError(error);
        throw error;
      }
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { mutate, isLoading, error };
}

export function useUpdateUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const mutate = async ({ id, data }: { id: string; data: Partial<User> }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await usersService.updateUser(id, data);
      if (result.error) {
        setError(result.error);
        throw result.error;
      }
      return result.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { mutate, isLoading, error };
}

// Report generation hook
export function useGenerateReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const mutate = async ({
    reportType,
    startDate,
    endDate,
    format = 'csv'
  }: {
    reportType: 'maintenance' | 'revenue' | 'satisfaction' | 'performance';
    startDate: string;
    endDate: string;
    format?: 'csv' | 'json';
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await reportsService.generateReport(reportType, startDate, endDate, format);
      if (error) {
        setError(error);
        throw error;
      }
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { mutate, isLoading, error };
}