import React, { createContext, useContext, useState, useEffect } from 'react';
import { clearAutoReplyCache } from '../services/emailService';
import { useProfile } from './ProfileContext';

interface OutOfOfficeContextType {
  isOutOfOffice: boolean;
  setOutOfOffice: (status: boolean) => void;
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
  const { currentProfile } = useProfile();
  const [outOfOfficeStatuses, setOutOfOfficeStatuses] = useState<{[profileName: string]: boolean}>({});

  // Load the out-of-office statuses from localStorage on component mount
  useEffect(() => {
    const savedStatuses = localStorage.getItem('outOfOfficeStatuses');
    if (savedStatuses) {
      setOutOfOfficeStatuses(JSON.parse(savedStatuses));
    }
  }, []);

  // Get the current profile's out-of-office status
  const isOutOfOffice = currentProfile ? (outOfOfficeStatuses[currentProfile.name] || false) : false;

  // Save the out-of-office status to localStorage whenever it changes
  const setOutOfOffice = (status: boolean) => {
    if (!currentProfile) return;
    
    const newStatuses = {
      ...outOfOfficeStatuses,
      [currentProfile.name]: status
    };
    
    setOutOfOfficeStatuses(newStatuses);
    localStorage.setItem('outOfOfficeStatuses', JSON.stringify(newStatuses));
    
    // Clear auto-reply cache when status changes to prevent duplicate replies
    clearAutoReplyCache();
    
    console.log(`${currentProfile.name}'s out-of-office status set to:`, status);
  };

  return (
    <OutOfOfficeContext.Provider value={{ isOutOfOffice, setOutOfOffice }}>
      {children}
    </OutOfOfficeContext.Provider>
  );
}
