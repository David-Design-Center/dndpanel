/**
 * Email Feature - Main exports
 * 
 * This folder contains all email list management logic
 * cleanly separated from the UI component.
 */

export { useEmailListManager } from './hooks';
export type {
  TabName,
  CategoryName,
  FolderType,
  TabConfig,
  PaginationState,
  EmailListState,
  EmailListManager,
  EmailFilters,
  EmailFetchResult,
} from './types';
