import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';

interface LayoutState {
  sidebar: {
    collapsed: boolean;
  };
  foldersColumn: {
    expanded: boolean;
  };
  emailList: {
    collapsed: boolean;
  };
  panels: {
    folders: number;
    emailList: number;
    emailView: number;
  };
  selectedEmailId: string | null;
  systemFolderFilterHandler?: (folderType: string) => void;
}

interface LayoutStateContextType {
  // State
  layoutState: LayoutState;
  
  // Email selection
  selectedEmailId: string | null;
  selectEmail: (id: string) => void;
  clearSelection: () => void;
  
  // Sidebar
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // Folders column
  isFoldersColumnExpanded: boolean;
  toggleFoldersColumn: () => void;
  
  // Email list
  isEmailListCollapsed: boolean;
  toggleEmailList: () => void;
  
  // Panel sizes
  panelSizes: {
    folders: number;
    emailList: number;
    emailView: number;
  };
  updatePanelSizes: (sizes: { folders: number; emailList: number; emailView: number }) => void;
  
  // System folder filter handler
  onSystemFolderFilter?: (folderType: string) => void;
  setSystemFolderFilterHandler: (handler: (folderType: string) => void) => void;
  
  // Layout coordination
  getOptimalLayout: () => {
    sidebar: number;
    folders: number;
    emailList: number;
    content: number;
  };
  resetToDefaultLayout: () => void;
  autoCollapseForMobile: () => void;
}

const LayoutStateContext = createContext<LayoutStateContextType | undefined>(undefined);

// Helper to load state from localStorage with defaults
function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Helper to save state to localStorage
function saveToLocalStorage(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn(`Failed to save ${key} to localStorage`);
  }
}

export function LayoutStateProvider({ children }: { children: ReactNode }) {
  // Load persisted state from localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => 
    loadFromLocalStorage('sidebarCollapsed', true)
  );
  
  const [isFoldersColumnExpanded, setIsFoldersColumnExpanded] = useState(() => 
    loadFromLocalStorage('foldersColumnExpanded', true)
  );
  
  const [isEmailListCollapsed, setIsEmailListCollapsed] = useState(() => 
    loadFromLocalStorage('emailListCollapsed', false)
  );
  
  const [panelSizes, setPanelSizes] = useState(() => 
    loadFromLocalStorage('emailPanelSizes', {
      folders: 20,
      emailList: 45,
      emailView: 35
    })
  );
  
  // Non-persisted state
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [systemFolderFilterHandler, setSystemFolderFilterHandler] = useState<((folderType: string) => void) | undefined>(undefined);

  // Listen for profile switches and clear selected email
  useEffect(() => {
    const handleClearCache = () => {
      setSelectedEmailId(null);
      console.log('🔄 LayoutStateContext: Cleared selected email');
    };

    window.addEventListener('clear-all-caches', handleClearCache as EventListener);
    return () => {
      window.removeEventListener('clear-all-caches', handleClearCache as EventListener);
    };
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    saveToLocalStorage('sidebarCollapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    saveToLocalStorage('foldersColumnExpanded', isFoldersColumnExpanded);
  }, [isFoldersColumnExpanded]);

  useEffect(() => {
    saveToLocalStorage('emailListCollapsed', isEmailListCollapsed);
  }, [isEmailListCollapsed]);

  useEffect(() => {
    saveToLocalStorage('emailPanelSizes', panelSizes);
  }, [panelSizes]);

  // Email selection actions
  const selectEmail = useCallback((id: string) => {
    setSelectedEmailId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEmailId(null);
  }, []);

  // Toggle actions
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  const toggleFoldersColumn = useCallback(() => {
    setIsFoldersColumnExpanded(prev => !prev);
  }, []);

  const toggleEmailList = useCallback(() => {
    setIsEmailListCollapsed(prev => !prev);
  }, []);

  // Panel sizes update
  const updatePanelSizes = useCallback((sizes: { folders: number; emailList: number; emailView: number }) => {
    setPanelSizes(sizes);
  }, []);

  // System folder filter handler
  const setSystemFolderFilterHandlerCallback = useCallback((handler: (folderType: string) => void) => {
    setSystemFolderFilterHandler(() => handler);
  }, []);

  // Layout coordination functions
  const getOptimalLayout = useCallback(() => {
    // Universal layout percentages
    const sidebarWidth = 4;
    const foldersWidth = 15;
    const inboxWidth = 28;
    const emailWidth = 52;
    
    return {
      sidebar: sidebarWidth,
      folders: foldersWidth,
      emailList: inboxWidth,
      content: emailWidth
    };
  }, []);

  const resetToDefaultLayout = useCallback(() => {
    setIsSidebarCollapsed(true);
    setIsFoldersColumnExpanded(true);
    setIsEmailListCollapsed(false);
    setPanelSizes({
      folders: 20,
      emailList: 45,
      emailView: 35
    });
  }, []);

  const autoCollapseForMobile = useCallback(() => {
    if (window.innerWidth < 768) {
      setIsFoldersColumnExpanded(false);
    }
  }, []);

  // Compute the layout state object
  const layoutState: LayoutState = useMemo(() => ({
    sidebar: { collapsed: isSidebarCollapsed },
    foldersColumn: { expanded: isFoldersColumnExpanded },
    emailList: { collapsed: isEmailListCollapsed },
    panels: panelSizes,
    selectedEmailId,
    systemFolderFilterHandler,
  }), [isSidebarCollapsed, isFoldersColumnExpanded, isEmailListCollapsed, panelSizes, selectedEmailId, systemFolderFilterHandler]);

  const value = useMemo(() => ({
    layoutState,
    selectedEmailId,
    selectEmail,
    clearSelection,
    isSidebarCollapsed,
    toggleSidebar,
    isFoldersColumnExpanded,
    toggleFoldersColumn,
    isEmailListCollapsed,
    toggleEmailList,
    panelSizes,
    updatePanelSizes,
    onSystemFolderFilter: systemFolderFilterHandler,
    setSystemFolderFilterHandler: setSystemFolderFilterHandlerCallback,
    getOptimalLayout,
    resetToDefaultLayout,
    autoCollapseForMobile,
  }), [
    layoutState,
    selectedEmailId,
    selectEmail,
    clearSelection,
    isSidebarCollapsed,
    toggleSidebar,
    isFoldersColumnExpanded,
    toggleFoldersColumn,
    isEmailListCollapsed,
    toggleEmailList,
    panelSizes,
    updatePanelSizes,
    systemFolderFilterHandler,
    setSystemFolderFilterHandlerCallback,
    getOptimalLayout,
    resetToDefaultLayout,
    autoCollapseForMobile,
  ]);

  return (
    <LayoutStateContext.Provider value={value}>
      {children}
    </LayoutStateContext.Provider>
  );
}

export function useLayoutState() {
  const context = useContext(LayoutStateContext);
  if (context === undefined) {
    throw new Error('useLayoutState must be used within a LayoutStateProvider');
  }
  return context;
}
