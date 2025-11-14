import { useState } from 'react';
import { Email } from '@/types';
import { 
  markAsRead, 
  markAsUnread, 
  markAsImportant, 
  markAsUnimportant, 
  deleteDraft, 
  deleteEmail, 
  applyLabelsToEmail, 
  markAsStarred, 
  markAsUnstarred 
} from '@/services/emailService';
import { toast } from 'sonner';
import { emitLabelUpdateEvent } from '@/utils/labelUpdateEvents';

interface UseEmailItemActionsProps {
  email: Email;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
}

export function useEmailItemActions({ 
  email, 
  onEmailUpdate, 
  onEmailDelete 
}: UseEmailItemActionsProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isTogglingImportance, setIsTogglingImportance] = useState(false);
  const [isTogglingStar, setIsTogglingStar] = useState(false);

  const handleToggleReadStatus = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsToggling(true);
    
    const newReadStatus = !email.isRead;
    
    console.log(`🔄 Toggling read status for email ${email.id}: ${email.isRead} → ${newReadStatus}`);
    
    // Optimistic UI update
    const updatedEmail = { ...email, isRead: newReadStatus };
    onEmailUpdate?.(updatedEmail);
    
    // Emit immediate event for folder unread counter updates
    if (email.labelIds && email.labelIds.length > 0) {
      emitLabelUpdateEvent({
        labelIds: email.labelIds,
        action: newReadStatus ? 'mark-read' : 'mark-unread',
        threadId: email.threadId,
        messageId: email.id
      });
    }

    // Call API in background
    const apiCall = email.isRead ? markAsUnread(email.id) : markAsRead(email.id);
    
    apiCall
      .then(() => {
        console.log(`✅ Successfully toggled read status for email ${email.id}`);
      })
      .catch((error) => {
        console.error('Error toggling read status:', error);
        
        // Revert the optimistic update on error
        const revertedEmail = { ...email, isRead: email.isRead };
        onEmailUpdate?.(revertedEmail);
        
        // Emit revert event
        if (email.labelIds && email.labelIds.length > 0) {
          emitLabelUpdateEvent({
            labelIds: email.labelIds,
            action: email.isRead ? 'mark-read' : 'mark-unread',
            threadId: email.threadId,
            messageId: email.id
          });
        }
      })
      .finally(() => {
        setIsToggling(false);
      });
  };

  const handleToggleImportance = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsTogglingImportance(true);
    
    const currentImportantStatus = email.isImportant ?? false;
    const newImportantStatus = !currentImportantStatus;
    
    // Optimistic UI update
    const updatedEmail = { ...email, isImportant: newImportantStatus };
    onEmailUpdate?.(updatedEmail);
    
    try {
      if (currentImportantStatus) {
        await markAsUnimportant(email.id);
      } else {
        await markAsImportant(email.id);
      }
      
      console.log(`⭐ Successfully toggled importance for email ${email.id}`);
      
    } catch (error) {
      console.error('Error toggling importance:', error);
      
      // Revert the optimistic update on error
      const revertedEmail = { ...email, isImportant: currentImportantStatus };
      onEmailUpdate?.(revertedEmail);
    } finally {
      setIsTogglingImportance(false);
    }
  };

  const handleToggleStar = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsTogglingStar(true);
    const current = email.isStarred ?? false;
    const updated = { ...email, isStarred: !current };
    onEmailUpdate?.(updated);
    try {
      if (current) await markAsUnstarred(email.id); 
      else await markAsStarred(email.id);
    } catch (err) {
      onEmailUpdate?.({ ...email, isStarred: current });
    } finally {
      setIsTogglingStar(false);
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Optimistic UI update
    onEmailDelete?.(email.id);
    
    toast.success('Draft discarded successfully!');
    
    // Emit event to update draft counter
    window.dispatchEvent(new CustomEvent('email-deleted', { 
      detail: { emailId: email.id } 
    }));
    
    // Run API call in background
    try {
      await deleteDraft(email.id);
      console.log(`✅ Successfully discarded draft ${email.id}`);
    } catch (error) {
      console.error('Error discarding draft:', error);
      toast.error('Failed to discard draft. Please try again.');
    }
  };

  const handleDeleteEmail = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Optimistic UI update
    onEmailDelete?.(email.id);
    
    toast.success('Email deleted successfully!');
    
    // Run API call in background
    try {
      await deleteEmail(email.id);
      console.log(`✅ Successfully deleted email ${email.id}`);
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Failed to delete email. Please try again.');
    }
  };

  const handleApplyLabel = async (labelId: string) => {
    try {
      // Optimistically hide the email from inbox view
      const emailElement = document.querySelector(`[data-email-id="${email.id}"]`);
      if (emailElement) {
        emailElement.classList.add('opacity-50', 'pointer-events-none');
      }
      
      await applyLabelsToEmail(email.id, [labelId]);
      
      toast.success('Label applied successfully');
      
      // The applyLabelsToEmail function will trigger 'inbox-refetch-required' event
      
    } catch (error) {
      console.error('Error applying label:', error);
      
      // Revert optimistic update on error
      const emailElement = document.querySelector(`[data-email-id="${email.id}"]`);
      if (emailElement) {
        emailElement.classList.remove('opacity-50', 'pointer-events-none');
      }
      
      toast.error('Failed to apply label. Please try again.');
      throw error;
    }
  };

  return {
    handleToggleReadStatus,
    handleToggleImportance,
    handleToggleStar,
    handleDelete,
    handleDeleteEmail,
    handleApplyLabel,
    isToggling,
    isTogglingImportance,
    isTogglingStar
  };
}
