import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeLabelUpdateEvent, LabelUpdateEventDetail } from '@/utils/labelUpdateEvents';
import { getCurrentAccessToken } from '@/integrations/gapiService';

export interface UseUnreadCountsOptions {
  lookbackDays?: number;          // How many days back to look (default 7)
  maxMessages?: number;           // Max unread messages to scan (default 1000)
  batchConcurrency?: number;      // Parallel fetches per batch (default 10)
  batchDelayMs?: number;          // Delay between batches (default 100ms)
}

interface UseUnreadCountsResult {
  unreadCounts: Record<string, number>;       // user labelId -> unread threads count
  systemUnreadCounts: Record<string, number>; // system labelId -> unread threads count
  archiveCount: number;                       // derived archive count
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Gmail system labels we treat specially
const SYSTEM_LABELS = ['INBOX','SENT','DRAFT','TRASH','SPAM','STARRED','IMPORTANT'];
const ARCHIVE_EXCLUDE = new Set(SYSTEM_LABELS.concat(['CATEGORY_FORUMS','CATEGORY_UPDATES','CATEGORY_PROMOTIONS','CATEGORY_SOCIAL']));

interface MessageMeta { id: string; threadId: string; labelIds: string[]; }

export function useUnreadCounts(options: UseUnreadCountsOptions = {}): UseUnreadCountsResult {
  const { lookbackDays = 7, maxMessages = 1000, batchConcurrency = 10, batchDelayMs = 100 } = options;
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [systemUnreadCounts, setSystemUnreadCounts] = useState<Record<string, number>>({});
  const [archiveCount, setArchiveCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanningRef = useRef(false);

  const listUnreadMessageIds = useCallback(async (token: string): Promise<string[]> => {
    const ids: string[] = [];
    let nextPageToken: string | undefined;
    const afterDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    while (ids.length < maxMessages) {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      url.searchParams.set('q', `is:unread after:${afterDate}`);
      url.searchParams.set('maxResults','500');
      if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);
      const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) break; // graceful stop
      const data = await resp.json();
      if (data.messages) {
        const slice = data.messages.slice(0, maxMessages - ids.length);
        ids.push(...slice.map((m: any) => m.id));
      }
      nextPageToken = data.nextPageToken;
      if (!nextPageToken) break;
    }
    return ids;
  }, [lookbackDays, maxMessages]);

  const fetchMessageMetas = useCallback(async (token: string, ids: string[]): Promise<MessageMeta[]> => {
    const results: MessageMeta[] = [];
    for (let i = 0; i < ids.length; i += batchConcurrency) {
      const slice = ids.slice(i, i + batchConcurrency);
      const promises = slice.map(async id => {
        try {
          const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=minimal&fields=id,threadId,labelIds`, { headers: { Authorization: `Bearer ${token}` } });
          if (!r.ok) return null;
          const d = await r.json();
            return { id: d.id, threadId: d.threadId, labelIds: d.labelIds || [] } as MessageMeta;
        } catch { return null; }
      });
      const batch = await Promise.all(promises);
      results.push(...batch.filter(Boolean) as MessageMeta[]);
      if (i + batchConcurrency < ids.length) await new Promise(res => setTimeout(res, batchDelayMs));
    }
    return results;
  }, [batchConcurrency, batchDelayMs]);

  const buildCounts = useCallback((messages: MessageMeta[]) => {
    const labelToThreads: Record<string, Set<string>> = {};
    const system: Record<string, Set<string>> = {};
    const allThreads = new Set<string>();
    const threadLabels: Record<string, Set<string>> = {};

    messages.forEach(m => {
      if (!m.threadId) return;
      allThreads.add(m.threadId);
      if (!threadLabels[m.threadId]) threadLabels[m.threadId] = new Set();
      m.labelIds.forEach(lid => threadLabels[m.threadId].add(lid));
      m.labelIds.forEach(lid => {
        if (SYSTEM_LABELS.includes(lid)) {
          if (!system[lid]) system[lid] = new Set();
          system[lid].add(m.threadId);
        } else {
          if (!labelToThreads[lid]) labelToThreads[lid] = new Set();
          labelToThreads[lid].add(m.threadId);
        }
      });
    });

    // Archive derivation: unread threads that are NOT tagged with any exclude system labels
    let archiveThreads = 0;
    for (const t of allThreads) {
      const labels = threadLabels[t] || new Set();
      const hasExcluded = Array.from(labels).some(l => ARCHIVE_EXCLUDE.has(l));
      if (!hasExcluded) archiveThreads++;
    }

    const userCounts: Record<string, number> = {};
    Object.entries(labelToThreads).forEach(([lid, set]) => { userCounts[lid] = set.size; });
    const sysCounts: Record<string, number> = {};
    Object.entries(system).forEach(([lid, set]) => { sysCounts[lid] = set.size; });

    return { userCounts, sysCounts, archiveThreads };
  }, []);

  const refresh = useCallback(async () => {
    if (scanningRef.current) return; // prevent overlap
    scanningRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const token = getCurrentAccessToken();
      if (!token) throw new Error('No Gmail access token');
      const ids = await listUnreadMessageIds(token);
      if (ids.length === 0) {
        setUnreadCounts({});
        setSystemUnreadCounts({});
        setArchiveCount(0);
      } else {
        const metas = await fetchMessageMetas(token, ids);
        const { userCounts, sysCounts, archiveThreads } = buildCounts(metas);
        setUnreadCounts(userCounts);
        setSystemUnreadCounts(sysCounts);
        setArchiveCount(archiveThreads);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load unread counts');
    } finally {
      setLoading(false);
      scanningRef.current = false;
    }
  }, [listUnreadMessageIds, fetchMessageMetas, buildCounts]);

  // Initial + event-based incremental updates
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    return subscribeLabelUpdateEvent((detail: LabelUpdateEventDetail) => {
      const delta = detail.action === 'mark-unread' ? 1 : -1;
      // Adjust counts for affected labels
      setUnreadCounts(prev => {
        const next = { ...prev };
        detail.labelIds.forEach(id => {
          if (!SYSTEM_LABELS.includes(id)) {
            next[id] = Math.max(0, (next[id] || 0) + delta);
          }
        });
        return next;
      });
      setSystemUnreadCounts(prev => {
        const next = { ...prev };
        detail.labelIds.forEach(id => {
          if (SYSTEM_LABELS.includes(id)) {
            next[id] = Math.max(0, (next[id] || 0) + delta);
          }
        });
        return next;
      });
      // Approximate archive adjustment: if none of the labels are excluded system labels and marking unread => archive++, vice versa
      const touchesExcluded = detail.labelIds.some(id => ARCHIVE_EXCLUDE.has(id));
      if (!touchesExcluded) {
        setArchiveCount(prev => Math.max(0, prev + delta));
      }
    });
  }, []);

  return { unreadCounts, systemUnreadCounts, archiveCount, loading, error, refresh };
}
