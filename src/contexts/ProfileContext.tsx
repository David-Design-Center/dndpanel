import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Profile } from '../types';
import { devLog } from '../utils/logging';
import { configureDomainWideAuth, configureTraditionalAuth } from '../services/domainWideGmailService';
import { clearEmailCacheForProfileSwitch } from '../services/emailService';
import { clearCurrentAccessToken } from '../integrations/gapiService';
import { fetchGmailSignature } from '../services/gmailSignatureService';

interface ProfileContextType {
  profiles: Profile[];
  currentProfile: Profile | null;
  gmailSignature: string;
  selectProfile: (id: string, passcode?: string, isAutoSelection?: boolean) => Promise<boolean>;
  clearProfile: () => void;
  isLoading: boolean;
  error: string | null;
  fetchProfiles: () => Promise<void>;
  fetchFullProfile: (id: string) => Promise<Profile | null>;
  authFlowCompleted: boolean;
}

export const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [gmailSignature, setGmailSignature] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent infinite retry loops
  const [isInitializing, setIsInitializing] = useState(false);

  // Authentication flow state management
  const [authFlowCompleted, setAuthFlowCompleted] = useState(false);

  // Get authentication context and Gmail functions
  const { user, initGmail, loading: authLoading } = useAuth();
  
  // Router navigation for clearing URLs when switching profiles
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on auth page to determine flow state
  const isOnAuthPage = location.pathname === '/auth';
  const isOnProfilePickerPage = location.pathname === '/profile-picker' || location.pathname === '/';

  // Clear everything when on auth page
  useEffect(() => {
    if (isOnAuthPage) {
      setProfiles([]);
      setCurrentProfile(null);
      setAuthFlowCompleted(false);
      // Clear all session storage
      sessionStorage.clear();
      setIsLoading(false);
    }
  }, [isOnAuthPage]);

  const fetchProfiles = async () => {
    // SECURITY: Block all fetching if on auth page
    if (isOnAuthPage) {
      return;
    }

    // Only fetch profiles if user is authenticated
    if (!user) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, passcode, is_admin, userEmail')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      setProfiles(data || []);
      
      // Mark auth flow as completed for profile picker page
      if (isOnProfilePickerPage && user) {
        setAuthFlowCompleted(true);
      }
      
    } catch (err) {
      console.error('❌ Error fetching profiles:', err);
      setError(err instanceof Error ? err.message : 'Unknown error fetching profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFullProfile = async (id: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('❌ fetchFullProfile: Error fetching full profile:', error);
        return null;
      }
      
      return data as Profile;
    } catch (err) {
      console.error('💥 fetchFullProfile: Error fetching full profile:', err);
      return null;
    }
  };

  // Auto-select profile for staff members (non-admin)
  const autoSelectStaffProfile = async () => {
    if (!user?.email || isOnAuthPage) return;

    try {
      // Fetch profile associated with this email
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, is_admin, userEmail')
        .eq('userEmail', user.email)
        .single();

      if (error || !data) {
        return;
      }

      // If user is admin, don't auto-select
      if (data.is_admin) {
        return;
      }

      await selectProfile(data.id, undefined, true);
      
    } catch (err) {
      console.error('❌ Error in auto-selection:', err);
    }
  };

  const selectProfile = async (id: string, passcode?: string, isAutoSelection = false): Promise<boolean> => {
    try {
      // Fetch the full profile data with all fields including passcode
      const profileToSelect = await fetchFullProfile(id);
      
      if (!profileToSelect) {
        console.error('❌ selectProfile: Profile not found with ID:', id);
        setError('Profile not found');
        return false;
      }
      
      // Check if profile requires a passcode (skip passcode check for auto-selection of staff profiles)
      if (profileToSelect.passcode && profileToSelect.passcode !== passcode && !isAutoSelection) {
        setError('Invalid passcode');
        return false;
      }
      
      // CRITICAL: Clear all cached data when switching profiles
      
      // Clear browser URL if currently viewing a specific email or profile-specific page
      const currentPath = location.pathname;
      const isViewingEmail = currentPath.includes('/email/');
      const isProfileSpecificRoute = currentPath.includes('/compose') || currentPath.includes('/view') || isViewingEmail;
      
      if (isProfileSpecificRoute && !isAutoSelection) {
        navigate('/inbox', { replace: true });
      }
      
      // Clear session storage data that might be profile-specific
      const keysToKeep = ['currentProfileId']; // Keep the profile ID we're switching to
      Object.keys(sessionStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Clear emailService cache specifically for profile switch
      clearEmailCacheForProfileSwitch(profileToSelect.id);
      
      // CRITICAL: Clear GAPI client token to force fresh token for new profile
      console.log('🔑 Clearing GAPI client token for profile switch');
      clearCurrentAccessToken();
      
      // Clear all caches to prevent data leakage between profiles
      console.log('🔄 Dispatching clear-all-caches event for profile switch');
      window.dispatchEvent(new CustomEvent('clear-all-caches', {
        detail: { newProfile: profileToSelect.name, oldProfile: currentProfile?.name }
      }));
      
      setCurrentProfile(profileToSelect);
      sessionStorage.setItem('currentProfileId', id);
      
      // Store user email globally for token refresh
      if (profileToSelect.userEmail) {
        (window as any)._currentProfileEmail = profileToSelect.userEmail;
        localStorage.setItem('currentProfileUserEmail', profileToSelect.userEmail);
        console.log('📧 Set current user email:', profileToSelect.userEmail);
      } else {
        (window as any)._currentProfileEmail = null;
        localStorage.removeItem('currentProfileUserEmail');
        console.warn('⚠️ Profile has no userEmail');
      }
      
      setError(null);
      
      // Configure authentication method based on profile email
      if (profileToSelect.userEmail) {
        const isDomainUser = profileToSelect.userEmail.endsWith('@dnddesigncenter.com');
        
        if (isDomainUser) {
          configureDomainWideAuth(profileToSelect.userEmail);
        } else {
          // For external users, use traditional OAuth
          configureTraditionalAuth();
        }
      } else {
        console.warn('Profile has no userEmail, using traditional auth');
        configureTraditionalAuth();
      }
      
      // Automatically initialize Gmail 
      
      // Ensure we have a user with email before initializing Gmail
      if (!user?.email) {
        // Don't fail the profile selection - just skip Gmail initialization
        // Still mark auth flow as completed so data contexts can fetch
        setAuthFlowCompleted(true);
        return true;
      }
      
      try {
        // Wait for Gmail initialization to complete
        await initGmail(profileToSelect);
        
        // Start automatic token refresh scheduler
        const { startTokenRefreshScheduler } = await import('../integrations/gapiService');
        startTokenRefreshScheduler();
        console.log('✅ Token refresh scheduler started for profile:', profileToSelect.name);
        
        // CRITICAL: Clear old signature and fetch fresh from Gmail
        setGmailSignature('');
        if (profileToSelect.userEmail) {
          try {
            console.log('📝 Fetching Gmail signature for new profile:', profileToSelect.userEmail);
            const sig = await fetchGmailSignature(profileToSelect.userEmail);
            setGmailSignature(sig || '');
            console.log('✅ Loaded Gmail signature, length:', sig?.length || 0);
          } catch (sigError) {
            console.error('⚠️ Failed to fetch Gmail signature:', sigError);
            // Don't fail profile switch for signature error
          }
        }
        
        // CRITICAL: Mark auth flow as completed after successful profile selection
        // This allows all data contexts to start fetching
        setAuthFlowCompleted(true);
        
        // Force refresh all data contexts after Gmail is ready
        setTimeout(() => {
          console.log('🔄 Force refreshing all data after profile switch');
          window.dispatchEvent(new CustomEvent('force-refresh-data', {
            detail: { newProfile: profileToSelect.name }
          }));
        }, 1000);
        
      } catch (gmailError) {
        console.log('❌ selectProfile: Error initializing Gmail for profile:', gmailError);
        // Set a user-friendly error message but don't fail the profile selection
        setError('Gmail authentication failed. You may need to reconnect Gmail for this profile.');
        // Don't fail profile selection - user can still access the app
        
        // Clear signature when Gmail fails
        setGmailSignature('');
        
        // Still mark auth flow as completed even if Gmail fails
        setAuthFlowCompleted(true);
      }
      
      return true;
    } catch (err) {
      console.error('💥 selectProfile: Error selecting profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error selecting profile');
      return false;
    }
  };

  const clearProfile = () => {
    devLog.debug('ProfileContext: Clearing current profile');
    
    // CRITICAL: Clear Gmail signature
    setGmailSignature('');
    
    // CRITICAL: Clear all cached data to prevent data leakage between profiles
    // This ensures "Log Out" behaves the same as switching profiles
    
    // Clear session storage data that might be profile-specific
    const keysToKeep: string[] = []; // Don't keep anything when logging out
    Object.keys(sessionStorage).forEach(key => {
      if (!keysToKeep.includes(key)) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Clear emailService cache
    clearEmailCacheForProfileSwitch('');
    
    // Clear GAPI client token
    console.log('🔑 Clearing GAPI client token (profile cleared)');
    clearCurrentAccessToken();
    
    // Dispatch clear-all-caches event to clear contacts, labels, etc.
    console.log('🔄 Dispatching clear-all-caches event (profile cleared)');
    window.dispatchEvent(new CustomEvent('clear-all-caches', {
      detail: { newProfile: null, oldProfile: currentProfile?.name }
    }));
    
    setCurrentProfile(null);
    
    // Stop token refresh scheduler
    import('../integrations/gapiService').then(({ stopTokenRefreshScheduler }) => {
      stopTokenRefreshScheduler();
      console.log('🛑 Token refresh scheduler stopped (profile cleared)');
    });
    
    // Clear user email from global storage
    (window as any)._currentProfileEmail = null;
    localStorage.removeItem('currentProfileUserEmail');
    console.log('📧 Cleared current user email');
    
    setError(null);
    
    // Reset auth flow state so data contexts don't fetch until new profile is selected
    setAuthFlowCompleted(false);
    
    // Configure back to traditional auth when no profile is selected
    devLog.debug('🔑 Clearing profile, switching to traditional auth');
    configureTraditionalAuth();
  };

  // Check authentication status on mount and listen for auth changes
  useEffect(() => {
    async function initializeProfiles() {
      // SECURITY: Block everything on auth page
      if (isOnAuthPage) {
        return;
      }

      // Wait for auth to finish loading before proceeding
      if (authLoading) {
        return;
      }

      if (!user) {
        setProfiles([]);
        setCurrentProfile(null);
        setIsLoading(false);
        return;
      }

      // Prevent multiple simultaneous initializations
      if (isInitializing) {
        return;
      }

      setIsInitializing(true);

      try {
        // Check authentication via Supabase directly
        const { data } = await supabase.auth.getSession();
        const authenticated = !!data.session;

        if (authenticated) {
          // Strategy: Different behavior based on current page and user type
          if (isOnProfilePickerPage) {
            await fetchProfiles();
          } else {
            await autoSelectStaffProfile();
          }
        } else {
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
      initializeProfiles();
    };

    window.addEventListener('auth-state-changed', handleAuthStateChanged);

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChanged);
    };
  }, [user, authLoading, isOnAuthPage, isOnProfilePickerPage]); // Add page dependencies

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
    gmailSignature,
    selectProfile,
    isLoading,
    error,
    fetchProfiles,
    fetchFullProfile,
    clearProfile,
    authFlowCompleted
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