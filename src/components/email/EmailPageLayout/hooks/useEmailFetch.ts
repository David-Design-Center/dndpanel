/**
 * useEmailFetch Hook
 * 
 * Manages all email fetching operations including:
 * - Initial optimized inbox load
 * - Category email fetching
 * - Label email fetching
 * - Tab-specific loading
 * 
 * Extracted from EmailPageLayout.tsx to reduce complexity.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Email } from '@/types';
import {
  getCategoryEmailsForFolder,
  CategoryFilterOptions,
  getAllInboxEmails,
  getSentEmails,
  getDraftEmails,
  getTrashEmails,
  getImportantEmails,
  getStarredEmails,
  getSpamEmails,
  getAllMailEmails,
  getLabelEmails
} from '@/services/emailService';
import { emailRepository } from '@/services/emailRepository';
import { emitLoadingProgress } from '@/utils/loadingProgress';
import {
  loadCriticalInboxData,
  loadLabelsBasic,
  processAutoReplyOptimized,
  prefetchDraftsOnly,
  clearOptimizedCaches
} from '@/services/optimizedInitialLoad';

type TabKey = 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'allmail';

export interface UseEmailFetchOptions {
  isGmailSignedIn: boolean;
  authLoading: boolean;
  isGmailInitializing: boolean;
  pageType: 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash';
  labelName: string | null;
  labelQueryParam?: string | null;
  labelIdParam?: string | null;
  setLoading: (loading: boolean) => void;
  setHasEverLoaded: (loaded: boolean) => void;
  buildFilters: () => CategoryFilterOptions;
  CATEGORIES_ENABLED?: boolean;
}

export interface UseEmailFetchReturn {
  // State
  loading: boolean;
  allTabEmails: Record<TabKey, Email[]>;
  setAllTabEmails: React.Dispatch<React.SetStateAction<Record<TabKey, Email[]>>>;
  tabLoaded: Record<TabKey, boolean>;
  setTabLoaded: React.Dispatch<React.SetStateAction<Record<TabKey, boolean>>>;
  emailCounts: { unread: number; drafts: number; trash: number };
  setEmailCounts: React.Dispatch<React.SetStateAction<{ unread: number; drafts: number; trash: number }>>;
  categoryEmails: any;
  setCategoryEmails: React.Dispatch<React.SetStateAction<any>>;
  pageTokens: Record<TabKey, string | undefined>;
  setPageTokens: React.Dispatch<React.SetStateAction<Record<TabKey, string | undefined>>>;
  hasMoreForTabs: Record<TabKey, boolean>;
  setHasMoreForTabs: React.Dispatch<React.SetStateAction<Record<TabKey, boolean>>>;
  categoryPageTokens: any;
  setCategoryPageTokens: React.Dispatch<React.SetStateAction<any>>;
  hasMoreCategoryEmails: any;
  setHasMoreCategoryEmails: React.Dispatch<React.SetStateAction<any>>;
  loadingMore: boolean;
  setLoadingMore: React.Dispatch<React.SetStateAction<boolean>>;
  
  // For label emails
  emails: Email[];
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  currentPageToken: string | undefined;
  setCurrentPageToken: React.Dispatch<React.SetStateAction<string | undefined>>;
  
  // Functions
  fetchAllEmailTypes: (forceRefresh?: boolean) => Promise<void>;
  fetchCategoryEmails: (forceRefresh?: boolean) => Promise<void>;
  fetchLabelEmails: (forceRefresh?: boolean, loadMore?: boolean) => Promise<void>;
  loadMoreForTab: (tabType: TabKey, options?: { force?: boolean }) => Promise<void>;
  hasLoaded: boolean;
}

export function useEmailFetch(options: UseEmailFetchOptions): UseEmailFetchReturn {
  const {
    isGmailSignedIn,
    authLoading,
    isGmailInitializing,
    pageType,
    labelName,
    labelQueryParam,
    labelIdParam,
    setLoading,
    setHasEverLoaded,
    buildFilters,
    CATEGORIES_ENABLED
  } = options;

  const effectiveLabelQuery = labelQueryParam || labelName || undefined;
  const hasLabelTarget = Boolean(labelIdParam || effectiveLabelQuery);

  // Track if initial load has completed
  const hasInitiallyLoadedRef = useRef(false);

  // Email storage state
  const [allTabEmails, setAllTabEmails] = useState<Record<TabKey, Email[]>>({
    all: [],
    unread: [],
    sent: [],
    drafts: [],
    trash: [],
    important: [],
    starred: [],
    spam: [],
    allmail: []
  });

  const [tabLoaded, setTabLoaded] = useState<Record<TabKey, boolean>>({
    all: false,
    unread: false,
    sent: false,
    drafts: false,
    trash: false,
    important: false,
    starred: false,
    spam: false,
    allmail: false
  });

  const [emailCounts, setEmailCounts] = useState({
    unread: 0,
    drafts: 0,
    trash: 0
  });

  const [categoryEmails, setCategoryEmails] = useState({
    all: {
      primary: [] as Email[],
      updates: [] as Email[],
      promotions: [] as Email[],
      social: [] as Email[]
    },
    spam: {
      primary: [] as Email[],
      updates: [] as Email[],
      promotions: [] as Email[],
      social: [] as Email[]
    },
    trash: {
      primary: [] as Email[],
      updates: [] as Email[],
      promotions: [] as Email[],
      social: [] as Email[]
    }
  });

  const [pageTokens, setPageTokens] = useState<Record<TabKey, string | undefined>>({
    all: undefined,
    unread: undefined,
    sent: undefined,
    drafts: undefined,
    trash: undefined,
    important: undefined,
    starred: undefined,
    spam: undefined,
    allmail: undefined
  });

  const [hasMoreForTabs, setHasMoreForTabs] = useState({
    all: false,
    unread: false,
    sent: false,
    drafts: false,
    trash: false,
    important: false,
    starred: false,
    spam: false,
    allmail: false
  });

  const [categoryPageTokens, setCategoryPageTokens] = useState({
    all: {
      primary: undefined as string | undefined,
      updates: undefined as string | undefined,
      promotions: undefined as string | undefined,
      social: undefined as string | undefined
    },
    spam: {
      primary: undefined as string | undefined,
      updates: undefined as string | undefined,
      promotions: undefined as string | undefined,
      social: undefined as string | undefined
    },
    trash: {
      primary: undefined as string | undefined,
      updates: undefined as string | undefined,
      promotions: undefined as string | undefined,
      social: undefined as string | undefined
    }
  });

  const [hasMoreCategoryEmails, setHasMoreCategoryEmails] = useState({
    all: {
      primary: false,
      updates: false,
      promotions: false,
      social: false
    },
    spam: {
      primary: false,
      updates: false,
      promotions: false,
      social: false
    },
    trash: {
      primary: false,
      updates: false,
      promotions: false,
      social: false
    }
  });

  const [loadingMore, setLoadingMore] = useState(false);

  // For label emails only
  const [emails, setEmails] = useState<Email[]>([]);
  const [currentPageToken, setCurrentPageToken] = useState<string | undefined>(undefined);

  /**
   * OPTIMIZED: Fetch all email types using performance-optimized approach
   */
  const fetchAllEmailTypes = useCallback(async (forceRefresh = false) => {
    if (!isGmailSignedIn || labelName) return;

    try {
      emitLoadingProgress('inbox', 'start');
      console.log('📧 Starting OPTIMIZED email fetch - reduced from ~38 to ~6-8 API calls...');
      setLoading(true);

      // Clear caches if force refresh
      if (forceRefresh) {
        clearOptimizedCaches();
      }

      // STEP 1: Critical first paint - minimal calls for instant UI (2 API calls)
      const criticalData = await loadCriticalInboxData();
      
      const now = Date.now();
      const cutoffMs = now - 24 * 60 * 60 * 1000;

      const primaryUnread = criticalData.unreadList.emails;
      const primaryRecent = criticalData.recentList.emails;

      const uniqueAllMap = new Map<string, Email>();
      const uniqueUnreadMap = new Map<string, Email>();

      const addToMaps = (messages: Email[]) => {
        for (const message of messages) {
          if (!uniqueAllMap.has(message.id)) {
            uniqueAllMap.set(message.id, message);
          }
          if (!message.isRead && !uniqueUnreadMap.has(message.id)) {
            uniqueUnreadMap.set(message.id, message);
          }
        }
      };

      addToMaps(primaryRecent);
      addToMaps(primaryUnread);

      const countUnreadSinceCutoff = (): number => {
        let count = 0;
        uniqueUnreadMap.forEach(email => {
          const receivedAt = email.internalDate ? Number(email.internalDate) : (email.date ? new Date(email.date).getTime() : NaN);
          if (!Number.isNaN(receivedAt) && receivedAt >= cutoffMs) {
            count += 1;
          }
        });
        return count;
      };

      const unreadSinceCutoff = countUnreadSinceCutoff();
      
      // 🚀 INSTANT UI: Show emails immediately without waiting for labels
      console.log(`⚡ INSTANT: Showing ${primaryRecent.length} emails immediately (labels loading in background)`);
      
      const allEmails = Array.from(uniqueAllMap.values());
      const unreadEmails = Array.from(uniqueUnreadMap.values());
      
      // Set emails BEFORE labels load - this gives instant UI
      setAllTabEmails(prev => ({
        ...prev,
        all: allEmails,
        unread: unreadEmails
      }));
      setTabLoaded(prev => ({
        ...prev,
        all: true,
        unread: true
      }));
      setLoading(false); // ⚡ INSTANT: Stop loading immediately
      setHasEverLoaded(true); // ⚡ INSTANT: Mark as loaded so UI renders
      
      // Dispatch event to signal unread metadata readiness
      try {
        window.dispatchEvent(new CustomEvent('unread-metadata-ready', { detail: {
          unreadIds: Array.from(uniqueUnreadMap.keys()),
          unreadCount: unreadSinceCutoff,
          inboxUnreadEstimate: unreadSinceCutoff
        }}));
      } catch (e) {
        console.warn('Failed to dispatch unread-metadata-ready event', e);
      }
      
      // Load labels in background (1 API call) - won't block UI
      const labels = await loadLabelsBasic();
      console.log(`📧 Background: Labels loaded (${labels.length} labels)`);

      // Update counts immediately using the API's resultSizeEstimate
      setEmailCounts({
        unread: Math.min(unreadSinceCutoff, 99),
        drafts: 0, // Will be updated in step 2
        trash: 0   // Will be updated in step 2
      });

      // Process auto-reply using cached data (no additional API calls)
      processAutoReplyOptimized(criticalData).catch(error => {
        console.error('Auto-reply processing failed:', error);
      });

      // STEP 2: Background prefetch - ONLY drafts (for counter, with 1s delay to avoid rate limit)
      prefetchDraftsOnly().then(({ drafts }) => {
        console.log(`📧 Drafts loaded in background: ${drafts.emails.length} drafts`);
        
        // Update drafts in state
        setAllTabEmails(prev => ({
          ...prev,
          drafts: drafts.emails
        }));

        // Update draft count
        setEmailCounts(prev => ({
          ...prev,
          drafts: drafts.emails.length
        }));
        
        // Update pagination for drafts
        setPageTokens(prev => ({
          ...prev,
          drafts: drafts.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          drafts: !!drafts.nextPageToken
        }));

      }).catch(error => {
        console.error('❌ Failed to prefetch drafts:', error);
      });

      // Mark as loaded after critical data is shown
      setHasEverLoaded(true);
      setLoading(false);
      
      console.log('✅ OPTIMIZED fetch complete - UI updated with ~6-8 API calls instead of ~38!');
      emitLoadingProgress('inbox', 'success');
      
    } catch (error) {
      console.error('❌ Error in optimized email fetch:', error);
      setLoading(false);
      emitLoadingProgress('inbox', 'error');
    }
  }, [isGmailSignedIn, labelName, setLoading, setHasEverLoaded]);

  /**
   * Fetch category emails for all folder contexts
   */
  const fetchCategoryEmails = useCallback(async (forceRefresh = false) => {
    if (typeof CATEGORIES_ENABLED !== 'undefined' && !CATEGORIES_ENABLED) {
      return; // categories disabled
    }
    if (!isGmailSignedIn || labelName) return;

    try {
      console.log('📧 Fetching category emails for all folder contexts...');
      
      // Get current filters
      const currentFilters = buildFilters();
      
      // Fetch categories for inbox/all context
      const [primaryInbox, updatesInbox, promotionsInbox, socialInbox] = await Promise.all([
        getCategoryEmailsForFolder('primary', 'all', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('updates', 'all', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('promotions', 'all', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('social', 'all', forceRefresh, 15, undefined, currentFilters)
      ]);

      // Fetch categories for spam context
      const [primarySpam, updatesSpam, promotionsSpam, socialSpam] = await Promise.all([
        getCategoryEmailsForFolder('primary', 'spam', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('updates', 'spam', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('promotions', 'spam', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('social', 'spam', forceRefresh, 15, undefined, currentFilters)
      ]);

      // Fetch categories for trash context
      const [primaryTrash, updatesTrash, promotionsTrash, socialTrash] = await Promise.all([
        getCategoryEmailsForFolder('primary', 'trash', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('updates', 'trash', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('promotions', 'trash', forceRefresh, 15, undefined, currentFilters),
        getCategoryEmailsForFolder('social', 'trash', forceRefresh, 15, undefined, currentFilters)
      ]);

      // Update category emails state
      setCategoryEmails({
        all: {
          primary: primaryInbox.emails || [],
          updates: updatesInbox.emails || [],
          promotions: promotionsInbox.emails || [],
          social: socialInbox.emails || []
        },
        spam: {
          primary: primarySpam.emails || [],
          updates: updatesSpam.emails || [],
          promotions: promotionsSpam.emails || [],
          social: socialSpam.emails || []
        },
        trash: {
          primary: primaryTrash.emails || [],
          updates: updatesTrash.emails || [],
          promotions: promotionsTrash.emails || [],
          social: socialTrash.emails || []
        }
      });

      // Update category page tokens
      setCategoryPageTokens({
        all: {
          primary: primaryInbox.nextPageToken,
          updates: updatesInbox.nextPageToken,
          promotions: promotionsInbox.nextPageToken,
          social: socialInbox.nextPageToken
        },
        spam: {
          primary: primarySpam.nextPageToken,
          updates: updatesSpam.nextPageToken,
          promotions: promotionsSpam.nextPageToken,
          social: socialSpam.nextPageToken
        },
        trash: {
          primary: primaryTrash.nextPageToken,
          updates: updatesTrash.nextPageToken,
          promotions: promotionsTrash.nextPageToken,
          social: socialTrash.nextPageToken
        }
      });

      // Update has more category emails flags
      setHasMoreCategoryEmails({
        all: {
          primary: !!primaryInbox.nextPageToken,
          updates: !!updatesInbox.nextPageToken,
          promotions: !!promotionsInbox.nextPageToken,
          social: !!socialInbox.nextPageToken
        },
        spam: {
          primary: !!primarySpam.nextPageToken,
          updates: !!updatesSpam.nextPageToken,
          promotions: !!promotionsSpam.nextPageToken,
          social: !!socialSpam.nextPageToken
        },
        trash: {
          primary: !!primaryTrash.nextPageToken,
          updates: !!updatesTrash.nextPageToken,
          promotions: !!promotionsTrash.nextPageToken,
          social: !!socialTrash.nextPageToken
        }
      });

      console.log('✅ Category emails fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching category emails:', error);
    }
  }, [isGmailSignedIn, labelName, buildFilters, CATEGORIES_ENABLED]);

  /**
   * Load more emails for specific tab
   */
  const loadMoreForTab = useCallback(async (tabType: TabKey, options?: { force?: boolean }) => {
    if (!isGmailSignedIn) return;
    const force = options?.force || false;

    if (force) {
      setTabLoaded(prev => ({ ...prev, [tabType]: false }));
      setPageTokens(prev => ({
        ...prev,
        [tabType]: undefined,
        ...(tabType === 'all' ? { unread: undefined } : {})
      }));
    }

    try {
      setLoadingMore(true);

      if (tabType === 'all' || tabType === 'unread') {
        // DON'T fetch on initial load - we already have data from optimized load
        // Only fetch when user explicitly scrolls for more
        if (force && !pageTokens.all) {
          console.log('⚡ Skipping fetch - already have initial data from optimized load');
          setLoadingMore(false);
          return;
        }
        
        // Load more inbox emails (shared for all/unread tabs) - only when paginating
        const pageToken = force ? undefined : (pageTokens.all === 'has-more' ? undefined : pageTokens.all);
        
        // Fetch 30 emails at a time for faster loading (instead of 100)
        const response = await getAllInboxEmails(force, 30, pageToken);
        const newEmails = response.emails || [];

        // Debug: log what we fetched
        const newRead = newEmails.filter(e => e.isRead).length;
        const newUnread = newEmails.filter(e => !e.isRead).length;
        console.log('📧 Fetched batch for all/unread:', { total: newEmails.length, read: newRead, unread: newUnread });

        // ✨ FIX: Add to repository (single source of truth)
        emailRepository.addEmails(newEmails);

        // Update state
        setAllTabEmails(prev => {
          const base = force ? [] : prev.all;
          const merged = [...base, ...newEmails];
          console.log('[all] total loaded after merge', { total: merged.length });
          
          // Split into all and unread
          const unreadOnly = merged.filter(e => !e.isRead);
          return {
            ...prev,
            all: merged,
            unread: unreadOnly
          };
        });

        setPageTokens(prev => ({
          ...prev,
          all: response.nextPageToken,
          unread: response.nextPageToken
        }));

        setHasMoreForTabs(prev => ({
          ...prev,
          all: !!response.nextPageToken,
          unread: !!response.nextPageToken
        }));
      } else if (tabType === 'sent') {
        const pageToken = force ? undefined : (pageTokens.sent === 'has-more' ? undefined : pageTokens.sent);
        const response = await getSentEmails(force, 50, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          sent: force ? newEmails : [...prev.sent, ...newEmails]
        }));
        setPageTokens(prev => ({ ...prev, sent: response.nextPageToken }));
        setHasMoreForTabs(prev => ({ ...prev, sent: !!response.nextPageToken }));
      } else if (tabType === 'drafts') {
        const draftList = await getDraftEmails(force);
        setAllTabEmails(prev => ({ ...prev, drafts: draftList || [] }));
        setHasMoreForTabs(prev => ({ ...prev, drafts: (draftList?.length || 0) > 20 }));
      } else if (tabType === 'trash') {
        const pageToken = force ? undefined : (pageTokens.trash === 'has-more' ? undefined : pageTokens.trash);
        const response = await getTrashEmails(force, 50, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          trash: force ? newEmails : [...prev.trash, ...newEmails]
        }));
        setPageTokens(prev => ({ ...prev, trash: response.nextPageToken }));
        setHasMoreForTabs(prev => ({ ...prev, trash: !!response.nextPageToken }));
      } else if (tabType === 'important') {
        const pageToken = force ? undefined : (pageTokens.important === 'has-more' ? undefined : pageTokens.important);
        const response = await getImportantEmails(force, 20, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          important: force ? newEmails : [...prev.important, ...newEmails]
        }));
        setPageTokens(prev => ({ ...prev, important: response.nextPageToken }));
        setHasMoreForTabs(prev => ({ ...prev, important: !!response.nextPageToken }));
      } else if (tabType === 'starred') {
        const pageToken = force ? undefined : (pageTokens.starred === 'has-more' ? undefined : pageTokens.starred);
        const response = await getStarredEmails(force, 50, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          starred: force ? newEmails : [...prev.starred, ...newEmails]
        }));
        setPageTokens(prev => ({ ...prev, starred: response.nextPageToken }));
        setHasMoreForTabs(prev => ({ ...prev, starred: !!response.nextPageToken }));
      } else if (tabType === 'spam') {
        const pageToken = force ? undefined : (pageTokens.spam === 'has-more' ? undefined : pageTokens.spam);
        const response = await getSpamEmails(force, 50, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          spam: force ? newEmails : [...prev.spam, ...newEmails]
        }));
        setPageTokens(prev => ({ ...prev, spam: response.nextPageToken }));
        setHasMoreForTabs(prev => ({ ...prev, spam: !!response.nextPageToken }));
      } else if (tabType === 'allmail') {
        const pageToken = force ? undefined : (pageTokens.allmail === 'has-more' ? undefined : pageTokens.allmail);
        const response = await getAllMailEmails(force, 50, pageToken);
        const newEmails = response.emails || [];
        
        setAllTabEmails(prev => ({
          ...prev,
          allmail: force ? newEmails : [...prev.allmail, ...newEmails]
        }));
        setPageTokens(prev => ({ ...prev, allmail: response.nextPageToken }));
        setHasMoreForTabs(prev => ({ ...prev, allmail: !!response.nextPageToken }));
      }

      setTabLoaded(prev => ({ ...prev, [tabType]: true }));
    } catch (error) {
      console.error(`Error loading ${tabType} emails:`, error);
    } finally {
      setLoadingMore(false);
    }
  }, [isGmailSignedIn, pageTokens]);

  /**
   * Fetch label emails (separate logic for labels)
   */
  const fetchLabelEmails = useCallback(async (forceRefresh = false, loadMore = false) => {
    if (!isGmailSignedIn || !hasLabelTarget) return;

    try {
      const logName = labelName || effectiveLabelQuery || labelIdParam || 'label';
      const identifier = { labelId: labelIdParam || undefined, labelName: effectiveLabelQuery };
      console.log(`📧 Fetching emails for label: ${logName}${loadMore ? ' (loading more)' : ''}`);
      
      if (loadMore) {
        setLoadingMore(true);
        const response = await getLabelEmails(identifier, false, 10, currentPageToken);
        setEmails(prevEmails => [...prevEmails, ...(response.emails || [])]);
        setCurrentPageToken(response.nextPageToken);
        setLoadingMore(false);
      } else {
        setLoading(true);
        const response = await getLabelEmails(identifier, forceRefresh, 10, undefined);
        setEmails(response.emails);
        setCurrentPageToken(response.nextPageToken);
        setHasEverLoaded(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching label emails:', error);
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isGmailSignedIn, hasLabelTarget, labelName, effectiveLabelQuery, labelIdParam, currentPageToken, setLoading, setHasEverLoaded]);

  // Initial load effect
  useEffect(() => {
    console.log('📧 EmailPageLayout useEffect triggered:', { 
      isGmailSignedIn, 
      pageType, 
      labelName, 
      labelQueryParam, 
      labelIdParam, 
      authLoading, 
      isGmailInitializing, 
      hasInitiallyLoaded: hasInitiallyLoadedRef.current 
    });
    
    if (authLoading || isGmailInitializing) return;

    // ✅ DISABLED: usePagination now handles inbox loading for better performance
    // Initial load is handled by usePagination hook for list view (25 threads fast)
    // This hook now only handles:
    // 1. Label-specific emails (when labelName is set)
    // 2. Background operations (drafts, counts, etc.)
    
    if (isGmailSignedIn && pageType === 'inbox' && !labelName) {
      // Mark as loaded since usePagination handles the actual fetch
      if (!hasInitiallyLoadedRef.current) {
        hasInitiallyLoadedRef.current = true;
        setHasEverLoaded(true);
        console.log('📧 Initial load delegated to usePagination');
      }
    } else if (isGmailSignedIn && labelName) {
      console.log('📧 Label emails handled by pagination system');
    } else if (!isGmailSignedIn && !authLoading && !isGmailInitializing) {
      console.log('📧 Not signed in and auth complete - setting loading false');
      setHasEverLoaded(true);
      setLoading(false);
    }
  }, [isGmailSignedIn, pageType, labelName, authLoading, isGmailInitializing, fetchAllEmailTypes, setLoading, setHasEverLoaded]);

  return {
    // State
    loading: false, // Internal loading state handled by setLoading callback
    allTabEmails,
    setAllTabEmails,
    tabLoaded,
    setTabLoaded,
    emailCounts,
    setEmailCounts,
    categoryEmails,
    setCategoryEmails,
    pageTokens,
    setPageTokens,
    hasMoreForTabs,
    setHasMoreForTabs,
    categoryPageTokens,
    setCategoryPageTokens,
    hasMoreCategoryEmails,
    setHasMoreCategoryEmails,
    loadingMore,
    setLoadingMore,
    
    // Label emails
    emails,
    setEmails,
    currentPageToken,
    setCurrentPageToken,
    
    // Functions
    fetchAllEmailTypes,
    fetchCategoryEmails,
    fetchLabelEmails,
    loadMoreForTab,
    hasLoaded: hasInitiallyLoadedRef.current
  };
}
