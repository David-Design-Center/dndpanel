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

    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const contactsData = await contactService.getContacts();
      setContacts(contactsData);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentProfile, authFlowCompleted, isLoading, location]);

  const refreshContacts = useCallback(async () => {
    contactService.clearContacts();
    setContacts([]);
    await loadContacts();
  }, [loadContacts]);

  const searchContacts = useCallback((query: string, limit: number = 5): Contact[] => {
    return contactService.filterContacts(query, limit);
  }, []);

  const clearContactsCache = useCallback(() => {
    setContacts([]);
    setError(null);
    setIsLoading(false);
  }, []);

  // Load contacts whenever user, profile, and Gmail sign-in are available
  useEffect(() => {
    if (!isLoading && !error && user && currentProfile && isGmailSignedIn) {
      loadContacts();
    }
  }, [isLoading, error, loadContacts, user, currentProfile, isGmailSignedIn]);

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