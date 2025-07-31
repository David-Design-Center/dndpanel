import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  const { isGmailSignedIn } = useAuth();

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

  const loadPage = async (pageType: EmailPageType): Promise<void> => {
    try {
      const emailFunction = getEmailFunction(pageType);
      
      let response: PaginatedEmailServiceResponse;
      
      if (pageType === 'inbox') {
        response = await getEmails(false, undefined, 10);
      } else {
        const emailsData = await emailFunction(false);
        response = {
          emails: Array.isArray(emailsData) ? emailsData : emailsData.emails || [],
          resultSizeEstimate: Array.isArray(emailsData) ? emailsData.length : emailsData.resultSizeEstimate || 0,
          nextPageToken: undefined
        };
      }

      setCache(prev => ({
        ...prev,
        [pageType]: {
          emails: response.emails || [],
          timestamp: Date.now(),
          nextPageToken: response.nextPageToken,
          hasMoreEmails: !!response.nextPageToken,
          isLoaded: true
        }
      }));
    } catch (error) {
      console.error(`Error preloading ${pageType}:`, error);
      // Mark as loaded even on error to prevent infinite loading
      setCache(prev => ({
        ...prev,
        [pageType]: {
          ...prev[pageType],
          isLoaded: true
        }
      }));
    }
  };

  const preloadAllPages = useCallback(async () => {
    if (!isGmailSignedIn || isPreloading) return; // Prevent duplicate preloading
    
    console.log('� GHOST PRELOADER: Starting aggressive preload of all email pages...');
    setIsPreloading(true);
    
    // Load pages in parallel for maximum speed
    const pageTypes: EmailPageType[] = ['inbox', 'sent', 'drafts', 'trash', 'unread'];
    
    try {
      const startTime = Date.now();
      
      // Use Promise.all for parallel loading (faster than Promise.allSettled)
      const loadPromises = pageTypes.map(async (pageType) => {
        try {
          console.log(`� GHOST PRELOADER: Loading ${pageType}...`);
          await loadPage(pageType);
          console.log(`✅ GHOST PRELOADER: ${pageType} loaded successfully`);
        } catch (error) {
          console.error(`❌ GHOST PRELOADER: Error loading ${pageType}:`, error);
          // Continue loading other pages even if one fails
        }
      });
      
      await Promise.all(loadPromises);
      
      const endTime = Date.now();
      console.log(`🎉 GHOST PRELOADER: All pages preloaded in ${endTime - startTime}ms`);
      
      // Log detailed cache status
      setTimeout(() => {
        setCache(currentCache => {
          console.log('� GHOST PRELOADER: Final cache status:', {
            inbox: currentCache.inbox.isLoaded ? `${currentCache.inbox.emails.length} emails` : 'FAILED',
            sent: currentCache.sent.isLoaded ? `${currentCache.sent.emails.length} emails` : 'FAILED',
            drafts: currentCache.drafts.isLoaded ? `${currentCache.drafts.emails.length} emails` : 'FAILED',
            trash: currentCache.trash.isLoaded ? `${currentCache.trash.emails.length} emails` : 'FAILED',
            unread: currentCache.unread.isLoaded ? `${currentCache.unread.emails.length} emails` : 'FAILED',
          });
          console.log('🚀 GHOST PRELOADER: All email pages are now ready for instant navigation!');
          setIsGhostPreloadComplete(true);
          return currentCache;
        });
      }, 100);
    } catch (error) {
      console.error('❌ GHOST PRELOADER: Error during preload:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [isGmailSignedIn]);

  const refreshPage = useCallback(async (pageType: EmailPageType) => {
    await loadPage(pageType);
  }, []);

  const getCachedEmails = useCallback((pageType: EmailPageType): EmailCache | null => {
    return cache[pageType] || null;
  }, [cache]);

  const isPageLoaded = useCallback((pageType: EmailPageType): boolean => {
    return cache[pageType]?.isLoaded || false;
  }, [cache]);

  // Ghost pre-loading: Aggressively preload all pages when Gmail is signed in
  useEffect(() => {
    if (isGmailSignedIn && !hasInitialPreload) {
      console.log('👻 GHOST PRELOADER: Gmail signed in, starting aggressive background preload...');
      setIsGhostPreloadComplete(false);
      setHasInitialPreload(true);
      
      // Single preload on sign-in
      preloadAllPages();
    } else if (!isGmailSignedIn) {
      console.log('👻 GHOST PRELOADER: Gmail not signed in, clearing cache...');
      setIsGhostPreloadComplete(false);
      setHasInitialPreload(false);
      // Clear cache when signed out for security
      setCache({
        inbox: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
        unread: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
        sent: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
        drafts: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
        trash: { emails: [], timestamp: 0, hasMoreEmails: false, isLoaded: false },
      });
    }
  }, [isGmailSignedIn, hasInitialPreload, preloadAllPages]);

  return (
    <EmailPreloaderContext.Provider value={{
      getCachedEmails,
      isPageLoaded,
      preloadAllPages,
      refreshPage,
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
