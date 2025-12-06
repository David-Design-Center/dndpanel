import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ComposeContextType {
  isComposeOpen: boolean;
  draftId: string | null;
  isExpanded: boolean;
  openCompose: (draftId?: string) => void;
  closeCompose: () => void;
  toggleExpand: () => void;
}

const ComposeContext = createContext<ComposeContextType | undefined>(undefined);

export const ComposeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Listen for profile switches and clear compose state
  useEffect(() => {
    const handleClearCache = () => {
      setIsComposeOpen(false);
      setDraftId(null);
      setIsExpanded(false);
      console.log('🔄 ComposeContext: Closed compose and cleared draft state');
    };

    window.addEventListener('clear-all-caches', handleClearCache as EventListener);
    return () => {
      window.removeEventListener('clear-all-caches', handleClearCache as EventListener);
    };
  }, []);

  const openCompose = (draftIdParam?: string) => {
    setDraftId(draftIdParam || null);
    setIsComposeOpen(true);
  };

  const closeCompose = () => {
    setIsComposeOpen(false);
    setDraftId(null);
    setIsExpanded(false); // Reset expansion on close
  };

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <ComposeContext.Provider value={{ isComposeOpen, draftId, isExpanded, openCompose, closeCompose, toggleExpand }}>
      {children}
    </ComposeContext.Provider>
  );
};

export const useCompose = () => {
  const context = useContext(ComposeContext);
  if (context === undefined) {
    throw new Error('useCompose must be used within a ComposeProvider');
  }
  return context;
};
