/**
 * Email Page Layout - Render Logic
 * 
 * Functions for rendering email lists, tabs, and UI elements
 */

import { Email } from '../../../types';
import { sortEmailsByDate, calculateFocusedScore, filterEmailsBySearch } from './utils';
import { TabKey } from './state';

/**
 * Get visible emails for current tab (derived from repository)
 */
export function getCurrentEmails(
  allEmails: Email[],
  activeTab: TabKey,
  searchQuery: string,
  inboxViewMode: 'split' | 'unread' | 'read'
): Email[] {
  // Apply search filter
  let filtered = filterEmailsByDate(allEmails, activeTab);
  filtered = filterEmailsBySearch(filtered, searchQuery);

  // Apply view mode filter
  if (inboxViewMode === 'unread') {
    filtered = filtered.filter(e => !e.isRead);
  } else if (inboxViewMode === 'read') {
    filtered = filtered.filter(e => e.isRead);
  }

  // Sort by date (newest first)
  return sortEmailsByDate(filtered);
}

/**
 * Filter emails by tab type
 */
function filterEmailsByDate(emails: Email[], tab: TabKey): Email[] {
  if (tab === 'all') {
    return emails;
  }

  // For other tabs, filter by status
  // Note: In real implementation with repository, these would be computed views
  return emails;
}

/**
 * Calculate pagination info
 */
export function calculatePagination(
  totalEmails: number,
  pageIndex: number,
  pageSize: number = 50
): {
  startIndex: number;
  endIndex: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const startIndex = pageIndex * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEmails);
  const totalPages = Math.ceil(totalEmails / pageSize);

  return {
    startIndex,
    endIndex,
    totalPages,
    hasNextPage: endIndex < totalEmails,
    hasPreviousPage: pageIndex > 0,
  };
}

/**
 * Get paginated emails
 */
export function getPaginatedEmails(
  emails: Email[],
  pageIndex: number,
  pageSize: number = 50
): Email[] {
  const start = pageIndex * pageSize;
  const end = start + pageSize;
  return emails.slice(start, end);
}

/**
 * Format tab display name
 */
export function getTabDisplayName(tab: TabKey): string {
  const names: Record<TabKey, string> = {
    all: 'All',
    unread: 'Unread',
    sent: 'Sent',
    drafts: 'Drafts',
    trash: 'Trash',
    important: 'Important',
    starred: 'Starred',
    spam: 'Spam',
    archive: 'Archive',
    allmail: 'All Mail',
  };
  return names[tab] || tab;
}

/**
 * Get tab badge count
 */
export function getTabBadgeCount(
  emails: Email[],
  tab: TabKey
): number {
  switch (tab) {
    case 'unread':
      return emails.filter(e => !e.isRead).length;
    case 'important':
      return emails.filter(e => e.isImportant).length;
    case 'starred':
      return emails.filter(e => e.isStarred).length;
    default:
      return emails.length;
  }
}

/**
 * Sort emails by score (for "focused" view)
 */
export function sortEmailsByScore(emails: Email[]): Email[] {
  return [...emails].sort((a, b) => {
    const scoreA = calculateFocusedScore(a);
    const scoreB = calculateFocusedScore(b);
    if (scoreA !== scoreB) return scoreB - scoreA;
    // Fallback to date if scores equal
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });
}

/**
 * Check if email is selected in set
 */
export function isEmailSelected(emailId: string, selectedEmails: Set<string>): boolean {
  return selectedEmails.has(emailId);
}

/**
 * Get selection count display
 */
export function getSelectionDisplayText(selectedCount: number, totalCount: number): string {
  if (selectedCount === 0) return '';
  if (selectedCount === totalCount) return 'All selected';
  return `${selectedCount} selected`;
}

/**
 * Should show empty state
 */
export function shouldShowEmptyState(emails: Email[], loading: boolean): boolean {
  return !loading && emails.length === 0;
}

/**
 * Get empty state message
 */
export function getEmptyStateMessage(tab: TabKey): string {
  const messages: Record<TabKey, string> = {
    all: 'No emails yet',
    unread: 'No unread emails',
    sent: 'No sent emails',
    drafts: 'No drafts',
    trash: 'No emails in trash',
    important: 'No important emails',
    starred: 'No starred emails',
    spam: 'No spam emails',
    archive: 'No archived emails',
    allmail: 'No emails',
  };
  return messages[tab] || 'No emails';
}

/**
 * Calculate email list height for virtualization
 */
export function calculateEmailListHeight(
  containerHeight: number,
  headerHeight: number = 60,
  toolbarHeight: number = 50
): number {
  return Math.max(containerHeight - headerHeight - toolbarHeight, 300);
}

/**
 * Get email item height (for virtualization)
 */
export function getEmailItemHeight(): number {
  return 72; // Standard email row height in pixels
}

/**
 * Estimate number of visible items
 */
export function estimateVisibleItems(containerHeight: number): number {
  const itemHeight = getEmailItemHeight();
  return Math.ceil(containerHeight / itemHeight) + 2; // +2 for buffer
}
