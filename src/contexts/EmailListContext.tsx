import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EmailListContextType {
  isEmailListCollapsed: boolean;
  toggleEmailList: () => void;
  setEmailListCollapsed: (collapsed: boolean) => void;
}

const EmailListContext = createContext<EmailListContextType | undefined>(undefined);

interface EmailListProviderProps {
  children: ReactNode;
}

export function EmailListProvider({ children }: EmailListProviderProps) {
  const [isEmailListCollapsed, setIsEmailListCollapsed] = useState(false);

  const toggleEmailList = () => {
    setIsEmailListCollapsed(prev => !prev);
  };

  const setEmailListCollapsed = (collapsed: boolean) => {
    setIsEmailListCollapsed(collapsed);
  };

  return (
    <EmailListContext.Provider 
      value={{ 
        isEmailListCollapsed, 
        toggleEmailList, 
        setEmailListCollapsed 
      }}
    >
      {children}
    </EmailListContext.Provider>
  );
}

export function useEmailList() {
  const context = useContext(EmailListContext);
  if (context === undefined) {
    throw new Error('useEmailList must be used within an EmailListProvider');
  }
  return context;
}
