/**
 * useTabManagement Hook
 * 
 * Provides tab switching and management utilities:
 * - Switch inbox view mode with selection clearing
 * - System folder filtering handler
 * 
 * Note: activeTab and inboxViewMode state remain in parent component
 * due to complex initialization dependencies with other hooks.
 * 
 * Extracted from EmailPageLayout.tsx to reduce complexity.
 */

import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type TabKey = 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'allmail';
type InboxViewMode = 'split' | 'unread' | 'read';

export interface UseTabManagementOptions {
  pageType: 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash';
  labelName: string | null;
  inboxViewMode: InboxViewMode;
  setInboxViewMode: React.Dispatch<React.SetStateAction<InboxViewMode>>;
  setActiveTab: React.Dispatch<React.SetStateAction<TabKey>>;
  tabLoaded: Record<TabKey, boolean>;
  setSystemFolderFilterHandler: (handler: (folderType: string) => Promise<void>) => void;
  loadMoreForTab: (tab: TabKey, options?: { force?: boolean }) => Promise<void>;
  clearSelection: () => void;
}

export interface UseTabManagementReturn {
  switchInboxViewMode: (mode: InboxViewMode) => void;
  handleSystemFolderFilter: (folderType: string) => Promise<void>;
}

export function useTabManagement(options: UseTabManagementOptions): UseTabManagementReturn {
  const {
    pageType,
    labelName,
    inboxViewMode,
    setInboxViewMode,
    setActiveTab,
    tabLoaded,
    setSystemFolderFilterHandler,
    loadMoreForTab,
    clearSelection
  } = options;

  const navigate = useNavigate();

  /**
   * Switch inbox view mode and clear selections
   */
  const switchInboxViewMode = useCallback((mode: InboxViewMode) => {
    console.log(`📋 Switching inbox view mode: ${inboxViewMode} → ${mode}`);
    // Clear all selections when switching views to avoid confusion
    clearSelection();
    setInboxViewMode(mode);
  }, [inboxViewMode, clearSelection, setInboxViewMode]);

  /**
   * Handle system folder filter from FoldersColumn
   */
  const handleSystemFolderFilter = useCallback(async (folderType: string) => {
    // Map folder types to activeTab values
    const folderToTabMap: Record<string, TabKey> = {
      'inbox': 'all', // Show all inbox emails
      'sent': 'sent',
      'drafts': 'drafts', 
      'trash': 'trash',
      'spam': 'spam', // Use dedicated spam tab
      'starred': 'starred', // Use dedicated starred tab
      'important': 'important' // Important is separate from starred
    };

    const newTab = folderToTabMap[folderType] || 'all';

    if (pageType === 'inbox' && labelName) {
      navigate('/inbox', { replace: true });
    }

    // Set the active tab to show the filtered emails
    setActiveTab(newTab);
    
    if (!tabLoaded[newTab]) {
      try {
        await loadMoreForTab(newTab, { force: true });
      } catch (error) {
        console.error(`❌ Failed to load tab ${newTab}:`, error);
      }
    }

    console.log(`📂 Filtered to: ${folderType} (tab: ${newTab})`);
  }, [pageType, labelName, tabLoaded, loadMoreForTab, navigate, setActiveTab]);

  /**
   * Register system folder filter handler with context
   */
  useEffect(() => {
    setSystemFolderFilterHandler(handleSystemFolderFilter);
  }, [setSystemFolderFilterHandler, handleSystemFolderFilter]);

  return {
    switchInboxViewMode,
    handleSystemFolderFilter
  };
}
