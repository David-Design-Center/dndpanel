import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface FoldersColumnContextType {
  isFoldersColumnExpanded: boolean;
  setIsFoldersColumnExpanded: (expanded: boolean) => void;
  toggleFoldersColumn: () => void;
}

const FoldersColumnContext = createContext<FoldersColumnContextType | undefined>(undefined);

export function FoldersColumnProvider({ children }: { children: ReactNode }) {
  const [isFoldersColumnExpanded, setIsFoldersColumnExpanded] = useState(true);

  const toggleFoldersColumn = useCallback(() => {
    setIsFoldersColumnExpanded(prev => !prev);
  }, []);

  const value = useMemo(() => ({
    isFoldersColumnExpanded,
    setIsFoldersColumnExpanded,
    toggleFoldersColumn,
  }), [isFoldersColumnExpanded, toggleFoldersColumn]);

  return (
    <FoldersColumnContext.Provider value={value}>
      {children}
    </FoldersColumnContext.Provider>
  );
}

export function useFoldersColumn() {
  const context = useContext(FoldersColumnContext);
  if (context === undefined) {
    throw new Error('useFoldersColumn must be used within a FoldersColumnProvider');
  }
  return context;
}
