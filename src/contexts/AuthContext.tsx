import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Session } from '../types';
import { supabase } from '../lib/supabase';
import { initGapiClient, isGmailSignedIn as checkGmailSignedIn, signOutFromGmail, setAccessToken } from '../integrations/gapiService';
import { fetchGmailAccessToken } from '../lib/gmail';
import { authCoordinator } from '../utils/authCoordinator';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  userProfileId: string | null;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  loading: boolean;
  isGmailSignedIn: boolean;
  isGmailApiReady: boolean;
  isGmailInitializing: boolean;
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
  const [isGmailInitializing, setIsGmailInitializing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  
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

  const refreshGmailToken = useCallback(async (userEmail: string): Promise<boolean> => {
    try {
      // Ensure gapi client is initialized before setting token
      await initGapiClient();
      
      // Use the new domain-wide delegation approach
      const accessToken = await fetchGmailAccessToken(userEmail);
      
      if (accessToken) {
        // Set the new access token in the gapi client (expires in 1 hour by default)
        setAccessToken(accessToken, 3600);
        
        setIsGmailApiReady(true);
        return true;
      } else {
        console.error('❌ No access token received');
        return false;
      }

      setIsGmailApiReady(false);
      return false;
    } catch (error) {
      console.error('❌ Error fetching Gmail token via domain-wide delegation:', error);
      setIsGmailApiReady(false);
      return false;
    }
  }, []);

  const initGmail = useCallback(async (profile: any) => {
    setIsGmailInitializing(true);
    try {
      // Reset authentication state when switching profiles
      authCoordinator.reset();
      
      // If no profile provided, we can't initialize Gmail
      if (!profile) {
        console.log('No profile provided, cannot initialize Gmail');
        setIsGmailSignedIn(false);
        setIsGmailApiReady(false);
        return;
      }

      console.log('Checking Gmail tokens for profile:', profile.name);
      console.log('User email:', user?.email);
      
      if (!user?.email) {
        console.log('❌ No user email found, cannot initialize Gmail');
        setIsGmailSignedIn(false);
        setIsGmailApiReady(false);
        return;
      }

      // With domain-wide delegation, we always fetch a fresh token
      // No need to check expiry or stored tokens
      try {
        const refreshed = await refreshGmailToken(user.email);
        if (refreshed) {
          // CRITICAL: Set Gmail as signed in when token refresh succeeds
          setIsGmailSignedIn(true);
          setIsGmailApiReady(true);
          setIsGmailInitializing(false);
          return;
        } else {
          console.log('❌ Failed to get fresh Gmail token');
        }
      } catch (error) {
        console.error('❌ Error getting fresh Gmail token:', error);
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
    } finally {
      setIsGmailInitializing(false);
    }
  }, [refreshGmailToken, user]); // Add user to dependency array

  const signInGmail = useCallback(async (profile: any) => {
    try {
      if (!profile) {
        throw new Error('No profile provided');
      }

      if (!user?.email) {
        throw new Error('No user email found');
      }

      // Use domain-wide delegation to get access token directly
      const refreshed = await refreshGmailToken(user.email);
      
      if (refreshed) {
        setIsGmailSignedIn(true);
        setIsGmailApiReady(true);
      } else {
        throw new Error('Failed to get Gmail access token via domain-wide delegation');
      }
      
    } catch (error) {
      console.error('❌ Error signing in to Gmail:', error);
      setIsGmailApiReady(false);
      throw error;
    }
  }, [refreshGmailToken, user]); // Add user to dependency array

  const signOutGmail = useCallback(async (profile: any) => {
    console.log('🔓 Signing out of Gmail for profile:', profile?.name || 'unknown');

    try {
      if (!profile) {
        throw new Error('No profile provided');
      }

      console.log('🚪 Clearing Gmail session...');
      await signOutFromGmail();
      
      // With domain-wide delegation, no need to clear stored tokens since they're generated on-demand
      setIsGmailSignedIn(false);
      setIsGmailApiReady(false);
      
    } catch (error) {
      console.error('❌ Error signing out of Gmail:', error);
      setIsGmailSignedIn(false);
      setIsGmailApiReady(false);
    }
  }, []);  // Initialize authentication with Supabase
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

    // Note: Supabase auth state listener is DISABLED to prevent tab refresh issues.
    // User state is managed manually in signIn/signOut methods.
    
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

  const signIn = async (username: string, password: string) => {
    setLoading(true);
    
    // Look up the email from username
    try {
      const { data: credData, error: credError } = await supabase
        .from('user_credentials')
        .select('email')
        .eq('username', username)
        .single();
        
      if (credError || !credData) {
        console.error('❌ Username lookup failed:', credError);
        setLoading(false);
        return { error: new Error('Invalid username or password') };
      }
      
      const email = credData.email;
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
      if (error) {
        console.error('Supabase auth error:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
        setLoading(false);
        return { error };
      }
      
      // Check if user is authorized after successful Supabase auth
      if (data?.user?.email) {
        
        const { isAuthorizedUser } = await import('../utils/security');
        const { SECURITY_CONFIG } = await import('../config/security');
        
        if (SECURITY_CONFIG.FEATURES.ENFORCE_USER_WHITELIST && !isAuthorizedUser(data.user.email)) {
          console.warn(`User ${data.user.email} successfully authenticated with Supabase but is not in the allowed users list`);
          
          // Sign out the user since they're not authorized
          await supabase.auth.signOut();
          
          const unauthorizedError = new Error(`Access denied. User ${data.user.email} is not authorized to access this application.`);
          setLoading(false);
          return { error: unauthorizedError };
        }
        
        // Fetch user role and profile information
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_credentials')
            .select(`
              profile_id,
              profiles (
                is_admin,
                name
              )
            `)
            .eq('email', data.user.email)
            .single();
            
          if (!roleError && roleData && roleData.profiles) {
            // profiles is an array, so we need to access the first element
            const profile = Array.isArray(roleData.profiles) ? roleData.profiles[0] : roleData.profiles;
            setIsAdmin(profile.is_admin || false);
            setUserProfileId(roleData.profile_id);
          }
        } catch (roleError) {
          console.warn('Could not fetch user role:', roleError);
          setIsAdmin(false);
          setUserProfileId(null);
        }
        
        // Update user state immediately after successful auth
        setUser(data.user as unknown as User);
        setSession(data.session as unknown as Session);
        
        // Notify ProfileContext to fetch profiles after successful auth
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
          detail: { user: data.user, session: data.session }
        }));
      }
      
      setLoading(false);
      return { error: null };
    } catch (error) {
      console.error('💥 Unexpected error during signIn:', error);
      setLoading(false);
      return { error: new Error('Invalid username or password') };
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setUserProfileId(null);
    setIsGmailSignedIn(false);
    setIsGmailApiReady(false);
    setLoading(false);
  };

  const wrappedRefreshGmailToken = useCallback(async (profile: any): Promise<boolean> => {
    if (!user?.email) {
      console.log('❌ No email available for user');
      return false;
    }

    console.log('🔄 Refreshing Gmail token for profile:', profile.name);
    return await refreshGmailToken(user.email);
  }, [refreshGmailToken, user?.email]);

  const value = {
    user,
    session,
    isAdmin,
    userProfileId,
    signIn,
    signUp,
    signOut,
    initializeAuth,
    loading,
    isGmailSignedIn,
    isGmailApiReady,
    isGmailInitializing,
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