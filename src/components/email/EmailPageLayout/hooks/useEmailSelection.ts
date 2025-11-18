/**
 * useEmailSelection Hook
 * 
 * Manages email selection state and bulk actions:
 * - Individual email selection/deselection
 * - Bulk delete
 * - Bulk mark as read/unread
 * - Selection clearing
 * 
 * Extracted from EmailPageLayout.tsx to reduce complexity.
 */

import { useState, useCallback } from 'react';
import { Email } from '@/types';
import { deleteEmail, markAsRead, markAsUnread } from '@/services/emailService';
import { toast } from 'sonner';

export interface UseEmailSelectionOptions {
  pageType: 'inbox' | 'unread' | 'sent' | 'drafts' | 'trash';
  labelName: string | null;
  setAllTabEmails: React.Dispatch<React.SetStateAction<Record<string, Email[]>>>;
  setCategoryEmails: React.Dispatch<React.SetStateAction<any>>;
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
}

export interface UseEmailSelectionReturn {
  selectedEmails: Set<string>;
  setSelectedEmails: React.Dispatch<React.SetStateAction<Set<string>>>;
  sectionSelectedEmails: Set<string>;
  setSectionSelectedEmails: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleToggleSelectEmail: (emailId: string) => void;
  handleDeleteSelected: () => Promise<void>;
  handleMarkReadSelected: () => Promise<void>;
  handleMarkUnreadSelected: () => Promise<void>;
  clearSelection: () => void;
}

