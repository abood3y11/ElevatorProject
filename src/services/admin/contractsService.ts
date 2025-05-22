import { supabase } from '../../utils/supabase';
import { Contract, ContractSummary, Building, Customer } from './types';

// In your Contracts.tsx or service layer
const debugContractRelationships = async () => {
  try {
    // Fetch a sample contract with full relationships
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        customer_id:customers(id, company_name),
        buildings:buildings(id, name)
      `)
      .limit(1)
      .single();

    console.log('Debug Contract Relationships:', {
      contract: data,
      error,
      customerRelationship: data?.customer_id,
      buildingRelationship: data?.buildings
    });
  } catch (err) {
    console.error('Relationship Debug Error:', err);
  }
};

export const contractsService = {
  // Get all contracts with enhanced filtering and pagination

  
  async getContracts(
  searchTerm?: string, 
  status?: string, 
  page: number = 1, 
  limit: number = 10
) {
  try {
    let query = supabase
      .from('contracts')
      .select(`
        *,
        customers!inner (
          id, 
          company_name, 
          contact_person, 
          email, 
          phone
        ),
        contract_buildings (
          buildings (
            id, 
            name, 
            address, 
            city
          )
        )
      `, { count: 'exact' });

    // Flexible search across multiple fields
    if (searchTerm?.trim()) {
      query = query.or(
        `contract_number.ilike.%${searchTerm}%,` +
        `contract_type.ilike.%${searchTerm}%,` +
        `customers.company_name.ilike.%${searchTerm}%,` +
        `customers.contact_person.ilike.%${searchTerm}%`
      );
    }

    // Status filtering with case-insensitive match
    if (status && status !== 'all') {
      query = query.eq('contract_status', status.toLowerCase());
    }

    // Enhanced pagination with safety checks
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);
    const start = (validPage - 1) * validLimit;
    const end = start + validLimit - 1;

    const result = await query
      .range(start, end)
      .order('created_at', { ascending: false });

    // Comprehensive logging
    console.log('Contracts Query Diagnostic:', {
      searchParams: { searchTerm, status, page, limit },
      queryResult: result
    });

    return result;
  } catch (error) {
    console.error('Comprehensive Contracts Fetch Error:', {
      error,
      searchTerm,
      status,
      page,
      limit
    });
    return { data: null, error, count: null };
  }
},

  // Get a single contract by ID with related data
  async getContractById(id: string): Promise<{ data: Contract | null; error: any }> {
    try {
      if (!id?.trim()) {
        return { data: null, error: new Error('Contract ID is required') };
      }

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers:customer_id(
            id,
            name,
            email,
            phone,
            address
          ),
          buildings:building_id(
            id,
            name,
            address,
            city,
            floors,
            elevators_count
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching contract by ID:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('getContractById unexpected error:', err);
      return { data: null, error: err };
    }
  },

  // Create a new contract with validation
  async createContract(contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Contract | null; error: any }> {
    try {
      // Validate required fields
      const requiredFields = ['contract_number', 'contract_type', 'customer_id', 'total_amount', 'start_date', 'end_date'];
      const missingFields = requiredFields.filter(field => !contract[field as keyof typeof contract]);
      
      if (missingFields.length > 0) {
        return { 
          data: null, 
          error: new Error(`Missing required fields: ${missingFields.join(', ')}`) 
        };
      }

      // Check if contract number already exists
      const { data: existingContract } = await supabase
        .from('contracts')
        .select('id')
        .eq('contract_number', contract.contract_number)
        .single();

      if (existingContract) {
        return { 
          data: null, 
          error: new Error('Contract number already exists') 
        };
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('contracts')
        .insert([
          { 
            ...contract,
            created_at: now,
            updated_at: now
          }
        ])
        .select(`
          *,
          customers:customer_id(
            id,
            name,
            email
          ),
          buildings:building_id(
            id,
            name,
            address
          )
        `)
        .single();

      if (error) {
        console.error('Error creating contract:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('createContract unexpected error:', err);
      return { data: null, error: err };
    }
  },

  // Update an existing contract
  async updateContract(id: string, updates: Partial<Contract>): Promise<{ data: Contract | null; error: any }> {
    try {
      if (!id?.trim()) {
        return { data: null, error: new Error('Contract ID is required') };
      }

      // Remove system fields from updates
      const { created_at, id: contractId, ...validUpdates } = updates as any;

      const { data, error } = await supabase
        .from('contracts')
        .update({
          ...validUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          customers:customer_id(
            id,
            name,
            email
          ),
          buildings:building_id(
            id,
            name,
            address
          )
        `)
        .single();

      if (error) {
        console.error('Error updating contract:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('updateContract unexpected error:', err);
      return { data: null, error: err };
    }
  },

  // Delete a contract with validation
  async deleteContract(id: string): Promise<{ error: any }> {
    try {
      if (!id?.trim()) {
        return { error: new Error('Contract ID is required') };
      }

      // Check if contract exists
      const { data: existingContract } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingContract) {
        return { error: new Error('Contract not found') };
      }

      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting contract:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('deleteContract unexpected error:', err);
      return { error: err };
    }
  },

  // Get enhanced contract summary data
  async getContractSummary(): Promise<{ data: ContractSummary | null; error: any }> {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const todayStr = today.toISOString().split('T')[0];
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

      // Get all contract statistics in parallel
      const [
        activeContractsResult,
        totalValueResult,
        expiringSoonResult,
        pendingRenewalResult,
        monthlyRevenueResult
      ] = await Promise.all([
        // Active contracts count
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('contract_status', 'active'),
        
        // Total value of active contracts
        supabase
          .from('contracts')
          .select('total_amount')
          .eq('contract_status', 'active'),
        
        // Contracts expiring within 30 days
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('contract_status', 'active')
          .gte('end_date', todayStr)
          .lte('end_date', thirtyDaysStr),
        
        // Pending renewal contracts
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('contract_status', 'pending'),
        
        // Monthly revenue (current month active contracts)
        supabase
          .from('contracts')
          .select('total_amount, start_date, end_date')
          .eq('contract_status', 'active')
          .lte('start_date', todayStr)
          .gte('end_date', todayStr)
      ]);

      // Check for errors
      const errors = [
        activeContractsResult.error,
        totalValueResult.error,
        expiringSoonResult.error,
        pendingRenewalResult.error,
        monthlyRevenueResult.error
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error('Contract summary errors:', errors);
        return { data: null, error: errors[0] };
      }

      // Calculate values
      const activeContracts = activeContractsResult.count || 0;
      const totalValue = totalValueResult.data?.reduce((sum, contract) => 
        sum + (contract.total_amount || 0), 0) || 0;
      const expiringSoon = expiringSoonResult.count || 0;
      const pendingRenewal = pendingRenewalResult.count || 0;
      
      // Calculate monthly revenue
      const monthlyRevenue = monthlyRevenueResult.data?.reduce((sum, contract) => {
        const monthlyAmount = contract.total_amount / 12; // Assuming annual contracts
        return sum + monthlyAmount;
      }, 0) || 0;

      return {
        data: {
          activeContracts,
          totalValue,
          expiringSoon,
          pendingRenewal,
          monthlyRevenue: Math.round(monthlyRevenue)
        },
        error: null
      };
    } catch (err) {
      console.error('getContractSummary unexpected error:', err);
      return { data: null, error: err };
    }
  },

  // Get all buildings with enhanced data
  async getBuildings() {
  try {
    let query = supabase
      .from('buildings')
      .select(`
        *,
        customers!inner (
          id, 
          company_name, 
          contact_person
        ),
        contract_buildings (
          contracts (
            id,
            contract_number,
            contract_status
          )
        )
      `)
      .eq('is_active', true)
      .order('name');

    const { data, error } = await query;

    if (error) {
      console.error('Detailed Buildings Fetch Error:', {
        error,
        details: error.details,
        hint: error.hint
      });
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected Buildings Fetch Error:', error);
    return { data: null, error };
  }
},

  // Get all customers with enhanced data
  async getCustomers() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        buildings (
          id, 
          name, 
          address
        ),
        contracts (
          id, 
          contract_number, 
          contract_status
        )
      `)
      .eq('is_active', true)
      .order('company_name');

    if (error) {
      console.error('Detailed Customers Fetch Diagnostic:', {
        error,
        errorDetails: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }
      });
      return { data: null, error };
    }

    // Additional logging for data verification
    console.log('Customers Fetch Diagnostic:', {
      customersCount: data?.length,
      firstCustomer: data?.[0]
    });

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected Customers Fetch Error:', error);
    return { data: null, error };
  }
},

  // Get available contract statuses from database
  async getContractStatuses(): Promise<{ data: string[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('contract_status')
        .limit(1000);
        
      if (error) {
        console.error('Error fetching contract statuses:', error);
        return { data: null, error };
      }
        
      const statuses = [...new Set(data.map(contract => contract.contract_status))]
        .filter(Boolean)
        .sort();
      
      console.log('Available contract statuses:', statuses);
      return { data: statuses, error: null };
    } catch (err) {
      console.error('getContractStatuses unexpected error:', err);
      return { data: null, error: err };
    }
  },

  // Get customer by ID
  async getCustomerById(id: string): Promise<{ data: Customer | null; error: any }> {
    try {
      if (!id?.trim()) {
        return { data: null, error: new Error('Customer ID is required') };
      }

      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          contracts:contracts(count),
          buildings:buildings(count)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching customer by ID:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('getCustomerById unexpected error:', err);
      return { data: null, error: err };
    }
  },

  // Get building by ID
  async getBuildingById(id: string): Promise<{ data: Building | null; error: any }> {
    try {
      if (!id?.trim()) {
        return { data: null, error: new Error('Building ID is required') };
      }

      const { data, error } = await supabase
        .from('buildings')
        .select(`
          *,
          contracts:contracts(count),
          customer:customer_id(
            id,
            name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching building by ID:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('getBuildingById unexpected error:', err);
      return { data: null, error: err };
    }
  },

  // Enhanced data fetching for dashboard
  async getAllData(): Promise<{ 
    data: {
      contracts: Contract[] | null;
      summary: ContractSummary | null;
      buildings: Building[] | null;
      customers: Customer[] | null;
    } | null;
    error: any;
  }> {
    try {
      console.log('Fetching all contract data...');
      
      const [contractsResult, summaryResult, buildingsResult, customersResult] = await Promise.all([
        this.getContracts('', '', 1, 100), // Get first 100 contracts
        this.getContractSummary(),
        this.getBuildings(),
        this.getCustomers()
      ]);

      const hasErrors = [
        contractsResult.error,
        summaryResult.error,
        buildingsResult.error,
        customersResult.error
      ].some(Boolean);

      if (hasErrors) {
        console.error('Errors in getAllData:', {
          contractsError: contractsResult.error,
          summaryError: summaryResult.error,
          buildingsError: buildingsResult.error,
          customersError: customersResult.error
        });
      }

      return {
        data: {
          contracts: contractsResult.data,
          summary: summaryResult.data,
          buildings: buildingsResult.data,
          customers: customersResult.data,
        },
        error: contractsResult.error || summaryResult.error || buildingsResult.error || customersResult.error
      };
    } catch (err) {
      console.error('getAllData unexpected error:', err);
      return {
        data: null,
        error: err
      };
    }
  }
};