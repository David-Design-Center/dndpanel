import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Email } from '../types';
import { 
  getEmails, 
  getUnreadEmails, 
  getSentEmails, 
  getDraftEmails, 
  getTrashEmails,
  PaginatedEmailServiceResponse
} from '../services/emailService';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import { shouldBlockDataFetches } from '../utils/authFlowUtils';

type EmailPageType = 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash';

interface EmailCache {
  emails: Email[];
  timestamp: number;
  nextPageToken?: string;
  hasMoreEmails: boolean;
  isLoaded: boolean;
}

interface EmailPreloaderContextType {
  getCachedEmails: (pageType: EmailPageType) => EmailCache | null;
  isPageLoaded: (pageType: EmailPageType) => boolean;
  preloadAllPages: () => Promise<void>;
  refreshPage: (pageType: EmailPageType) => Promise<void>;
  clearAllCache: () => void;
  clearAllCacheForRefresh: () => void;
  isPreloading: boolean;
  isGhostPreloadComplete: boolean;
}

const EmailPreloaderContext = createContext<EmailPreloaderContextType | null>(null);

export function EmailPreloaderProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Record<EmailPageType, EmailCache>>({
    inbox: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
    unread: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
    sent: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
    drafts: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
    trash: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
  });
  const [isPreloading, setIsPreloading] = useState(false);
  const [isGhostPreloadComplete, setIsGhostPreloadComplete] = useState(false);
  const [hasInitialPreload, setHasInitialPreload] = useState(false); // Prevent duplicate preloading
  const [isRefreshing, setIsRefreshing] = useState(false); // Prevent auto-preload during refresh
  const { isGmailSignedIn } = useAuth();
  const { authFlowCompleted } = useProfile();
  const location = useLocation();

  const getEmailFunction = (pageType: EmailPageType) => {
    switch (pageType) {
      case 'inbox': return () => getEmails(false, undefined, 10);
      case 'unread': return getUnreadEmails;
      case 'sent': return getSentEmails;
      case 'drafts': return getDraftEmails;
      case 'trash': return getTrashEmails;
      default: return () => getEmails(false, undefined, 10);
    }
  };

  const loadPage = useCallback(async (pageType: EmailPageType) => {
    // Security check: Block all data fetches during auth flow
    if (shouldBlockDataFetches(location.pathname)) {
      return;
    }

    // Double check with authFlowCompleted state
    if (!authFlowCompleted) {
      return;
    }

    if (!isGmailSignedIn) {
      return;
    }

    try {
      const emailFunction = getEmailFunction(pageType);
      const emailsData = await emailFunction();
      
      const response: PaginatedEmailServiceResponse = Array.isArray(emailsData) 
        ? { emails: emailsData, resultSizeEstimate: emailsData.length, nextPageToken: undefined }
        : emailsData;

      setCache(prevCache => ({
        ...prevCache,
        [pageType]: {
          emails: response.emails || [],
          timestamp: Date.now(),
          nextPageToken: response.nextPageToken,
          hasMoreEmails: !!response.nextPageToken,
          isLoaded: true
        }
      }));

    } catch (error) {
      console.error(`Error loading ${pageType} emails:`, error);
      setCache(prevCache => ({
        ...prevCache,
        [pageType]: {
          ...prevCache[pageType],
          isLoaded: false
        }
      }));
    }
  }, [isGmailSignedIn, authFlowCompleted, location.pathname]);

  const preloadAllPages = useCallback(async () => {
    if (!isGmailSignedIn || isPreloading) return; // Prevent duplicate preloading
    
    setIsPreloading(true);
    
    // Load pages in parallel for maximum speed
    const pageTypes: EmailPageType[] = ['inbox', 'sent', 'drafts', 'trash', 'unread'];
    
    try {
      const startTime = Date.now();
      
      // Use Promise.all for parallel loading (faster than Promise.allSettled)
      const loadPromises = pageTypes.map(async (pageType) => {
        try {
          await loadPage(pageType);
        } catch (error) {
          console.error(`Error loading ${pageType}:`, error);
          // Continue loading other pages even if one fails
        }
      });
      
      await Promise.all(loadPromises);
      
      const endTime = Date.now();
      
      // Log detailed cache status
      setTimeout(() => {
        setCache(currentCache => {
          setIsGhostPreloadComplete(true);
          return currentCache;
        });
      }, 100);
    } catch (error) {
      console.error('Error during preload:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [isGmailSignedIn, loadPage]);

  const refreshPage = useCallback(async (pageType: EmailPageType) => {
    await loadPage(pageType);
    setIsRefreshing(false); // Reset refresh state after loading
  }, [loadPage]);

  const getCachedEmails = useCallback((pageType: EmailPageType): EmailCache | null => {
    return cache[pageType] || null;
  }, [cache]);

  const isPageLoaded = useCallback((pageType: EmailPageType): boolean => {
    return cache[pageType]?.isLoaded || false;
  }, [cache]);

  const clearAllCache = useCallback(() => {
    setCache({
      inbox: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
      unread: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
      sent: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
      drafts: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
      trash: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
    });
    setIsPreloading(false);
    setIsGhostPreloadComplete(false);
    setHasInitialPreload(false);
  }, []);

  const clearAllCacheForRefresh = useCallback(() => {
    setCache({
      inbox: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
      unread: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
      sent: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
      drafts: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
      trash: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
    });
    setIsPreloading(false);
    setIsGhostPreloadComplete(false);
    setIsRefreshing(true);
    // Don't reset hasInitialPreload to prevent auto-preloading
  }, []);

  // Ghost pre-loading: Aggressively preload all pages when Gmail is signed in
  useEffect(() => {
    if (isGmailSignedIn && !hasInitialPreload && !isRefreshing) {
      setIsGhostPreloadComplete(false);
      setHasInitialPreload(true);
      
      // Single preload on sign-in
      preloadAllPages();
    } else if (!isGmailSignedIn) {
      setIsGhostPreloadComplete(false);
      setHasInitialPreload(false);
      setIsRefreshing(false);
      // Clear cache when signed out for security
      setCache({
        inbox: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
        unread: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
        sent: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
        drafts: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
        trash: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
      });
    }
  }, [isGmailSignedIn, hasInitialPreload, isRefreshing, preloadAllPages]);

  // Listen for profile switches and clear cache
  useEffect(() => {
    const handleClearCache = () => {
      clearAllCache();
    };

    window.addEventListener('clear-all-caches', handleClearCache as EventListener);
    return () => {
      window.removeEventListener('clear-all-caches', handleClearCache as EventListener);
    };
  }, [clearAllCache]);

  return (
    <EmailPreloaderContext.Provider value={{
      getCachedEmails,
      isPageLoaded,
      preloadAllPages,
      refreshPage,
      clearAllCache,
      clearAllCacheForRefresh,
      isPreloading,
      isGhostPreloadComplete
    }}>
      {children}
    </EmailPreloaderContext.Provider>
  );
}

export function useEmailPreloader() {
  const context = useContext(EmailPreloaderContext);
  if (!context) {
    throw new Error('useEmailPreloader must be used within EmailPreloaderProvider');
  }
  return context;
}
