import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Email } from '../../../../types';
import {
  markEmailAsTrash,
  markAsRead,
  markAsUnread,
  markAsImportant,
  markAsUnimportant,
  markAsStarred,
  markAsUnstarred,
  applyLabelsToEmail
} from '../../../../services/emailService';
import {
  updateCountersForTrash,
  updateCountersForSpam,
  updateCountersForMove,
  updateCountersForMarkRead,
  updateCountersForMarkUnread
} from '../../../../utils/counterUpdateUtils';

interface UseEmailActionsOptions {
  email: Email | null;
  setEmail: React.Dispatch<React.SetStateAction<Email | null>>;
  clearSelection: () => void;
  getBackToListUrl: () => string;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
}

interface UseEmailActionsReturn {
  handleTrash: (e?: React.MouseEvent) => Promise<void>;
  handleMarkAsSpam: (e?: React.MouseEvent) => Promise<void>;
  handleMoveToFolder: (labelId: string, labelName: string) => Promise<void>;
  handleMarkAsUnread: (e?: React.MouseEvent) => Promise<void>;
  handleToggleImportant: (e?: React.MouseEvent) => Promise<void>;
  handleToggleStarred: (e?: React.MouseEvent) => Promise<void>;
}

/**
 * Hook for email action handlers: trash, spam, move, read/unread, important, starred
 * All actions use optimistic UI updates with background server sync
 */
