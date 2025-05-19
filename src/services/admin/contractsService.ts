import { supabase } from '../../lib/supabase';
import { Contract, ContractSummary, Building } from './types';

export const contractsService = {
  // Get all contracts with optional filters
  async getContracts(
    searchTerm?: string,
    status?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: Contract[] | null; count: number | null; error: Error | null }> {
    console.log('getContracts called with:', { searchTerm, status, page, limit });
    
    let query = supabase
      .from('contracts')
      .select('*', { count: 'exact' });
  
    // Apply filters if provided
    if (searchTerm) {
      query = query.or(`id.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`);
    }
  
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
  
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    try {
      const { data, error, count } = await query
        .order('createdAt', { ascending: false })
        .range(from, to);
        
      console.log('getContracts result:', { data, error, count });
      
      return { data, count, error };
    } catch (err) {
      console.error('getContracts error:', err);
      return { data: null, count: null, error: err as Error };
    }
  },

  // Get a single contract by ID
  async getContractById(id: string): Promise<{ data: Contract | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  },

  // Create a new contract
  async createContract(contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ data: Contract | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('contracts')
      .insert([
        { 
          ...contract,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update an existing contract
  async updateContract(id: string, updates: Partial<Contract>): Promise<{ data: Contract | null; error: Error | null  }> {
    const { data, error } = await supabase
      .from('contracts')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Delete a contract
  async deleteContract(id: string): Promise<{ error: Error | null  }> {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);

    return { error };
  },

  // Get contract summary data
  async getContractSummary(): Promise<{ data: ContractSummary | null; error: Error | null  }> {
    // Get active contracts count
    const { data: activeContracts, error: activeError } = await supabase
      .from('contracts')
      .select('count', { count: 'exact' })
      .eq('status', 'active');

    // Get total value of all active contracts
    const { data: valueData, error: valueError } = await supabase
      .from('contracts')
      .select('value')
      .eq('status', 'active');

    // Calculate total value
    const totalValue = valueData ? valueData.reduce((sum, contract) => sum + contract.value, 0) : 0;

    // Get expiring soon contracts (within next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data: expiringSoon, error: expiringError } = await supabase
      .from('contracts')
      .select('count', { count: 'exact' })
      .eq('status', 'active')
      .lt('endDate', thirtyDaysFromNow.toISOString())
      .gt('endDate', new Date().toISOString());

    // Get pending renewal contracts
    const { data: pendingRenewal, error: pendingError } = await supabase
      .from('contracts')
      .select('count', { count: 'exact' })
      .eq('status', 'pending-renewal');

    if (activeError || valueError || expiringError || pendingError) {
      return { 
        data: null, 
        error: activeError || valueError || expiringError || pendingError 
      };
    }

    return {
      data: {
        activeContracts: activeContracts?.[0]?.count || 0,
        totalValue,
        expiringSoon: expiringSoon?.[0]?.count  || 0,
        pendingRenewal: pendingRenewal?.[0]?.count  || 0
      },
      error: null
    };
  },

  // Get all buildings for contract association
  async getBuildings(): Promise<{ data: Building[] | null; error: Error | null  }> {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('name');

    return { data, error };
  }
};