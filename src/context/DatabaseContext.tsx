import React, { createContext, useContext, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import type {
  Building,
  Contract,
  Elevator,
  MaintenanceTask,
  MaintenanceRecord,
  SparePart,
  Notification
} from '../types/database';

interface DatabaseContextType {
  // Buildings
  getBuildings: () => Promise<Building[]>;
  getBuildingById: (id: string) => Promise<Building | null>;
  createBuilding: (building: Partial<Building>) => Promise<Building | null>;
  updateBuilding: (id: string, building: Partial<Building>) => Promise<Building | null>;
  
  // Elevators
  getElevators: (buildingId?: string) => Promise<Elevator[]>;
  getElevatorById: (id: string) => Promise<Elevator | null>;
  createElevator: (elevator: Partial<Elevator>) => Promise<Elevator | null>;
  updateElevator: (id: string, elevator: Partial<Elevator>) => Promise<Elevator | null>;
  
  // Maintenance Tasks
  getMaintenanceTasks: (elevatorId?: string) => Promise<MaintenanceTask[]>;
  getMaintenanceTaskById: (id: string) => Promise<MaintenanceTask | null>;
  createMaintenanceTask: (task: Partial<MaintenanceTask>) => Promise<MaintenanceTask | null>;
  updateMaintenanceTask: (id: string, task: Partial<MaintenanceTask>) => Promise<MaintenanceTask | null>;
  
  // Maintenance Records
  getMaintenanceRecords: (taskId?: string) => Promise<MaintenanceRecord[]>;
  createMaintenanceRecord: (record: Partial<MaintenanceRecord>) => Promise<MaintenanceRecord | null>;
  
  // Spare Parts
  getSpareParts: () => Promise<SparePart[]>;
  getSparePartById: (id: string) => Promise<SparePart | null>;
  updateSparePartStock: (id: string, quantity: number) => Promise<SparePart | null>;
  
  // Notifications
  getNotifications: () => Promise<Notification[]>;
  markNotificationAsRead: (id: string) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Buildings
  const getBuildings = useCallback(async () => {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }, []);

  const getBuildingById = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }, []);

  const createBuilding = useCallback(async (building: Partial<Building>) => {
    const { data, error } = await supabase
      .from('buildings')
      .insert([{ ...building, customer_id: user?.id }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }, [user]);

  const updateBuilding = useCallback(async (id: string, building: Partial<Building>) => {
    const { data, error } = await supabase
      .from('buildings')
      .update(building)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }, []);

  // Elevators
  const getElevators = useCallback(async (buildingId?: string) => {
    let query = supabase.from('elevators').select('*');
    
    if (buildingId) {
      query = query.eq('building_id', buildingId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }, []);

  // Add other methods similarly...

  const value = {
    getBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    getElevators,
    // ... other methods
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};