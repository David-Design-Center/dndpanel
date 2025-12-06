import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Email } from '../types';

interface FilterCreationState {
  isCreating: boolean;
  emailData: Email | null;
  shouldOpenCreate: boolean;
}

interface FilterCreationContextType {
  filterCreation: FilterCreationState;
  startFilterCreation: (email: Email) => void;
  clearFilterCreation: () => void;
  markCreateOpened: () => void;
}

const FilterCreationContext = createContext<FilterCreationContextType | undefined>(undefined);

export const FilterCreationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filterCreation, setFilterCreation] = useState<FilterCreationState>({
    isCreating: false,
    emailData: null,
    shouldOpenCreate: false
  });

  // Listen for profile switches and clear filter creation state
  useEffect(() => {
    const handleClearCache = () => {
      setFilterCreation({
        isCreating: false,
        emailData: null,
        shouldOpenCreate: false
      });
      console.log('🔄 FilterCreationContext: Cleared filter creation state');
    };

    window.addEventListener('clear-all-caches', handleClearCache as EventListener);
    return () => {
      window.removeEventListener('clear-all-caches', handleClearCache as EventListener);
    };
  }, []);

  const startFilterCreation = (email: Email) => {
    setFilterCreation({
      isCreating: true,
      emailData: email,
      shouldOpenCreate: true
    });
  };

  const clearFilterCreation = () => {
    setFilterCreation({
      isCreating: false,
      emailData: null,
      shouldOpenCreate: false
    });
  };

  const markCreateOpened = () => {
    setFilterCreation(prev => ({
      ...prev,
      shouldOpenCreate: false
    }));
  };

  return (
    <FilterCreationContext.Provider value={{
      filterCreation,
      startFilterCreation,
      clearFilterCreation,
      markCreateOpened
    }}>
      {children}
    </FilterCreationContext.Provider>
  );
};

export const useFilterCreation = () => {
  const context = useContext(FilterCreationContext);
  if (context === undefined) {
    throw new Error('useFilterCreation must be used within a FilterCreationProvider');
  }
  return context;
};
