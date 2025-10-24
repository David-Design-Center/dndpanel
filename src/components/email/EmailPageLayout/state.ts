/**
 * Email Page Layout - State Types & Constants
 * 
 * Defines all the state shapes used throughout the component
 */

import { Email } from '../../../types';
import { type SearchSuggestion } from '../../../services/searchService';

export type TabKey = 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'archive' | 'allmail';
export type InboxViewMode = 'split' | 'unread' | 'read';
export type CategoryName = 'primary' | 'updates' | 'promotions' | 'social';
export type FolderType = 'all' | 'archive' | 'spam' | 'trash';

/**
 * Tab configuration - static data about each tab
 */
export const TAB_KEYS: TabKey[] = ['all', 'unread', 'sent', 'drafts', 'trash', 'important', 'starred', 'spam', 'archive', 'allmail'];

export const INITIAL_TAB_PAGINATION = {
  all: undefined as string | undefined,
  unread: undefined as string | undefined,
  sent: undefined as string | undefined,
  drafts: undefined as string | undefined,
  trash: undefined as string | undefined,
  important: undefined as string | undefined,
  starred: undefined as string | undefined,
  spam: undefined as string | undefined,
  archive: undefined as string | undefined,
  allmail: undefined as string | undefined,
};

export const INITIAL_TAB_COUNTS: Record<TabKey, number> = {
  all: 0,
  unread: 0,
  sent: 0,
  drafts: 0,
  trash: 0,
  important: 0,
  starred: 0,
  spam: 0,
  archive: 0,
  allmail: 0,
};

/**
 * UI State interface
 */
export interface EmailPageLayoutState {
  // Loading states
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  tabLoading: string | null;
  
  // Search/Filter state
  searchQuery: string;
  searchSuggestions: SearchSuggestion[];
  showSuggestions: boolean;
  isSearching: boolean;
  
  // Tab & view state
  activeTab: TabKey;
  hasEverLoaded: boolean;
  inboxViewMode: InboxViewMode;
  activeCategory: CategoryName;
  activeEmail: Email | null;
  
  // Selection state
  selectedEmails: Set<string>;
  recentlyReadIds: Set<string>;
  
  // Pagination state
  pageIndex: number;
  emailCounts: Record<TabKey, number>;
  pageTokens: Record<TabKey, string | undefined>;
  hasMoreForTabs: Record<TabKey, boolean>;
  
  // Label email state (for label pages)
  labelEmails: Email[];
  labelPageToken: string | undefined;
  labelHasMoreEmails: boolean;
}

/**
 * Create initial UI state
 */
export function createInitialState(): EmailPageLayoutState {
  return {
    loading: true,
    refreshing: false,
    loadingMore: false,
    tabLoading: null,
    searchQuery: '',
    searchSuggestions: [],
    showSuggestions: false,
    isSearching: false,
    activeTab: 'all',
    hasEverLoaded: false,
    inboxViewMode: 'split',
    activeCategory: 'primary',
    activeEmail: null,
    selectedEmails: new Set(),
    recentlyReadIds: new Set(),
    pageIndex: 0,
    emailCounts: { ...INITIAL_TAB_COUNTS },
    pageTokens: { ...INITIAL_TAB_PAGINATION },
    hasMoreForTabs: TAB_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<TabKey, boolean>),
    labelEmails: [],
    labelPageToken: undefined,
    labelHasMoreEmails: false,
  };
}
