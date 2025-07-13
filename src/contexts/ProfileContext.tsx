import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Profile } from '../types';
import { devLog } from '../utils/logging';

interface ProfileContextType {
  profiles: Profile[];
  currentProfile: Profile | null;
  selectProfile: (id: string, passcode?: string) => Promise<boolean>;
  updateProfileSignature: (
    profileId: string,
    signature: string
  ) => Promise<boolean>;
  clearProfile: () => void;
  isLoading: boolean;
  error: string | null;
  fetchProfiles: () => Promise<void>;
  fetchFullProfile: (id: string) => Promise<Profile | null>;
}

export const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track authentication state directly with Supabase
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Prevent infinite retry loops
  const [isInitializing, setIsInitializing] = useState(false);

  // Get authentication context and Gmail functions
  const { user, initGmail } = useAuth();

  const fetchProfiles = async () => {
    // Only fetch profiles if user is authenticated
    if (!user) {
      devLog.debug('ProfileContext: No user, skipping profile fetch');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      devLog.debug('fetchProfiles: Fetching profiles...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, passcode')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      devLog.debug(`fetchProfiles: Loaded ${data?.length || 0} profiles`);
      setProfiles(data || []);
      
      // Try to restore previously selected profile from sessionStorage
      const savedProfileId = sessionStorage.getItem('currentProfileId');
      if (savedProfileId && data) {
        const savedProfileExists = data.find(p => p.id === savedProfileId);
        if (savedProfileExists) {
          devLog.info('Found saved profile ID, fetching full profile data...');
          const fullProfile = await fetchFullProfile(savedProfileId);
          if (fullProfile) {
            devLog.info('Restoring previously selected profile:', fullProfile.name);
            setCurrentProfile(fullProfile);
            
            // Initialize Gmail if the profile has tokens, but handle failures gracefully
            if (fullProfile.gmail_access_token || fullProfile.gmail_refresh_token) {
              try {
                await initGmail(fullProfile);
                devLog.debug('Gmail initialized for restored profile');
              } catch (err) {
                devLog.debug('Gmail initialization failed for restored profile, clearing invalid tokens:', err);
                // If Gmail init fails, clear the profile to prevent infinite retry
                // This forces the user to re-authenticate with Gmail
                setCurrentProfile(null);
                sessionStorage.removeItem('currentProfileId');
                setError('Gmail authentication expired. Please select your profile again.');
                return;
              }
            }
          } else {
            devLog.debug('Failed to fetch full profile data, clearing sessionStorage');
            sessionStorage.removeItem('currentProfileId');
            setCurrentProfile(null);
          }
        } else {
          devLog.debug('Saved profile ID not found in current profiles, clearing sessionStorage');
          sessionStorage.removeItem('currentProfileId');
          setCurrentProfile(null);
        }
      } else {
        devLog.info('No saved profile found - user must choose a profile');
        setCurrentProfile(null);
      }
    } catch (err) {
      devLog.error('fetchProfiles: Error fetching profiles:', err);
      setError(err instanceof Error ? err.message : 'Unknown error fetching profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFullProfile = async (id: string): Promise<Profile | null> => {
    try {
      devLog.debug('fetchFullProfile: Fetching full profile data for ID:', id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        devLog.error('fetchFullProfile: Error fetching full profile:', error);
        return null;
      }
      
      devLog.debug('fetchFullProfile: Successfully fetched full profile data');
      return data as Profile;
    } catch (err) {
      devLog.error('fetchFullProfile: Error fetching full profile:', err);
      return null;
    }
  };

  const selectProfile = async (id: string, passcode?: string): Promise<boolean> => {
    try {
      devLog.debug('selectProfile: Attempting to select profile with ID:', id);
      
      // Fetch the full profile data with all fields including passcode
      const profileToSelect = await fetchFullProfile(id);
      
      if (!profileToSelect) {
        devLog.error('selectProfile: Profile not found with ID:', id);
        setError('Profile not found');
        return false;
      }
      
      devLog.debug('selectProfile: Found profile to select:', profileToSelect.name);
      
      // Check if profile requires a passcode
      if (profileToSelect.passcode && profileToSelect.passcode !== passcode) {
        devLog.debug('selectProfile: Invalid passcode for profile:', profileToSelect.name);
        setError('Invalid passcode');
        return false;
      }
      
      setCurrentProfile(profileToSelect);
      sessionStorage.setItem('currentProfileId', id);
      setError(null);
      
      devLog.info('selectProfile: Successfully selected profile:', profileToSelect.name);
      
      // Automatically initialize Gmail if profile has tokens
      if (profileToSelect.gmail_access_token || profileToSelect.gmail_refresh_token) {
        devLog.debug('selectProfile: Profile has Gmail tokens, initializing Gmail connection...');
        try {
          await initGmail(profileToSelect);
          devLog.debug('selectProfile: Gmail initialization completed for profile:', profileToSelect.name);
        } catch (gmailError) {
          devLog.debug('selectProfile: Error initializing Gmail for profile:', gmailError);
          // Set a user-friendly error message but don't fail the profile selection
          setError('Gmail authentication failed. You may need to reconnect Gmail for this profile.');
          // Don't fail profile selection - user can still access the app
        }
      } else {
        devLog.debug('selectProfile: Profile has no Gmail tokens, skipping Gmail initialization');
      }
      
      return true;
    } catch (err) {
      devLog.error('selectProfile: Error selecting profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error selecting profile');
      return false;
    }
  };

  const updateProfileSignature = async (
    profileId: string,
    signature: string
  ): Promise<boolean> => {
    try {
      devLog.debug('ProfileContext: Updating signature for profile:', profileId);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          signature: signature
        })
        .eq('id', profileId)
        .select()

      if (error) {
        devLog.error('ProfileContext: Supabase error:', error);
        throw error;
      }

      // This is a crucial check. If RLS prevents the select after update, `data` will be an empty array.
      if (!data || data.length === 0) {
        devLog.warn('ProfileContext: Signature update did not return data. This is likely a Row Level Security (RLS) issue where the user lacks SELECT permission on the updated row.');
        throw new Error('Save failed due to a permission issue. The signature may have been saved, but it could not be verified. Please check the Row Level Security SELECT policy on the "profiles" table for authenticated users.');
      }

      devLog.debug('ProfileContext: Signature update successful, returned data:', data[0]);

      // Update the profiles array
      setProfiles(prevProfiles => 
        prevProfiles.map(profile => 
          profile.id === profileId 
            ? {
                ...profile,
                signature: signature
              }
            : profile
        )
      );

      // Update current profile if it's the one being updated
      if (currentProfile?.id === profileId) {
        setCurrentProfile(prev => prev ? {
          ...prev,
          signature: signature
        } : null);
      }

      devLog.debug('ProfileContext: Successfully updated signature in state');
      return true;
    } catch (err) {
      devLog.error('ProfileContext: Error updating profile signature:', err);
      setError(err instanceof Error ? err.message : 'Unknown error updating signature');
      return false;
    }
  };

  const clearProfile = () => {
    devLog.debug('ProfileContext: Clearing current profile');
    setCurrentProfile(null);
    sessionStorage.removeItem('selectedProfileId');
    sessionStorage.removeItem('currentProfileId');
    setError(null);
  };

  // Check authentication status on mount and listen for auth changes
  useEffect(() => {
    async function initializeProfiles() {
      if (!user) {
        devLog.debug('ProfileContext: User not authenticated');
        setProfiles([]);
        setCurrentProfile(null);
        setIsLoading(false);
        return;
      }

      // Prevent multiple simultaneous initializations
      if (isInitializing) {
        devLog.debug('ProfileContext: Already initializing, skipping...');
        return;
      }

      setIsInitializing(true);

      try {
        // Check authentication via Supabase directly
        const { data } = await supabase.auth.getSession();
        const authenticated = !!data.session;
        
        devLog.debug('ProfileContext: Authentication check completed, authenticated =', authenticated);
        setIsAuthenticated(authenticated);
        setAuthLoading(false);

        if (authenticated) {
          devLog.debug('ProfileContext: Authenticated, fetching profiles');
          await fetchProfiles();
        } else {
          devLog.debug('ProfileContext: Not authenticated, clearing profiles');
          setProfiles([]);
          setCurrentProfile(null);
          setIsLoading(false);
        }
      } finally {
        setIsInitializing(false);
      }
    }

    initializeProfiles();

    // Set up an auth state listener to detect changes to authentication
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        devLog.debug('ProfileContext: Auth state changed:', event);
        setIsAuthenticated(!!session);

        // If the user signed out, clear profiles
        if (event === 'SIGNED_OUT') {
          setProfiles([]);
          setCurrentProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [user]);

  // DEBUG: Log currentProfile changes
  useEffect(() => {
    devLog.debug('ProfileContext: currentProfile changed to:', currentProfile?.name || 'none');
  }, [currentProfile]);

  // DEBUG: Log auth state changes
  useEffect(() => {
    devLog.debug('ProfileContext: Auth state - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated);
  }, [authLoading, isAuthenticated]);

  // Listen for Gmail token updates from AuthContext
  useEffect(() => {
    const handleGmailTokensUpdated = (event: CustomEvent) => {
      const { profileId, gmailAccessToken, gmailRefreshToken, gmailTokenExpiry } = event.detail;
      devLog.debug('ProfileContext: Received Gmail tokens update for profile:', profileId);
      
      // Update the profiles array
      setProfiles(prevProfiles => 
        prevProfiles.map(profile => 
          profile.id === profileId 
            ? {
                ...profile,
                gmail_access_token: gmailAccessToken || undefined,
                gmail_refresh_token: gmailRefreshToken || undefined,
                gmail_token_expiry: gmailTokenExpiry || undefined
              }
            : profile
        )
      );

      // Update current profile if it's the one being updated
      if (currentProfile?.id === profileId) {
        setCurrentProfile(prev => prev ? {
          ...prev,
          gmail_access_token: gmailAccessToken || undefined,
          gmail_refresh_token: gmailRefreshToken || undefined,
          gmail_token_expiry: gmailTokenExpiry || undefined
        } : null);
      }
    };

    window.addEventListener('gmail-tokens-updated', handleGmailTokensUpdated as EventListener);
    
    return () => {
      window.removeEventListener('gmail-tokens-updated', handleGmailTokensUpdated as EventListener);
    };
  }, [currentProfile]);

  const value = {
    profiles,
    currentProfile,
    selectProfile,
    updateProfileSignature,
    isLoading,
    error,
    fetchProfiles,
    fetchFullProfile,
    clearProfile
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}