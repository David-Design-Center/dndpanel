import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Item {
  id: string;
  description: string;
  brand_name?: string;
  user_id?: string;
  created_at: string;
}

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const { user } = useAuth();

  const refreshItems = async () => {
    console.log('useItems - refreshItems called');
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('description');

      console.log('useItems - query result:', { data, error });

      if (error) throw error;
      
      setItems(data || []);
      console.log('useItems - items set to:', data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const addItem = async (description: string) => {
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

      const { data, error } = await supabase
        .from('items')
        .insert([{ 
          description: description.trim(), 
          user_id: user.id 
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Add to local state
      setItems(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      setAddItemError(error.message || 'Failed to add item');
      throw error;
    } finally {
      setIsAddingItem(false);
    }
  };

  const updateItem = async (id: string, description: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('items')
        .update({ 
          description: description.trim()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setItems(prev => prev.map(item => 
        item.id === id ? data : item
      ));
      return data;
    } catch (error: any) {
      console.error('Error updating item:', error);
      throw error;
    }
  };

  useEffect(() => {
    refreshItems();
  }, [user]);

  return {
    items,
    loadingItems,
    addItem,
    updateItem,
    isAddingItem,
    addItemError,
    refreshItems
  };
}
