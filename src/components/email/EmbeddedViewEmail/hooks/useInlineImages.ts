/**
 * useInlineImages - Hook for loading inline images (cid: references) in email bodies
 * 
 * Handles:
 * - Loading inline images for a specific message
 * - Retry logic with exponential backoff
 * - Updating message body with resolved image URLs
 * - Tracking which messages have been processed
 * - Visibility-based batch loading (loads first 3, then more on scroll)
 * 
 * @module EmbeddedViewEmail/hooks/useInlineImages
 */

import { useCallback, useRef } from 'react';
import { replaceCidReferences } from '@/integrations/gmail/fetch/messages';
import type { Email } from '@/types';

/** Max messages to load images for at once (prevents rate limiting) */
const BATCH_SIZE = 3;

export interface UseInlineImagesOptions {
  /** Set of message IDs that have already had images loaded */
  loadedImages: Set<string>;
  
  /** Current thread messages */
  threadMessages: Email[];
  
  /** Setter for thread messages (to update body with resolved images) */
  setThreadMessages: React.Dispatch<React.SetStateAction<Email[]>>;
  
  /** Setter for loaded images set */
  setLoadedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export interface UseInlineImagesReturn {
  /** Load inline images for a specific message, replacing cid: references with data URLs */
  loadInlineImagesForMessage: (messageId: string) => Promise<void>;
  
  /** Load images for a batch of visible messages (respects BATCH_SIZE limit) */
  loadImagesForVisibleMessages: (visibleMessageIds: string[]) => void;
  
  /** Check if a message is currently loading */
  isLoading: (messageId: string) => boolean;
}

export function useInlineImages(options: UseInlineImagesOptions): UseInlineImagesReturn {
  const {
    loadedImages,
    threadMessages,
    setThreadMessages,
    setLoadedImages,
  } = options;

  // 🔒 Synchronous lock to prevent race conditions (async guard is too slow)
  const loadingInProgressRef = useRef<Set<string>>(new Set());
  
  // Track pending batch to avoid duplicate batch processing
  const pendingBatchRef = useRef<Set<string>>(new Set());

  const loadInlineImagesForMessage = useCallback(async (messageId: string) => {
    // 🔒 Synchronous guard using ref (prevents race condition)
    if (loadedImages.has(messageId) || loadingInProgressRef.current.has(messageId)) {
      return;
    }

    // Mark as loading IMMEDIATELY (synchronous)
    loadingInProgressRef.current.add(messageId);

    const message = threadMessages.find(m => m.id === messageId);
    if (!message || !message.inlineAttachments || message.inlineAttachments.length === 0) {
      loadingInProgressRef.current.delete(messageId);
      // Mark as "loaded" even if no images, to prevent re-processing
      setLoadedImages(prev => new Set(prev).add(messageId));
      return;
    }

    console.log(`🖼️ Loading ${message.inlineAttachments.length} inline images for message ${messageId}`);

    const maxRetries = 3;
    const delayMs = 1000;

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Attempt ${attempt}/${maxRetries} to load images for message ${messageId}`);

          const updatedBody = await replaceCidReferences(
            message.body,
            message.inlineAttachments || [],
            messageId
          );

          // Only update if body actually changed
          if (updatedBody !== message.body) {
            setThreadMessages(prev =>
              prev.map(m => m.id === messageId ? { ...m, body: updatedBody } : m)
            );
          }

          setLoadedImages(prev => new Set(prev).add(messageId));
          console.log(`✅ Inline images loaded for message ${messageId} on attempt ${attempt}`);
          return;
        } catch (error) {
          console.error(`❌ Attempt ${attempt}/${maxRetries} failed to load inline images:`, error);
          if (attempt < maxRetries) {
            console.log(`⏳ Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
      console.error(`❌ All ${maxRetries} attempts failed for message ${messageId}`);
    } finally {
      // Always clean up loading state
      loadingInProgressRef.current.delete(messageId);
    }
  }, [loadedImages, threadMessages, setThreadMessages, setLoadedImages]);

  /**
   * Load images for visible messages in batches
   * Respects BATCH_SIZE to prevent Gmail API rate limiting
   */
  const loadImagesForVisibleMessages = useCallback((visibleMessageIds: string[]) => {
    // Filter to only messages that need loading
    const needsLoading = visibleMessageIds.filter(id => 
      !loadedImages.has(id) && 
      !loadingInProgressRef.current.has(id) &&
      !pendingBatchRef.current.has(id)
    );

    if (needsLoading.length === 0) return;

    // Take only first BATCH_SIZE messages
    const batch = needsLoading.slice(0, BATCH_SIZE);
    
    console.log(`📦 Batch loading images for ${batch.length} messages (${needsLoading.length} pending)`);

    // Mark as pending to prevent duplicate batch calls
    batch.forEach(id => pendingBatchRef.current.add(id));

    // Load in parallel (within batch limit)
    batch.forEach(id => {
      loadInlineImagesForMessage(id).finally(() => {
        pendingBatchRef.current.delete(id);
      });
    });
  }, [loadedImages, loadInlineImagesForMessage]);

  const isLoading = useCallback((messageId: string) => {
    return loadingInProgressRef.current.has(messageId);
  }, []);

  return {
    loadInlineImagesForMessage,
    loadImagesForVisibleMessages,
    isLoading,
  };
}
