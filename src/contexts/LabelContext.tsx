import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useLocation } from "react-router-dom";
import { GmailLabel } from "../types";
import {
  createGmailLabel,
  updateGmailLabel,
  deleteGmailLabel,
  fetchGmailLabels,
} from "../integrations/gapiService";
import { useAuth } from "./AuthContext";
import { useProfile } from "./ProfileContext";
import { useSecurity } from "./SecurityContext";
import { devLog } from "../utils/logging";
import { shouldBlockDataFetches } from "../utils/authFlowUtils";
import { emitLoadingProgress } from "@/utils/loadingProgress";
import { subscribeLabelUpdateEvent } from "../utils/labelUpdateEvents";
import { supabase } from "../lib/supabase";
import { FEATURE_FLAGS } from "../config/server";
import { GMAIL_SYSTEM_LABELS } from "../constants/gmailLabels";

// Static system labels with zero counters - shown immediately before API loads
const INITIAL_SYSTEM_LABELS: GmailLabel[] = [
  { id: GMAIL_SYSTEM_LABELS.INBOX, name: 'INBOX', type: 'system', messagesUnread: 0, messagesTotal: 0, threadsUnread: 0, threadsTotal: 0 },
  { id: GMAIL_SYSTEM_LABELS.SENT, name: 'SENT', type: 'system', messagesUnread: 0, messagesTotal: 0, threadsUnread: 0, threadsTotal: 0 },
  { id: GMAIL_SYSTEM_LABELS.DRAFT, name: 'DRAFT', type: 'system', messagesUnread: 0, messagesTotal: 0, threadsUnread: 0, threadsTotal: 0 },
  { id: GMAIL_SYSTEM_LABELS.TRASH, name: 'TRASH', type: 'system', messagesUnread: 0, messagesTotal: 0, threadsUnread: 0, threadsTotal: 0 },
  { id: GMAIL_SYSTEM_LABELS.SPAM, name: 'SPAM', type: 'system', messagesUnread: 0, messagesTotal: 0, threadsUnread: 0, threadsTotal: 0 },
  { id: GMAIL_SYSTEM_LABELS.IMPORTANT, name: 'IMPORTANT', type: 'system', messagesUnread: 0, messagesTotal: 0, threadsUnread: 0, threadsTotal: 0 },
  { id: GMAIL_SYSTEM_LABELS.STARRED, name: 'STARRED', type: 'system', messagesUnread: 0, messagesTotal: 0, threadsUnread: 0, threadsTotal: 0 },
];

interface LabelContextType {
  labels: GmailLabel[];
  loadingLabels: boolean;
  refreshLabels: (forceRefresh?: boolean, systemOnly?: boolean) => Promise<void>;
  clearLabelsCache: () => void;
  error: string | null;
  addLabel: (name: string) => Promise<GmailLabel | null>;
  editLabel: (id: string, newName: string) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
  isAddingLabel: boolean;
  addLabelError: string | null;
  isEditingLabel: boolean;
  editLabelError: string | null;
  isDeletingLabel: boolean;
  deleteLabelError: string | null;
  systemCounts: Record<string, number>; // ✅ NEW: Clear derivation for system folder badges
  // ✅ Local deltas for custom labels (tracked until manual refresh)
  incrementLabelUnreadCount: (labelId: string, delta: number) => void;
  // ✅ Recent counts (live, derived separately from static label metadata)
  recentCounts: {
    inboxUnreadToday: number; // unread INBOX messages received since New York midnight
    inboxUnreadOverLimit: boolean; // true when the real count exceeds the display cap (99+)
    draftTotal: number; // total number of drafts
    lastUpdated: number | null;
    isRefreshing: boolean;
  };
  // Simplified: no approximate fallback needed; value is direct Gmail estimate for unread since date boundary
  refreshRecentCounts: (opts?: { force?: boolean }) => Promise<void>;
  labelsLastUpdated: number | null; // Timestamp of when labels were last fetched
  isLabelHydrated: (labelId?: string | null) => boolean;
  isLabelRecentlyDeleted: (labelId: string) => boolean; // Check if label was just deleted (to skip pagination reset)
}

const LabelContext = createContext<LabelContextType | undefined>(undefined);

