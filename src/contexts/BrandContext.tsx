import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Brand {
  id: string;
  name: string;
  created_at: string;
  user_id: string | null; // Allow null for default brands
  // Vendor/supplier contact info
  email?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  companyName?: string;
  updatedAt?: string;
}

interface BrandContextType {
  brands: Brand[];
  loadingBrands: boolean;
  addBrand: (name: string, vendorInfo?: Partial<Brand>) => Promise<void>;
  updateBrand: (id: string, updates: Partial<Brand>) => Promise<Brand>;
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
      
      // Transform snake_case to camelCase
      const transformedBrands = (data || []).map(brand => ({
        ...brand,
        phonePrimary: brand.phone_primary,
        phoneSecondary: brand.phone_secondary,
        addressLine1: brand.address_line1,
        addressLine2: brand.address_line2,
        postalCode: brand.postal_code,
        companyName: brand.company_name,
        createdAt: brand.created_at,
        userId: brand.user_id
      }));
      
      setBrands(transformedBrands);
      console.log('BrandContext - brands set to:', transformedBrands);
    } catch (error) {
      console.error('Error fetching brands:', error);
      // On error, show hardcoded default brands as fallback
      setBrands(defaultBrandObjects);
      console.log('BrandContext - fallback to default objects:', defaultBrandObjects);
    } finally {
      setLoadingBrands(false);
    }
  };

  const addBrand = async (name: string, vendorInfo?: Partial<Brand>) => {
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

      const brandData: any = { 
        name: name.trim(), 
        user_id: user.id 
      };

      // Add optional vendor fields if provided
      if (vendorInfo) {
        if (vendorInfo.email) brandData.email = vendorInfo.email;
        if (vendorInfo.phonePrimary) brandData.phone_primary = vendorInfo.phonePrimary;
        if (vendorInfo.phoneSecondary) brandData.phone_secondary = vendorInfo.phoneSecondary;
        if (vendorInfo.addressLine1) brandData.address_line1 = vendorInfo.addressLine1;
        if (vendorInfo.addressLine2) brandData.address_line2 = vendorInfo.addressLine2;
        if (vendorInfo.city) brandData.city = vendorInfo.city;
        if (vendorInfo.state) brandData.state = vendorInfo.state;
        if (vendorInfo.postalCode) brandData.postal_code = vendorInfo.postalCode;
        if (vendorInfo.country) brandData.country = vendorInfo.country;
        if (vendorInfo.notes) brandData.notes = vendorInfo.notes;
        if (vendorInfo.companyName) brandData.company_name = vendorInfo.companyName;
      }

      const { data, error } = await supabase
        .from('brands')
        .insert([brandData])
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

  const updateBrand = async (id: string, updates: Partial<Brand>) => {
    try {
      const updateData: any = {};

      // Map camelCase to snake_case for database
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phonePrimary !== undefined) updateData.phone_primary = updates.phonePrimary;
      if (updates.phoneSecondary !== undefined) updateData.phone_secondary = updates.phoneSecondary;
      if (updates.addressLine1 !== undefined) updateData.address_line1 = updates.addressLine1;
      if (updates.addressLine2 !== undefined) updateData.address_line2 = updates.addressLine2;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.postalCode !== undefined) updateData.postal_code = updates.postalCode;
      if (updates.country !== undefined) updateData.country = updates.country;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.companyName !== undefined) updateData.company_name = updates.companyName;

      const { data, error } = await supabase
        .from('brands')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setBrands(prev => prev.map(b => b.id === id ? data : b));
      return data;
    } catch (error) {
      console.error('Error updating brand:', error);
      throw error;
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
      updateBrand,
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
