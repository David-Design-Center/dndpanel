/**
 * Email Page Layout Module Index
 * 
 * This folder organizes the Email Page component into modular files
 * making it easier to maintain and understand.
 */

// State management
export { type EmailPageLayoutState, type TabKey, type InboxViewMode, type CategoryName, type FolderType, createInitialState, INITIAL_TAB_COUNTS, TAB_KEYS } from './state';

// Utilities
export {
  getEmailTimestampMs,
  getReceivedAtMs,
  sortEmailsByDate,
  calculateFocusedScore,
  filterEmailsBySearch,
  getEmailExcerpt,
  formatSenderName,
  formatSubject,
  isEmailToday,
  getEmailDisplayDate,
} from './utils';

// Handlers
export {
  fetchAllEmailTypes,
  fetchCategoryEmails,
  fetchLabelEmails,
  handleDeleteEmail,
  handleDeleteSelectedEmails,
  handleMarkEmailAsRead,
  handleMarkSelectedAsRead,
  handleMarkSelectedAsUnread,
  handleRefreshEmails,
  handleClearCache,
  validateRepository,
} from './handlers';

// Render logic
export {
  getCurrentEmails,
  calculatePagination,
  getPaginatedEmails,
  getTabDisplayName,
  getTabBadgeCount,
  sortEmailsByScore,
  isEmailSelected,
  getSelectionDisplayText,
  shouldShowEmptyState,
  getEmptyStateMessage,
  calculateEmailListHeight,
  getEmailItemHeight,
  estimateVisibleItems,
} from './render';

// Main component will be imported from parent EmailPageLayout.tsx


