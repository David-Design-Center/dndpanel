import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, Session } from '../types';
import { initGapiClient, isGmailSignedIn as checkGmailSignedIn, signInToGmail, signOutFromGmail, setAccessToken } from '../integrations/gapiService';

// Initialize Supabase client with persistent session storage
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: false, // Disable auto refresh to prevent page refreshes
    persistSession: true,
    detectSessionInUrl: false, // Disable URL session detection to prevent refreshes
    flowType: 'implicit' // Use implicit flow to reduce auth events
  }
});

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  loading: boolean;
  isGmailSignedIn: boolean;
  isGmailApiReady: boolean;
  initGmail: (profile: any) => Promise<void>;
  signInGmail: (profile: any) => Promise<void>;
  signOutGmail: (profile: any) => Promise<void>;
  refreshGmailToken: (profile: any) => Promise<boolean>;
  updateProfileGmailTokens: (
    profileId: string,
    gmailAccessToken: string | null,
    gmailRefreshToken: string | null,
    gmailTokenExpiry: string | null
  ) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGmailSignedIn, setIsGmailSignedIn] = useState(false);
  const [isGmailApiReady, setIsGmailApiReady] = useState(false);
  
  // Function to update profile Gmail tokens directly via Supabase
  const updateProfileGmailTokens = useCallback(async (
    profileId: string,
    gmailAccessToken: string | null,
    gmailRefreshToken: string | null,
    gmailTokenExpiry: string | null
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          gmail_access_token: gmailAccessToken,
          gmail_refresh_token: gmailRefreshToken,
          gmail_token_expiry: gmailTokenExpiry
        })
        .eq('id', profileId);

      if (error) {
        console.error('Error updating profile Gmail tokens:', error);
        return false;
      }

      // Dispatch custom event to notify ProfileContext of token update
      window.dispatchEvent(new CustomEvent('gmail-tokens-updated', {
        detail: { profileId, gmailAccessToken, gmailRefreshToken, gmailTokenExpiry }
      }));

      return true;
    } catch (error) {
      console.error('Error updating profile Gmail tokens:', error);
      return false;
    }
  }, []);

  const refreshGmailToken = useCallback(async (profileId: string, refreshToken: string): Promise<boolean> => {
    console.log('Refreshing Gmail token for profile:', profileId);
    console.log('Refresh token available:', !!refreshToken);
    
    try {
      const requestBody = {
        refreshToken: refreshToken,
        profileId: profileId
      };
      
      console.log('Sending request to refresh-gmail-token function:', { 
        profileId, 
        hasRefreshToken: !!refreshToken 
      });

      const { data, error } = await supabase.functions.invoke('refresh-gmail-token', {
        body: requestBody
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Error calling refresh token function:', error);
        return false;
      }

      if (data.access_token) {
        console.log('Successfully received new access token from edge function');
        
        // Set the new access token in the gapi client
        setAccessToken(data.access_token, data.expires_in || 3600);
        
        // Update the profile with new token info
        const expiryDate = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
        
        const success = await updateProfileGmailTokens(
          profileId,
          data.access_token,
          null, // Don't update refresh token
          expiryDate
        );

        if (!success) {
          console.error('Error updating profile with new token');
          return false;
        }

        setIsGmailSignedIn(true);
        setIsGmailApiReady(true); // Mark API as ready after successful token refresh
        return true;
      }
    } catch (error) {
      console.error('Error refreshing Gmail token:', error);
    }

    setIsGmailApiReady(false);
    return false;
  }, [updateProfileGmailTokens]);

  const initGmail = useCallback(async (profile: any) => {
    console.log('Initializing Gmail API for profile:', profile?.name || 'unknown');

    try {
      setIsGmailApiReady(false); // Mark API as not ready at start
      console.log('Initializing Gmail API...');
      await initGapiClient();
      
      // If no profile provided, we can't initialize Gmail
      if (!profile) {
        console.log('No profile provided, cannot initialize Gmail');
        setIsGmailSignedIn(false);
        setIsGmailApiReady(false);
        return;
      }

      console.log('Checking Gmail tokens for profile:', profile.name);
      
      // Check if we have a valid access token for the current profile
      if (profile.gmail_access_token && profile.gmail_token_expiry) {
        const expiryTime = new Date(profile.gmail_token_expiry).getTime();
        const now = Date.now();
        
        if (expiryTime > now + 5 * 60 * 1000) { // 5-minute buffer
          // Token is still valid, use it
          console.log('Using existing valid access token');
          setAccessToken(profile.gmail_access_token, Math.floor((expiryTime - now) / 1000));
          setIsGmailSignedIn(true);
          setIsGmailApiReady(true); // Mark API as ready after setting token
          return;
        } else if (profile.gmail_refresh_token) {
          // Token is expired, try to refresh it
          console.log('Access token expired, attempting to refresh...');
          const refreshed = await refreshGmailToken(profile.id, profile.gmail_refresh_token);
          if (refreshed) {
            console.log('Successfully refreshed access token');
            return;
          } else {
            console.log('Failed to refresh access token');
          }
        }
      }
      
      // No valid token available
      console.log('No valid Gmail token available for profile');
      const signedIn = checkGmailSignedIn();
      setIsGmailSignedIn(signedIn);
      setIsGmailApiReady(false); // API not ready if no valid token
    } catch (error) {
      console.error('Error initializing Gmail:', error);
      setIsGmailSignedIn(false);
      setIsGmailApiReady(false);
    }
  }, [refreshGmailToken]);

  const signInGmail = useCallback(async (profile: any) => {
    console.log('signInGmail called');

    try {
      if (!profile) {
        throw new Error('No profile provided');
      }

      console.log('Signing in to Gmail for profile:', profile.name);
      const authResponse = await signInToGmail();
      
      if (authResponse.code) {
        // Authorization Code Flow - exchange code for tokens via backend
        console.log('Exchanging authorization code for tokens via backend...');
        
        try {
          const { data, error } = await supabase.functions.invoke('exchange-gmail-code', {
            body: {
              code: authResponse.code,
              redirectUri: window.location.origin,
              profileId: profile.id
            }
          });

          if (error) {
            console.error('Error exchanging code for tokens:', error);
            throw new Error('Failed to exchange authorization code for tokens');
          }

          if (data.access_token) {
            console.log('Successfully received tokens from backend');
            
            // Set the access token in the gapi client
            setAccessToken(data.access_token, data.expires_in || 3600);
            
            // Update the profile with Gmail tokens
            const expiryDate = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
            
            const success = await updateProfileGmailTokens(
              profile.id,
              data.access_token,
              data.refresh_token || null,
              expiryDate
            );

            if (!success) {
              throw new Error('Failed to update profile with Gmail tokens');
            }

            console.log('Successfully updated profile with Gmail tokens');
            setIsGmailSignedIn(true);
            setIsGmailApiReady(true); // Mark API as ready after successful sign-in
          } else {
            throw new Error('No access token received from backend');
          }
        } catch (backendError) {
          console.error('Backend exchange failed, falling back to direct token flow:', backendError);
          
          // Fallback: if backend exchange fails, the authResponse should have direct tokens
          if (authResponse.access_token) {
            const expiryDate = new Date(authResponse.expires_at).toISOString();
            
            const success = await updateProfileGmailTokens(
              profile.id,
              authResponse.access_token,
              null, // GIS rarely provides refresh tokens directly
              expiryDate
            );

            if (!success) {
              throw new Error('Failed to update profile with Gmail tokens');
            }

            console.log('Successfully updated profile with direct tokens');
            setIsGmailSignedIn(true);
            setIsGmailApiReady(true); // Mark API as ready after successful fallback
          } else {
            throw backendError;
          }
        }
      } else if (authResponse.access_token) {
        // Direct token flow
        const expiryDate = new Date(authResponse.expires_at).toISOString();
        
        console.log('Received direct tokens, updating profile...');
        
        const success = await updateProfileGmailTokens(
          profile.id,
          authResponse.access_token,
          null, // GIS rarely provides refresh tokens directly
          expiryDate
        );

        if (!success) {
          throw new Error('Failed to update profile with Gmail tokens');
        }

        console.log('Successfully updated profile with Gmail tokens');
        setIsGmailSignedIn(true);
        setIsGmailApiReady(true); // Mark API as ready after successful direct sign-in
      } else {
        throw new Error('No valid tokens received from Gmail');
      }
    } catch (error) {
      console.error('Error signing in to Gmail:', error);
      setIsGmailApiReady(false);
      throw error;
    }
  }, [updateProfileGmailTokens]);

  const signOutGmail = useCallback(async (profile: any) => {
    console.log('signOutGmail called');

    try {
      if (!profile) {
        throw new Error('No profile provided');
      }

      console.log('Signing out of Gmail for profile:', profile.name);
      await signOutFromGmail();
      
      // Clear Gmail tokens from the profile
      const success = await updateProfileGmailTokens(
        profile.id,
        null,
        null,
        null
      );

      if (!success) {
        console.error('Error clearing Gmail tokens from profile');
        throw new Error('Failed to clear Gmail tokens from profile');
      }
      
      console.log('Successfully cleared Gmail tokens from profile');
      setIsGmailSignedIn(false);
      setIsGmailApiReady(false); // Ensure API is marked as not ready after sign-out
    } catch (error) {
      console.error('Error signing out from Gmail:', error);
      throw error;
    }
  }, [updateProfileGmailTokens]);

  // Initialize authentication with Supabase
  const initializeAuth = useCallback(async () => {  
    setLoading(true);
    setIsGmailApiReady(false); // Mark API as not ready during initialization
    try {
      // Check active session - this will automatically restore from localStorage
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        // Don't throw error - user can still sign in manually
      }
      
      if (data?.session) {
        console.log('Found existing session, user is authenticated');
        setSession(data.session as unknown as Session);
        setUser(data.session.user as unknown as User);
      } else {
        console.log('No existing session found');
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up auth state listener and initialize auth (runs once on mount)
  useEffect(() => {
    // Initialize auth on app start
    initializeAuth();

    // Note: Supabase auth state listener is disabled to prevent page refresh issues.
    // Manual session checks are performed in initializeAuth instead.
    
    return () => {
      // No auth state listener cleanup needed since it's disabled
    };
  }, [initializeAuth]);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsGmailSignedIn(false);
    setIsGmailApiReady(false);
    setLoading(false);
  };

  const wrappedRefreshGmailToken = useCallback(async (profile: any): Promise<boolean> => {
    if (!profile?.gmail_refresh_token) {
      console.log('No refresh token available for profile');
      return false;
    }

    return await refreshGmailToken(profile.id, profile.gmail_refresh_token);
  }, [refreshGmailToken]);

  const value = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    initializeAuth,
    loading,
    isGmailSignedIn,
    isGmailApiReady,
    initGmail,
    signInGmail,
    signOutGmail,
    refreshGmailToken: wrappedRefreshGmailToken,
    updateProfileGmailTokens
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}