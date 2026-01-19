/**
 * useDraftComposer - Hook for managing draft auto-save functionality
 * 
 * Handles:
 * - Draft saving (create/update/delete)
 * - Debounced save scheduling
 * - Failsafe save timers
 * - Content hashing to detect changes
 * - Empty content detection
 * 
 * Does NOT handle:
 * - loadDraftCompletely (stays in component - tied to email fetching flow)
 * - Draft UI state (showComposer, etc. - stays in component)
 * 
 * @module EmbeddedViewEmail/hooks/useDraftComposer
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  createReplyDraft,
  updateReplyDraft,
  deleteReplyDraft,
} from '@/integrations/gapiService';
import type { Email } from '@/types';

export interface UseDraftComposerOptions {
  /** Current email being viewed */
  email: Email | null;
  
  /** Current CC recipients */
  ccRecipients: string[];
  
  /** Current BCC recipients */
  bccRecipients: string[];
  
  /** Whether the reply composer is visible */
  showReplyComposer: boolean;
  
  /** Current draft ID (null if not yet created) */
  draftId: string | null;
  
  /** Draft version for conflict detection */
  draftVersion: number;
  
  /** Whether content has changed since last save */
  isDirty: boolean;
  
  /** Last saved content hash */
  lastHash: string;
  
  /** Ref to current reply content (avoids stale closures) */
  replyContentRef: React.MutableRefObject<string>;
  
  /** Ref to current forward recipient (avoids stale closures) */
  forwardToRef: React.MutableRefObject<string>;
  
  /** Ref to current reply mode (avoids stale closures) */
  replyModeRef: React.MutableRefObject<'reply' | 'replyAll' | 'forward'>;
  
  /** Ref to current isDirty state (avoids stale closures) */
  isDirtyRef: React.MutableRefObject<boolean>;
  
  /** Timer ref for debounced saves - shared with component for navigation cleanup */
  debounceSaveTimerRef: React.MutableRefObject<number | null>;
  
  /** Timer ref for failsafe saves - shared with component for navigation cleanup */
  failsafeSaveTimerRef: React.MutableRefObject<number | null>;
  
  // State setters (called after save operations)
  setDraftId: (id: string | null) => void;
  setDraftVersion: (version: number) => void;
  setIsDirty: (dirty: boolean) => void;
  setLastHash: (hash: string) => void;
  setIsSaving: (saving: boolean) => void;
  setLastSavedAt: (date: Date | null) => void;
}

export interface UseDraftComposerReturn {
  /** Hash current draft state for change detection */
  hashDraftState: () => string;
  
  /** Check if draft content is empty */
  isEmpty: () => boolean;
  
  /** Save draft to Gmail (create or update) */
  saveDraft: () => Promise<void>;
  
  /** Schedule a debounced save (call on content change) */
  scheduleDebouncedSave: () => void;
  
  /** Mark draft as dirty and schedule save */
  handleDraftChange: () => void;
}

