import { supabase } from '../../lib/supabase';
import { User, Customer, UserSummary } from './types';

export const usersService = {
  // Get all users (employees) with optional filters
  async getUsers(
    searchTerm?: string,
    role?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: User[] | null; count: number | null; error: Error | null }> {
    let query = supabase
      .from('employees')
      .select('*', { count: 'exact' });

    // Apply filters if provided
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .eq('isActive', true)
      .order('name')
      .range(from, to);

    return { data, count, error };
  },

  // Get a single user by ID
  async getUserById(id: string): Promise<{ data: User | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  },

  // Create a new user
  async createUser(user: Omit<User, 'id'>): Promise<{ data: User | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('employees')
      .insert([user])
      .select()
      .single();

    return { data, error };
  },

  // Update an existing user
  async updateUser(id: string, updates: Partial<User>): Promise<{ data: User | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Deactivate a user (soft delete)
  async deactivateUser(id: string): Promise<{ data: User | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('employees')
      .update({ isActive: false })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Get all customers with optional filters
  async getCustomers(
    searchTerm?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: Customer[] | null; count: number | null; error: Error | null }> {
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' });

    // Apply filters if provided
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,contactPerson.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .eq('isActive', true)
      .order('name')
      .range(from, to);

    return { data, count, error };
  },

  // Get a single customer by ID
  async getCustomerById(id: string): Promise<{ data: Customer | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  },

  // Create a new customer
  async createCustomer(customer: Omit<Customer, 'id'>): Promise<{ data: Customer | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();

    return { data, error };
  },

  // Update an existing customer
  async updateCustomer(id: string, updates: Partial<Customer>): Promise<{ data: Customer | null; error: Error | null  }> {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Deactivate a customer (soft delete)
  async deactivateCustomer(id: string): Promise<{ data: Customer | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('customers')
      .update({ isActive: false })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Get user/customer summary data
  async getUserSummary(): Promise<{ data: UserSummary | null; error: Error | null }> {
    // Get total active employees count
    const { count: employeesCount, error: employeesError } = await supabase
      .from('employees')
      .select('*', { count: 'exact' })
      .eq('isActive', true);

    // Get total active customers count
    const { count: customersCount, error: customersError } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('isActive', true);

    if (employeesError || customersError) {
      return { 
        data: null, 
        error: employeesError || customersError 
      };
    }

    const totalUsers = (employeesCount || 0) + (customersCount || 0);

    return {
      data: {
        totalUsers,
        activeEmployees: employeesCount || 0,
        activeCustomers: customersCount || 0
      },
      error: null
    };
  },

  // Get all user roles
  async getUserRoles(): Promise<{ data: string[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('employees')
      .select('role');

    if (error || !data) {
      return { data: null, error };
    }

    // Extract unique roles
    const uniqueRoles = [...new Set((data as { role: string }[]).map(user => user.role))];
    
    return { data: uniqueRoles, error: null };
  }
};