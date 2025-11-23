/**
 * Email Page Layout - Async Handlers
 * 
 * All async operations for fetching, deleting, and mutating emails
 * This layer interacts with emailService and emailRepository
 */

import { Email } from '../../../types';
import {
  getCategoryEmailsForFolder,
  CategoryFilterOptions,
  getAllInboxEmails,
  getSentEmails,
  getDraftEmails,
  getTrashEmails,
  getImportantEmails,
  getStarredEmails,
  getSpamEmails,
  getArchiveEmails,
  getAllMailEmails,
  getLabelEmails,
  deleteEmail,
  markAsRead,
  markAsUnread,
  clearEmailCache,
} from '../../../services/emailService';
import { emailRepository } from '../../../services/emailRepository';

/**
 * Fetch all email types for all tabs (Inbox, Unread, Sent, etc.)
 */
export async function fetchAllEmailTypes(
  forceRefresh: boolean = false
): Promise<{ emails: Record<string, Email[]>; counts: Record<string, number> }> {
  try {
    // Fetch all tab types in parallel
    const [all, sent, important, starred, spam, archive, allmail] = await Promise.all([
      getAllInboxEmails(forceRefresh),
      getSentEmails(forceRefresh),
      getImportantEmails(forceRefresh),
      getStarredEmails(forceRefresh),
      getSpamEmails(forceRefresh),
      getArchiveEmails(forceRefresh),
      getAllMailEmails(forceRefresh),
    ]);

    // Fetch drafts separately (returns Email[] not PaginatedResponse)
    const draftsEmails = await getDraftEmails(forceRefresh);
    const trashResult = await getTrashEmails(forceRefresh);

    // Add to repository (single source of truth)
    emailRepository.addEmails(all.emails);
    emailRepository.addEmails(sent.emails);
    emailRepository.addEmails(important.emails);
    emailRepository.addEmails(starred.emails);
    emailRepository.addEmails(spam.emails);
    emailRepository.addEmails(archive.emails);
    emailRepository.addEmails(allmail.emails);
    emailRepository.addEmails(draftsEmails);
    emailRepository.addEmails(trashResult.emails);

    return {
      emails: {
        all: all.emails,
        unread: [], // Will be derived from repository
        sent: sent.emails,
        drafts: draftsEmails,
        trash: trashResult.emails,
        important: important.emails,
        starred: starred.emails,
        spam: spam.emails,
        archive: archive.emails,
        allmail: allmail.emails,
      },
      counts: {
        all: all.emails.length,
        unread: 0, // Will be computed from repository
        sent: sent.emails.length,
        drafts: draftsEmails.length,
        trash: trashResult.emails.length,
        important: important.emails.length,
        starred: starred.emails.length,
        spam: spam.emails.length,
        archive: archive.emails.length,
        allmail: allmail.emails.length,
      },
    };
  } catch (error) {
    console.error('Error fetching all email types:', error);
    throw error;
  }
}

/**
 * Fetch category emails (primary, updates, promotions, social)
 */
