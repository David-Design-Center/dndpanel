/**
 * useEmailListManager Hook
 * 
 * Manages ALL email list logic:
 * - Repository (single source of truth)
 * - Tab management
 * - Pagination
 * - Deletion/mutations
 * - Selection
 * 
 * Replaces: 26+ arrays + complex handlers from EmailPageLayout
 */

import { useCallback, useReducer, useRef } from 'react';
import { Email } from '../../../types';
import { emailRepository } from '../../../services/emailRepository';
import {
  TabName,
  CategoryName,
  EmailListState,
  EmailListManager,
  PaginationState,
  EmailFilters,
} from '../types';
import { deleteEmail, markEmailAsRead } from '../../../services/emailService';

const initialState: EmailListState = {
  activeTab: 'all',
  activeCategory: 'primary',
  pagination: {
    all: { pageIndex: 0, hasMore: true, isLoading: false },
    unread: { pageIndex: 0, hasMore: true, isLoading: false },
    sent: { pageIndex: 0, hasMore: true, isLoading: false },
    drafts: { pageIndex: 0, hasMore: true, isLoading: false },
    trash: { pageIndex: 0, hasMore: true, isLoading: false },
    important: { pageIndex: 0, hasMore: true, isLoading: false },
    starred: { pageIndex: 0, hasMore: true, isLoading: false },
    spam: { pageIndex: 0, hasMore: true, isLoading: false },
    allmail: { pageIndex: 0, hasMore: true, isLoading: false },
  },
  selectedEmails: new Set(),
  loading: false,
  refreshing: false,
};

type Action =
  | { type: 'SET_ACTIVE_TAB'; tab: TabName }
  | { type: 'SET_ACTIVE_CATEGORY'; category: CategoryName }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_REFRESHING'; refreshing: boolean }
  | { type: 'UPDATE_PAGINATION'; tab: TabName; updates: Partial<PaginationState> }
  | { type: 'TOGGLE_SELECT'; emailId: string }
  | { type: 'SELECT_ALL'; tab: TabName }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_ERROR'; error?: string }
  | { type: 'INVALIDATE_REPOSITORY' };

function stateReducer(state: EmailListState, action: Action): EmailListState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab, selectedEmails: new Set() };

    case 'SET_ACTIVE_CATEGORY':
      return { ...state, activeCategory: action.category };

    case 'SET_LOADING':
      return { ...state, loading: action.loading };

    case 'SET_REFRESHING':
      return { ...state, refreshing: action.refreshing };

    case 'UPDATE_PAGINATION':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          [action.tab]: {
            ...state.pagination[action.tab],
            ...action.updates,
          },
        },
      };

    case 'TOGGLE_SELECT': {
      const newSelected = new Set(state.selectedEmails);
      if (newSelected.has(action.emailId)) {
        newSelected.delete(action.emailId);
      } else {
        newSelected.add(action.emailId);
      }
      return { ...state, selectedEmails: newSelected };
    }

    case 'SELECT_ALL': {
      // Get all visible emails for current tab
      const emails = getEmailsForTab(state.activeTab);
      return { ...state, selectedEmails: new Set(emails.map(e => e.id)) };
    }

    case 'DESELECT_ALL':
      return { ...state, selectedEmails: new Set() };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'INVALIDATE_REPOSITORY':
      // Force re-render by invalidating - handled at hook level
      return state;

    default:
      return state;
  }
}

/**
 * Helper: Get emails for a given tab
 */
function getEmailsForTab(tab: TabName): Email[] {
  switch (tab) {
    case 'all':
      return emailRepository.getInboxEmails();
    case 'unread':
      return emailRepository.getUnreadEmails();
    case 'sent':
      return emailRepository.getSentEmails();
    case 'drafts':
      return emailRepository.getDraftEmails();
    case 'trash':
      return emailRepository.getTrashEmails();
    case 'important':
      return emailRepository.getImportantEmails();
    case 'starred':
      return emailRepository.getStarredEmails();
    case 'spam':
      return emailRepository.getSpamEmails();
    case 'allmail':
      return emailRepository.getAllMailEmails();
    default:
      return [];
  }
}

