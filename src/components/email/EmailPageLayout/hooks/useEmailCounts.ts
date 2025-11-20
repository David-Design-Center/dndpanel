/**
 * useEmailCounts Hook
 * 
 * Manages email count calculations and event emissions:
 * - Unread count tracking (from repository)
 * - 24-hour unread count calculation
 * - Inbox unread count event emission
 * - Email timestamp utilities
 * 
 * Extracted from EmailPageLayout.tsx to reduce complexity.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Email } from '@/types';
import { emailRepository } from '@/services/emailRepository';

export interface UseEmailCountsOptions {
  pageType: 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash';
  labelName: string | null;
  allTabEmails: { all: Email[] };
  paginatedEmails: Email[];
  emailCounts: { drafts: number; trash: number; unread: number };
  setEmailCounts: React.Dispatch<React.SetStateAction<{ drafts: number; trash: number; unread: number }>>;
}

export interface UseEmailCountsReturn {
  getUnreadFromRepository: () => number;
  getEmailTimestampMs: (email: Email) => number;
  unreadCount: number;
  draftsCount: number;
  trashCount: number;
}

export function useEmailCounts(options: UseEmailCountsOptions): UseEmailCountsReturn {
  const {
    pageType,
    labelName,
    allTabEmails,
    paginatedEmails,
    emailCounts,
    setEmailCounts
  } = options;

  const lastUnread24hRef = useRef<number>(-1);
  const isInboxContext = pageType === 'inbox' && !labelName;

  /**
   * Get unread count from repository (single source of truth)
   */
  const getUnreadFromRepository = useCallback((): number => {
    return emailRepository.getUnreadEmails().length;
  }, []);

  /**
   * Get email timestamp in milliseconds
   */
  const getEmailTimestampMs = useCallback((email: Email): number => {
    const internal = (email as any)?.internalDate;
    if (internal != null) {
      const numeric = typeof internal === 'string' ? Number.parseInt(internal, 10) : Number(internal);
      if (!Number.isNaN(numeric)) return numeric;
    }
    if (email.date) {
      const parsed = new Date(email.date).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
    return NaN;
  }, []);

  // Inbox counter now uses Gmail API labels directly (via LabelContext)
  // No need to emit events - FoldersColumn reads from systemCounts

  /**
   * Calculate and emit 24-hour unread count
   */
  useEffect(() => {
    if (!isInboxContext) return;

    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
    const seenIds = new Set<string>();
    let count = 0;

    for (const email of allTabEmails.all) {
      if (!email || !email.id) continue;
      if (seenIds.has(email.id)) continue;
      seenIds.add(email.id);
      if (email.isRead) continue;
      const timestamp = getEmailTimestampMs(email);
      if (!Number.isNaN(timestamp) && timestamp >= cutoffMs) {
        count += 1;
      }
    }

    const limitedCount = Math.min(count, 99);

    setEmailCounts(prev => {
      if (prev.unread === limitedCount) return prev;
      return { ...prev, unread: limitedCount };
    });

    if (lastUnread24hRef.current !== count) {
      lastUnread24hRef.current = count;
      try {
        window.dispatchEvent(new CustomEvent('inbox-unread-24h', {
          detail: {
            count,
            overLimit: count > 99
          }
        }));
      } catch (error) {
        console.warn('Failed to broadcast inbox-unread-24h event', error);
      }
    }
  }, [allTabEmails.all, getEmailTimestampMs, isInboxContext, setEmailCounts]);

  // Calculate counts for display
  const unreadCount = (pageType === 'inbox' && !labelName) ? getUnreadFromRepository() : 0;
  const draftsCount = (pageType === 'inbox' && !labelName) ? emailCounts.drafts : 0;
  const trashCount = (pageType === 'inbox' && !labelName) ? emailCounts.trash : 0;

  return {
    getUnreadFromRepository,
    getEmailTimestampMs,
    unreadCount,
    draftsCount,
    trashCount
  };
}
