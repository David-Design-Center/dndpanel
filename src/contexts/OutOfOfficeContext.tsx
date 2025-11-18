import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { clearAutoReplyCache } from '../services/emailService';
import { useProfile } from './ProfileContext';
import { useAuth } from './AuthContext';
import { 
  isGmailVacationResponderActive 
} from '../services/gmailVacationService';
import { shouldBlockDataFetches } from '../utils/authFlowUtils';

interface OutOfOfficeContextType {
  isOutOfOffice: boolean;
  setOutOfOffice: (status: boolean) => void;
  isLoading: boolean;
  refreshStatus: () => void;
}

const OutOfOfficeContext = createContext<OutOfOfficeContextType | undefined>(undefined);

export function useOutOfOffice() {
  const context = useContext(OutOfOfficeContext);
  if (context === undefined) {
    throw new Error('useOutOfOffice must be used within an OutOfOfficeProvider');
  }
  return context;
}

interface OutOfOfficeProviderProps {
  children: React.ReactNode;
}

export function OutOfOfficeProvider({ children }: OutOfOfficeProviderProps) {
  const { currentProfile, authFlowCompleted } = useProfile();
  const { isGmailApiReady } = useAuth();
  const location = useLocation();
  const [isOutOfOffice, setIsOutOfOfficeState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Cache to prevent duplicate API calls when switching tabs/pages
  const statusCache = useRef<{[profileName: string]: { value: boolean, timestamp: number }}>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Check Gmail vacation responder status
  const refreshStatus = async () => {
    // Security check: Block all data fetches during auth flow
    if (shouldBlockDataFetches(location.pathname)) {
      return;
    }

    // Double check with authFlowCompleted state
    if (!authFlowCompleted) {
      return;
    }
    
    if (!currentProfile || !isGmailApiReady) {
      return;
    }
    
    // Check cache first to prevent unnecessary API calls
    const cached = statusCache.current[currentProfile.name];
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      setIsOutOfOfficeState(cached.value);
      return;
    }
    
    setIsLoading(true);
    try {
      const isActive = await isGmailVacationResponderActive();
      setIsOutOfOfficeState(isActive);
      
      // Cache the result
      statusCache.current[currentProfile.name] = {
        value: isActive,
        timestamp: Date.now()
      };
      
      // Also update localStorage as backup
      const localStatuses = JSON.parse(localStorage.getItem('outOfOfficeStatuses') || '{}');
      localStatuses[currentProfile.name] = isActive;
      localStorage.setItem('outOfOfficeStatuses', JSON.stringify(localStatuses));
    } catch (error) {
      console.error('Error checking Gmail vacation responder status:', error);
      
      // Fallback to localStorage
      const localStatuses = JSON.parse(localStorage.getItem('outOfOfficeStatuses') || '{}');
      setIsOutOfOfficeState(localStatuses[currentProfile.name] || false);
    } finally {
      setIsLoading(false);
    }
  };

  // Load status when profile changes or Gmail API becomes ready
  useEffect(() => {
    // ✅ GUARD: Only load vacation status when on email-related pages or settings
    const isOnEmailPage = location.pathname.startsWith('/inbox') || 
                          location.pathname.startsWith('/unread') ||
                          location.pathname.startsWith('/sent') ||
                          location.pathname.startsWith('/drafts') ||
                          location.pathname.startsWith('/trash') ||
                          location.pathname.startsWith('/settings') ||
                          location.pathname.startsWith('/email');

    if (!isOnEmailPage) {
      console.log('⏸️ OutOfOfficeContext: Not on email/settings page, skipping status check');
      return;
    }

    refreshStatus();
  }, [currentProfile, isGmailApiReady, location.pathname]);

  // Listen for tab visibility refresh events (instead of relying on auth state changes)
  useEffect(() => {
    const handleTabVisibleRefresh = () => {
      if (currentProfile) {
        refreshStatus();
      }
    };

    window.addEventListener('tab-visible-refresh-data', handleTabVisibleRefresh);
    
    return () => {
      window.removeEventListener('tab-visible-refresh-data', handleTabVisibleRefresh);
    };
  }, [currentProfile]);

  // This function is now handled by the GmailVacationSettings component
  // We keep it here for backward compatibility
  const setOutOfOffice = async (status: boolean) => {
    if (!currentProfile) return;
    
    try {
      // Clear auto-reply cache when status changes
      clearAutoReplyCache();
      
      // Update state immediately for UI responsiveness
      setIsOutOfOfficeState(status);
      
      // Also update localStorage as backup
      const localStatuses = JSON.parse(localStorage.getItem('outOfOfficeStatuses') || '{}');
      localStatuses[currentProfile.name] = status;
      localStorage.setItem('outOfOfficeStatuses', JSON.stringify(localStatuses));
      
      console.log(`${currentProfile.name}'s out-of-office status set to:`, status);
      
      // Note: Actual Gmail vacation responder should be updated through GmailVacationSettings component
    } catch (err) {
      console.error('Failed to update out-of-office status:', err);
    }
  };

  return (
    <OutOfOfficeContext.Provider value={{ isOutOfOffice, setOutOfOffice, isLoading, refreshStatus }}>
      {children}
    </OutOfOfficeContext.Provider>
  );
}
