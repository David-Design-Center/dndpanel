import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { GmailLabel } from '../types';
import { fetchGmailLabels, createGmailLabel, updateGmailLabel, deleteGmailLabel } from '../integrations/gapiService';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import { useSecurity } from './SecurityContext';
import { devLog } from '../utils/logging';
import { shouldBlockDataFetches } from '../utils/authFlowUtils';

interface LabelContextType {
  labels: GmailLabel[];
  loadingLabels: boolean;
  refreshLabels: () => Promise<void>;
  clearLabelsCache: () => void;
  error: string | null;
  addLabel: (name: string) => Promise<void>;
  editLabel: (id: string, newName: string) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
  isAddingLabel: boolean;
  addLabelError: string | null;
  isEditingLabel: boolean;
  editLabelError: string | null;
  isDeletingLabel: boolean;
  deleteLabelError: string | null;
  systemCounts: Record<string, number>; // ✅ NEW: Clear derivation for system folder badges
  // ✅ Recent counts (live, derived separately from static label metadata)
  recentCounts: {
    inboxUnreadToday: number;      // unread INBOX messages received since New York midnight
    inboxUnreadOverLimit: boolean; // true when the real count exceeds the display cap (99+)
    draftTotal: number;            // total number of drafts
    lastUpdated: number | null;
    isRefreshing: boolean;
  };
  // Simplified: no approximate fallback needed; value is direct Gmail estimate for unread since date boundary
  refreshRecentCounts: (opts?: { force?: boolean }) => Promise<void>;
}

const LabelContext = createContext<LabelContextType | undefined>(undefined);

const INBOX_UNREAD_HARD_LIMIT = 100;
const UNREAD_BATCH_SIZE = 100;
const MAX_UNREAD_PAGES = 10; // safety guard to avoid runaway pagination
const DRAFT_BATCH_SIZE = 100;

const getRolling24hCutoffUnixSeconds = (): number => Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

const fetchInboxUnreadSinceCutoff = async (cutoffSeconds: number): Promise<{ count: number; overLimit: boolean; }> => {
  let pageToken: string | undefined;
  let total = 0;
  let overLimit = false;
  const query = `label:INBOX is:unread after:${cutoffSeconds}`;

  for (let page = 0; page < MAX_UNREAD_PAGES; page++) {
    const response = await window.gapi.client.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: UNREAD_BATCH_SIZE,
      pageToken,
      fields: 'messages/id,nextPageToken'
    });
    const messages = (response as any)?.result?.messages || [];
    total += messages.length;

    if (total > INBOX_UNREAD_HARD_LIMIT) {
      overLimit = true;
      break;
    }

    pageToken = (response as any)?.result?.nextPageToken;
    if (!pageToken) break;
  }

  if (!overLimit && pageToken) {
    overLimit = true;
  }

  return {
    count: Math.min(total, INBOX_UNREAD_HARD_LIMIT),
    overLimit
  };
};

const fetchDraftTotal = async (): Promise<number> => {
  let pageToken: string | undefined;
  let total = 0;

  do {
    const response = await window.gapi.client.gmail.users.drafts.list({
      userId: 'me',
      maxResults: DRAFT_BATCH_SIZE,
      pageToken,
      fields: 'drafts/id,nextPageToken'
    });
    const drafts = (response as any)?.result?.drafts || [];
    total += drafts.length;
    pageToken = (response as any)?.result?.nextPageToken;
  } while (pageToken);

  return total;
};

