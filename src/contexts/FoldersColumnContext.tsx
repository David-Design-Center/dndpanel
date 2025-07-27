import { createContext, useContext, useState, ReactNode } from 'react';

interface FoldersColumnContextType {
  isFoldersColumnExpanded: boolean;
  setIsFoldersColumnExpanded: (expanded: boolean) => void;
  toggleFoldersColumn: () => void;
}

const FoldersColumnContext = createContext<FoldersColumnContextType | undefined>(undefined);

export function FoldersColumnProvider({ children }: { children: ReactNode }) {
  const [isFoldersColumnExpanded, setIsFoldersColumnExpanded] = useState(true);

  const toggleFoldersColumn = () => {
    setIsFoldersColumnExpanded(prev => !prev);
  };

  return (
    <FoldersColumnContext.Provider
      value={{
        isFoldersColumnExpanded,
        setIsFoldersColumnExpanded,
        toggleFoldersColumn,
      }}
    >
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