const SYSTEM_LABEL_IDS = new Set([
  "INBOX",
  "DRAFT",
  "DRAFTS",
  "SENT",
  "TRASH",
  "SPAM",
  "STARRED",
  "IMPORTANT",
  "UNREAD",
  "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
  "CHAT",
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ✅ REMOVED: fetchInboxUnreadSinceCutoff and fetchDraftTotal
// Counters now come directly from Gmail labels API (label.messagesUnread and label.messagesTotal)
// This ensures exact match with Gmail app and eliminates redundant API calls

export function LabelProvider({ children }: { children: React.ReactNode }) {
  // Initialize with static system labels so folders render immediately with 0 counters
  const [labels, setLabelsInternal] = useState<GmailLabel[]>(INITIAL_SYSTEM_LABELS);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelsLastUpdated, setLabelsLastUpdated] = useState<number | null>(
    null
  );

  // Cache to prevent duplicate API calls when switching tabs/pages
  const labelsCache = useRef<{
    [profileId: string]: {
      labels: GmailLabel[];
      timestamp: number;
      hydrated: boolean;
    };
  }>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Request coalescing to prevent duplicate label fetches
  const inFlightRequest = useRef<Promise<GmailLabel[]> | null>(null);
  const lastLoadedAt = useRef<number>(0);
  const userLabelDetailsInFlight = useRef<{
    cacheKey: string | null;
    promise: Promise<void> | null;
  }>({ cacheKey: null, promise: null });
  const hydratedLabelIdsRef = useRef<Set<string>>(new Set());
  const inboxReadyRef = useRef<boolean>(false);
  const labelsCountRef = useRef<number>(0); // Track labels count for stale closure checks
  const [hydratedLabelsVersion, setHydratedLabelsVersion] = useState(0);

  // Track recently deleted label IDs so pagination can skip reloading when navigating away
  const recentlyDeletedLabelIdsRef = useRef<Set<string>>(new Set());
  // Clear deleted labels after 10 seconds (enough time for navigation to complete)
  const clearDeletedLabelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Local delta tracking for custom label unread counts (cleared on manual refresh)
  // Key = labelId, Value = delta to add to the API count
  const [labelUnreadDeltas, setLabelUnreadDeltas] = useState<Record<string, number>>({});

  // Wrapper to update both state and ref
  const setLabels = useCallback((value: GmailLabel[] | ((prev: GmailLabel[]) => GmailLabel[])) => {
    setLabelsInternal((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      labelsCountRef.current = next.length;
      return next;
    });
  }, []);

  // Increment local unread count for a label (used when dragging unread emails)
  const incrementLabelUnreadCount = useCallback((labelId: string, delta: number) => {
    if (!labelId || delta === 0) return;
    setLabelUnreadDeltas(prev => ({
      ...prev,
      [labelId]: (prev[labelId] || 0) + delta
    }));
  }, []);

  // Clear local deltas (called on manual refresh)
  const clearLabelUnreadDeltas = useCallback(() => {
    setLabelUnreadDeltas({});
  }, []);

  const markLabelsHydrated = useCallback(
    (labelIds: Array<string | undefined | null>) => {
      let changed = false;
      for (const rawId of labelIds) {
        if (!rawId) continue;
        if (!hydratedLabelIdsRef.current.has(rawId)) {
          hydratedLabelIdsRef.current.add(rawId);
          changed = true;
        }
      }
      if (changed) {
        setHydratedLabelsVersion((version) => version + 1);
      }
    },
    []
  );

  const resetHydratedLabels = useCallback(() => {
    if (hydratedLabelIdsRef.current.size === 0) {
      return;
    }
    hydratedLabelIdsRef.current = new Set();
    setHydratedLabelsVersion((version) => version + 1);
  }, []);

  const isSystemLabel = useCallback((label?: GmailLabel | null) => {
    if (!label?.id) return false;
    const idUpper = label.id.toUpperCase();
    return label.type === "system" || SYSTEM_LABEL_IDS.has(idUpper);
  }, []);

  const isLabelHydrated = useCallback(
    (labelId?: string | null) => {
      if (!labelId) return false;
      return hydratedLabelIdsRef.current.has(labelId);
    },
    [hydratedLabelsVersion]
  );

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
    isRefreshing: false,
  }));
  const recentInFlight = useRef<Promise<void> | null>(null);
  const RECENT_MIN_INTERVAL = 15 * 1000; // throttle repeated refreshes (15s)
  // Separate ref for lastUpdated to avoid recreating callback & causing loops
  const recentLastUpdatedRef = useRef<number | null>(null);
  const countersProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (countersProgressTimerRef.current) {
        clearTimeout(countersProgressTimerRef.current);
        countersProgressTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Refresh recent dynamic counts.
   * ✅ OPTIMIZED: Now uses Gmail labels API directly - no separate API calls needed
   * - inboxUnreadToday: Now derived from labels API (label.messagesUnread for INBOX)
   * - draftTotal: Now derived from labels API (label.messagesTotal for DRAFT)
   *
   * This eliminates redundant API calls and ensures exact match with Gmail app.
   */
  const refreshRecentCounts = useCallback(
    async (opts?: { force?: boolean }) => {
      // ✅ OPTIMIZED: No longer needed - counters come directly from labels API
      // This function is kept for backward compatibility but does minimal work
      if (!isGmailSignedIn || !isGmailApiReady) return;

      const timestamp = Date.now();
      recentLastUpdatedRef.current = timestamp;

      // ✅ Get values directly from labels (already loaded)
      const inboxLabel = labels.find((l) => l.id === "INBOX");
      const draftLabel = labels.find((l) => l.id === "DRAFT");

      setRecentCounts((prev) => ({
        ...prev,
        inboxUnreadToday: inboxLabel?.messagesUnread ?? 0,
        inboxUnreadOverLimit: (inboxLabel?.messagesUnread ?? 0) > 99,
        draftTotal: draftLabel?.messagesTotal ?? 0,
        lastUpdated: timestamp,
        isRefreshing: false,
      }));
    },
    [isGmailSignedIn, isGmailApiReady, labels]
  );
  // ✅ NEW: Load labels from Supabase instead of Gmail API
  const loadLabelsFromSupabase = useCallback(async () => {
    if (!currentProfile?.id) return [];

    // 1. Get the account ID for the current profile
    const { data: account } = await supabase
      .from('gmail_accounts')
      .select('id')
      .eq('profile_id', currentProfile.id)
      .single();

    if (!account) return [];

    // 2. Fetch labels for this account
    const { data: labelsData, error } = await supabase
      .from('gmail_labels')
      .select('*')
      .eq('gmail_account_id', account.id)
      .order('type', { ascending: true }) // System first
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Failed to load labels from Supabase:', error);
      return [];
    }

    // Transform to GmailLabel format
    return labelsData.map(l => ({
      id: l.label_id,
      name: l.name,
      type: l.type as 'system' | 'user',
      messagesTotal: l.messages_total,
      messagesUnread: l.messages_unread,
      threadsTotal: l.threads_total,
      threadsUnread: l.threads_unread,
      messageListVisibility: 'show',
      labelListVisibility: 'labelShow',
    })) as GmailLabel[];
  }, [currentProfile]);


  // ✅ OPTIMIZED: Update counters automatically when labels change (no separate API calls)
  useEffect(() => {
    if (!isGmailSignedIn || !isGmailApiReady || labels.length === 0) return;

    // Update counters directly from labels (no API call needed)
    refreshRecentCounts({ force: true });
  }, [labels, isGmailSignedIn, isGmailApiReady, refreshRecentCounts]);

  // Realtime Subscription
  // ⚠️ DISABLED in diagnostic mode to prevent double updates and nondeterministic behavior
  useEffect(() => {
    // Skip Realtime subscription in diagnostic mode - direct Gmail API only
    if (FEATURE_FLAGS.USE_DIRECT_GMAIL_LABELS) {
      console.log("🔬 DIAGNOSTIC MODE: Supabase Realtime subscription DISABLED");
      return;
    }

    if (!currentProfile?.id) return;

    const channel = supabase
      .channel('gmail_labels_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gmail_labels',
        },
        () => {
          console.log('🔄 Realtime label update received, reloading...');
          loadLabelsFromSupabase().then(setLabelsInternal);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfile, loadLabelsFromSupabase]);

  // ✅ REMOVED: Optimistic adjustments - refresh labels instead to get exact Gmail API values
  // This ensures counters always match Gmail app exactly

  // ✅ REMOVED: No longer using 24h filtered count - using Gmail API directly
  // The inbox counter now comes directly from label.messagesUnread which matches Gmail app

  // Coalesced label fetching function


  const loadLabelsOnce = useCallback(async (): Promise<GmailLabel[]> => {
    // If already in-flight, return the same promise
    if (inFlightRequest.current) {
      return inFlightRequest.current;
    }

    try {
      // =========================================================================
      // DIAGNOSTIC MODE: Direct Gmail API with Progressive Loading
      // Purpose: Google Support case - prove counters come directly from Gmail API
      // =========================================================================
      if (FEATURE_FLAGS.USE_DIRECT_GMAIL_LABELS) {
        console.log("🔬 DIAGNOSTIC MODE: Using direct Gmail API for labels with progressive loading");
        
        // Progressive callback - updates state as each batch completes
        const handleProgress = (progressLabels: GmailLabel[]) => {
          console.log(`📊 Progressive update: ${progressLabels.length} labels`);
          setLabels(progressLabels);
          setLabelsLastUpdated(Date.now());
        };
        
        inFlightRequest.current = fetchGmailLabels(handleProgress);
        
        const gmailLabels = await inFlightRequest.current;
        lastLoadedAt.current = Date.now();
        return gmailLabels;
      }

      // =========================================================================
      // PRODUCTION MODE: Load from Supabase (gmail-sync backend)
      // =========================================================================
      inFlightRequest.current = loadLabelsFromSupabase().then(async labels => {
        // Initial sync trigger if empty
        if (labels.length === 0 && isGmailSignedIn && currentProfile?.id) {
          console.log('⚠️ No labels in Supabase & Signed In. Triggering initial sync...');
          await supabase.functions.invoke('gmail-sync', {
            method: 'POST',
            body: { profile_id: currentProfile.id }
          });
          return loadLabelsFromSupabase();
        }
        return labels;
      });

      const gmailLabels = await inFlightRequest.current;

      lastLoadedAt.current = Date.now();

      return gmailLabels;
    } finally {
      // Clear in-flight marker
      inFlightRequest.current = null;
    }
  }, [loadLabelsFromSupabase, isGmailSignedIn, setLabels]);

  // hydrateUserLabelCounts removed (dead code)

  useEffect(() => {
    if (!isGmailSignedIn) return;

    const unsubscribe = subscribeLabelUpdateEvent((detail) => {
      const delta = detail.action === "mark-unread" ? 1 : -1;
      if (!delta) return;

      setLabels((prev) => {
        if (!prev.length) return prev;
        let changed = false;

        const next = prev.map((label) => {
          if (!label.id || !detail.labelIds.includes(label.id)) {
            return label;
          }

          const currentUnread = label.messagesUnread ?? 0;
          const updatedUnread = Math.max(0, currentUnread + delta);

          // Also update threadsUnread for INBOX (used by FoldersColumn display)
          const currentThreadsUnread = label.threadsUnread ?? 0;
          const updatedThreadsUnread = Math.max(0, currentThreadsUnread + delta);

          if (updatedUnread === currentUnread && updatedThreadsUnread === currentThreadsUnread) {
            return label;
          }

          changed = true;
          return {
            ...label,
            messagesUnread: updatedUnread,
            threadsUnread: updatedThreadsUnread,
          };
        });

        return changed ? next : prev;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [isGmailSignedIn]);



  // ----------------------------------------------------------------------
  // 2) Refresh / Hydrate Logic
  // ----------------------------------------------------------------------

  // ✅ Helper: Fetch system label counts directly from Gmail API
  const fetchSystemLabelCountsFromGmail = useCallback(async (): Promise<Map<string, { messagesTotal: number; messagesUnread: number; threadsTotal: number; threadsUnread: number }>> => {
    const systemLabelIds = ['INBOX', 'DRAFT'];
    const counts = new Map<string, { messagesTotal: number; messagesUnread: number; threadsTotal: number; threadsUnread: number }>();

    if (!window.gapi?.client?.gmail?.users?.labels?.get) {
      console.warn('⚠️ Gmail API not ready for system label fetch');
      return counts;
    }

    // Fetch all system labels in parallel
    const results = await Promise.allSettled(
      systemLabelIds.map(async (labelId) => {
        try {
          const response = await window.gapi.client.gmail.users.labels.get({
            userId: 'me',
            id: labelId,
          });
          return { labelId, result: response.result };
        } catch (error) {
          console.warn(`⚠️ Failed to fetch ${labelId}:`, error);
          return { labelId, result: null };
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.result) {
        const { labelId, result: labelData } = result.value;
        counts.set(labelId, {
          messagesTotal: labelData.messagesTotal ?? 0,
          messagesUnread: labelData.messagesUnread ?? 0,
          threadsTotal: labelData.threadsTotal ?? 0,
          threadsUnread: labelData.threadsUnread ?? 0,
        });
      }
    }

    console.log('📊 System label counts from Gmail API:', Object.fromEntries(counts));
    return counts;
  }, []);

  const refreshLabels = useCallback(
    async (forceRefresh: boolean = false, systemOnly: boolean = false) => {
      // Security checks
      if (shouldBlockDataFetches(location.pathname) || !authFlowCompleted || !currentProfile || !isDataLoadingAllowed) {
        return;
      }

      // =========================================================================
      // DIAGNOSTIC MODE: Always use direct Gmail API - Zero Supabase involvement
      // =========================================================================
      if (FEATURE_FLAGS.USE_DIRECT_GMAIL_LABELS) {
        console.log("🔬 DIAGNOSTIC MODE: Refreshing labels via direct Gmail API");
        setLoadingLabels(true);
        emitLoadingProgress("labels", "start");

        try {
          const freshLabels = await fetchGmailLabels();
          setLabelsInternal(freshLabels);
          clearLabelUnreadDeltas();
          emitLoadingProgress("labels", "success");
          console.log("✅ DIAGNOSTIC MODE: Labels refreshed from Gmail API");
        } catch (e) {
          console.error("❌ DIAGNOSTIC MODE: Label refresh failed:", e);
          emitLoadingProgress("labels", "error");
        } finally {
          setLoadingLabels(false);
        }
        return;
      }

      // =========================================================================
      // PRODUCTION MODE: Supabase-based gmail-sync
      // =========================================================================
      if (forceRefresh) {
        // ✅ NEW: systemOnly mode - only refresh system label counts from Gmail API
        // Preserves custom labels and their optimistic counter changes
        if (systemOnly) {
          console.log('🔄 Refreshing system labels only (preserving custom folders)...');
          setLoadingLabels(true);

          try {
            // Fetch fresh system label counts directly from Gmail API
            const systemCounts = await fetchSystemLabelCountsFromGmail();

            // Merge: update system labels with fresh counts, preserve custom labels exactly
            setLabelsInternal((prevLabels) => {
              // Snapshot current custom label deltas to preserve
              const currentDeltas = { ...labelUnreadDeltas };

              return prevLabels.map((label) => {
                const labelIdUpper = label.id?.toUpperCase() || '';
                const isSystem = label.type === 'system' || SYSTEM_LABEL_IDS.has(labelIdUpper);

                if (isSystem && systemCounts.has(label.id || '')) {
                  // System label: update with fresh Gmail API counts
                  const fresh = systemCounts.get(label.id || '')!;
                  return {
                    ...label,
                    messagesTotal: fresh.messagesTotal,
                    messagesUnread: fresh.messagesUnread,
                    threadsTotal: fresh.threadsTotal,
                    threadsUnread: fresh.threadsUnread,
                  };
                } else if (!isSystem) {
                  // Custom label: preserve as-is, including any pending optimistic deltas
                  // Apply deltas to messagesUnread if any exist
                  const delta = currentDeltas[label.id || ''] || 0;
                  if (delta !== 0) {
                    return {
                      ...label,
                      messagesUnread: Math.max(0, (label.messagesUnread ?? 0) + delta),
                      threadsUnread: Math.max(0, (label.threadsUnread ?? 0) + delta),
                    };
                  }
                  return label;
                }

                return label;
              });
            });

            // Don't clear deltas for systemOnly refresh - they apply to custom labels
            console.log('✅ System labels refreshed, custom folders preserved');
            emitLoadingProgress("labels", "success");
          } catch (e) {
            console.error('❌ System label refresh failed:', e);
            emitLoadingProgress("labels", "error");
          } finally {
            setLoadingLabels(false);
          }

          return;
        }

        // Full refresh: sync ALL labels via backend
        console.log('🚀 Force Refresh requested - Triggering Backend Sync...');
        setLoadingLabels(true);
        emitLoadingProgress("labels", "start");

        try {
          console.log(`📤 invoking gmail-sync for profile: ${currentProfile.id}`);
          const { error, data } = await supabase.functions.invoke('gmail-sync', {
            method: 'POST',
            body: JSON.stringify({ profile_id: currentProfile.id })
          });

          if (data) console.log('📥 gmail-sync response:', data);

          if (error) {
            console.error('❌ Backend Sync failed:', error);
            setError('Failed to sync with Gmail');
            emitLoadingProgress("labels", "error");
          } else {
            console.log('✅ Backend Sync triggered successfully');
            // Wait a bit for changes to propagate then reload
            await sleep(1000);
            const freshLabels = await loadLabelsOnce();
            setLabelsInternal(freshLabels);
            // Clear optimistic deltas after full refresh (backend has authoritative counts)
            clearLabelUnreadDeltas();
            emitLoadingProgress("labels", "success");
          }
        } catch (e) {
          console.error('❌ Backend Sync exception:', e);
          emitLoadingProgress("labels", "error");
        } finally {
          setLoadingLabels(false);
        }
      } else {
        // Standard reload from Supabase
        const freshLabels = await loadLabelsOnce();
        setLabelsInternal(freshLabels);
      }
    },
    [loadLabelsOnce, currentProfile, authFlowCompleted, isDataLoadingAllowed, location.pathname, fetchSystemLabelCountsFromGmail, labelUnreadDeltas, clearLabelUnreadDeltas]
  );


  // ✅ OPTIMIZED: Refresh labels (which updates counters) instead of manual increment/decrement
  // This ensures we always have the exact Gmail API value
  // MOVED HERE: After refreshLabels is defined to avoid hoisting issues
  useEffect(() => {
    const handleDraftCreated = async () => {
      // Refresh only system labels (DRAFT, INBOX, etc.) - preserve custom folder counters
      await refreshLabels(true, true);
    };

    const handleDraftDeleted = async () => {
      // Refresh only system labels (DRAFT, INBOX, etc.) - preserve custom folder counters
      await refreshLabels(true, true);
    };

    window.addEventListener("draft-created", handleDraftCreated);
    window.addEventListener("email-deleted", handleDraftDeleted);

    // ✅ HOURLY REFRESH (User Request: "Reset every hour so it feels alive")
    // Re-added after manual removal. Ensures data stays fresh if user leaves app open.
    const hourlyTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && isGmailSignedIn && isGmailApiReady) {
        console.log('⏰ Hourly Label Refresh Triggered');
        refreshLabels(true); // Force sync
      }
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      window.removeEventListener("draft-created", handleDraftCreated);
      window.removeEventListener("email-deleted", handleDraftDeleted);
      clearInterval(hourlyTimer);
    };
  }, [refreshLabels, isGmailSignedIn, isGmailApiReady]);

  const clearLabelsCache = () => {
    labelsCache.current = {};
    lastLoadedAt.current = 0; // ✅ Reset timestamp so next fetch is allowed immediately
    resetHydratedLabels();
    userLabelDetailsInFlight.current = { cacheKey: null, promise: null };
    setLabels([]);
    setError(null);
    setLoadingLabels(false);
    setAddLabelError(null);
    setEditLabelError(null);
    setDeleteLabelError(null);
  };

  const addLabel = async (name: string): Promise<GmailLabel | null> => {
    if (!isGmailSignedIn || !isGmailApiReady || !currentProfile) {
      throw new Error("Gmail API not ready or no profile selected");
    }

    try {
      setIsAddingLabel(true);
      setAddLabelError(null);

      const createdLabel = await createGmailLabel(name);

      // Optimistically add to local state immediately for instant UI update
      if (createdLabel?.id) {
        const newLabel: GmailLabel = {
          id: createdLabel.id,
          name: createdLabel.name || name,
          type: createdLabel.type || "user",
          messagesTotal: 0,
          messagesUnread: 0,
          threadsTotal: 0,
          threadsUnread: 0,
        };
        setLabels((prev) => [...prev, newLabel]);
        markLabelsHydrated([createdLabel.id]);

        // Refresh for accurate counts
        await refreshLabels();
        return newLabel;
      }

      return null;
    } catch (err) {
      console.error("Error adding Gmail label:", err);
      setAddLabelError(
        err instanceof Error ? err.message : "Failed to add label"
      );
      throw err;
    } finally {
      setIsAddingLabel(false);
    }
  };

  const editLabel = async (id: string, newName: string) => {
    if (!isGmailSignedIn || !isGmailApiReady || !currentProfile) {
      throw new Error("Gmail API not ready or no profile selected");
    }

    try {
      setIsEditingLabel(true);
      setEditLabelError(null);

      await updateGmailLabel(id, newName);
      await refreshLabels(); // Refresh the labels list
    } catch (err) {
      console.error("Error editing Gmail label:", err);
      setEditLabelError(
        err instanceof Error ? err.message : "Failed to edit label"
      );
      throw err;
    } finally {
      setIsEditingLabel(false);
    }
  };

  const deleteLabel = async (id: string) => {
    if (!isGmailSignedIn || !isGmailApiReady || !currentProfile) {
      throw new Error("Gmail API not ready or no profile selected");
    }

    try {
      setIsDeletingLabel(true);
      setDeleteLabelError(null);

      // Find the label name before deleting (for event dispatch)
      const labelToDelete = labels.find((l) => l.id === id);
      const labelName = labelToDelete?.name || "";

      // ✅ WAIT for API to confirm deletion BEFORE optimistic update
      // This prevents race conditions where we navigate away before deletion completes
      await deleteGmailLabel(id);

      // ✅ Track this label as recently deleted so pagination skips reload
      recentlyDeletedLabelIdsRef.current.add(id);
      
      // Clear the tracking after 10 seconds
      if (clearDeletedLabelTimeout.current) {
        clearTimeout(clearDeletedLabelTimeout.current);
      }
      clearDeletedLabelTimeout.current = setTimeout(() => {
        recentlyDeletedLabelIdsRef.current.delete(id);
      }, 10000);

      // ✅ NOW apply optimistic update (after API success)
      setLabels((prev) => prev.filter((label) => label.id !== id));

      // ✅ Dispatch event AFTER API success to notify other components
      // This allows them to navigate away safely
      window.dispatchEvent(
        new CustomEvent("label-deleted", {
          detail: { labelId: id, labelName },
        })
      );

      // ✅ NO refreshLabels() needed - the label is already removed from state
      // Calling refreshLabels would cause folder list to flash/reset
    } catch (err) {
      console.error("Error deleting Gmail label:", err);
      setDeleteLabelError(
        err instanceof Error ? err.message : "Failed to delete label"
      );
      // Only refresh on error to restore state if something went wrong
      await refreshLabels();
      throw err;
    } finally {
      setIsDeletingLabel(false);
    }
  };

  const wasOnEmailPageRef = useRef(false);
  const lastRefreshKeyRef = useRef<string | null>(null);

  // Refresh labels when Gmail API becomes ready OR when the current profile changes
  // Avoid re-fetching whenever the route changes within email pages (e.g., opening a message)
  useEffect(() => {
    const isOnEmailPage =
      location.pathname.startsWith("/inbox") ||
      location.pathname.startsWith("/unread") ||
      location.pathname.startsWith("/sent") ||
      location.pathname.startsWith("/drafts") ||
      location.pathname.startsWith("/trash") ||
      location.pathname.startsWith("/email");

    if (!isOnEmailPage) {
      wasOnEmailPageRef.current = false;
      return;
    }

    if (!inboxReadyRef.current) {
      return;
    }

    const refreshKey = `${currentProfile?.id || "no-profile"}|${Number(
      isGmailSignedIn
    )}|${Number(isGmailApiReady)}|${Number(isDataLoadingAllowed)}`;
    const alreadyRefreshedForKey = lastRefreshKeyRef.current === refreshKey;
    const stayedOnEmailPage =
      wasOnEmailPageRef.current && alreadyRefreshedForKey;

    if (stayedOnEmailPage) {
      // No relevant dependency change; avoid redundant refresh when switching folders or opening messages
      return;
    }

    wasOnEmailPageRef.current = true;
    lastRefreshKeyRef.current = refreshKey;

    devLog.debug("Label refresh triggered");
    refreshLabels();
  }, [
    isGmailSignedIn,
    isGmailApiReady,
    currentProfile?.id,
    isDataLoadingAllowed,
    location.pathname,
    refreshLabels,
  ]);

  useEffect(() => {
    const handleInboxReady = () => {
      if (inboxReadyRef.current) return;
      inboxReadyRef.current = true;
      refreshLabels();
    };

    if (typeof window !== "undefined" && (window as any).__dndInboxReadyTs) {
      handleInboxReady();
    }

    window.addEventListener(
      "inbox-first-page-loaded",
      handleInboxReady as EventListener
    );
    return () => {
      window.removeEventListener(
        "inbox-first-page-loaded",
        handleInboxReady as EventListener
      );
    };
  }, [refreshLabels]);

  // Listen for profile switches and clear cache
  useEffect(() => {
    const handleClearCache = () => {
      clearLabelsCache();

      // Force immediate refresh after a short delay to allow profile switch to complete
      setTimeout(() => {
        if (
          currentProfile &&
          isGmailSignedIn &&
          isGmailApiReady &&
          inboxReadyRef.current
        ) {
          refreshLabels();
        } else {
        }
      }, 500);
    };

    const handleForceRefresh = () => {
      console.log("� LabelContext: Force refresh data event received");

      // ✅ OPTIMIZATION: Coalesce force refresh to prevent duplicate label fetches
      const timeSinceLastLoad = Date.now() - lastLoadedAt.current;
      if (timeSinceLastLoad < 3000 || inFlightRequest.current) {
        if (inFlightRequest.current) {
          // Wait for in-flight request to complete
          inFlightRequest.current
            .then(() => {
              // Force refresh satisfied
            })
            .catch(() => {
              // Force refresh satisfied
            });
        }
        return;
      }

      if (
        currentProfile &&
        isGmailSignedIn &&
        isGmailApiReady
      ) {
        refreshLabels();
      } else {
        console.log('⚠️ LabelContext: Force refresh validation failed', {
          hasProfile: !!currentProfile,
          isSignedIn: isGmailSignedIn,
          isApiReady: isGmailApiReady
        });
      }
    };

    window.addEventListener(
      "clear-all-caches",
      handleClearCache as EventListener
    );
    window.addEventListener(
      "force-refresh-data",
      handleForceRefresh as EventListener
    );

    return () => {
      window.removeEventListener(
        "clear-all-caches",
        handleClearCache as EventListener
      );
      window.removeEventListener(
        "force-refresh-data",
        handleForceRefresh as EventListener
      );
    };
  }, [
    clearLabelsCache,
    refreshLabels,
    currentProfile,
    isGmailSignedIn,
    isGmailApiReady,
  ]);

  // ✅ SYSTEM COUNTS: Direct from Gmail API - matches Gmail app exactly
  // Keys should match Gmail system label IDs: INBOX, SENT, DRAFT, TRASH, SPAM, IMPORTANT, STARRED
  const systemCounts = useMemo(() => {
    const map: Record<string, number> = {};

    for (const label of labels) {
      if (!label.id) continue;

      // ✅ Use messagesUnread directly from Gmail API (no fallback, no calculations)
      const count = label.messagesUnread ?? 0;
      map[label.id] = count;
    }

    // ✅ Apply local deltas for custom labels (tracked until manual refresh)
    for (const [labelId, delta] of Object.entries(labelUnreadDeltas)) {
      if (delta !== 0) {
        map[labelId] = Math.max(0, (map[labelId] || 0) + delta);
      }
    }

    return map;
  }, [labels, labelUnreadDeltas]);

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
    systemCounts, // ✅ Export system counts for badges (includes local deltas)
    incrementLabelUnreadCount, // ✅ Method to locally increment label unread count
    recentCounts, // ✅ Export recent dynamic counts
    refreshRecentCounts, // ✅ Method to refresh recent counts
    labelsLastUpdated, // ✅ Timestamp of when labels were last fetched
    isLabelHydrated,
    isLabelRecentlyDeleted: (labelId: string) => recentlyDeletedLabelIdsRef.current.has(labelId),
  };

  return (
    <LabelContext.Provider value={value}>{children}</LabelContext.Provider>
  );
}

export function useLabel() {
  const context = useContext(LabelContext);
  if (context === undefined) {
    throw new Error("useLabel must be used within a LabelProvider");
  }
  return context;
}