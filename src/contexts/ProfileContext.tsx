import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Profile } from '../types';
import { devLog } from '../utils/logging';
import { configureDomainWideAuth, configureTraditionalAuth } from '../services/domainWideGmailService';

interface ProfileContextType {
  profiles: Profile[];
  currentProfile: Profile | null;
  selectProfile: (id: string, passcode?: string, isAutoSelection?: boolean) => Promise<boolean>;
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
  
  // Prevent infinite retry loops
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Add throttling to prevent rapid profile restoration
  const lastProfileRestoreRef = useRef<number>(0);
  const PROFILE_RESTORE_THROTTLE_MS = 2000; // 2 second throttle

  // Get authentication context and Gmail functions
  const { user, initGmail, loading: authLoading } = useAuth();

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
        const now = Date.now();
        
        // Throttle profile restoration to prevent refresh loops
        if (now - lastProfileRestoreRef.current < PROFILE_RESTORE_THROTTLE_MS) {
          devLog.debug('Profile restoration throttled to prevent refresh loop');
          return;
        }
        lastProfileRestoreRef.current = now;
        
        const savedProfileExists = data.find(p => p.id === savedProfileId);
        if (savedProfileExists) {
          devLog.info('Found saved profile ID, fetching full profile data...');
          const fullProfile = await fetchFullProfile(savedProfileId);
          if (fullProfile) {
            devLog.info('Restoring previously selected profile:', fullProfile.name);
            setCurrentProfile(fullProfile);
            
            // Initialize Gmail if the profile has tokens, but handle failures gracefully
            if (fullProfile.gmail_access_token || fullProfile.gmail_refresh_token) {
              // Ensure we have a user with email before initializing Gmail
              if (!user?.email) {
                devLog.debug('No user email available, skipping Gmail initialization for restored profile');
                setError('User email not available. Please refresh the page and try again.');
                return;
              }
              
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
      console.log('🔍 fetchFullProfile: Fetching full profile data for ID:', id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('❌ fetchFullProfile: Error fetching full profile:', error);
        return null;
      }
      
      console.log('✅ fetchFullProfile: Successfully fetched full profile data:', data);
      return data as Profile;
    } catch (err) {
      console.error('💥 fetchFullProfile: Error fetching full profile:', err);
      return null;
    }
  };

  const selectProfile = async (id: string, passcode?: string, isAutoSelection = false): Promise<boolean> => {
    try {
      console.log('🔍 selectProfile: Attempting to select profile with ID:', id);
      console.log('🔍 selectProfile: Current user object:', user);
      console.log('🔍 selectProfile: User email available:', user?.email);
      console.log('🔍 selectProfile: Is auto-selection:', isAutoSelection);
      
      // Fetch the full profile data with all fields including passcode
      const profileToSelect = await fetchFullProfile(id);
      
      if (!profileToSelect) {
        console.error('❌ selectProfile: Profile not found with ID:', id);
        setError('Profile not found');
        return false;
      }
      
      console.log('✅ selectProfile: Found profile to select:', profileToSelect.name);
      
      // Check if profile requires a passcode (skip passcode check for auto-selection of staff profiles)
      if (profileToSelect.passcode && profileToSelect.passcode !== passcode && !isAutoSelection) {
        console.log('❌ selectProfile: Invalid passcode for profile:', profileToSelect.name);
        console.log('🔧 selectProfile: Passcode provided:', passcode, 'Expected:', profileToSelect.passcode);
        setError('Invalid passcode');
        return false;
      }
      
      if (isAutoSelection && profileToSelect.passcode) {
        console.log('🔓 selectProfile: Bypassing passcode check for auto-selection of staff profile:', profileToSelect.name);
      }
      
      console.log('🚀 selectProfile: Setting currentProfile to:', profileToSelect.name);
      setCurrentProfile(profileToSelect);
      sessionStorage.setItem('currentProfileId', id);
      setError(null);
      
      console.log('✅ selectProfile: Successfully selected profile:', profileToSelect.name);
      
      // Configure domain-wide auth using the authenticated user's email
      if (user?.email) {
        console.log('🔑 Configuring domain-wide Gmail auth for user:', user.email);
        configureDomainWideAuth(user.email);
      } else {
        console.log('🔑 No user email found, using traditional auth');
        configureTraditionalAuth();
      }
      
      // Automatically initialize Gmail 
      console.log('📧 selectProfile: Initializing Gmail connection...');
      
      // Ensure we have a user with email before initializing Gmail
      if (!user?.email) {
        console.log('⚠️ selectProfile: No user email available, but profile selection can proceed');
        console.warn('⚠️ Profile selected but Gmail initialization skipped - user email not available');
        // Don't fail the profile selection - just skip Gmail initialization
        return true;
      }
      
      try {
        console.log('🔄 selectProfile: Calling initGmail for profile:', profileToSelect.name);
        await initGmail(profileToSelect);
        console.log('✅ selectProfile: Gmail initialization completed for profile:', profileToSelect.name);
      } catch (gmailError) {
        console.log('❌ selectProfile: Error initializing Gmail for profile:', gmailError);
        // Set a user-friendly error message but don't fail the profile selection
        setError('Gmail authentication failed. You may need to reconnect Gmail for this profile.');
        // Don't fail profile selection - user can still access the app
      }
      
      console.log('🎉 selectProfile: Profile selection completed successfully');
      return true;
    } catch (err) {
      console.error('💥 selectProfile: Error selecting profile:', err);
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
    
    // Configure back to traditional auth when no profile is selected
    devLog.debug('🔑 Clearing profile, switching to traditional auth');
    configureTraditionalAuth();
  };

  // Check authentication status on mount and listen for auth changes
  useEffect(() => {
    async function initializeProfiles() {
      // Wait for auth to finish loading before proceeding
      if (authLoading) {
        devLog.debug('ProfileContext: Auth still loading, waiting...');
        return;
      }

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

    // Listen for manual auth state changes (since we disabled the automatic listener)
    const handleAuthStateChanged = () => {
      devLog.debug('ProfileContext: Received auth state change event, re-initializing');
      initializeProfiles();
    };

    window.addEventListener('auth-state-changed', handleAuthStateChanged);

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChanged);
    };
  }, [user, authLoading]); // Add authLoading to dependency array

  // DEBUG: Log currentProfile changes (keep minimal debugging)
  useEffect(() => {
    devLog.debug('ProfileContext: currentProfile changed to:', currentProfile?.name || 'none');
  }, [currentProfile]);

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