export function useEmailActions({
  email,
  setEmail,
  clearSelection,
  getBackToListUrl,
  onEmailUpdate,
  onEmailDelete,
}: UseEmailActionsOptions): UseEmailActionsReturn {
  const navigate = useNavigate();

  const handleTrash = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!email) return;

    console.log(`🗑️ Moving email ${email.id} to trash`);

    // 📊 Update counters (decrement source labels if was unread)
    updateCountersForTrash({
      labelIds: email.labelIds || ['INBOX'],
      wasUnread: !email.isRead,
      threadId: email.threadId,
      messageId: email.id,
    });

    // ⚡ INSTANT: Navigate away immediately (user expects to leave this view)
    clearSelection();
    navigate(getBackToListUrl());

    // ⚡ INSTANT: Notify parent immediately to remove from list
    onEmailDelete?.(email.id);

    // Show optimistic success toast (will be dismissed if error occurs)
    const toastId = toast.success('Moved to trash');

    // 🔄 BACKGROUND: Update on server
    try {
      await markEmailAsTrash(email.id);
    } catch (err) {
      console.error('Failed to move to trash:', err);
      toast.dismiss(toastId);
      toast.error('Failed to move to trash');
    }
  }, [email, clearSelection, navigate, getBackToListUrl, onEmailDelete]);

  const handleMarkAsSpam = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!email) return;

    console.log(`🚫 Marking email ${email.id} as spam`);

    // 📊 Update counters (decrement source labels if was unread)
    updateCountersForSpam({
      labelIds: email.labelIds || ['INBOX'],
      wasUnread: !email.isRead,
      threadId: email.threadId,
      messageId: email.id,
    });

    // ⚡ INSTANT: Navigate away immediately (user expects to leave this view)
    clearSelection();
    navigate(getBackToListUrl());

    // ⚡ INSTANT: Remove email from list immediately (optimistic UI update)
    window.dispatchEvent(new CustomEvent('emails-moved', {
      detail: {
        emailIds: [email.id],
        targetFolder: 'SPAM',
        targetFolderName: 'Spam'
      }
    }));

    // Show optimistic success toast (will be dismissed if error occurs)
    const toastId = toast.success('Moved to spam');

    // 🔄 BACKGROUND: Update on server
    try {
      await applyLabelsToEmail(email.id, ['SPAM'], ['INBOX']);
    } catch (err) {
      console.error('Failed to mark as spam:', err);
      toast.dismiss(toastId);
      toast.error('Failed to mark as spam');
    }
  }, [email, clearSelection, navigate, getBackToListUrl]);

  const handleMoveToFolder = useCallback(async (labelId: string, labelName: string) => {
    if (!email) return;

    const isMovingToInbox = labelId === 'INBOX';
    console.log(`📁 Moving email ${email.id} to ${isMovingToInbox ? 'Inbox' : `folder: ${labelName}`}`);

    // 📊 Update counters (decrement source, increment destination if was unread)
    updateCountersForMove({
      labelIds: email.labelIds || ['INBOX'],
      wasUnread: !email.isRead,
      toLabelId: labelId,
      threadId: email.threadId,
      messageId: email.id,
    });

    try {
      // Get current user labels to remove (exclude system labels)
      const systemLabels = ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'];
      const currentUserLabels = (email.labelIds || []).filter(id =>
        !systemLabels.includes(id) && !id.startsWith('CATEGORY_')
      );

      let labelsToAdd: string[];
      let labelsToRemove: string[];

      if (isMovingToInbox) {
        // Moving to Inbox: add INBOX, remove all user labels
        labelsToAdd = ['INBOX'];
        labelsToRemove = currentUserLabels;
        console.log(`📥 Moving to Inbox. Removing user labels:`, labelsToRemove);
      } else {
        // Moving to folder: add the folder label, remove INBOX + current user labels
        labelsToAdd = [labelId];
        labelsToRemove = [...new Set([...currentUserLabels, 'INBOX'])];
        console.log(`📁 Adding label: ${labelId}, Removing labels:`, labelsToRemove);
      }

      // Apply the new label and remove old labels
      await applyLabelsToEmail(email.id, labelsToAdd, labelsToRemove);

      // Navigate away
      clearSelection();
      navigate(getBackToListUrl());

      // ⚡ INSTANT: Remove email from list immediately (optimistic UI update)
      window.dispatchEvent(new CustomEvent('emails-moved', {
        detail: {
          emailIds: [email.id],
          targetFolder: labelId,
          targetFolderName: labelName
        }
      }));

      toast.success(isMovingToInbox ? 'Moved to Inbox' : `Moved to ${labelName}`);
    } catch (err) {
      console.error('Failed to move email:', err);
      toast.error('Failed to move email');
    }
  }, [email, clearSelection, navigate, getBackToListUrl]);

  const handleMarkAsUnread = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!email) return;

    // Toggle between read and unread
    const newReadStatus = !email.isRead;

    console.log(`🔄 Toggling read status: ${email.isRead} → ${newReadStatus}`);

    // 📊 Update counters immediately
    if (newReadStatus) {
      // Marking as read → decrement
      updateCountersForMarkRead({
        labelIds: email.labelIds || ['INBOX'],
        wasUnread: !email.isRead,
        threadId: email.threadId,
        messageId: email.id,
      });
    } else {
      // Marking as unread → increment
      updateCountersForMarkUnread({
        labelIds: email.labelIds || ['INBOX'],
        threadId: email.threadId,
        messageId: email.id,
      });
    }

    // ⚡ INSTANT: Update local state immediately (optimistic update)
    const updatedEmail = {
      ...email,
      isRead: newReadStatus,
      labelIds: newReadStatus
        ? email.labelIds?.filter(id => id !== 'UNREAD')
        : [...(email.labelIds || []), 'UNREAD']
    };

    setEmail(updatedEmail);

    // ⚡ INSTANT: Notify parent component to update email list immediately
    if (onEmailUpdate) {
      onEmailUpdate(updatedEmail);
    }

    // Show optimistic success toast (will be dismissed if error occurs)
    const toastId = toast.success(newReadStatus ? 'Marked as read' : 'Marked as unread');

    // 🔄 BACKGROUND: Update on server
    try {
      if (newReadStatus) {
        await markAsRead(email.id);
      } else {
        await markAsUnread(email.id);
      }
      // ✅ No refresh needed - optimistic update already done
    } catch (err) {
      console.error('Failed to update read status:', err);
      // Revert on error
      setEmail(email);
      if (onEmailUpdate) {
        onEmailUpdate(email);
      }
      toast.dismiss(toastId);
      toast.error('Failed to update read status');
    }
  }, [email, setEmail, onEmailUpdate]);

  const handleToggleImportant = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!email) return;

    const isImportant = email.labelIds?.includes('IMPORTANT');
    const newImportantStatus = !isImportant;

    console.log(`🚩 Toggling important: ${isImportant} → ${newImportantStatus}`);

    // ⚡ INSTANT: Update local state immediately
    const updatedLabelIds = newImportantStatus
      ? [...(email.labelIds || []), 'IMPORTANT']
      : email.labelIds?.filter(id => id !== 'IMPORTANT') || [];

    const updatedEmail = {
      ...email,
      isImportant: newImportantStatus,
      labelIds: updatedLabelIds
    };

    setEmail(updatedEmail);

    // ⚡ INSTANT: Notify parent component
    if (onEmailUpdate) {
      onEmailUpdate(updatedEmail);
    }

    // Show optimistic success toast (will be dismissed if error occurs)
    const toastId = toast.success(newImportantStatus ? 'Marked as important' : 'Removed from important');

    // 🔄 BACKGROUND: Update on server
    try {
      if (newImportantStatus) {
        await markAsImportant(email.id);
      } else {
        await markAsUnimportant(email.id);
      }
      // ✅ No refresh needed - optimistic update already done
    } catch (err) {
      console.error('Failed to update important status:', err);
      // Revert on error
      setEmail(email);
      if (onEmailUpdate) {
        onEmailUpdate(email);
      }
      toast.dismiss(toastId);
      toast.error('Failed to update important status');
    }
  }, [email, setEmail, onEmailUpdate]);

  const handleToggleStarred = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!email) return;

    const isStarred = email.labelIds?.includes('STARRED');
    const newStarredStatus = !isStarred;

    console.log(`⭐ Toggling starred: ${isStarred} → ${newStarredStatus}`);

    // ⚡ INSTANT: Update local state immediately
    const updatedLabelIds = newStarredStatus
      ? [...(email.labelIds || []), 'STARRED']
      : email.labelIds?.filter(id => id !== 'STARRED') || [];

    const updatedEmail = {
      ...email,
      isStarred: newStarredStatus,
      labelIds: updatedLabelIds
    };

    setEmail(updatedEmail);

    // ⚡ INSTANT: Notify parent component
    if (onEmailUpdate) {
      onEmailUpdate(updatedEmail);
    }

    // Show optimistic success toast (will be dismissed if error occurs)
    const toastId = toast.success(newStarredStatus ? 'Added star' : 'Removed star');

    // 🔄 BACKGROUND: Update on server
    try {
      if (newStarredStatus) {
        await markAsStarred(email.id);
      } else {
        await markAsUnstarred(email.id);
      }
      // ✅ No refresh needed - optimistic update already done
    } catch (err) {
      console.error('Failed to update starred status:', err);
      // Revert on error
      setEmail(email);
      if (onEmailUpdate) {
        onEmailUpdate(email);
      }
      toast.dismiss(toastId);
      toast.error('Failed to update starred status');
    }
  }, [email, setEmail, onEmailUpdate]);

  return {
    handleTrash,
    handleMarkAsSpam,
    handleMoveToFolder,
    handleMarkAsUnread,
    handleToggleImportant,
    handleToggleStarred,
  };
}
