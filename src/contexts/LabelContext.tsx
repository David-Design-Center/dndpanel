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
  fetchGmailLabels,
  createGmailLabel,
  updateGmailLabel,
  deleteGmailLabel,
} from "../integrations/gapiService";
import { useAuth } from "./AuthContext";
import { useProfile } from "./ProfileContext";
import { useSecurity } from "./SecurityContext";
import { devLog } from "../utils/logging";
import { shouldBlockDataFetches } from "../utils/authFlowUtils";
import { emitLoadingProgress } from "@/utils/loadingProgress";
import { getRolling24hCutoffUnixSeconds } from "../lib/utils";
import { subscribeLabelUpdateEvent } from "../utils/labelUpdateEvents";

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
}

const LabelContext = createContext<LabelContextType | undefined>(undefined);

// ✅ REMOVED: Unused constants - counters now come directly from Gmail API
const USER_LABEL_BATCH_SIZE = 10;
const USER_LABEL_DETAIL_DELAY_MS = 150;
const USER_LABEL_RETRY_LIMIT = 2;

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
  const [labels, setLabelsInternal] = useState<GmailLabel[]>([]);
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

  // ✅ OPTIMIZED: Update counters automatically when labels change (no separate API calls)
  useEffect(() => {
    if (!isGmailSignedIn || !isGmailApiReady || labels.length === 0) return;

    // Update counters directly from labels (no API call needed)
    refreshRecentCounts({ force: true });
  }, [labels, isGmailSignedIn, isGmailApiReady, refreshRecentCounts]);

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
      // Mark request as in-flight
      inFlightRequest.current = fetchGmailLabels();
      const gmailLabels = await inFlightRequest.current;

      lastLoadedAt.current = Date.now();

      return gmailLabels;
    } finally {
      // Clear in-flight marker
      inFlightRequest.current = null;
    }
  }, []);

  const hydrateUserLabelCounts = useCallback(
    (baseLabels: GmailLabel[], cacheKey: string) => {
      console.log('🏷️ hydrateUserLabelCounts called', { 
        labelsCount: baseLabels?.length, 
        cacheKey,
        isGmailSignedIn,
        isGmailApiReady 
      });
      
      if (!isGmailSignedIn || !isGmailApiReady) {
        console.log('🏷️ hydrate skipped: Gmail not ready');
        return;
      }
      if (!baseLabels?.length) {
        console.log('🏷️ hydrate skipped: no labels');
        return;
      }
      if (
        typeof window === "undefined" ||
        !(window as any)?.gapi?.client?.gmail?.users?.labels?.get
      ) {
        console.log('🏷️ hydrate skipped: gapi not available');
        return;
      }

      const labelsNeedingDetails = baseLabels.filter((label) => {
        if (!label.id) return false;
        if (hydratedLabelIdsRef.current.has(label.id)) return false;
        const idUpper = label.id.toUpperCase();
        const isSystem =
          label.type === "system" || SYSTEM_LABEL_IDS.has(idUpper);
        return !isSystem;
      });

      console.log('🏷️ Labels needing hydration:', labelsNeedingDetails.length);

      if (labelsNeedingDetails.length === 0) return;

      if (
        userLabelDetailsInFlight.current.promise &&
        userLabelDetailsInFlight.current.cacheKey === cacheKey
      ) {
        return;
      }

      const fetchDetailWithRetry = async (
        labelId: string,
        attempt = 0
      ): Promise<any | null> => {
        try {
          return await (window as any).gapi.client.gmail.users.labels.get({
            userId: "me",
            id: labelId,
          });
        } catch (error: any) {
          if (error?.status === 429 && attempt < USER_LABEL_RETRY_LIMIT) {
            const backoff = 400 * (attempt + 1);
            console.warn(
              `⚠️ Rate limited fetching label ${labelId}, retrying in ${backoff}ms`
            );
            await sleep(backoff);
            return fetchDetailWithRetry(labelId, attempt + 1);
          }
          console.warn(
            `⚠️ Failed to fetch label detail for ${labelId}:`,
            error
          );
          return null;
        }
      };

      const promise = (async () => {
        for (
          let start = 0;
          start < labelsNeedingDetails.length;
          start += USER_LABEL_BATCH_SIZE
        ) {
          const batch = labelsNeedingDetails.slice(
            start,
            start + USER_LABEL_BATCH_SIZE
          );
          const responses = await Promise.all(
            batch.map((label) => fetchDetailWithRetry(label.id))
          );

          const updates: Record<string, Partial<GmailLabel>> = {};
          responses.forEach((response, idx) => {
            const detail = response?.result;
            const original = batch[idx];
            if (!detail?.id || !original) return;
            updates[detail.id] = {
              messagesUnread: detail.messagesUnread ?? 0,
              messagesTotal: detail.messagesTotal ?? 0,
              threadsUnread: detail.threadsUnread ?? 0,
              threadsTotal: detail.threadsTotal ?? 0,
              messageListVisibility:
                detail.messageListVisibility ?? original.messageListVisibility,
              labelListVisibility:
                detail.labelListVisibility ?? original.labelListVisibility,
              type: detail.type ?? original.type,
            };
          });

          if (Object.keys(updates).length > 0) {
            let nextSnapshot: GmailLabel[] | null = null;
            setLabels((prev) => {
              let mutated = false;
              const next = prev.map((label) => {
                const update = updates[label.id];
                if (update) {
                  mutated = true;
                  return {
                    ...label,
                    ...update,
                  };
                }
                return label;
              });
              if (mutated) {
                nextSnapshot = next;
                return next;
              }
              return prev;
            });

            if (nextSnapshot && labelsCache.current[cacheKey]) {
              labelsCache.current[cacheKey] = {
                labels: nextSnapshot,
                timestamp: Date.now(),
                hydrated: true,
              };
            }

            markLabelsHydrated(Object.keys(updates));
          }

          if (start + USER_LABEL_BATCH_SIZE < labelsNeedingDetails.length) {
            await sleep(USER_LABEL_DETAIL_DELAY_MS);
          }
        }
      })();

      userLabelDetailsInFlight.current = { cacheKey, promise };
      promise.finally(() => {
        if (userLabelDetailsInFlight.current.promise === promise) {
          userLabelDetailsInFlight.current = { cacheKey: null, promise: null };
        }
      });
    },
    [isGmailSignedIn, isGmailApiReady, setLabels, markLabelsHydrated]
  );

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

  // Listen for draft-created and draft-deleted events to update Draft counter
  useEffect(() => {
    if (!isGmailSignedIn) return;

    const handleDraftCreated = () => {
      console.log('📝 LabelContext: Draft created, incrementing DRAFT count');
      setLabels((prev) => {
        return prev.map((label) => {
          if (label.id !== 'DRAFT') return label;
          return {
            ...label,
            threadsTotal: (label.threadsTotal ?? 0) + 1,
            messagesTotal: (label.messagesTotal ?? 0) + 1,
          };
        });
      });
    };

    const handleDraftDeleted = () => {
      console.log('🗑️ LabelContext: Draft deleted, decrementing DRAFT count');
      setLabels((prev) => {
        return prev.map((label) => {
          if (label.id !== 'DRAFT') return label;
          return {
            ...label,
            threadsTotal: Math.max(0, (label.threadsTotal ?? 0) - 1),
            messagesTotal: Math.max(0, (label.messagesTotal ?? 0) - 1),
          };
        });
      });
    };

    window.addEventListener('draft-created', handleDraftCreated);
    window.addEventListener('draft-deleted', handleDraftDeleted);

    return () => {
      window.removeEventListener('draft-created', handleDraftCreated);
      window.removeEventListener('draft-deleted', handleDraftDeleted);
    };
  }, [isGmailSignedIn]);

  const refreshLabels = useCallback(
    async (forceRefresh: boolean = false, systemOnly: boolean = false) => {
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

      // When forcing refresh (and NOT systemOnly), clear hydrated labels so they get re-fetched with fresh counters
      // When systemOnly is true, we preserve custom label state and only refresh system labels
      if (forceRefresh && !systemOnly) {
        resetHydratedLabels();
        // Also clear any in-flight user label detail requests
        userLabelDetailsInFlight.current = { cacheKey: null, promise: null };
        // Clear local unread deltas - we're getting fresh data from API
        clearLabelUnreadDeltas();
        userLabelDetailsInFlight.current = { cacheKey: null, promise: null };
      }

      const startProgress = () => emitLoadingProgress("labels", "start");
      const finishProgress = (status: "success" | "error") =>
        emitLoadingProgress("labels", status);

      // Check cache first to prevent unnecessary API calls (unless forceRefresh is true)
      // Use profile userEmail + ID for cache key to ensure separation between different profiles
      const cacheKey = `${currentProfile.id}-${
        currentProfile.userEmail || "no-email"
      }`;
      const cached = labelsCache.current[cacheKey];
      if (
        !forceRefresh &&
        cached &&
        Date.now() - cached.timestamp < CACHE_DURATION
      ) {
        startProgress();
        setLabels(cached.labels);
        setLabelsLastUpdated(cached.timestamp);
        if (cached.hydrated) {
          markLabelsHydrated(cached.labels.map((label) => label.id));
        } else {
          const systemIds = cached.labels
            .filter((label) => isSystemLabel(label))
            .map((label) => label.id);
          markLabelsHydrated(systemIds);
          hydrateUserLabelCounts(cached.labels, cacheKey);
        }
        finishProgress("success");
        return;
      }

      // ✅ OPTIMIZATION: Prevent duplicate label fetches with coalescing
      // Skip if we already loaded recently (within 3 seconds) or if already loading
      const timeSinceLastLoad = Date.now() - lastLoadedAt.current;
      if (timeSinceLastLoad < 3000 && lastLoadedAt.current > 0) {
        // Still restore from cache if labels state is empty (e.g., after remount)
        if (labelsCountRef.current === 0 && cached) {
          setLabels(cached.labels);
          setLabelsLastUpdated(cached.timestamp);
        }
        return;
      }

      // If already in-flight, wait for it to complete
      if (inFlightRequest.current) {
        await inFlightRequest.current;
        // Restore from cache after waiting if labels are empty
        if (labelsCountRef.current === 0 && cached) {
          setLabels(cached.labels);
          setLabelsLastUpdated(cached.timestamp);
        }
        return;
      }

      try {
        startProgress();
        setLoadingLabels(true);
        setError(null);

        const gmailLabels = await loadLabelsOnce();
        const instantHydratedIds = gmailLabels
          .filter((label) => isSystemLabel(label))
          .map((label) => label.id);
        markLabelsHydrated(instantHydratedIds);

        // When systemOnly is true, merge fresh system labels with existing custom labels
        if (systemOnly) {
          setLabels(prev => {
            // Keep existing custom labels (preserve their counters)
            const existingCustomLabels = prev.filter(label => !isSystemLabel(label));
            // Get fresh system labels
            const freshSystemLabels = gmailLabels.filter(label => isSystemLabel(label));
            // Merge: fresh system + existing custom
            return [...freshSystemLabels, ...existingCustomLabels];
          });
        } else {
          setLabels(gmailLabels);
        }

        // Cache the result with the same key format
        const now = Date.now();
        const hasCustomLabels = gmailLabels.some(
          (label) => !isSystemLabel(label)
        );
        const hasDetailedCounters = !hasCustomLabels;

        labelsCache.current[cacheKey] = {
          labels: gmailLabels,
          timestamp: now,
          hydrated: hasDetailedCounters,
        };

        // Update last updated timestamp
        setLabelsLastUpdated(now);

        // Skip hydrating user labels when systemOnly is true (preserve custom label state)
        console.log('🏷️ refreshLabels hydration check:', { systemOnly, hasDetailedCounters, labelsCount: gmailLabels.length });
        if (!systemOnly) {
          if (!hasDetailedCounters) {
            console.log('🏷️ Calling hydrateUserLabelCounts...');
            hydrateUserLabelCounts(gmailLabels, cacheKey);
          } else {
            console.log('🏷️ Labels already have detailed counters, marking as hydrated');
            markLabelsHydrated(gmailLabels.map((label) => label.id));
          }
        } else {
          console.log('🏷️ Skipping hydration due to systemOnly=true');
        }
        finishProgress("success");
      } catch (err) {
        console.error("Error fetching Gmail labels:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch labels";
        setError(errorMessage);
        finishProgress("error");

        // Don't clear existing labels on error, keep showing what we have
        // This prevents the UI from going blank during rate limit errors
      } finally {
        setLoadingLabels(false);
      }
    },
    [
      isGmailSignedIn,
      isGmailApiReady,
      currentProfile?.id,
      currentProfile?.userEmail,
      isDataLoadingAllowed,
      authFlowCompleted,
      hydrateUserLabelCounts,
      markLabelsHydrated,
      isSystemLabel,
      resetHydratedLabels,
      clearLabelUnreadDeltas,
    ]
  ); // Removed location.pathname to prevent unnecessary refreshes on navigation

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

    return () => {
      window.removeEventListener("draft-created", handleDraftCreated);
      window.removeEventListener("email-deleted", handleDraftDeleted);
    };
  }, [refreshLabels]);

  const clearLabelsCache = () => {
    labelsCache.current = {};
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

      // Optimistically remove from local state immediately for instant UI update
      setLabels((prev) => prev.filter((label) => label.id !== id));

      // Dispatch event to notify other components (EmailPageLayout, FoldersColumn)
      // This allows them to navigate away if viewing the deleted label
      window.dispatchEvent(
        new CustomEvent("label-deleted", {
          detail: { labelId: id, labelName },
        })
      );

      await deleteGmailLabel(id);

      // Refresh to ensure sync (in case of nested labels or other changes)
      await refreshLabels();
    } catch (err) {
      console.error("Error deleting Gmail label:", err);
      setDeleteLabelError(
        err instanceof Error ? err.message : "Failed to delete label"
      );
      // Revert optimistic update on error
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
        isGmailApiReady &&
        inboxReadyRef.current
      ) {
        refreshLabels();
      } else {
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