/**
 * Main hook: useEmailListManager
 */
export function useEmailListManager(): EmailListManager {
  const [state, dispatch] = useReducer(stateReducer, initialState);
  const renderCountRef = useRef(0);

  // Force repository update to trigger re-renders
  const invalidateRepository = useCallback(() => {
    renderCountRef.current++;
    dispatch({ type: 'INVALIDATE_REPOSITORY' });
  }, []);

  // Get visible emails for current tab
  const getVisibleEmails = useCallback((): Email[] => {
    return getEmailsForTab(state.activeTab);
  }, [state.activeTab]);

  // Get count for current tab
  const getEmailCount = useCallback((): number => {
    return getVisibleEmails().length;
  }, [getVisibleEmails]);

  // Check if tab is loaded
  const isLoaded = useCallback((): boolean => {
    // For now, always return true (repository always has data if populated)
    return true;
  }, []);

  // Switch tab
  const switchTab = useCallback((tab: TabName) => {
    dispatch({ type: 'SET_ACTIVE_TAB', tab });
  }, []);

  // Switch category
  const switchCategory = useCallback((category: CategoryName) => {
    dispatch({ type: 'SET_ACTIVE_CATEGORY', category });
  }, []);

  // Delete email
  const handleDeleteEmail = useCallback(
    async (emailId: string) => {
      try {
        await deleteEmail(emailId);
        emailRepository.deleteEmail(emailId);
        invalidateRepository();
      } catch (error) {
        console.error('Failed to delete email:', error);
        dispatch({ type: 'SET_ERROR', error: 'Failed to delete email' });
      }
    },
    [invalidateRepository]
  );

  // Move to trash
  const handleMoveToTrash = useCallback(
    async (emailId: string) => {
      try {
        await deleteEmail(emailId);
        emailRepository.deleteEmail(emailId);
        invalidateRepository();
      } catch (error) {
        console.error('Failed to move to trash:', error);
        dispatch({ type: 'SET_ERROR', error: 'Failed to move to trash' });
      }
    },
    [invalidateRepository]
  );

  // Mark as read
  const handleMarkAsRead = useCallback(
    async (emailId: string, isRead: boolean) => {
      try {
        await markEmailAsRead(emailId);
        const email = emailRepository.getEmailById(emailId);
        if (email) {
          email.isRead = isRead;
          invalidateRepository();
        }
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    },
    [invalidateRepository]
  );

  // Star email
  const handleStarEmail = useCallback(
    async (emailId: string, starred: boolean) => {
      try {
        // TODO: Implement star functionality with Gmail API
        const email = emailRepository.getEmailById(emailId);
        if (email) {
          email.isStarred = starred;
          invalidateRepository();
        }
      } catch (error) {
        console.error('Failed to star email:', error);
      }
    },
    [invalidateRepository]
  );

  // Delete selected
  const handleDeleteSelected = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      for (const emailId of state.selectedEmails) {
        await deleteEmail(emailId);
        emailRepository.deleteEmail(emailId);
      }
      dispatch({ type: 'DESELECT_ALL' });
      invalidateRepository();
    } catch (error) {
      console.error('Failed to delete selected:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to delete emails' });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [state.selectedEmails, invalidateRepository]);

  // Mark selected as read
  const handleMarkSelectedAsRead = useCallback(async () => {
    try {
      for (const emailId of state.selectedEmails) {
        await markEmailAsRead(emailId);
        const email = emailRepository.getEmailById(emailId);
        if (email) {
          email.isRead = true;
        }
      }
      invalidateRepository();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [state.selectedEmails, invalidateRepository]);

  // Mark selected as unread
  const handleMarkSelectedAsUnread = useCallback(async () => {
    try {
      for (const emailId of state.selectedEmails) {
        await markEmailAsRead(emailId);
        const email = emailRepository.getEmailById(emailId);
        if (email) {
          email.isRead = false;
        }
      }
      invalidateRepository();
    } catch (error) {
      console.error('Failed to mark as unread:', error);
    }
  }, [state.selectedEmails, invalidateRepository]);

  // Toggle select
  const handleToggleSelect = useCallback((emailId: string) => {
    dispatch({ type: 'TOGGLE_SELECT', emailId });
  }, []);

  // Select all
  const handleSelectAll = useCallback((tab: TabName) => {
    dispatch({ type: 'SELECT_ALL', tab });
  }, []);

  // Deselect all
  const handleDeselectAll = useCallback(() => {
    dispatch({ type: 'DESELECT_ALL' });
  }, []);

  // Pagination: next page
  const handleNextPage = useCallback(async () => {
    dispatch({
      type: 'UPDATE_PAGINATION',
      tab: state.activeTab,
      updates: { isLoading: true },
    });
    try {
      // Pagination would fetch more emails and add to repository
      // For now, just mark as having more
      dispatch({
        type: 'UPDATE_PAGINATION',
        tab: state.activeTab,
        updates: { pageIndex: state.pagination[state.activeTab].pageIndex + 1 },
      });
    } finally {
      dispatch({
        type: 'UPDATE_PAGINATION',
        tab: state.activeTab,
        updates: { isLoading: false },
      });
    }
  }, [state.activeTab, state.pagination]);

  // Pagination: previous page
  const handlePreviousPage = useCallback(() => {
    if (state.pagination[state.activeTab].pageIndex > 0) {
      dispatch({
        type: 'UPDATE_PAGINATION',
        tab: state.activeTab,
        updates: { pageIndex: state.pagination[state.activeTab].pageIndex - 1 },
      });
    }
  }, [state.activeTab, state.pagination]);

  // Can go next
  const canGoNext = useCallback((): boolean => {
    return state.pagination[state.activeTab].hasMore;
  }, [state.activeTab, state.pagination]);

  // Can go previous
  const canGoPrevious = useCallback((): boolean => {
    return state.pagination[state.activeTab].pageIndex > 0;
  }, [state.activeTab, state.pagination]);

  // Refresh
  const handleRefresh = useCallback(
    async () => {
      dispatch({ type: 'SET_REFRESHING', refreshing: true });
      try {
        // In real implementation, this would refetch from Gmail
        // For now, just invalidate the UI
        invalidateRepository();
      } finally {
        dispatch({ type: 'SET_REFRESHING', refreshing: false });
      }
    },
    [invalidateRepository]
  );

  // Apply filters (placeholder)
  const handleApplyFilters = useCallback(
    async (_filters: EmailFilters) => {
      // TODO: Implement filtering logic
    },
    []
  );

  // Clear filters
  const handleClearFilters = useCallback(() => {
    // TODO: Implement clear logic
  }, []);

  return {
    state,
    getVisibleEmails,
    getEmailCount,
    isLoaded,
    switchTab,
    switchCategory,
    goToNextPage: handleNextPage,
    goToPreviousPage: handlePreviousPage,
    canGoToNextPage: canGoNext,
    canGoToPreviousPage: canGoPrevious,
    deleteEmail: handleDeleteEmail,
    moveToTrash: handleMoveToTrash,
    markAsRead: handleMarkAsRead,
    starEmail: handleStarEmail,
    deleteSelected: handleDeleteSelected,
    markSelectedAsRead: handleMarkSelectedAsRead,
    markSelectedAsUnread: handleMarkSelectedAsUnread,
    toggleSelect: handleToggleSelect,
    selectAll: handleSelectAll,
    deselectAll: handleDeselectAll,
    refresh: handleRefresh,
    applyFilter: handleApplyFilters,
    clearFilters: handleClearFilters,
  };
}
