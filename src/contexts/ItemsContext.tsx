import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Item {
  id: string;
  description: string;
  brand_name?: string;
  user_id?: string | null;
  created_at?: string;
}

interface ItemsContextType {
  items: Item[];
  loadingItems: boolean;
  addItem: (description: string, brandName?: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<Item>;
  isAddingItem: boolean;
  addItemError: string | null;
  refreshItems: () => Promise<void>;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

// Default items that are always available
const DEFAULT_ITEMS = [
  'Item 1',
  'Item 2',
  'Item 3'
];

export function ItemsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const { user } = useAuth();

  const defaultItemObjects = DEFAULT_ITEMS.map(name => ({
    id: `default-${name}`,
    description: name,
    brand_name: undefined,
    user_id: null,
    created_at: ''
  }));

  const refreshItems = async () => {
    setLoadingItems(true);
    console.log('ItemsContext - refreshItems called, user:', user);
    try {
      // Fetch all items - RLS policies handle filtering automatically
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('description');

      console.log('ItemsContext - query result:', { data, error });

      if (error) throw error;
      
      setItems(data || []);
      console.log('ItemsContext - items set to:', data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      // On error, show hardcoded default items as fallback
      setItems(defaultItemObjects);
      console.log('ItemsContext - fallback to default objects:', defaultItemObjects);
    } finally {
      setLoadingItems(false);
    }
  };

  const addItem = async (description: string, brandName?: string) => {
    if (!user) return;
    
    setIsAddingItem(true);
    setAddItemError(null);
    
    try {
      // Check if item already exists (case insensitive)
      const existingItem = items.find(
        item => item.description.toLowerCase() === description.toLowerCase()
      );
      
      if (existingItem) {
        throw new Error('Item already exists');
      }

      const itemData: any = { 
        description: description.trim(), 
        user_id: user.id 
      };

      // Add optional brand name if provided
      if (brandName) {
        itemData.brand_name = brandName;
      }

      const { data, error } = await supabase
        .from('items')
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;
      
      // Add to local state
      setItems(prev => [...prev, data]);
    } catch (error: any) {
      setAddItemError(error.message || 'Failed to add item');
      throw error;
    } finally {
      setIsAddingItem(false);
    }
  };

  const updateItem = async (id: string, updates: Partial<Item>) => {
    try {
      const updateData: any = {};

      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.brand_name !== undefined) updateData.brand_name = updates.brand_name;

      const { data, error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setItems(prev => prev.map(b => b.id === id ? data : b));
      return data;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Fetch items when user changes
    refreshItems();
  }, [user]);

  return (
    <ItemsContext.Provider value={{
      items,
      loadingItems,
      addItem,
      updateItem,
      isAddingItem,
      addItemError,
      refreshItems
    }}>
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  const context = useContext(ItemsContext);
  if (context === undefined) {
    throw new Error('useItems must be used within an ItemsProvider');
  }
  return context;
}
