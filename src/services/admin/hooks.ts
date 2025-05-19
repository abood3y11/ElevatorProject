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
  InventoryItem,
  InventorySummary,
  User,
  Customer,
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

// Generic hook for loading data with a service method
export function useServiceCall<T>(
  serviceMethod: () => Promise<{ data: T | null; error: Error | null; count?: number | null }>,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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
        setError(err as Error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  return { data, isLoading, error, count };
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
  return useServiceCall<ExpiringContract[]>(() => dashboardService.getExpiringContracts(limit));
}

export function useLowStockItems(limit: number = 3) {
  return useServiceCall<LowStockItem[]>(() => dashboardService.getLowStockItems(limit));
}

export function useRecentActivities(limit: number = 5) {
  return useServiceCall<ActivityLog[]>(() => dashboardService.getRecentActivities(limit));
}

export function useKeyMetrics() {
  return useServiceCall<KeyMetric[]>(dashboardService.getKeyMetrics);
}

// Contracts hooks
export function useContracts(searchTerm?: string, status?: string, page: number = 1, limit: number = 10) {
  const fetch = useCallback(() => {
    return contractsService.getContracts(searchTerm, status, page, limit);
  }, [searchTerm, status, page, limit]);
  
  return useServiceCall<Contract[]>(fetch, [searchTerm, status, page, limit]);
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

export function useCustomers(searchTerm?: string, page: number = 1, limit: number = 10) {
  const fetch = useCallback(() => {
    return usersService.getCustomers(searchTerm, page, limit);
  }, [searchTerm, page, limit]);
  
  return useServiceCall<Customer[]>(fetch, [searchTerm, page, limit]);
}

export function useCustomerById(id: string) {
  return useServiceCall<Customer>(() => usersService.getCustomerById(id), [id]);
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

// Mutation hooks
export function useCreateContract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const createContract = async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await contractsService.createContract(contract);
      if (error) setError(error);
      return { data, error };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { createContract, isLoading, error };
}

export function useUpdateContract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const updateContract = async (id: string, updates: Partial<Contract>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await contractsService.updateContract(id, updates);
      if (error) setError(error);
      return { data, error };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { updateContract, isLoading, error };
}

export function useDeleteContract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const deleteContract = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await contractsService.deleteContract(id);
      if (error) setError(error);
      return { error };
    } catch (err) {
      setError(err as Error);
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { deleteContract, isLoading, error };
}

export function useCreateInventoryItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const createItem = async (item: Omit<InventoryItem, 'id'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await inventoryService.createInventoryItem(item);
      if (error) setError(error);
      return { data, error };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { createItem, isLoading, error };
}

export function useUpdateInventoryItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await inventoryService.updateInventoryItem(id, updates);
      if (error) setError(error);
      return { data, error };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { updateItem, isLoading, error };
}

export function useRestockInventoryItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const restockItem = async (id: string, quantity: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await inventoryService.restockItem(id, quantity);
      if (error) setError(error);
      return { data, error };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { restockItem, isLoading, error };
}

export function useCreateUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const createUser = async (user: Omit<User, 'id'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await usersService.createUser(user);
      if (error) setError(error);
      return { data, error };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { createUser, isLoading, error };
}

export function useUpdateUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const updateUser = async (id: string, updates: Partial<User>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await usersService.updateUser(id, updates);
      if (error) setError(error);
      return { data, error };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { updateUser, isLoading, error };
}

export function useCreateCustomer() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const createCustomer = async (customer: Omit<Customer, 'id'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await usersService.createCustomer(customer);
      if (error) setError(error);
      return { data, error };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { createCustomer, isLoading, error };
}

export function useUpdateCustomer() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await usersService.updateCustomer(id, updates);
      if (error) setError(error);
      return { data, error };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { updateCustomer, isLoading, error };
}

export function useGenerateReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const generateReport = async (
    reportType: 'maintenance' | 'revenue' | 'satisfaction' | 'performance',
    startDate: string,
    endDate: string,
    format: 'csv' | 'json' = 'csv'
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await reportsService.generateReport(reportType, startDate, endDate, format);
      if (error) setError(error);
      return { data, error };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { generateReport, isLoading, error };
}