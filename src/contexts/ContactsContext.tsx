import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Contact } from '../types';
import { contactService } from '../services/contactService';
import { useProfile } from './ProfileContext';
import { useAuth } from './AuthContext';
import { devLog } from '../utils/logging';

interface ContactsContextType {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  searchContacts: (query: string, limit?: number) => Contact[];
  loadContacts: () => Promise<void>;
  refreshContacts: () => Promise<void>;
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
  
  const { user } = useAuth();
  const { currentProfile } = useProfile();

  const loadContacts = useCallback(async () => {
    if (isLoading) return;
    
    // Only load contacts if user is authenticated and a profile is selected
    if (!user || !currentProfile) {
      devLog.debug('ContactsContext: Skipping contact load - user or profile not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loadedContacts = await contactService.loadContacts();
      setContacts(loadedContacts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contacts';
      setError(errorMessage);
      console.error('Error loading contacts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, currentProfile]);

  const refreshContacts = useCallback(async () => {
    contactService.clearContacts();
    setContacts([]);
    await loadContacts();
  }, [loadContacts]);

  const searchContacts = useCallback((query: string, limit: number = 5): Contact[] => {
    return contactService.filterContacts(query, limit);
  }, []);

  // Load contacts when the provider mounts and user/profile are available
  useEffect(() => {
    // Only load contacts if we don't have any yet and user/profile are available
    if (contacts.length === 0 && !isLoading && !error && user && currentProfile) {
      loadContacts();
    }
  }, [contacts.length, isLoading, error, loadContacts, user, currentProfile]);

  const value: ContactsContextType = {
    contacts,
    isLoading,
    error,
    searchContacts,
    loadContacts,
    refreshContacts
  };

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
};
