import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Session } from '../types';
import { supabase } from '../lib/supabase';
import { 
  initGapiClient, 
  isGmailSignedIn as checkGmailSignedIn, 
  signOutFromGmail, 
  setAccessToken, 
  signInToGmailWithOAuth 
} from '../integrations/gapiService';
import { fetchGmailAccessToken } from '../lib/gmail';
import { authCoordinator } from '../utils/authCoordinator';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  userProfileId: string | null;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
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
      
      // Check if user is from dnddesigncenter domain
      const isDomainUser = userEmail.endsWith('@dnddesigncenter.com');
      
      if (isDomainUser) {
        // Use the domain-wide delegation approach for domain users
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
      } else {
        // For external users, check if they already have a valid OAuth token
        const isSignedIn = checkGmailSignedIn();
        if (isSignedIn) {
          setIsGmailApiReady(true);
          return true;
        } else {
          console.log('✓ External user needs to re-authenticate via OAuth');
          setIsGmailApiReady(false);
          return false;
        }
      }

    } catch (error) {
      console.error('❌ Error fetching Gmail token:', error);
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
      console.log('Profile userEmail:', profile.userEmail);
      console.log('Profile object:', profile);
      
      if (!profile.userEmail) {
        console.log('❌ No userEmail found for profile, cannot initialize Gmail');
        setIsGmailSignedIn(false);
        setIsGmailApiReady(false);
        return;
      }

      // With domain-wide delegation, we always fetch a fresh token
      // Use the profile's email instead of the authenticated user's email
      try {
        const refreshed = await refreshGmailToken(profile.userEmail);
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
  }, [refreshGmailToken]); // Remove user from dependency array

  const signInGmail = useCallback(async (profile: any) => {
    try {
      if (!profile) {
        throw new Error('No profile provided');
      }

      if (!profile.userEmail) {
        throw new Error('No userEmail found for profile');
      }

      const isDomainUser = profile.userEmail.endsWith('@dnddesigncenter.com');
      
      if (isDomainUser) {
        // Use domain-wide delegation for domain users
        const refreshed = await refreshGmailToken(profile.userEmail);
        
        if (refreshed) {
          setIsGmailSignedIn(true);
          setIsGmailApiReady(true);
        } else {
          throw new Error('Failed to get Gmail access token via domain-wide delegation');
        }
      } else {
        // For external users, use OAuth popup
        console.log('🌐 External user detected - using OAuth flow');
        
        await signInToGmailWithOAuth();
        setIsGmailSignedIn(true);
        setIsGmailApiReady(true);
      }
      
    } catch (error) {
      console.error('❌ Error signing in to Gmail:', error);
      setIsGmailApiReady(false);
      throw error;
    }
  }, [refreshGmailToken]); // Remove user from dependency array // Add user to dependency array

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

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      // Use production URL in production, development URL in development
      const baseUrl = import.meta.env.PROD 
        ? 'https://order.dnddesigncenter.com' 
        : window.location.origin;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/reset`
      });
      setLoading(false);
      return { error };
    } catch (error) {
      setLoading(false);
      return { error: error as Error };
    }
  };

  const updatePassword = async (password: string) => {
    setLoading(true);
    try {
      // SECURITY: Verify that we have a valid recovery session before updating password
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error checking session:', sessionError);
        setLoading(false);
        return { error: new Error('Unable to verify reset session. Please try again.') };
      }

      if (!session) {
        console.error('No active session found for password update');
        setLoading(false);
        return { error: new Error('No valid reset session found. Please click the reset link in your email again.') };
      }

      // Additional check: ensure this is a recovery session by checking the URL hash
      const hasRecoveryTokens = window.location.hash.includes('access_token') && 
                               window.location.hash.includes('type=recovery');
      
      if (!hasRecoveryTokens && session.user?.user_metadata?.email_confirmed_at === undefined) {
        console.error('Invalid session type for password reset');
        setLoading(false);
        return { error: new Error('Invalid reset session. Please use the link from your email.') };
      }

      console.log('✅ Valid recovery session found, updating password for user:', session.user?.email);
      
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);
      
      if (error) {
        console.error('Password update error:', error);
        return { error };
      }
      
      console.log('✅ Password updated successfully');
      return { error: null };
    } catch (error) {
      console.error('Unexpected error during password update:', error);
      setLoading(false);
      return { error: error as Error };
    }
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
            
            console.log('🔍 Admin check - Profile data:', profile);
            console.log('🔍 Admin check - is_admin:', profile.is_admin);
            console.log('🔍 Admin check - name:', profile.name);
            console.log('🔍 Admin check - email:', data.user.email);
            
            // Only David should have admin privileges
            const isUserAdmin = (profile.is_admin || false) && profile.name === 'David';
            console.log('🔍 Admin check - Final result:', isUserAdmin);
            
            setIsAdmin(isUserAdmin);
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
    
    try {
      // Sign out from Gmail first if connected
      if (isGmailSignedIn) {
        await signOutFromGmail();
      }
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all local state
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setUserProfileId(null);
      setIsGmailSignedIn(false);
      setIsGmailApiReady(false);
      
      // Clear storage
      sessionStorage.clear();
      localStorage.clear();
      
      // Reset auth coordinator
      authCoordinator.reset();
      
      // Dispatch event to clear all caches
      window.dispatchEvent(new CustomEvent('clear-all-caches', {
        detail: { reason: 'logout' }
      }));
      
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      setLoading(false);
    }
  };

  const wrappedRefreshGmailToken = useCallback(async (profile: any): Promise<boolean> => {
    if (!profile?.userEmail) {
      console.log('❌ No userEmail available for profile');
      return false;
    }

    console.log('🔄 Refreshing Gmail token for profile:', profile.name, 'with email:', profile.userEmail);
    return await refreshGmailToken(profile.userEmail);
  }, [refreshGmailToken]);

  const value = {
    user,
    session,
    isAdmin,
    userProfileId,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
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