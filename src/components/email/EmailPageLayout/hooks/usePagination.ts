/**
 * usePagination Hook
 * 
 * Manages email pagination state and infinite scroll logic.
 * Handles Gmail API pagination tokens and loading states.
 * 
 * Extracted from EmailPageLayout.tsx to reduce complexity.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Email } from '@/types';
import { getEmails } from '@/services/emailService';

export interface UsePaginationOptions {
  isGmailSignedIn: boolean;
  isGmailInitializing: boolean;
  activeTab: 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'allmail';
  labelName: string | null;
  labelQueryParam?: string | null;
  pageType: 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash' | 'spam' | 'important' | 'starred' | 'allmail';
  setLoading: (loading: boolean) => void;
  emailListRef: React.RefObject<HTMLDivElement>;
}

export interface UsePaginationReturn {
  paginatedEmails: Email[];
  setPaginatedEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  nextPageToken: string | undefined;
  setNextPageToken: React.Dispatch<React.SetStateAction<string | undefined>>;
  isLoadingMore: boolean;
  loadPaginatedEmails: (pageToken?: string, append?: boolean) => Promise<void>;
  handleLoadMore: () => Promise<void>;
  resetPagination: () => void;
}

export function usePagination(options: UsePaginationOptions): UsePaginationReturn {
  const {
    isGmailSignedIn,
    isGmailInitializing,
    activeTab,
    labelName,
    labelQueryParam,
    pageType,
    setLoading,
    emailListRef
  } = options;

  // ✅ Check current route - only load emails when on email pages
  const location = useLocation();

    // Pagination state
  const [paginatedEmails, setPaginatedEmails] = useState<Email[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Track previous values to detect actual changes
  const prevTabRef = useRef<string>();
  const prevLabelRef = useRef<string | null>();
  const prevBasePathRef = useRef<string>();
  const prevIsViewingEmailRef = useRef<boolean>(false);
  
  // Prevent duplicate scroll triggers
  const loadMoreInFlightRef = useRef(false);

  /**
   * Load paginated emails for infinite scroll using Gmail API pageToken
   * FIXED: Now implements proper pagination loop to handle thread-level filtering
   */
  const loadPaginatedEmails = useCallback(async (pageToken?: string, append: boolean = false) => {
    if (!isGmailSignedIn) return;
    
    console.log(`🔍 loadPaginatedEmails called:`, {
      pageToken: pageToken ? 'present' : 'none',
      append,
      currentEmailsCount: paginatedEmails.length
    });
    
    // Prevent duplicate loading
    if (append && isLoadingMore) {
      console.log('⏳ Already loading more, skipping...');
      return;
    }
    
    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Build query based on active tab/page context
      let query = '';
      
      // For inbox views, use query with SERVER-SIDE filtering to exclude user-labeled emails
      // -has:userlabels ensures we only get emails without custom labels
      if (pageType === 'inbox' && !labelName) {
        switch (activeTab) {
          case 'all':
            query = 'in:inbox -has:userlabels';
            break;
          case 'unread':
            query = 'in:inbox -has:userlabels is:unread';
            break;
          case 'sent':
            query = 'label:SENT';
            break;
          case 'drafts':
            query = 'label:DRAFT';
            break;
          case 'trash':
            query = 'label:TRASH';
            break;
          case 'important':
            query = 'label:IMPORTANT';
            break;
          case 'starred':
            query = 'label:STARRED';
            break;
          case 'spam':
            query = 'label:SPAM';
            break;
          case 'allmail':
            // All mail - exclude spam/trash
            query = '-label:SPAM -label:TRASH';
            break;
          default:
            query = 'in:inbox -has:userlabels';
        }
      } else if (labelName) {
        // Viewing a specific custom label
        // ⚠️ Use name-based query so we fetch full message details (threads.list returns only snippets)
        const labelQuery = labelQueryParam || labelName;
        query = `label:"${labelQuery}"`;
        console.log('📧 Using label query for filtering:', labelQuery, 'Query:', query);
      } else {
        // Other page types (sent, drafts, trash, unread, etc.)
        switch (pageType) {
          case 'sent':
            query = 'label:SENT';
            break;
          case 'drafts':
            query = 'label:DRAFT';
            break;
          case 'trash':
            query = 'label:TRASH';
            break;
          case 'spam':
            query = 'label:SPAM';
            break;
          case 'important':
            query = 'label:IMPORTANT';
            break;
          case 'starred':
            query = 'label:STARRED';
            break;
          case 'unread':
            query = 'label:INBOX is:unread';
            break;
          default:
            query = '';
        }
      }
      
      // Use query-based fetch to always retrieve full message details
      const response = await getEmails(false, query || undefined, 25, pageToken);
      
      const startTime = Date.now();
      const fetchedEmails = response.emails || [];
      const duration = Date.now() - startTime;
      
      console.log(`✅ Fetched ${fetchedEmails.length} emails using ${query ? 'query' : 'labelIds'} in ${duration}ms`);
      
      if (append) {
        // Deduplicate: merge new emails with existing, removing duplicates by ID
        setPaginatedEmails(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEmails = fetchedEmails.filter(e => !existingIds.has(e.id));
          
          if (newEmails.length < fetchedEmails.length) {
            console.log(`⚠️ Deduplication: Filtered out ${fetchedEmails.length - newEmails.length} duplicate emails`);
          }
          
          return [...prev, ...newEmails];
        });
      } else {
        setPaginatedEmails(fetchedEmails);
      }
      
      // Update pagination token
      setNextPageToken(response.nextPageToken);
      
      // Determine if there are more emails to load
      const hasActualMore = !!response.nextPageToken;
      
      // For inbox queries, always assume more emails exist unless we explicitly know otherwise
      const isInboxQuery = query.includes('inbox');
      const forceMore = isInboxQuery && fetchedEmails.length >= 20; // If we got 20+, likely more exist
      
      console.log('📄 Pagination state:', {
        emailsCount: fetchedEmails.length,
        nextPageToken: response.nextPageToken,
        isInboxQuery,
        hasActualMore,
        forceMore,
        willShowMore: hasActualMore || forceMore
      });
      
    } catch (error) {
      console.error('Error loading paginated emails:', error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [
    isGmailSignedIn,
    activeTab,
    labelName,
    labelQueryParam,
    pageType,
    setLoading,
    isLoadingMore,
    paginatedEmails.length
  ]);

  /**
   * Handle loading more emails (infinite scroll)
   */
  const handleLoadMore = useCallback(async () => {
    // Prevent duplicate calls
    if (!nextPageToken || isLoadingMore || loadMoreInFlightRef.current) return;
    
    loadMoreInFlightRef.current = true;
    console.log('📜 Loading more emails...');
    
    try {
      await loadPaginatedEmails(nextPageToken, true);
    } finally {
      loadMoreInFlightRef.current = false;
    }
  }, [nextPageToken, isLoadingMore, loadPaginatedEmails]);

  /**
   * Reset pagination state
   */
  const resetPagination = useCallback(() => {
    setNextPageToken(undefined);
    setPaginatedEmails([]);
    setIsLoadingMore(false);
  }, []);

  // Add scroll listener for infinite scroll
  useEffect(() => {
    const emailList = emailListRef.current;
    if (!emailList) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Debounce scroll events to prevent rapid firing
      if (scrollTimeout) clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = emailList;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
        
        // Load more when user scrolls to 80% of the list
        if (scrollPercentage > 0.8 && nextPageToken && !isLoadingMore && !loadMoreInFlightRef.current) {
          console.log('📜 Loading more emails (scroll trigger)...');
          handleLoadMore();
        }
      }, 100); // 100ms debounce
    };

    emailList.addEventListener('scroll', handleScroll);
    return () => {
      emailList.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [handleLoadMore, nextPageToken, isLoadingMore, emailListRef]);

  // Reset pagination when tab or label changes
  useEffect(() => {
    const pathname = location.pathname;
    const isViewingEmail = pathname.includes('/email/');
    const basePath = isViewingEmail ? pathname.split('/email/')[0] : pathname;

    const wasViewingEmail = prevIsViewingEmailRef.current;
    const isTransitioningToDetail = !wasViewingEmail && isViewingEmail;

    if (isViewingEmail && (prevBasePathRef.current === basePath || isTransitioningToDetail)) {
      console.log('⏸️ Pagination: Viewing email detail, skipping reset', {
        basePath,
        prevBasePath: prevBasePathRef.current,
        isViewingEmail,
        wasViewingEmail,
        isTransitioningToDetail,
        currentPath: pathname
      });
      prevTabRef.current = activeTab;
      prevLabelRef.current = labelName;
      prevBasePathRef.current = basePath;
      prevIsViewingEmailRef.current = isViewingEmail;
      return;
    }

    prevIsViewingEmailRef.current = isViewingEmail;

    const tabChanged = prevTabRef.current !== activeTab;
    const labelChanged = prevLabelRef.current !== labelName;
    const basePathChanged = prevBasePathRef.current !== basePath;
    const isInitialLoad = prevTabRef.current === undefined && prevLabelRef.current === undefined;

    console.log('📋 Pagination useEffect triggered:', {
      activeTab,
      labelName,
      isGmailSignedIn,
      isGmailInitializing,
      tabChanged,
      labelChanged,
      basePathChanged,
      isViewingEmail,
      basePath,
      currentPath: pathname,
      trigger: 'tab/label/auth change'
    });

    if (isGmailInitializing) {
      console.log('📋 Waiting for Gmail initialization to complete...');
      return;
    }

    if (!tabChanged && !labelChanged && !basePathChanged && !isInitialLoad) {
      console.log('📋 Skipping reset - no actual change (just re-render)');
      return;
    }

    prevTabRef.current = activeTab;
    prevLabelRef.current = labelName;
    prevBasePathRef.current = basePath;

    resetPagination();
    setLoading(true);

    if (isGmailSignedIn) {
      console.log('📋 Loading first page of emails...', isInitialLoad ? '(initial load)' : '(tab/label changed)');
      loadPaginatedEmails(undefined, false);
    }
  }, [activeTab, labelName, isGmailSignedIn, isGmailInitializing, location.pathname, resetPagination, loadPaginatedEmails, setLoading]);

  return {
    paginatedEmails,
    setPaginatedEmails,
    nextPageToken,
    setNextPageToken,
    isLoadingMore,
    loadPaginatedEmails,
    handleLoadMore,
    resetPagination
  };
}
