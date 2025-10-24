/**
 * Email List Manager Types
 * Clean, focused types for the new email management system
 */

import { Email } from '../../../types';

export type TabName = 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'archive' | 'allmail';
export type CategoryName = 'primary' | 'updates' | 'promotions' | 'social';
export type FolderType = 'all' | 'archive' | 'spam' | 'trash';

/**
 * Tab configuration - defines what each tab represents
 */
export interface TabConfig {
  name: TabName;
  label: string;
  getEmails: () => Email[];
  getCount: () => number;
}

/**
 * Pagination state for a single tab
 */
export interface PaginationState {
  pageToken?: string;
  pageIndex: number;
  hasMore: boolean;
  isLoading: boolean;
}

/**
 * Email list manager state
 */
export interface EmailListState {
  activeTab: TabName;
  activeCategory?: CategoryName;
  pagination: Record<TabName, PaginationState>;
  selectedEmails: Set<string>;
  loading: boolean;
  refreshing: boolean;
  error?: string;
}

/**
 * Email list manager API
 */
export interface EmailListManager {
  // State
  state: EmailListState;
  
  // Current view queries
  getVisibleEmails: () => Email[];
  getEmailCount: () => number;
  isLoaded: (tab: TabName) => boolean;
  
  // Tab management
  switchTab: (tab: TabName) => void;
  switchCategory: (category: CategoryName) => void;
  
  // Pagination
  goToNextPage: () => Promise<void>;
  goToPreviousPage: () => void;
  canGoToNextPage: () => boolean;
  canGoToPreviousPage: () => boolean;
  
  // Email actions
  deleteEmail: (emailId: string) => Promise<void>;
  moveToTrash: (emailId: string) => Promise<void>;
  markAsRead: (emailId: string, isRead: boolean) => Promise<void>;
  starEmail: (emailId: string, starred: boolean) => Promise<void>;
  
  // Bulk actions
  deleteSelected: () => Promise<void>;
  markSelectedAsRead: () => Promise<void>;
  markSelectedAsUnread: () => Promise<void>;
  
  // Selection
  toggleSelect: (emailId: string) => void;
  selectAll: (tab: TabName) => void;
  deselectAll: () => void;
  
  // Refresh
  refresh: (force?: boolean) => Promise<void>;
  
  // Search/Filter
  applyFilter: (filters: EmailFilters) => Promise<void>;
  clearFilters: () => void;
}

/**
 * Email filtering options
 */
export interface EmailFilters {
  query?: string;
  from?: string;
  hasAttachment?: boolean;
  starred?: boolean;
  unread?: boolean;
  dateRange?: { start?: string; end?: string };
}

/**
 * Email fetch result
 */
export interface EmailFetchResult {
  emails: Email[];
  nextPageToken?: string;
  count: number;
}
