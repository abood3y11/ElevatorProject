import { supabase } from '../../lib/supabase';
import { 
  DashboardSummary, 
  MaintenanceData, 
  RevenueData, 
  StatusData, 
  Technician,
  ExpiringContract,
  LowStockItem,
  ActivityLog,
  KeyMetric
} from './types';

export const dashboardService = {
  // Get dashboard summary data
  async getDashboardSummary(): Promise<{ data: DashboardSummary | null; error: Error | null }> {
    // Get total elevators count
    const { count: elevatorsCount, error: elevatorsError } = await supabase
      .from('elevators')
      .select('*', { count: 'exact' });

    // Get active contracts count
    const { count: contractsCount, error: contractsError } = await supabase
      .from('contracts')
      .select('*', { count: 'exact' })
      .eq('status', 'active');

    // Get maintenance tasks scheduled for today
    const today = new Date().toISOString().split('T')[0];
    const { count: maintenanceCount, error: maintenanceError } = await supabase
      .from('maintenance')
      .select('*', { count: 'exact' })
      .like('scheduledDate', `${today}%`);

    // Get pending maintenance requests
    const { count: requestsCount, error: requestsError } = await supabase
      .from('maintenance')
      .select('*', { count: 'exact' })
      .eq('status', 'pending');

    if (elevatorsError || contractsError || maintenanceError || requestsError) {
      return { 
        data: null, 
        error: elevatorsError || contractsError || maintenanceError || requestsError 
      };
    }

    return {
      data: {
        totalElevators: elevatorsCount || 0,
        activeContracts: contractsCount || 0,
        maintenanceToday: maintenanceCount || 0,
        pendingRequests: requestsCount || 0
      },
      error: null
    };
  },

  // Get maintenance data for the last 6 months
  async getMaintenanceData(): Promise<{ data: MaintenanceData[] | null; error: Error | null }> {
    // Calculate date range for last 6 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5); // 6 months including current month
    
    const { data, error } = await supabase
      .from('maintenance')
      .select('type, scheduledDate')
      .gte('scheduledDate', startDate.toISOString())
      .lte('scheduledDate', endDate.toISOString());

    if (error || !data) {
      return { data: null, error };
    }

    // Process data into monthly format
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize result with all months having 0 values
    const result: MaintenanceData[] = [];
    
    for (let i = 0; i < 6; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() - 5 + i);
      result.push({
        month: months[month.getMonth()],
        scheduled: 0,
        emergency: 0
      });
    }

    // Count maintenance by month and type
    data.forEach((item: { scheduledDate: string; type: string }) => {
      const date = new Date(item.scheduledDate);
     // const monthIndex = months.indexOf(months[date.getMonth()]);
      
      // Find the corresponding result entry
      const resultIndex = result.findIndex((r: MaintenanceData) => r.month === months[date.getMonth()]);
      if (resultIndex !== -1) {
        if (item.type === 'scheduled') {
          result[resultIndex].scheduled++;
        } else if (item.type === 'emergency') {
          result[resultIndex].emergency++;
        }
      }
    });

    return { data: result, error: null };
  },

  // Get revenue data for the last 6 months
  async getRevenueData(): Promise<{ data: RevenueData[] | null; error: Error | null }> {
    // Calculate date range for last 6 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5); // 6 months including current month
    
    const { data, error } = await supabase
      .from('payments')
      .select('amount, date, type')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error || !data) {
      return { data: null, error };
    }

    // Process data into monthly format
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize result with all months having 0 values
    const result: RevenueData[] = [];
    
    for (let i = 0; i < 6; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() - 5 + i);
      result.push({
        month: months[month.getMonth()],
        value: 0,
        trend: 0
      });
    }

    // Sum revenue by month
    data.forEach((item: { date: string; amount: number; type: string }) => {
      const date = new Date(item.date);
      //const monthIndex = months.indexOf(months[date.getMonth()]);
      
      // Find the corresponding result entry
      const resultIndex = result.findIndex((r: RevenueData) => r.month === months[date.getMonth()]);
      if (resultIndex !== -1) {
        result[resultIndex].value += item.amount;

        // For trend data, we're assuming trend is based on another payment type
        // This is a simplification - in a real app, you'd have a more sophisticated trend calculation
        if (item.type === 'forecast') {
          result[resultIndex].trend += item.amount;
        }
      }
    });

    return { data: result, error: null };
  },

  // Get elevator status data
  async getElevatorStatusData(): Promise<{ data: StatusData[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('elevators')
      .select('status');

    if (error || !data) {
      return { data: null, error };
    }

    // Count elevators by status
    const statusCounts: { [key: string]: number } = {
      'Operational': 0,
      'Under Maintenance': 0,
      'Needs Repair': 0
    };

    data.forEach((elevator: { status: string }) => {
      if (statusCounts[elevator.status] !== undefined) {
        statusCounts[elevator.status]++;
      }
    });

    // Format into the required StatusData format
    const result: StatusData[] = [
      { name: 'Operational', value: statusCounts['Operational'], color: '#9333EA' },
      { name: 'Under Maintenance', value: statusCounts['Under Maintenance'], color: '#A855F7' },
      { name: 'Needs Repair', value: statusCounts['Needs Repair'], color: '#C084FC' }
    ];

    return { data: result, error: null };
  },

  // Get technician status data
  async getTechnicianStatus(): Promise<{ data: Technician[] | null; error: Error | null}> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all technicians
    const { data: technicians, error: techError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('role', 'technician')
      .eq('isActive', true);

    if (techError || !technicians) {
      return { data: null, error: techError };
    }

    // For each technician, get their tasks for today
    const result: Technician[] = [];
    
    for (const tech of technicians) {
      // Get tasks assigned to this technician for today
      const { data: tasks, error: taskError } = await supabase
        .from('maintenance')
        .select('id, status')
        .eq('assignedTechnician', tech.id)
        .like('scheduledDate', `${today}%`);

      if (taskError) continue;
      
    const tasksToday = tasks ? tasks.length : 0;
    const tasksCompleted: number = tasks ? tasks.filter((t: { status: string }) => t.status === 'completed').length : 0;
      
      result.push({
        id: tech.id,
        name: tech.name,
        tasksToday,
        tasksCompleted,
        image: undefined // Add logic to fetch profile images if needed
      });
    }

    return { data: result, error: null };
  },

  // Get expiring contracts
  async getExpiringContracts(limit: number = 3): Promise<{ data: ExpiringContract[] | null; error: Error | null }> {
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);
    
    const { data, error } = await supabase
      .from('contracts')
      .select('id, endDate, buildingId')
      .eq('status', 'active')
      .gte('endDate', today.toISOString())
      .lte('endDate', next30Days.toISOString())
      .order('endDate')
      .limit(limit);

    if (error || !data) {
      return { data: null, error };
    }

    // Fetch customer data for each contract
    const result: ExpiringContract[] = [];
    
    for (const contract of data) {
      // Get building data
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select('customerId')
        .eq('id', contract.buildingId)
        .single();
      
      if (buildingError || !building) continue;
      
      // Get customer data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('name')
        .eq('id', building.customerId)
        .single();
      
      if (customerError || !customer) continue;
      
      // Calculate days left
      const endDate = new Date(contract.endDate);
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      result.push({
        id: contract.id,
        customer: customer.name,
        expiry: contract.endDate,
        daysLeft
      });
    }

    return { data: result, error: null };
  },

  // Get low stock items
  async getLowStockItems(limit: number = 3): Promise<{ data: LowStockItem[] | null; error: Error | null }> {
    const { data: allItems, error } = await supabase
  .from('inventory')
  .select('id, name, currentStock, minimumStock')
  .order('currentStock');

// Filter items where currentStock < minimumStock and take only the first 'limit' items
    const data = allItems ? 
        allItems
            .filter(item => item.currentStock < item.minimumStock)
            .slice(0, limit)
        : null;

    if (error || !data) {
      return { data: null, error };
    }

    const result: LowStockItem[] = data.map((item: { id: string; name: string; currentStock: number; minimumStock: number }) => ({
      id: parseInt(item.id),
      name: item.name,
      stock: item.currentStock,
      minimum: item.minimumStock
    }));

    return { data: result, error: null };
  },

  // Get recent activities
  async getRecentActivities(limit: number = 5): Promise<{ data: ActivityLog[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    return { data, error };
  },

  // Get key performance metrics
  async getKeyMetrics(): Promise<{ data: KeyMetric[] | null; error: Error | null }> {
    // This is a placeholder implementation
    // In a real-world scenario, these metrics would be calculated based on real data
    // For example, you might calculate the average response time from maintenance logs
    
    const metrics: KeyMetric[] = [
      {
        name: 'Average Response Time',
        value: '2.5 hours',
        percentageChange: -15,
        status: 'improved',
        percentage: 85
      },
      {
        name: 'First-Time Fix Rate',
        value: '92%',
        percentageChange: 3,
        status: 'on-target',
        percentage: 92
      },
      {
        name: 'Contract Renewal Rate',
        value: '88%',
        percentageChange: -2,
        status: 'needs-attention',
        percentage: 88
      },
      {
        name: 'Customer Retention',
        value: '95%',
        percentageChange: 5,
        status: 'excellent',
        percentage: 95
      }
    ];

    return { data: metrics, error: null };
  }
};