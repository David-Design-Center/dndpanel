import React, { createContext, useContext, useState, useCallback } from 'react';
import { Email } from '../types';

type EmailPageType = 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash';

interface EmailCache {
  [key: string]: {
    emails: Email[];
    timestamp: number;
    nextPageToken?: string;
    hasMoreEmails: boolean;
  };
}

interface EmailCacheContextType {
  getCachedEmails: (pageType: EmailPageType) => Email[] | null;
  setCachedEmails: (pageType: EmailPageType, emails: Email[], nextPageToken?: string, hasMoreEmails?: boolean) => void;
  clearCache: (pageType?: EmailPageType) => void;
  isCacheValid: (pageType: EmailPageType, maxAge?: number) => boolean;
}

const EmailCacheContext = createContext<EmailCacheContextType | null>(null);

export function EmailCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<EmailCache>({});

  const getCachedEmails = useCallback((pageType: EmailPageType): Email[] | null => {
    const cached = cache[pageType];
    if (!cached) return null;
    
    // Return cached emails if they exist
    return cached.emails;
  }, [cache]);

  const setCachedEmails = useCallback((
    pageType: EmailPageType, 
    emails: Email[], 
    nextPageToken?: string, 
    hasMoreEmails = false
  ) => {
    setCache(prev => ({
      ...prev,
      [pageType]: {
        emails,
        timestamp: Date.now(),
        nextPageToken,
        hasMoreEmails
      }
    }));
  }, []);

  const clearCache = useCallback((pageType?: EmailPageType) => {
    if (pageType) {
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[pageType];
        return newCache;
      });
    } else {
      setCache({});
    }
  }, []);

  const isCacheValid = useCallback((pageType: EmailPageType, maxAge = 30000): boolean => {
    const cached = cache[pageType];
    if (!cached) return false;
    
    return Date.now() - cached.timestamp < maxAge;
  }, [cache]);

  return (
    <EmailCacheContext.Provider value={{
      getCachedEmails,
      setCachedEmails,
      clearCache,
      isCacheValid
    }}>
      {children}
    </EmailCacheContext.Provider>
  );
}

export function useEmailCache() {
  const context = useContext(EmailCacheContext);
  if (!context) {
    throw new Error('useEmailCache must be used within EmailCacheProvider');
  }
  return context;
}
