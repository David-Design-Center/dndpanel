import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Contact } from '../types';
import { contactService } from '../services/contactService';
import { useProfile } from './ProfileContext';
import { useAuth } from './AuthContext';
import { devLog } from '../utils/logging';
import { shouldBlockDataFetches } from '../utils/authFlowUtils';

interface ContactsContextType {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  shouldLoadContacts: boolean;
  setShouldLoadContacts: (should: boolean) => void;
  searchContacts: (query: string, limit?: number) => Contact[];
  loadContacts: () => Promise<void>;
  refreshContacts: () => Promise<void>;
  clearContactsCache: () => void;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
};

interface ContactsProviderProps {
  children: React.ReactNode;
}

export const ContactsProvider: React.FC<ContactsProviderProps> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Expert optimization: Only load contacts when user intent requires it
  const [shouldLoadContacts, setShouldLoadContacts] = useState(false);
  
  const { user, isGmailSignedIn } = useAuth();
  const { currentProfile, authFlowCompleted } = useProfile();
  const location = useLocation();

  const loadContacts = useCallback(async () => {
    // Security check: Block all data fetches during auth flow
    if (shouldBlockDataFetches(location.pathname)) {
      return;
    }

    // Double check with authFlowCompleted state
    if (!authFlowCompleted) {
      return;
    }

    if (!user || !currentProfile?.name) {
      return;
    }

    // Prevent multiple simultaneous loads
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      devLog.info('ContactsContext: Loading contacts from API...');
      const contactsData = await contactService.loadContacts();
      setContacts(contactsData);
      devLog.info(`ContactsContext: Loaded ${contactsData.length} contacts`);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setError(error instanceof Error ? error.message : 'Failed to load contacts');
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentProfile, authFlowCompleted, location]); // Removed isLoading from dependencies

  const refreshContacts = useCallback(async () => {
    contactService.clearContacts();
    setContacts([]);
    await loadContacts();
  }, [loadContacts]);

  const searchContacts = useCallback((query: string, limit: number = 5): Contact[] => {
    return contactService.filterContacts(query, limit);
  }, []);

  const clearContactsCache = useCallback(() => {
    // Clear the singleton's in-memory cache (contacts array + isLoaded flag)
    contactService.clearContacts();
    // Clear React state
    setContacts([]);
    setError(null);
    setIsLoading(false);
  }, []);

  // Load contacts whenever user, profile, and Gmail sign-in are available
  // Expert optimization: Only load when shouldLoadContacts is true (user intent)
  useEffect(() => {
    // Only load if we should load contacts, don't have contacts yet, not already loading, no error, and all required conditions are met
    if (shouldLoadContacts && !contactService.isContactsLoaded() && !isLoading && !error && user && currentProfile && isGmailSignedIn) {
      devLog.info('ContactsContext: Triggering deferred contact load based on user intent');
      loadContacts();
    }
  }, [user, currentProfile, isGmailSignedIn, isLoading, error, loadContacts, shouldLoadContacts]);

  // Listen for profile switches and clear cache
  useEffect(() => {
    const handleClearCache = () => {
      clearContactsCache();
    };

    window.addEventListener('clear-all-caches', handleClearCache as EventListener);
    return () => {
      window.removeEventListener('clear-all-caches', handleClearCache as EventListener);
    };
  }, [clearContactsCache]);

  const value: ContactsContextType = {
    contacts,
    isLoading,
    error,
    shouldLoadContacts,
    setShouldLoadContacts,
    searchContacts,
    loadContacts,
    refreshContacts,
    clearContactsCache
  };

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
};