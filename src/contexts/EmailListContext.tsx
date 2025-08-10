import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

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

  const toggleEmailList = useCallback(() => {
    setIsEmailListCollapsed(prev => !prev);
  }, []);

  const setEmailListCollapsed = useCallback((collapsed: boolean) => {
    setIsEmailListCollapsed(collapsed);
  }, []);

  const value = useMemo(() => ({
    isEmailListCollapsed, 
    toggleEmailList, 
    setEmailListCollapsed 
  }), [isEmailListCollapsed, toggleEmailList, setEmailListCollapsed]);

  return (
    <EmailListContext.Provider value={value}>
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
