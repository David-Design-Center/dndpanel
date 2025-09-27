import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useFoldersColumn } from './FoldersColumnContext';
import { useEmailList } from './EmailListContext';

interface InboxLayoutContextType {
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;
  selectEmail: (id: string) => void;
  clearSelection: () => void;
  
  // Integrated collapse states
  isSidebarCollapsed: boolean;
  isFoldersCollapsed: boolean;
  isEmailListCollapsed: boolean;
  toggleSidebar: () => void;
  toggleFolders: () => void;
  toggleEmailList: () => void;
  
  // Layout coordination - UNIVERSAL VIEWPORT-BASED
  getOptimalLayout: () => {
    sidebar: number;
    folders: number;
    emailList: number;
    content: number;
  };
  autoCollapseForMobile: () => void;
  expandAllPanels: () => void;
  resetToDefaultLayout: () => void; // New function to reset to MacBook-optimized layout
}

const InboxLayoutContext = createContext<InboxLayoutContextType | undefined>(undefined);

// Internal provider that has access to all specialized contexts
function InboxLayoutProviderInternal({ children }: { children: ReactNode }) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  // Get context hooks
  const { isFoldersColumnExpanded, toggleFoldersColumn } = useFoldersColumn();
  const { isEmailListCollapsed, toggleEmailList } = useEmailList();

  const selectEmail = useCallback((id: string) => {
    setSelectedEmailId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEmailId(null);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  // Integrated collapse state getters
  const isFoldersCollapsed = !isFoldersColumnExpanded;
  
  // Toggle functions that use the specialized contexts
  const toggleFolders = toggleFoldersColumn;

  // Layout coordination functions - UNIVERSAL VIEWPORT-BASED PERCENTAGES
  const getOptimalLayout = useCallback(() => {
    // Universal layout percentages that work on any screen size:
    // Sidebar (collapsed): 4% (always collapsed in this mode)
    // Folders: 15% (always expanded in default view)
    // Inbox: 28% (fixed width)
    // Email view: 52% (fixed width, shown as empty gap when no email)
    
    const sidebarWidth = 4;  // Sidebar is always collapsed in default view
    const foldersWidth = 15; // Folders always 15% in default view
    const inboxWidth = 28;   // Inbox always 28%
    const emailWidth = 52;   // Email view always 52% (empty when no email)
    
    // Always return the same layout regardless of email panel state
    // The email panel will be hidden via CSS but still reserve space
    return {
      sidebar: sidebarWidth,    // New: explicit sidebar percentage
      folders: foldersWidth,    // Always 15%
      emailList: inboxWidth,    // Always 28%
      content: emailWidth       // Always 52%
    };
  }, []); // No dependencies - always return the same layout

  // Reset layout to default universal view
  const resetToDefaultLayout = useCallback(() => {
    // 1. Collapse sidebar
    if (!isSidebarCollapsed) setIsSidebarCollapsed(true);
    // 2. Ensure folders are expanded to default state (15%)
    if (!isFoldersColumnExpanded) toggleFoldersColumn();
    
    // The layout percentages are now fixed and universal:
    // Sidebar: 4% (collapsed), Folders: 15%, Inbox: 28%, Email: 52%
    console.log('Reset to universal layout: Sidebar 4%, Folders 15%, Inbox 28%, Email 52%');
  }, [isSidebarCollapsed, isFoldersColumnExpanded, toggleFoldersColumn]);

  const autoCollapseForMobile = useCallback(() => {
    // Simple: just collapse folders on mobile
    if (window.innerWidth < 768) {
      if (isFoldersColumnExpanded) toggleFoldersColumn();
    }
  }, [isFoldersColumnExpanded, toggleFoldersColumn]);

  const expandAllPanels = useCallback(() => {
    // Simple: just expand folders
    if (!isFoldersColumnExpanded) toggleFoldersColumn();
  }, [isFoldersColumnExpanded, toggleFoldersColumn]);

  return (
    <InboxLayoutContext.Provider
      value={{
        selectedEmailId,
        setSelectedEmailId,
        selectEmail,
        clearSelection,
        
        // Integrated collapse states
        isSidebarCollapsed,
        isFoldersCollapsed,
        isEmailListCollapsed,
        toggleSidebar,
        toggleFolders,
        toggleEmailList,
        
        // Layout coordination
        getOptimalLayout,
        autoCollapseForMobile,
        expandAllPanels,
        resetToDefaultLayout,
      }}
    >
      {children}
    </InboxLayoutContext.Provider>
  );
}

export function InboxLayoutProvider({ children }: { children: ReactNode }) {
  // This provider ensures we're wrapped with all required contexts
  return (
    <InboxLayoutProviderInternal>
      {children}
    </InboxLayoutProviderInternal>
  );
}

export function useInboxLayout() {
  const context = useContext(InboxLayoutContext);
  if (context === undefined) {
    throw new Error('useInboxLayout must be used within an InboxLayoutProvider');
  }
  return context;
}