export function useEmailSelection(options: UseEmailSelectionOptions): UseEmailSelectionReturn {
  const {
    pageType,
    labelName,
    setAllTabEmails,
    setCategoryEmails,
    setEmails
  } = options;

  // Selection state
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [sectionSelectedEmails, setSectionSelectedEmails] = useState<Set<string>>(new Set());

  /**
   * Toggle selection of a single email
   */
  const handleToggleSelectEmail = useCallback((emailId: string) => {
    setSelectedEmails(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(emailId)) {
        newSelected.delete(emailId);
      } else {
        newSelected.add(emailId);
      }
      return newSelected;
    });
  }, []);

  /**
   * Delete all selected emails
   */
  const handleDeleteSelected = useCallback(async () => {
    if (selectedEmails.size === 0) return;
    
    const emailIds = Array.from(selectedEmails);
    const emailCount = emailIds.length;
    const loadingToastId = toast.loading(`Deleting ${emailCount} email${emailCount > 1 ? 's' : ''}...`);

    try {
      // Delete all selected emails
      await Promise.all(emailIds.map(emailId => deleteEmail(emailId)));

      // Remove from local state
      if (pageType === 'inbox' && !labelName) {
        // Remove from all relevant tab arrays
        setAllTabEmails(prev => ({
          all: prev.all.filter(email => !emailIds.includes(email.id)),
          unread: prev.unread.filter(email => !emailIds.includes(email.id)),
          sent: prev.sent.filter(email => !emailIds.includes(email.id)),
          drafts: prev.drafts.filter(email => !emailIds.includes(email.id)),
          trash: prev.trash.filter(email => !emailIds.includes(email.id)),
          important: prev.important.filter(email => !emailIds.includes(email.id)),
          starred: prev.starred.filter(email => !emailIds.includes(email.id)),
          spam: prev.spam.filter(email => !emailIds.includes(email.id)),
          allmail: prev.allmail.filter(email => !emailIds.includes(email.id))
        }));
        
        // Also remove from category emails
        setCategoryEmails((prev: any) => ({
          all: {
            primary: prev.all.primary.filter((email: Email) => !emailIds.includes(email.id)),
            updates: prev.all.updates.filter((email: Email) => !emailIds.includes(email.id)),
            promotions: prev.all.promotions.filter((email: Email) => !emailIds.includes(email.id)),
            social: prev.all.social.filter((email: Email) => !emailIds.includes(email.id))
          },
          spam: {
            primary: prev.spam.primary.filter((email: Email) => !emailIds.includes(email.id)),
            updates: prev.spam.updates.filter((email: Email) => !emailIds.includes(email.id)),
            promotions: prev.spam.promotions.filter((email: Email) => !emailIds.includes(email.id)),
            social: prev.spam.social.filter((email: Email) => !emailIds.includes(email.id))
          },
          trash: {
            primary: prev.trash.primary.filter((email: Email) => !emailIds.includes(email.id)),
            updates: prev.trash.updates.filter((email: Email) => !emailIds.includes(email.id)),
            promotions: prev.trash.promotions.filter((email: Email) => !emailIds.includes(email.id)),
            social: prev.trash.social.filter((email: Email) => !emailIds.includes(email.id))
          }
        }));
      } else {
        setEmails(prevEmails => 
          prevEmails.filter(email => !emailIds.includes(email.id))
        );
      }

      // Clear selection
      setSelectedEmails(new Set());

      // Show success toast
      toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} deleted`, {
        description: `Moved to trash successfully`,
        duration: 4000,
        id: loadingToastId
      });
      
    } catch (error) {
      console.error('Error deleting emails:', error);
      
      // Show error toast
      toast.error('Failed to delete emails', {
        description: 'Please try again or check your connection',
        duration: 4000,
        id: loadingToastId
      });
    }
  }, [selectedEmails, pageType, labelName, setAllTabEmails, setCategoryEmails, setEmails]);

  /**
   * Mark all selected emails as read
   */
  const handleMarkReadSelected = useCallback(async () => {
    if (selectedEmails.size === 0) return;

    const emailIds = Array.from(selectedEmails);
    const emailCount = emailIds.length;
    const loadingToastId = toast.loading(`Marking ${emailCount} email${emailCount > 1 ? 's' : ''} as read...`);

    try {
      // Mark all selected emails as read
      await Promise.all(emailIds.map(emailId => markAsRead(emailId)));

      // Update local state
      const updateEmailsReadStatus = (emails: Email[]) => 
        emails.map(email => 
          emailIds.includes(email.id) ? { ...email, isRead: true } : email
        );

      if (pageType === 'inbox' && !labelName) {
        // Update all relevant tab arrays
        setAllTabEmails(prev => ({
          all: updateEmailsReadStatus(prev.all),
          unread: prev.unread.filter(email => !emailIds.includes(email.id)), // Remove from unread
          sent: updateEmailsReadStatus(prev.sent),
          drafts: updateEmailsReadStatus(prev.drafts),
          trash: updateEmailsReadStatus(prev.trash),
          important: updateEmailsReadStatus(prev.important),
          starred: updateEmailsReadStatus(prev.starred),
          spam: updateEmailsReadStatus(prev.spam),
          allmail: updateEmailsReadStatus(prev.allmail)
        }));
        
        // Also update category emails
        setCategoryEmails((prev: any) => ({
          all: {
            primary: updateEmailsReadStatus(prev.all.primary),
            updates: updateEmailsReadStatus(prev.all.updates),
            promotions: updateEmailsReadStatus(prev.all.promotions),
            social: updateEmailsReadStatus(prev.all.social)
          },
          spam: {
            primary: updateEmailsReadStatus(prev.spam.primary),
            updates: updateEmailsReadStatus(prev.spam.updates),
            promotions: updateEmailsReadStatus(prev.spam.promotions),
            social: updateEmailsReadStatus(prev.spam.social)
          },
          trash: {
            primary: updateEmailsReadStatus(prev.trash.primary),
            updates: updateEmailsReadStatus(prev.trash.updates),
            promotions: updateEmailsReadStatus(prev.trash.promotions),
            social: updateEmailsReadStatus(prev.trash.social)
          }
        }));
      } else {
        setEmails(prevEmails => updateEmailsReadStatus(prevEmails));
      }

      // Clear selection
      setSelectedEmails(new Set());

      // Show success toast
      toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} marked as read`, {
        duration: 4000,
        id: loadingToastId
      });

    } catch (error) {
      console.error('Error marking emails as read:', error);
      
      // Show error toast
      toast.error('Failed to mark emails as read', {
        description: 'Please try again or check your connection',
        duration: 4000,
        id: loadingToastId
      });
    }
  }, [selectedEmails, pageType, labelName, setAllTabEmails, setCategoryEmails, setEmails]);

  /**
   * Mark all selected emails as unread
   */
  const handleMarkUnreadSelected = useCallback(async () => {
    if (selectedEmails.size === 0) return;

    const emailIds = Array.from(selectedEmails);
    const emailCount = emailIds.length;
    const loadingToastId = toast.loading(`Marking ${emailCount} email${emailCount > 1 ? 's' : ''} as unread...`);

    try {
      // Mark all selected emails as unread
      await Promise.all(emailIds.map(emailId => markAsUnread(emailId)));

      // Update local state
      const updateEmailsUnreadStatus = (emails: Email[]) => 
        emails.map(email => 
          emailIds.includes(email.id) ? { ...email, isRead: false } : email
        );

      if (pageType === 'inbox' && !labelName) {
        // Update all relevant tab arrays
        setAllTabEmails(prev => ({
          all: updateEmailsUnreadStatus(prev.all),
          unread: [
            ...prev.unread,
            ...prev.all.filter(email => emailIds.includes(email.id)).map(email => ({ ...email, isRead: false }))
          ], // Add back to unread
          sent: updateEmailsUnreadStatus(prev.sent),
          drafts: updateEmailsUnreadStatus(prev.drafts),
          trash: updateEmailsUnreadStatus(prev.trash),
          important: updateEmailsUnreadStatus(prev.important),
          starred: updateEmailsUnreadStatus(prev.starred),
          spam: updateEmailsUnreadStatus(prev.spam),
          allmail: updateEmailsUnreadStatus(prev.allmail)
        }));
        
        // Also update category emails
        setCategoryEmails((prev: any) => ({
          all: {
            primary: updateEmailsUnreadStatus(prev.all.primary),
            updates: updateEmailsUnreadStatus(prev.all.updates),
            promotions: updateEmailsUnreadStatus(prev.all.promotions),
            social: updateEmailsUnreadStatus(prev.all.social)
          },
          spam: {
            primary: updateEmailsUnreadStatus(prev.spam.primary),
            updates: updateEmailsUnreadStatus(prev.spam.updates),
            promotions: updateEmailsUnreadStatus(prev.spam.promotions),
            social: updateEmailsUnreadStatus(prev.spam.social)
          },
          trash: {
            primary: updateEmailsUnreadStatus(prev.trash.primary),
            updates: updateEmailsUnreadStatus(prev.trash.updates),
            promotions: updateEmailsUnreadStatus(prev.trash.promotions),
            social: updateEmailsUnreadStatus(prev.trash.social)
          }
        }));
      } else {
        setEmails(prevEmails => updateEmailsUnreadStatus(prevEmails));
      }

      // Clear selection
      setSelectedEmails(new Set());

      // Show success toast
      toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} marked as unread`, {
        duration: 4000,
        id: loadingToastId
      });

    } catch (error) {
      console.error('Error marking emails as unread:', error);
      
      // Show error toast
      toast.error('Failed to mark emails as unread', {
        description: 'Please try again or check your connection',
        duration: 4000,
        id: loadingToastId
      });
    }
  }, [selectedEmails, pageType, labelName, setAllTabEmails, setCategoryEmails, setEmails]);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedEmails(new Set());
    setSectionSelectedEmails(new Set());
  }, []);

  return {
    selectedEmails,
    setSelectedEmails,
    sectionSelectedEmails,
    setSectionSelectedEmails,
    handleToggleSelectEmail,
    handleDeleteSelected,
    handleMarkReadSelected,
    handleMarkUnreadSelected,
    clearSelection
  };
}
