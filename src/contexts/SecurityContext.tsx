import React, { createContext, useContext, useState } from 'react';
import { SECURITY_CONFIG } from '../config/security';
import { useAuth } from './AuthContext';

interface SecurityContextType {
  isAuthenticated: boolean;
  isUserAuthorized: boolean;
  isDataLoadingAllowed: boolean;
  loading: boolean;
}

export const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  // Get authentication state from AuthContext
  const { user, loading: authLoading } = useAuth();
  
  // Convert user from AuthContext to our security model
  const isAuthenticated = !!user;
  
  // Check if the user's email is in the allowed list
  const isUserAuthorized = React.useMemo(() => {
    if (!user?.email) return false;
    
    // Check if the user's email is in the allowed list
    const userEmail = user.email.toLowerCase().trim();
    const authorized = SECURITY_CONFIG.ALLOWED_USERS.some(
      allowedEmail => allowedEmail.toLowerCase().trim() === userEmail
    );
    
    if (!authorized) {
      console.warn(`User ${userEmail} is not in the allowed users list`);
    }
    
    return authorized;
  }, [user]);
  
  const [loading] = useState(false);

  // Data loading is only allowed if:
  // 1. Feature is disabled in config, OR
  // 2. User is authenticated AND authorized
  const isDataLoadingAllowed = !SECURITY_CONFIG.FEATURES.REQUIRE_INITIAL_AUTH || 
                               (isAuthenticated && isUserAuthorized);

  const value = {
    isAuthenticated,
    isUserAuthorized,
    isDataLoadingAllowed,
    loading: loading || authLoading,
  };

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