export function useDraftComposer(options: UseDraftComposerOptions): UseDraftComposerReturn {
  const {
    email,
    ccRecipients,
    bccRecipients,
    showReplyComposer,
    draftId,
    draftVersion,
    isDirty,
    lastHash,
    replyContentRef,
    forwardToRef,
    replyModeRef,
    isDirtyRef,
    debounceSaveTimerRef,
    failsafeSaveTimerRef,
    setDraftId,
    setDraftVersion,
    setIsDirty,
    setLastHash,
    setIsSaving,
    setLastSavedAt,
  } = options;

  // Timer ref for rate limiting (internal to hook - not needed externally)
  const lastSaveTimeRef = useRef<number>(0);

  // Hash current draft state for change detection
  const hashDraftState = useCallback(() => {
    const state = {
      to: forwardToRef.current,
      body: replyContentRef.current,
      mode: replyModeRef.current
    };
    return btoa(JSON.stringify(state));
  }, [forwardToRef, replyContentRef, replyModeRef]);

  // Check if draft content is empty
  const isEmpty = useCallback(() => {
    // For forward mode, check if both to and body are empty
    if (replyModeRef.current === 'forward') {
      return !forwardToRef.current.trim() && !replyContentRef.current.trim();
    }
    // For reply/replyAll mode, only check body
    return !replyContentRef.current.trim();
  }, [forwardToRef, replyContentRef, replyModeRef]);

  // Main save function
  const saveDraft = useCallback(async () => {
    console.log('🔍 saveDraft called');
    console.log('  - isDirty:', isDirty);
    console.log('  - isDirtyRef.current:', isDirtyRef.current);
    console.log('  - replyContent:', replyContentRef.current.substring(0, 50));
    console.log('  - forwardTo:', forwardToRef.current);
    console.log('  - replyMode:', replyModeRef.current);

    if (!isDirtyRef.current) {
      console.log('❌ Not dirty (ref check), skipping save');
      return;
    }

    // Check if empty - delete if exists
    const emptyCheck = isEmpty();
    console.log('🔍 isEmpty check:', emptyCheck);

    if (emptyCheck) {
      console.log('❌ Content is empty, skipping save');
      if (draftId) {
        try {
          // Delete empty draft
          await deleteReplyDraft(draftId);
          console.log('🗑️ Deleted empty draft:', draftId);
          setDraftId(null);
          setDraftVersion(0);
        } catch (err) {
          console.error('Failed to delete draft:', err);
        }
      }
      setIsDirty(false);
      isDirtyRef.current = false;
      return;
    }

    // Check if content actually changed
    const currentHash = hashDraftState();
    console.log('🔍 Hash comparison:');
    console.log('  - Current hash:', currentHash);
    console.log('  - Last hash:', lastHash);
    console.log('  - Are equal?:', currentHash === lastHash);

    if (currentHash === lastHash) {
      console.log('❌ Hash unchanged, skipping save');
      return;
    }

    // Rate limit: ensure at least 2s between saves
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    console.log('🔍 Time since last save:', timeSinceLastSave, 'ms');

    if (timeSinceLastSave < 2000) {
      console.log('❌ Rate limited, skipping save');
      return;
    }

    console.log('✅ All checks passed, saving draft...');
    setIsSaving(true);
    lastSaveTimeRef.current = now;

    try {
      // Use refs to get current values (avoid stale closures)
      const currentReplyContent = replyContentRef.current;
      const currentForwardTo = forwardToRef.current;
      const currentReplyMode = replyModeRef.current;

      // Determine recipient based on reply mode
      let recipientEmail = currentForwardTo; // For forward mode

      if (currentReplyMode === 'reply' || currentReplyMode === 'replyAll') {
        // For reply modes, use the original sender's email
        recipientEmail = email?.from?.email || '';
      }

      // Build CC/BCC strings from current state
      const ccString = ccRecipients.filter(e => e.trim()).join(',');
      const bccString = bccRecipients.filter(e => e.trim()).join(',');

      const payload = {
        to: recipientEmail,
        body: currentReplyContent,
        mode: currentReplyMode,
        threadId: email?.threadId,
        inReplyTo: email?.id,
        cc: ccString || undefined,
        bcc: bccString || undefined
      };

      console.log('📝 Draft payload:', { ...payload, body: payload.body.substring(0, 100) + '...' });

      let response;
      if (!draftId) {
        // Create new draft
        response = await createReplyDraft(payload);
        console.log('📝 Created draft:', response);
        setDraftId(response.id);
        setDraftVersion(response.version);

        // Emit event to increment draft counter
        window.dispatchEvent(new CustomEvent('draft-created', {
          detail: { draftId: response.id }
        }));
        console.log('📤 Emitted draft-created event for:', response.id);
      } else {
        // Update existing draft
        response = await updateReplyDraft(draftId, payload, draftVersion);
        console.log('📝 Updated draft:', response);
        setDraftVersion(response.version);
      }

      setLastHash(currentHash);
      setIsDirty(false);
      isDirtyRef.current = false;
      setLastSavedAt(new Date());
      console.log('✅ Draft saved:', response.id);
    } catch (err: any) {
      console.error('Failed to save draft:', err);

      // Handle version conflict (412)
      if (err.status === 412) {
        console.log('⚠️ Version conflict, will retry');
        // TODO: Implement conflict resolution
      }

      // Handle draft not found (404) - recreate
      if (err.status === 404) {
        setDraftId(null);
        setDraftVersion(0);
        // Will retry on next trigger
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    isDirty,
    isEmpty,
    draftId,
    draftVersion,
    lastHash,
    hashDraftState,
    email,
    ccRecipients,
    bccRecipients,
    replyContentRef,
    forwardToRef,
    replyModeRef,
    isDirtyRef,
    setDraftId,
    setDraftVersion,
    setIsDirty,
    setLastHash,
    setIsSaving,
    setLastSavedAt,
  ]);

  // Schedule debounced save
  const scheduleDebouncedSave = useCallback(() => {
    console.log('⏰ scheduleDebouncedSave called');

    // Clear existing timers
    if (debounceSaveTimerRef.current) {
      clearTimeout(debounceSaveTimerRef.current);
      console.log('⏰ Cleared existing debounce timer');
    }

    // Schedule debounced save (3s after last change)
    debounceSaveTimerRef.current = window.setTimeout(() => {
      console.log('⏰ Debounce timer fired, calling saveDraft');
      saveDraft();
    }, 3000);
    console.log('⏰ Scheduled debounced save in 3s');

    // Schedule failsafe save (30s if user never idles)
    if (!failsafeSaveTimerRef.current) {
      failsafeSaveTimerRef.current = window.setTimeout(() => {
        console.log('⏰ Failsafe timer fired, calling saveDraft');
        saveDraft();
        failsafeSaveTimerRef.current = null;
      }, 30000);
      console.log('⏰ Scheduled failsafe save in 30s');
    }
  }, [saveDraft]);

  // Handler for draft content changes
  const handleDraftChange = useCallback(() => {
    console.log('📝 handleDraftChange called');
    setIsDirty(true);
    isDirtyRef.current = true;
    scheduleDebouncedSave();
  }, [scheduleDebouncedSave, setIsDirty, isDirtyRef]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && showReplyComposer) {
        // Attempt synchronous save
        saveDraft();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, showReplyComposer, saveDraft]);

  // Cleanup timers on unmount or when composer closes
  useEffect(() => {
    if (!showReplyComposer) {
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
        debounceSaveTimerRef.current = null;
      }
      if (failsafeSaveTimerRef.current) {
        clearTimeout(failsafeSaveTimerRef.current);
        failsafeSaveTimerRef.current = null;
      }

      // Final save when closing if dirty
      if (isDirty) {
        saveDraft();
      }
    }

    return () => {
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
      }
      if (failsafeSaveTimerRef.current) {
        clearTimeout(failsafeSaveTimerRef.current);
      }
    };
  }, [showReplyComposer, isDirty, saveDraft]);

  return {
    hashDraftState,
    isEmpty,
    saveDraft,
    scheduleDebouncedSave,
    handleDraftChange,
  };
}
