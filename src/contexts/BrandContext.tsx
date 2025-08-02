import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Brand {
  id: string;
  name: string;
  created_at: string;
  user_id: string | null; // Allow null for default brands
}

interface BrandContextType {
  brands: Brand[];
  loadingBrands: boolean;
  addBrand: (name: string) => Promise<void>;
  isAddingBrand: boolean;
  addBrandError: string | null;
  refreshBrands: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

// Default brands that are always available
const DEFAULT_BRANDS = [
  'Visionnaire',
  'Arketipo', 
  'Aster',
  'Cattelanitalia',
  'Gamma',
  'Longhi',
  'Kulik Systems',
  'Prestige',
  'Vittoriafrigerio'
];

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [addBrandError, setAddBrandError] = useState<string | null>(null);
  const { user } = useAuth();

  // Create default brand objects
  const defaultBrandObjects: Brand[] = DEFAULT_BRANDS.map(name => ({
    id: `default-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    created_at: '',
    user_id: null // Changed from 'default' to null
  }));

  const refreshBrands = async () => {
    setLoadingBrands(true);
    console.log('BrandContext - refreshBrands called, user:', user);
    try {
      // Fetch all brands - RLS policies handle filtering automatically
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');

      console.log('BrandContext - query result:', { data, error });

      if (error) throw error;
      
      setBrands(data || []);
      console.log('BrandContext - brands set to:', data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      // On error, show hardcoded default brands as fallback
      setBrands(defaultBrandObjects);
      console.log('BrandContext - fallback to default objects:', defaultBrandObjects);
    } finally {
      setLoadingBrands(false);
    }
  };

  const addBrand = async (name: string) => {
    if (!user) return;
    
    setIsAddingBrand(true);
    setAddBrandError(null);
    
    try {
      // Check if brand already exists (case insensitive)
      const existingBrand = brands.find(
        brand => brand.name.toLowerCase() === name.toLowerCase()
      );
      
      if (existingBrand) {
        throw new Error('Brand already exists');
      }

      const { data, error } = await supabase
        .from('brands')
        .insert([{ name: name.trim(), user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      // Add to local state
      setBrands(prev => [...prev, data]);
    } catch (error: any) {
      setAddBrandError(error.message || 'Failed to add brand');
      throw error;
    } finally {
      setIsAddingBrand(false);
    }
  };

  useEffect(() => {
    // Fetch brands when user changes
    refreshBrands();
  }, [user]);

  // Remove the second useEffect that was overwriting the brands
  // Initial load of default brands happens in the first useEffect

  return (
    <BrandContext.Provider value={{
      brands,
      loadingBrands,
      addBrand,
      isAddingBrand,
      addBrandError,
      refreshBrands
    }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
