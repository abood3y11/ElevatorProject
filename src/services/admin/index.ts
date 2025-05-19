import { supabase } from '../../lib/supabase';

// Import the services directly
import { contractsService } from './contractsService';
import { dashboardService } from './dashboardService';
import { inventoryService } from './inventoryService';
import { reportsService } from './reportsService';
import { usersService } from './usersService';

// Re-export all services
export { supabase };
export { contractsService };
export { dashboardService };
export { inventoryService };
export { reportsService };
export { usersService };
// Export all types
export * from './types';

// Service index
const services = {
  contracts: contractsService,
  dashboard: dashboardService,
  inventory: inventoryService,
  reports: reportsService,
  users: usersService
};

export default services;