export function LabelProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache to prevent duplicate API calls when switching tabs/pages
  const labelsCache = useRef<{[profileId: string]: { labels: GmailLabel[], timestamp: number }}>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  
  // Request coalescing to prevent duplicate label fetches
  const inFlightRequest = useRef<Promise<GmailLabel[]> | null>(null);
  const lastLoadedAt = useRef<number>(0);
  
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [addLabelError, setAddLabelError] = useState<string | null>(null);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabelError, setEditLabelError] = useState<string | null>(null);
  const [isDeletingLabel, setIsDeletingLabel] = useState(false);
  const [deleteLabelError, setDeleteLabelError] = useState<string | null>(null);
  const { isGmailSignedIn, isGmailApiReady } = useAuth();
  const { currentProfile, authFlowCompleted } = useProfile();
  const { isDataLoadingAllowed } = useSecurity();
  const location = useLocation();

  // ---------------------------------------------
  // Recent dynamic counts (Inbox unread last 24h & draft total)
  // ---------------------------------------------
  const [recentCounts, setRecentCounts] = useState<{
    inboxUnreadToday: number;
    inboxUnreadOverLimit: boolean;
    draftTotal: number;
    lastUpdated: number | null;
    isRefreshing: boolean;
  }>(() => ({
    inboxUnreadToday: 0,
    inboxUnreadOverLimit: false,
    draftTotal: 0,
    lastUpdated: null,
    isRefreshing: false
  }));
  const recentInFlight = useRef<Promise<void> | null>(null);
  const RECENT_MIN_INTERVAL = 15 * 1000; // throttle repeated refreshes (15s)
  // Separate ref for lastUpdated to avoid recreating callback & causing loops
  const recentLastUpdatedRef = useRef<number | null>(null);

  /**
   * Refresh recent dynamic counts.
   * - inboxUnreadToday: Count of INBOX messages marked UNREAD whose Gmail timestamp is within the
   *   last 24 hours (rolling window). Uses Gmail search filtering (`after:<unix_ts>`) to avoid
   *   scanning older pages and caps badge display at 99+ when count exceeds 100.
   * - draftTotal: Exact total number of draft messages (counts pages from users.drafts.list).
   *
   * Throttling: Prevents re-fetching more often than RECENT_MIN_INTERVAL unless force=true.
   * Coalescing: Multiple simultaneous calls share a single in-flight promise.
   */
  const refreshRecentCounts = useCallback(async (opts?: { force?: boolean }) => {
    if (!isGmailSignedIn || !isGmailApiReady) return;
    const force = opts?.force || false;
    const now = Date.now();
    const last = recentLastUpdatedRef.current;
    if (!force && last && (now - last) < RECENT_MIN_INTERVAL) return;
    if (recentInFlight.current) return;

    setRecentCounts(rc => ({ ...rc, isRefreshing: true }));

    recentInFlight.current = (async () => {
      try {
        const cutoffSeconds = getRolling24hCutoffUnixSeconds();
        const [unreadResult, draftResult] = await Promise.allSettled([
          fetchInboxUnreadSinceCutoff(cutoffSeconds),
          fetchDraftTotal()
        ]);

        const timestamp = Date.now();
        recentLastUpdatedRef.current = timestamp;

        setRecentCounts(prev => {
          const next = {
            ...prev,
            lastUpdated: timestamp,
            isRefreshing: false
          };

          if (unreadResult.status === 'fulfilled') {
            next.inboxUnreadToday = unreadResult.value.count;
            next.inboxUnreadOverLimit = unreadResult.value.overLimit;
          } else {
            console.error('⚠️ Failed to refresh inbox unread count', unreadResult.reason);
          }

          if (draftResult.status === 'fulfilled') {
            next.draftTotal = draftResult.value;
          } else {
            console.error('⚠️ Failed to refresh drafts total', draftResult.reason);
          }

          return next;
        });
      } catch (error) {
        console.error('⚠️ Recent counts refresh failed', error);
        setRecentCounts(prev => ({ ...prev, isRefreshing: false }));
      } finally {
        recentInFlight.current = null;
      }
    })();

    await recentInFlight.current;
  }, [isGmailSignedIn, isGmailApiReady]);

  // Initial fetch + periodic refresh (every 5 min)
  useEffect(() => {
    if (!isGmailSignedIn || !isGmailApiReady) return;
    refreshRecentCounts({ force: true });
    const id = setInterval(() => refreshRecentCounts({ force: true }), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [isGmailSignedIn, isGmailApiReady, refreshRecentCounts]);

  // Auto refresh recent counts when labels load (for draft total) or auth ready
  useEffect(() => {
    if (labels.length && isGmailSignedIn && isGmailApiReady) {
      refreshRecentCounts({ force: true });
    }
  }, [labels, isGmailSignedIn, isGmailApiReady, refreshRecentCounts]);

  // Optimistic adjustments via custom events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (!detail) return;
      setRecentCounts(rc => {
        const delta = detail.inboxUnread24hDelta || 0;
        const nextRaw = Math.max(0, (rc.inboxUnreadToday || 0) + delta);
        return {
          ...rc,
          inboxUnreadToday: Math.min(nextRaw, INBOX_UNREAD_HARD_LIMIT),
          inboxUnreadOverLimit: rc.inboxUnreadOverLimit || nextRaw > INBOX_UNREAD_HARD_LIMIT
        };
      });
    };
    window.addEventListener('recent-counts-adjust', handler as EventListener);
    return () => window.removeEventListener('recent-counts-adjust', handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail: any = (event as CustomEvent).detail;
      if (!detail || typeof detail.count !== 'number') return;
      setRecentCounts(rc => ({
        ...rc,
        inboxUnreadToday: Math.min(detail.count, INBOX_UNREAD_HARD_LIMIT),
        inboxUnreadOverLimit: !!detail.overLimit || detail.count > INBOX_UNREAD_HARD_LIMIT,
        lastUpdated: Date.now(),
        isRefreshing: false
      }));
    };
    window.addEventListener('inbox-unread-24h', handler as EventListener);
    return () => window.removeEventListener('inbox-unread-24h', handler as EventListener);
  }, []);

  // Coalesced label fetching function
  const loadLabelsOnce = useCallback(async (): Promise<GmailLabel[]> => {
    // If already in-flight, return the same promise
    if (inFlightRequest.current) {
      console.log('🔄 Labels already loading, reusing in-flight request');
      return inFlightRequest.current;
    }

    try {
      // Mark request as in-flight
      inFlightRequest.current = fetchGmailLabels();
      const gmailLabels = await inFlightRequest.current;
      
      lastLoadedAt.current = Date.now();
      console.log('🔄 Labels loaded successfully at:', lastLoadedAt.current);
      
      return gmailLabels;
    } finally {
      // Clear in-flight marker
      inFlightRequest.current = null;
    }
  }, []);

  const refreshLabels = useCallback(async () => {
    // Security check: Block all data fetches during auth flow
    if (shouldBlockDataFetches(location.pathname)) {
      return;
    }

    // Double check with authFlowCompleted state
    if (!authFlowCompleted) {
      return;
    }

    // Ensure we have current profile and Gmail is ready
    if (!currentProfile) {
      return;
    }

    if (!isGmailSignedIn || !isGmailApiReady) {
      return;
    }

    // Check security context
    if (!isDataLoadingAllowed) {
      return;
    }

    // Check cache first to prevent unnecessary API calls
    // Use profile userEmail + ID for cache key to ensure separation between different profiles
    const cacheKey = `${currentProfile.id}-${currentProfile.userEmail || 'no-email'}`;
    console.log('🏷️ Labels cache key:', cacheKey);
    const cached = labelsCache.current[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('📦 Using cached labels for profile:', currentProfile.name);
      setLabels(cached.labels);
      return;
    }

    // ✅ OPTIMIZATION: Prevent duplicate label fetches with coalescing
    // Skip if we already loaded recently (within 3 seconds) or if already loading
    const timeSinceLastLoad = Date.now() - lastLoadedAt.current;
    if (timeSinceLastLoad < 3000 && lastLoadedAt.current > 0) {
      console.log('🛑 Skipping duplicate label fetch - loaded', timeSinceLastLoad, 'ms ago');
      return;
    }

    // If already in-flight, wait for it to complete
    if (inFlightRequest.current) {
      console.log('🔄 Waiting for in-flight labels request to complete');
      await inFlightRequest.current;
      return;
    }

    try {
      setLoadingLabels(true);
      setError(null);
      
      console.log('🔄 Fetching fresh Gmail labels for profile:', currentProfile.name, 'email:', currentProfile.userEmail);
      const gmailLabels = await loadLabelsOnce();
      
      // Debug: Log labels with counts (only those with counts to reduce noise)
      const labelsWithCounts = gmailLabels.filter(label => 
        (label.messagesUnread || 0) > 0 || (label.messagesTotal || 0) > 0
      );
      console.log('Labels with counts:', labelsWithCounts.map(label => ({
        name: label.name,
        messagesUnread: label.messagesUnread,
        messagesTotal: label.messagesTotal
      })));
      
      setLabels(gmailLabels);
      
      // Cache the result with the same key format
      const cacheKey = `${currentProfile.id}-${currentProfile.userEmail || 'no-email'}`;
      labelsCache.current[cacheKey] = {
        labels: gmailLabels,
        timestamp: Date.now()
      };
      
    } catch (err) {
      console.error('Error fetching Gmail labels:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch labels';
      setError(errorMessage);
      
      // Don't clear existing labels on error, keep showing what we have
      // This prevents the UI from going blank during rate limit errors
    } finally {
      setLoadingLabels(false);
    }
  }, [isGmailSignedIn, isGmailApiReady, currentProfile?.id, isDataLoadingAllowed, authFlowCompleted]); // Removed location.pathname to prevent unnecessary refreshes on navigation

  const clearLabelsCache = () => {
    console.log('🗑️ Clearing labels cache');
    labelsCache.current = {};
    setLabels([]);
    setError(null);
    setLoadingLabels(false);
    setAddLabelError(null);
    setEditLabelError(null);
    setDeleteLabelError(null);
  };

  const addLabel = async (name: string) => {
    if (!isGmailSignedIn || !isGmailApiReady || !currentProfile) {
      throw new Error('Gmail API not ready or no profile selected');
    }

    try {
      setIsAddingLabel(true);
      setAddLabelError(null);
      console.log(`Adding Gmail label: ${name} for profile: ${currentProfile.name}`);
      
      await createGmailLabel(name);
      await refreshLabels(); // Refresh the labels list
      
      console.log(`Successfully added label: ${name} for profile: ${currentProfile.name}`);
    } catch (err) {
      console.error('Error adding Gmail label:', err);
      setAddLabelError(err instanceof Error ? err.message : 'Failed to add label');
      throw err;
    } finally {
      setIsAddingLabel(false);
    }
  };

  const editLabel = async (id: string, newName: string) => {
    if (!isGmailSignedIn || !isGmailApiReady || !currentProfile) {
      throw new Error('Gmail API not ready or no profile selected');
    }

    try {
      setIsEditingLabel(true);
      setEditLabelError(null);
      console.log(`Editing Gmail label ${id} to: ${newName} for profile: ${currentProfile.name}`);
      
      await updateGmailLabel(id, newName);
      await refreshLabels(); // Refresh the labels list
      
      console.log(`Successfully edited label to: ${newName} for profile: ${currentProfile.name}`);
    } catch (err) {
      console.error('Error editing Gmail label:', err);
      setEditLabelError(err instanceof Error ? err.message : 'Failed to edit label');
      throw err;
    } finally {
      setIsEditingLabel(false);
    }
  };

  const deleteLabel = async (id: string) => {
    if (!isGmailSignedIn || !isGmailApiReady || !currentProfile) {
      throw new Error('Gmail API not ready or no profile selected');
    }

    try {
      setIsDeletingLabel(true);
      setDeleteLabelError(null);
      console.log(`Deleting Gmail label: ${id} for profile: ${currentProfile.name}`);
      
      await deleteGmailLabel(id);
      await refreshLabels(); // Refresh the labels list
      
      console.log(`Successfully deleted label: ${id} for profile: ${currentProfile.name}`);
    } catch (err) {
      console.error('Error deleting Gmail label:', err);
      setDeleteLabelError(err instanceof Error ? err.message : 'Failed to delete label');
      throw err;
    } finally {
      setIsDeletingLabel(false);
    }
  };

  // Refresh labels when Gmail API becomes ready OR when the current profile changes
  // This ensures we only fetch labels when the API is properly configured for the current profile
  useEffect(() => {
    devLog.debug(`Label refresh triggered`);
    refreshLabels();
  }, [isGmailSignedIn, isGmailApiReady, currentProfile?.id, isDataLoadingAllowed]); // Depend on security policy

  // Listen for profile switches and clear cache
  useEffect(() => {
    const handleClearCache = () => {
      console.log('🗑️ LabelContext: Clearing labels cache for profile switch');
      clearLabelsCache();
      
      // Force immediate refresh after a short delay to allow profile switch to complete
      setTimeout(() => {
        if (currentProfile && isGmailSignedIn && isGmailApiReady) {
          console.log('🔄 LabelContext: Force refreshing labels after profile switch');
          refreshLabels();
        }
      }, 500);
    };

    const handleForceRefresh = () => {
      console.log('🔄 LabelContext: Force refresh data event received');
      
      // ✅ OPTIMIZATION: Coalesce force refresh to prevent duplicate label fetches
      const timeSinceLastLoad = Date.now() - lastLoadedAt.current;
      if (timeSinceLastLoad < 3000 || inFlightRequest.current) {
        console.log('🛑 Skipping force refresh - recently loaded or already loading');
        if (inFlightRequest.current) {
          // Wait for in-flight request to complete
          inFlightRequest.current.then(() => {
            console.log('✅ In-flight request completed, force refresh satisfied');
          }).catch(() => {
            console.log('❌ In-flight request failed, force refresh satisfied');
          });
        }
        return;
      }
      
      if (currentProfile && isGmailSignedIn && isGmailApiReady) {
        console.log('🔄 LabelContext: Force refreshing labels now');
        refreshLabels();
      }
    };

    window.addEventListener('clear-all-caches', handleClearCache as EventListener);
    window.addEventListener('force-refresh-data', handleForceRefresh as EventListener);
    
    return () => {
      window.removeEventListener('clear-all-caches', handleClearCache as EventListener);
      window.removeEventListener('force-refresh-data', handleForceRefresh as EventListener);
    };
  }, [clearLabelsCache, refreshLabels, currentProfile, isGmailSignedIn, isGmailApiReady]);

  // ✅ SYSTEM COUNTS: Clear derivation for system folder badges
  const systemCounts = useMemo(() => {
    const map: Record<string, number> = {};
    
    for (const label of labels) {
      if (!label.id) continue;
      
      // Try messagesUnread first, fallback to threadsUnread
      const count = (label as any).messagesUnread ?? (label as any).threadsUnread ?? 0;
      map[label.id] = count;
    }
    
    console.log('📊 System counts derived from labels:', Object.entries(map)
      .filter(([, count]) => count > 0)
      .reduce((acc, [id, count]) => ({ ...acc, [id]: count }), {}));
    
    return map; // ✅ New reference when labels change
  }, [labels]);

  const value = {
    labels,
    loadingLabels,
    refreshLabels,
    clearLabelsCache,
    error,
    addLabel,
    editLabel,
    deleteLabel,
    isAddingLabel,
    addLabelError,
    isEditingLabel,
    editLabelError,
    isDeletingLabel,
    deleteLabelError,
    systemCounts, // ✅ Export system counts for badges
    recentCounts, // ✅ Export recent dynamic counts
    refreshRecentCounts // ✅ Method to refresh recent counts
  };

  return <LabelContext.Provider value={value}>{children}</LabelContext.Provider>;
}

export function useLabel() {
  const context = useContext(LabelContext);
  if (context === undefined) {
    throw new Error('useLabel must be used within a LabelProvider');
  }
  return context;
}