export async function fetchCategoryEmails(
  forceRefresh: boolean = false
): Promise<{
  categoryEmails: Record<string, Record<string, Email[]>>;
}> {
  try {
    const filters: CategoryFilterOptions = {
      unread: false,
      starred: false,
      attachments: false,
    };

    // Fetch categories for all folders in parallel
    const [
      primaryInbox,
      updatesInbox,
      promotionsInbox,
      socialInbox,
      primaryArchive,
      updatesArchive,
      promotionsArchive,
      socialArchive,
      primarySpam,
      updatesSpam,
      promotionsSpam,
      socialSpam,
      primaryTrash,
      updatesTrash,
      promotionsTrash,
      socialTrash,
    ] = await Promise.all([
      getCategoryEmailsForFolder('primary', 'all', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('updates', 'all', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('promotions', 'all', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('social', 'all', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('primary', 'archive', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('updates', 'archive', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('promotions', 'archive', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('social', 'archive', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('primary', 'spam', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('updates', 'spam', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('promotions', 'spam', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('social', 'spam', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('primary', 'trash', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('updates', 'trash', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('promotions', 'trash', forceRefresh, 10, undefined, filters),
      getCategoryEmailsForFolder('social', 'trash', forceRefresh, 10, undefined, filters),
    ]);

    // Add all to repository
    [
      primaryInbox,
      updatesInbox,
      promotionsInbox,
      socialInbox,
      primaryArchive,
      updatesArchive,
      promotionsArchive,
      socialArchive,
      primarySpam,
      updatesSpam,
      promotionsSpam,
      socialSpam,
      primaryTrash,
      updatesTrash,
      promotionsTrash,
      socialTrash,
    ].forEach((result) => {
      emailRepository.addEmails(result.emails);
    });

    return {
      categoryEmails: {
        all: {
          primary: primaryInbox.emails,
          updates: updatesInbox.emails,
          promotions: promotionsInbox.emails,
          social: socialInbox.emails,
        },
        archive: {
          primary: primaryArchive.emails,
          updates: updatesArchive.emails,
          promotions: promotionsArchive.emails,
          social: socialArchive.emails,
        },
        spam: {
          primary: primarySpam.emails,
          updates: updatesSpam.emails,
          promotions: promotionsSpam.emails,
          social: socialSpam.emails,
        },
        trash: {
          primary: primaryTrash.emails,
          updates: updatesTrash.emails,
          promotions: promotionsTrash.emails,
          social: socialTrash.emails,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching category emails:', error);
    throw error;
  }
}

/**
 * Fetch label-specific emails
 */
export async function fetchLabelEmails(
  labelId: string,
  pageToken?: string,
  forceRefresh: boolean = false
): Promise<{ emails: Email[]; nextPageToken?: string }> {
  try {
    const result = await getLabelEmails({ labelId }, forceRefresh, 50, pageToken);
    emailRepository.addEmails(result.emails);
    return {
      emails: result.emails,
      nextPageToken: result.nextPageToken,
    };
  } catch (error) {
    console.error(`Error fetching label ${labelId} emails:`, error);
    throw error;
  }
}

/**
 * Handle delete single email
 */
export async function handleDeleteEmail(emailId: string): Promise<void> {
  try {
    // Delete from Gmail
    await deleteEmail(emailId);
    // Delete from repository (single source of truth)
    emailRepository.deleteEmail(emailId);
    console.log(`✅ Email deleted: ${emailId}`);
  } catch (error) {
    console.error(`Error deleting email ${emailId}:`, error);
    throw error;
  }
}

/**
 * Handle delete multiple selected emails
 */
export async function handleDeleteSelectedEmails(emailIds: Set<string>): Promise<void> {
  try {
    // Delete all from Gmail in parallel
    await Promise.all(Array.from(emailIds).map((id) => deleteEmail(id)));

    // Delete all from repository (automatic sync)
    emailIds.forEach((id) => {
      emailRepository.deleteEmail(id);
    });

    console.log(`✅ Deleted ${emailIds.size} emails`);
  } catch (error) {
    console.error('Error deleting selected emails:', error);
    throw error;
  }
}

/**
 * Handle mark single email as read
 */
export async function handleMarkEmailAsRead(emailId: string, isRead: boolean): Promise<void> {
  try {
    if (isRead) {
      await markAsRead(emailId);
    } else {
      await markAsUnread(emailId);
    }

    // Update in repository
    const email = emailRepository.getEmailById(emailId);
    if (email) {
      email.isRead = isRead;
    }

    console.log(`✅ Email marked as ${isRead ? 'read' : 'unread'}: ${emailId}`);
  } catch (error) {
    console.error(`Error marking email as ${isRead ? 'read' : 'unread'}:`, error);
    throw error;
  }
}

/**
 * Handle mark multiple selected emails as read
 */
export async function handleMarkSelectedAsRead(emailIds: Set<string>): Promise<void> {
  try {
    await Promise.all(Array.from(emailIds).map((id) => markAsRead(id)));

    // Update in repository
    emailIds.forEach((id) => {
      const email = emailRepository.getEmailById(id);
      if (email) {
        email.isRead = true;
      }
    });

    console.log(`✅ Marked ${emailIds.size} emails as read`);
  } catch (error) {
    console.error('Error marking selected as read:', error);
    throw error;
  }
}

/**
 * Handle mark multiple selected emails as unread
 */
export async function handleMarkSelectedAsUnread(emailIds: Set<string>): Promise<void> {
  try {
    await Promise.all(Array.from(emailIds).map((id) => markAsUnread(id)));

    // Update in repository
    emailIds.forEach((id) => {
      const email = emailRepository.getEmailById(id);
      if (email) {
        email.isRead = false;
      }
    });

    console.log(`✅ Marked ${emailIds.size} emails as unread`);
  } catch (error) {
    console.error('Error marking selected as unread:', error);
    throw error;
  }
}

/**
 * Handle refresh (re-fetch all data)
 */
export async function handleRefreshEmails(): Promise<{
  emails: Record<string, Email[]>;
  counts: Record<string, number>;
}> {
  try {
    // Clear cache first
    clearEmailCache();

    // Fetch fresh data
    const result = await fetchAllEmailTypes(true);

    console.log('✅ Emails refreshed');
    return result;
  } catch (error) {
    console.error('Error refreshing emails:', error);
    throw error;
  }
}

/**
 * Clear all caches
 */
export async function handleClearCache(): Promise<void> {
  try {
    clearEmailCache();
    emailRepository.clear();
    console.log('✅ All caches cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
}

/**
 * Validate repository consistency
 */
export function validateRepository(): { valid: boolean; errors: string[] } {
  const result = emailRepository.validate();

  if (result.valid) {
    console.log('✅ Repository is consistent');
  } else {
    console.error('❌ Repository has inconsistencies:', result.errors);
  }

  return result;
}
