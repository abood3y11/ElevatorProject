import { supabase } from '../../utils/supabase';
import { InventoryItem, InventorySummary } from './types';

export const inventoryService = {
  // Get all inventory items with optional filters
  async getInventoryItems(
    searchTerm?: string,
    category?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: InventoryItem[] | null; count: number | null; error: Error | null }> {
    let query = supabase
      .from('inventory')
      .select('*', { count: 'exact' });

    // Apply filters if provided
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('name')
      .range(from, to);

    return { data, count, error };
  },

  // Get a single inventory item by ID
  async getInventoryItemById(id: string): Promise<{ data: InventoryItem | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  },

  // Create a new inventory item
  async createInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<{ data: InventoryItem | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('inventory')
      .insert([item])
      .select()
      .single();

    return { data, error };
  },

  // Update an existing inventory item
  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<{ data: InventoryItem | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Delete an inventory item
  async deleteInventoryItem(id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    return { error };
  },

  // Restock an inventory item
  async restockItem(id: string, quantity: number): Promise<{ data: InventoryItem | null; error: Error | null }> {
    // First get the current stock
    const { data: currentItem, error: fetchError } = await supabase
      .from('inventory')
      .select('currentStock, lastRestocked')
      .eq('id', id)
      .single();

    if (fetchError || !currentItem) {
      return { data: null, error: fetchError };
    }

    // Update with new stock amount
    const { data, error } = await supabase
      .from('inventory')
      .update({
        currentStock: currentItem.currentStock + quantity,
        lastRestocked: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Get inventory summary data
  async getInventorySummary(): Promise<{ data: InventorySummary | null; error: Error | null }> {
    // Get total items count
    const { count: totalItems, error: countError } = await supabase
      .from('inventory')
      .select('*', { count: 'exact' });

    // Get low stock items count
    const { data: lowStockData, error: lowStockError } = await supabase
    .from('inventory')
    .select('id, currentStock, minimumStock')
    .filter('currentStock', 'lt', 'minimumStock');

    // Get unique categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('inventory')
      .select('category');

    if (countError || lowStockError || categoriesError) {
      return { 
        data: null, 
        error: countError || lowStockError || categoriesError 
      };
    }

    // Count unique categories
    const uniqueCategories = new Set(categoriesData?.map(item => item.category));

    return {
      data: {
        totalItems: totalItems || 0,
        lowStockItems: lowStockData?.length || 0,
        categories: uniqueCategories.size,
        lastUpdated: new Date().toISOString()
      },
      error: null
    };
  },

  // Get all low stock items
  async getLowStockItems(): Promise<{ data: InventoryItem[] | null; error: Error | null }> {
    // Instead of using supabase.raw, use the less than operator with column references
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .filter('currentStock', 'lt', 'minimumStock')
      .order('currentStock');
  
    return { data, error };
  },

  // Get all inventory categories
  async getCategories(): Promise<{ data: string[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('inventory')
      .select('category');

    if (error || !data) {
      return { data: null, error };
    }

    // Extract unique categories
    const uniqueCategories = [...new Set(data.map(item => item.category))];
    
    return { data: uniqueCategories, error: null };
  }
};