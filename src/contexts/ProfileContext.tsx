import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';
import { Profile } from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ProfileContextType {
  profiles: Profile[];
  currentProfile: Profile | null;
  selectProfile: (id: string, passcode?: string) => Promise<boolean>;
  updateProfileSignature: (
    profileId: string,
    signature: string
  ) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  fetchProfiles: () => Promise<void>;
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

  // Get authentication context and Gmail functions
  const { user, initGmail } = useAuth();

  const fetchProfiles = async () => {
    // Only fetch profiles if user is authenticated
    if (!user) {
      console.log('fetchProfiles: User not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('fetchProfiles: Starting to fetch profiles from Supabase...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      console.log('fetchProfiles: Profiles fetched from Supabase:', data);
      setProfiles(data);
      
      // Load the last selected profile from localStorage if available
      const savedProfileId = localStorage.getItem('currentProfileId');
      console.log('fetchProfiles: Saved profile ID from localStorage:', savedProfileId);
      
      let profileToAutoInit = null;
      
      if (savedProfileId && data.length > 0) {
        const savedProfile = data.find(profile => profile.id === savedProfileId);
        console.log('fetchProfiles: Found saved profile:', savedProfile);
        
        if (savedProfile) {
          setCurrentProfile(savedProfile);
          profileToAutoInit = savedProfile;
          console.log('fetchProfiles: Set current profile to saved profile:', savedProfile);
        } else {
          // If saved profile not found, select the first profile
          setCurrentProfile(data[0]);
          profileToAutoInit = data[0];
          localStorage.setItem('currentProfileId', data[0].id);
          console.log('fetchProfiles: Saved profile not found, set current profile to first profile:', data[0]);
        }
      } else if (data.length > 0) {
        // If no saved profile, select the first profile
        setCurrentProfile(data[0]);
        profileToAutoInit = data[0];
        localStorage.setItem('currentProfileId', data[0].id);
        console.log('fetchProfiles: No saved profile, set current profile to first profile:', data[0]);
      } else {
        console.log('fetchProfiles: No profiles found in database');
      }
      
      // Automatically initialize Gmail if the selected profile has tokens
      if (profileToAutoInit && (profileToAutoInit.gmail_access_token || profileToAutoInit.gmail_refresh_token)) {
        console.log('fetchProfiles: Auto-initializing Gmail for profile:', profileToAutoInit.name);
        try {
          await initGmail(profileToAutoInit);
          console.log('fetchProfiles: Gmail auto-initialization completed for profile:', profileToAutoInit.name);
        } catch (gmailError) {
          console.error('fetchProfiles: Error auto-initializing Gmail for profile:', gmailError);
          // Don't fail profile loading if Gmail init fails
        }
      } else if (profileToAutoInit) {
        console.log('fetchProfiles: Profile has no Gmail tokens, skipping auto-initialization');
      }
    } catch (err) {
      console.error('fetchProfiles: Error fetching profiles:', err);
      setError(err instanceof Error ? err.message : 'Unknown error fetching profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const selectProfile = async (id: string, passcode?: string): Promise<boolean> => {
    try {
      console.log('selectProfile: Attempting to select profile with ID:', id);
      console.log('selectProfile: Available profiles:', profiles);
      
      const profileToSelect = profiles.find(profile => profile.id === id);
      
      if (!profileToSelect) {
        console.error('selectProfile: Profile not found with ID:', id);
        setError('Profile not found');
        return false;
      }
      
      console.log('selectProfile: Found profile to select:', profileToSelect);
      
      // Check if profile requires a passcode
      if (profileToSelect.passcode && profileToSelect.passcode !== passcode) {
        console.error('selectProfile: Invalid passcode for profile:', profileToSelect.name);
        setError('Invalid passcode');
        return false;
      }
      
      setCurrentProfile(profileToSelect);
      localStorage.setItem('currentProfileId', id);
      setError(null);
      
      console.log('selectProfile: Successfully selected profile:', profileToSelect);
      console.log('selectProfile: Updated localStorage with profile ID:', id);
      
      // Automatically initialize Gmail if profile has tokens
      if (profileToSelect.gmail_access_token || profileToSelect.gmail_refresh_token) {
        console.log('selectProfile: Profile has Gmail tokens, initializing Gmail connection...');
        try {
          await initGmail(profileToSelect);
          console.log('selectProfile: Gmail initialization completed for profile:', profileToSelect.name);
        } catch (gmailError) {
          console.error('selectProfile: Error initializing Gmail for profile:', gmailError);
          // Don't fail profile selection if Gmail init fails
        }
      } else {
        console.log('selectProfile: Profile has no Gmail tokens, skipping Gmail initialization');
      }
      
      return true;
    } catch (err) {
      console.error('selectProfile: Error selecting profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error selecting profile');
      return false;
    }
  };

  const updateProfileSignature = async (
    profileId: string,
    signature: string
  ): Promise<boolean> => {
    try {
      console.log('Updating signature for profile:', profileId);
      const { error } = await supabase
        .from('profiles')
        .update({
          signature: signature
        })
        .eq('id', profileId);

      if (error) {
        throw error;
      }

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

      console.log('Successfully updated signature');
      return true;
    } catch (err) {
      console.error('Error updating profile signature:', err);
      setError(err instanceof Error ? err.message : 'Unknown error updating signature');
      return false;
    }
  };

  // Check authentication status on mount and listen for auth changes
  useEffect(() => {
    async function initializeProfiles() {
      if (!user) {
        console.log('ProfileContext: User not authenticated');
        setProfiles([]);
        setCurrentProfile(null);
        setIsLoading(false);
        return;
      }

      // Check authentication via Supabase directly
      const { data } = await supabase.auth.getSession();
      const authenticated = !!data.session;
      
      console.log('ProfileContext: Authentication check completed, authenticated =', authenticated);
      setIsAuthenticated(authenticated);
      setAuthLoading(false);

      if (authenticated) {
        console.log('ProfileContext: Authenticated, fetching profiles');
        fetchProfiles();
      } else {
        console.log('ProfileContext: Not authenticated, clearing profiles');
        setProfiles([]);
        setCurrentProfile(null);
        setIsLoading(false);
      }
    }

    initializeProfiles();

    // Set up an auth state listener to detect changes to authentication
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('ProfileContext: Auth state changed:', event);
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
    console.log('ProfileContext: currentProfile changed to:', currentProfile);
  }, [currentProfile]);

  // DEBUG: Log auth state changes
  useEffect(() => {
    console.log('ProfileContext: Auth state - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated);
  }, [authLoading, isAuthenticated]);

  // Listen for Gmail token updates from AuthContext
  useEffect(() => {
    const handleGmailTokensUpdated = (event: CustomEvent) => {
      const { profileId, gmailAccessToken, gmailRefreshToken, gmailTokenExpiry } = event.detail;
      console.log('ProfileContext: Received Gmail tokens update for profile:', profileId);
      
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
    fetchProfiles
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