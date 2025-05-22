import { supabase } from '../../utils/supabase';
import { 
  MaintenanceData, 
  RevenueData, 
  StatusData, 
  KeyMetric
} from './types';

export const reportsService = {
  // Get maintenance data by date range
  async getMaintenanceData(
    startDate: string, 
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<{ data: MaintenanceData[] | null; error: Error | null }> {
    // Get maintenance records within date range
    const { data, error } = await supabase
      .from('maintenance')
      .select('type, scheduledDate')
      .gte('scheduledDate', startDate)
      .lte('scheduledDate', endDate);

    if (error || !data) {
      return { data: null, error };
    }

    // Process data based on groupBy parameter
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result: { [key: string]: MaintenanceData } = {};
    
    data.forEach((item: { scheduledDate: string; type: string }) => {
      const date = new Date(item.scheduledDate);
      let groupKey: string = '';
      
      if (groupBy === 'day') {
        // Group by day: YYYY-MM-DD
        groupKey = date.toISOString().substring(0, 10);
      } else if (groupBy === 'week') {
        // Group by week: YYYY-WW (week number)
        const weekNumber = Math.ceil((date.getDate() + (new Date(date.getFullYear(), date.getMonth(), 1).getDay())) / 7);
        groupKey = `${date.getFullYear()}-W${weekNumber}`;
      } else {
        // Group by month: MMM YYYY
        groupKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
      }
      
      // Initialize group if it doesn't exist
      if (!result[groupKey]) {
        result[groupKey] = {
          month: groupKey,  // Using 'month' field for any grouping type
          scheduled: 0,
          emergency: 0
        } as MaintenanceData;
      }
      
      // Increment the appropriate counter
      if (item.type === 'scheduled') {
        result[groupKey].scheduled++;
      } else if (item.type === 'emergency') {
        result[groupKey].emergency++;
      }
    });

    // Convert result object to array
    const formattedResult = Object.values(result);
    
    return { data: formattedResult, error: null };
  },

  // Get revenue data by date range
  async getRevenueData(
    startDate: string, 
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<{ data: RevenueData[] | null; error: Error | null }> {
    // Get payment records within date range
    const { data, error } = await supabase
      .from('payments')
      .select('amount, date, type')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error || !data) {
      return { data: null, error };
    }

    // Process data based on groupBy parameter
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result: { [key: string]: RevenueData } = {};
    
    data.forEach((item: { date: string; amount: number; type: string }) => {
      const date = new Date(item.date);
      let groupKey: string = '';
      
      if (groupBy === 'day') {
        // Group by day: YYYY-MM-DD
        groupKey = date.toISOString().substring(0, 10);
      } else if (groupBy === 'week') {
        // Group by week: YYYY-WW (week number)
        const weekNumber = Math.ceil((date.getDate() + (new Date(date.getFullYear(), date.getMonth(), 1).getDay())) / 7);
        groupKey = `${date.getFullYear()}-W${weekNumber}`;
      } else {
        // Group by month: MMM YYYY
        groupKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
      }
      
      // Initialize group if it doesn't exist
      if (!result[groupKey]) {
        result[groupKey] = {
          month: groupKey,  // Using 'month' field for any grouping type
          value: 0,
          trend: 0
        } as RevenueData;
      }
      
      // Add to value
      result[groupKey].value += item.amount;
      
      // For trend data (e.g., for forecasts)
      if (item.type === 'forecast') {
        result[groupKey].trend += item.amount;
      }
    });

    // Convert result object to array
    const formattedResult = Object.values(result);
    
    return { data: formattedResult, error: null };
  },

  // Get customer satisfaction data
  async getCustomerSatisfactionData(
    startDate: string,
    endDate: string
  ): Promise<{ data: StatusData[] | null; error: Error | null }> {
    // Get customer feedback records within date range
    const { data, error } = await supabase
      .from('customer_feedback')
      .select('rating')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error || !data) {
      return { data: null, error };
    }

    // Count feedback by rating
    const ratingCounts: { [key: string]: number } = {
      'Very Satisfied': 0,
      'Satisfied': 0,
      'Neutral': 0,
      'Dissatisfied': 0
    };

    // Map numeric ratings to categories
    data.forEach((feedback: { rating: string }) => {
      const rating: number = parseInt(feedback.rating);
      
      if (rating === 5) {
        ratingCounts['Very Satisfied']++;
      } else if (rating === 4) {
        ratingCounts['Satisfied']++;
      } else if (rating === 3) {
        ratingCounts['Neutral']++;
      } else if (rating <= 2) {
        ratingCounts['Dissatisfied']++;
      }
    });

    // Calculate percentages
    const totalFeedback = Object.values(ratingCounts).reduce((sum, count) => sum + count, 0);
    
    // Format data
    const result: StatusData[] = [
      { 
        name: 'Very Satisfied', 
        value: totalFeedback ? Math.round((ratingCounts['Very Satisfied'] / totalFeedback) * 100) : 0, 
        color: '#9333EA' 
      },
      { 
        name: 'Satisfied', 
        value: totalFeedback ? Math.round((ratingCounts['Satisfied'] / totalFeedback) * 100) : 0, 
        color: '#A855F7' 
      },
      { 
        name: 'Neutral', 
        value: totalFeedback ? Math.round((ratingCounts['Neutral'] / totalFeedback) * 100) : 0, 
        color: '#C084FC' 
      },
      { 
        name: 'Dissatisfied', 
        value: totalFeedback ? Math.round((ratingCounts['Dissatisfied'] / totalFeedback) * 100) : 0, 
        color: '#E9D5FF' 
      }
    ];

    return { data: result, error: null };
  },

  // Get key metrics with historical comparison
  async getKeyMetrics(
    currentPeriodStart: string,
    currentPeriodEnd: string,
    previousPeriodStart: string,
    previousPeriodEnd: string
  ): Promise<{ data: KeyMetric[] | null; error: Error | null }> {
    // In a real application, these metrics would be calculated based on real data
    // This implementation demonstrates the structure but would need to be replaced with actual calculations
    
    // 1. Average Response Time
    const { data: currentResponseTime } = await supabase
      .from('maintenance')
      .select('scheduledDate, startTime')
      .gte('scheduledDate', currentPeriodStart)
      .lte('scheduledDate', currentPeriodEnd);
    
    const { data: previousResponseTime } = await supabase
      .from('maintenance')
      .select('scheduledDate, startTime')
      .gte('scheduledDate', previousPeriodStart)
      .lte('scheduledDate', previousPeriodEnd);
    
    // Calculate average response time
    let currentAvgResponse = 0;
    let previousAvgResponse = 0;
    
    if (currentResponseTime && currentResponseTime.length > 0) {
      // In a real application, you would calculate the time difference between scheduledDate and startTime
      // This is a simplified placeholder
      currentAvgResponse = 2.5; // hours
    }
    
    if (previousResponseTime && previousResponseTime.length > 0) {
      previousAvgResponse = 2.9; // hours
    }
    
    // Calculate percentage change
    const responseTimeChange = previousAvgResponse ? 
      ((currentAvgResponse - previousAvgResponse) / previousAvgResponse) * 100 : 0;
    
    // 2. First-Time Fix Rate
    // Similar calculations would be done for other metrics
    // Using placeholder data for this example
    
    const metrics: KeyMetric[] = [
      {
        name: 'Average Response Time',
        value: `${currentAvgResponse.toFixed(1)} hours`,
        percentageChange: responseTimeChange,
        status: responseTimeChange < 0 ? 'improved' : 'declined',
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
  },
  
  // Generate a comprehensive report for download
  async generateReport(
    reportType: 'maintenance' | 'revenue' | 'satisfaction' | 'performance',
    startDate: string,
    endDate: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<{ data: string | null; error: Error | null }> {
    let reportData: MaintenanceData[] | RevenueData[] | StatusData[] | KeyMetric[] | null = null;
    let error: Error | null = null;
    
    // Fetch data based on report type
    switch (reportType) {
      case 'maintenance': {
        const maintenanceResult = await this.getMaintenanceData(startDate, endDate, 'day');
        reportData = maintenanceResult.data;
        error = maintenanceResult.error;
        break;
      }
        
      case 'revenue': {
        const revenueResult = await this.getRevenueData(startDate, endDate, 'day');
        reportData = revenueResult.data;
        error = revenueResult.error;
        break;
      }
        
      case 'satisfaction': {
        const satisfactionResult = await this.getCustomerSatisfactionData(startDate, endDate);
        reportData = satisfactionResult.data;
        error = satisfactionResult.error;
        break;
      }
        
      case 'performance': {
        // For a performance report, you might want to include multiple metrics
        // This is a simplified implementation
        const previousPeriodStart = new Date(startDate);
        const previousPeriodEnd = new Date(endDate);
        const periodLength = new Date(endDate).getTime() - new Date(startDate).getTime();
        
        previousPeriodStart.setTime(previousPeriodStart.getTime() - periodLength);
        previousPeriodEnd.setTime(previousPeriodEnd.getTime() - periodLength);
        
        const metricsResult = await this.getKeyMetrics(
          startDate,
          endDate,
          previousPeriodStart.toISOString(),
          previousPeriodEnd.toISOString()
        );
        reportData = metricsResult.data;
        error = metricsResult.error;
        break;
      }
    }
    
    if (error || !reportData) {
      return { data: null, error };
    }
    
    // Format the report data based on the requested format
    let formattedReport: string;
    
    if (format === 'json') {
      formattedReport = JSON.stringify(reportData, null, 2);
    } else {
      // Create CSV
      // This is a simplified implementation - you might want to use a library for this in a real app
      const headers = Object.keys(reportData[0]).join(',');
      const rows = (reportData as unknown as Record<string, unknown>[]).map((item) => Object.values(item).join(',')).join('\n');
      formattedReport = `${headers}\n${rows}`;
    }
    
    return { data: formattedReport, error: null };
  }
};