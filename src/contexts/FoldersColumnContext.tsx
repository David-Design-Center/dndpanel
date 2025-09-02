import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface FoldersColumnContextType {
  isFoldersColumnExpanded: boolean;
  setIsFoldersColumnExpanded: (expanded: boolean) => void;
  toggleFoldersColumn: () => void;
  onSystemFolderFilter?: (folderType: string) => void;
  setSystemFolderFilterHandler: (handler: (folderType: string) => void) => void;
}

const FoldersColumnContext = createContext<FoldersColumnContextType | undefined>(undefined);

export function FoldersColumnProvider({ children }: { children: ReactNode }) {
  const [isFoldersColumnExpanded, setIsFoldersColumnExpanded] = useState(true);
  const [systemFolderFilterHandler, setSystemFolderFilterHandler] = useState<((folderType: string) => void) | undefined>(undefined);

  const toggleFoldersColumn = useCallback(() => {
    setIsFoldersColumnExpanded(prev => !prev);
  }, []);

  const setSystemFolderFilterHandlerCallback = useCallback((handler: (folderType: string) => void) => {
    setSystemFolderFilterHandler(() => handler);
  }, []);

  const value = useMemo(() => ({
    isFoldersColumnExpanded,
    setIsFoldersColumnExpanded,
    toggleFoldersColumn,
    onSystemFolderFilter: systemFolderFilterHandler,
    setSystemFolderFilterHandler: setSystemFolderFilterHandlerCallback,
  }), [isFoldersColumnExpanded, toggleFoldersColumn, systemFolderFilterHandler, setSystemFolderFilterHandlerCallback]);

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
