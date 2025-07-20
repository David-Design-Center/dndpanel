// Out of Office Management Service
// Provides utilities for managing out-of-office status across the application

import { supabase } from '../lib/supabase';

export interface OutOfOfficeStatus {
  profileName: string;
  isOutOfOffice: boolean;
  lastUpdated: string;
}

/**
 * Get out-of-office status for all profiles
 * @returns Promise<OutOfOfficeStatus[]> Array of out-of-office statuses
 */
export const getAllOutOfOfficeStatuses = async (): Promise<OutOfOfficeStatus[]> => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('name, out_of_office_status, updated_at')
      .in('name', ['David', 'Marti']);

    if (error) {
      console.error('Error fetching out-of-office statuses:', error);
      throw error;
    }

    return profiles?.map(profile => ({
      profileName: profile.name,
      isOutOfOffice: profile.out_of_office_status || false,
      lastUpdated: profile.updated_at || new Date().toISOString()
    })) || [];
  } catch (error) {
    console.error('Error in getAllOutOfOfficeStatuses:', error);
    return [];
  }
};

/**
 * Get out-of-office status for a specific profile
 * @param profileName The name of the profile
 * @returns Promise<boolean> True if out of office, false otherwise
 */
export const getOutOfOfficeStatus = async (profileName: string): Promise<boolean> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('out_of_office_status')
      .eq('name', profileName)
      .single();

    if (error) {
      console.error(`Error fetching out-of-office status for ${profileName}:`, error);
      return false;
    }

    return profile?.out_of_office_status || false;
  } catch (error) {
    console.error(`Error in getOutOfOfficeStatus for ${profileName}:`, error);
    return false;
  }
};

/**
 * Update out-of-office status for a profile
 * @param profileName The name of the profile
 * @param isOutOfOffice The new out-of-office status
 * @returns Promise<boolean> True if successful, false otherwise
 */
export const updateOutOfOfficeStatus = async (
  profileName: string, 
  isOutOfOffice: boolean
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        out_of_office_status: isOutOfOffice,
        updated_at: new Date().toISOString()
      })
      .eq('name', profileName);

    if (error) {
      console.error(`Error updating out-of-office status for ${profileName}:`, error);
      return false;
    }

    console.log(`✅ Successfully updated ${profileName}'s out-of-office status to: ${isOutOfOffice}`);
    return true;
  } catch (error) {
    console.error(`Error in updateOutOfOfficeStatus for ${profileName}:`, error);
    return false;
  }
};

/**
 * Check if any profile is currently out of office
 * @returns Promise<boolean> True if anyone is out of office, false otherwise
 */
export const isAnyoneOutOfOffice = async (): Promise<boolean> => {
  try {
    const statuses = await getAllOutOfOfficeStatuses();
    return statuses.some(status => status.isOutOfOffice);
  } catch (error) {
    console.error('Error checking if anyone is out of office:', error);
    return false;
  }
};

/**
 * Get names of all profiles currently out of office
 * @returns Promise<string[]> Array of profile names that are out of office
 */
export const getOutOfOfficeProfiles = async (): Promise<string[]> => {
  try {
    const statuses = await getAllOutOfOfficeStatuses();
    return statuses
      .filter(status => status.isOutOfOffice)
      .map(status => status.profileName);
  } catch (error) {
    console.error('Error getting out-of-office profiles:', error);
    return [];
  }
};
