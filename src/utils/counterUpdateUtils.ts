/**
 * Unified Counter Update System
 * 
 * Central utility for managing folder unread counts across all email actions.
 * All actions that affect unread counts should use these functions to ensure
 * consistent counter updates throughout the app.
 * 
 * Key principle: Only update counters when the email WAS unread before the action.
 * Thread-based counting: We count threads, not individual messages.
 */

import { emitLabelUpdateEvent } from './labelUpdateEvents';

// ============================================================================
// Types
// ============================================================================

export interface CounterUpdateOptions {
  /** The email's label IDs (e.g., ['INBOX', 'Label_123']) */
  labelIds: string[];
  /** Whether the email was unread BEFORE the action */
  wasUnread: boolean;
  /** Thread ID for the email */
  threadId?: string;
  /** Message ID for the email */
  messageId: string;
}

export interface MoveCounterUpdateOptions extends CounterUpdateOptions {
  /** The destination label ID when moving */
  toLabelId: string;
}

// ============================================================================
// Core Counter Update Functions
// ============================================================================

/**
 * Update counters when marking an email as READ
 * Decrements unread count for all labels the email belongs to
 */
export function updateCountersForMarkRead(options: CounterUpdateOptions): void {
  const { labelIds, wasUnread, threadId, messageId } = options;
  
  // Only decrement if email was actually unread
  if (!wasUnread) {
    console.log('📊 Counter: Skip mark-read (already read)', { messageId });
    return;
  }
  
  console.log('📊 Counter: Mark as read', { labelIds, messageId });
  
  emitLabelUpdateEvent({
    labelIds,
    action: 'mark-read',
    threadId,
    messageId,
  });
}

/**
 * Update counters when marking an email as UNREAD
 * Increments unread count for all labels the email belongs to
 */
export function updateCountersForMarkUnread(options: Omit<CounterUpdateOptions, 'wasUnread'>): void {
  const { labelIds, threadId, messageId } = options;
  
  console.log('📊 Counter: Mark as unread', { labelIds, messageId });
  
  emitLabelUpdateEvent({
    labelIds,
    action: 'mark-unread',
    threadId,
    messageId,
  });
}

/**
 * Update counters when TRASHING an email
 * Decrements unread count for source labels (if was unread)
 * Note: TRASH folder doesn't track unread count in Gmail
 */
export function updateCountersForTrash(options: CounterUpdateOptions): void {
  const { labelIds, wasUnread, threadId, messageId } = options;
  
  // Only decrement source labels if email was unread
  if (!wasUnread) {
    console.log('📊 Counter: Skip trash counter update (was already read)', { messageId });
    return;
  }
  
  console.log('📊 Counter: Trash (decrement source)', { labelIds, messageId });
  
  // Decrement source labels - treated same as mark-read since email leaves the folder
  emitLabelUpdateEvent({
    labelIds: labelIds.filter(id => id !== 'TRASH'), // Don't try to decrement TRASH
    action: 'mark-read',
    threadId,
    messageId,
  });
}

/**
 * Update counters when marking as SPAM
 * Decrements unread count for source labels (if was unread)
 */
export function updateCountersForSpam(options: CounterUpdateOptions): void {
  const { labelIds, wasUnread, threadId, messageId } = options;
  
  if (!wasUnread) {
    console.log('📊 Counter: Skip spam counter update (was already read)', { messageId });
    return;
  }
  
  console.log('📊 Counter: Spam (decrement source)', { labelIds, messageId });
  
  emitLabelUpdateEvent({
    labelIds: labelIds.filter(id => id !== 'SPAM'),
    action: 'mark-read',
    threadId,
    messageId,
  });
}

/**
 * Update counters when MOVING an email to another folder
 * Decrements source labels and increments destination (if was unread)
 */
export function updateCountersForMove(options: MoveCounterUpdateOptions): void {
  const { labelIds, wasUnread, toLabelId, threadId, messageId } = options;
  
  if (!wasUnread) {
    console.log('📊 Counter: Skip move counter update (was already read)', { messageId });
    return;
  }
  
  console.log('📊 Counter: Move', { from: labelIds, to: toLabelId, messageId });
  
  // Decrement source labels
  const sourceLabelIds = labelIds.filter(id => id !== toLabelId);
  if (sourceLabelIds.length > 0) {
    emitLabelUpdateEvent({
      labelIds: sourceLabelIds,
      action: 'mark-read',
      threadId,
      messageId,
    });
  }
  
  // Increment destination label
  emitLabelUpdateEvent({
    labelIds: [toLabelId],
    action: 'mark-unread',
    threadId,
    messageId,
  });
}

/**
 * Update counters when ARCHIVING an email (removing from INBOX)
 * Only decrements INBOX if email was unread
 */
export function updateCountersForArchive(options: CounterUpdateOptions): void {
  const { labelIds, wasUnread, threadId, messageId } = options;
  
  if (!wasUnread || !labelIds.includes('INBOX')) {
    console.log('📊 Counter: Skip archive counter update', { messageId, wasUnread, hasInbox: labelIds.includes('INBOX') });
    return;
  }
  
  console.log('📊 Counter: Archive (decrement INBOX)', { messageId });
  
  emitLabelUpdateEvent({
    labelIds: ['INBOX'],
    action: 'mark-read',
    threadId,
    messageId,
  });
}

// ============================================================================
// Bulk Operation Helpers
// ============================================================================

export interface BulkEmail {
  id: string;
  threadId?: string;
  isRead?: boolean;
  labelIds?: string[];
}

/**
 * Update counters for bulk mark as read
 */
export function updateCountersForBulkMarkRead(emails: BulkEmail[]): void {
  const unreadEmails = emails.filter(e => !e.isRead);
  
  console.log(`📊 Counter: Bulk mark read (${unreadEmails.length}/${emails.length} were unread)`);
  
  unreadEmails.forEach(email => {
    updateCountersForMarkRead({
      labelIds: email.labelIds || ['INBOX'],
      wasUnread: true,
      threadId: email.threadId,
      messageId: email.id,
    });
  });
}

/**
 * Update counters for bulk mark as unread
 */
export function updateCountersForBulkMarkUnread(emails: BulkEmail[]): void {
  const readEmails = emails.filter(e => e.isRead);
  
  console.log(`📊 Counter: Bulk mark unread (${readEmails.length}/${emails.length} were read)`);
  
  readEmails.forEach(email => {
    updateCountersForMarkUnread({
      labelIds: email.labelIds || ['INBOX'],
      threadId: email.threadId,
      messageId: email.id,
    });
  });
}

/**
 * Update counters for bulk trash
 */
export function updateCountersForBulkTrash(emails: BulkEmail[]): void {
  console.log(`📊 Counter: Bulk trash (${emails.length} emails)`);
  
  emails.forEach(email => {
    updateCountersForTrash({
      labelIds: email.labelIds || ['INBOX'],
      wasUnread: !email.isRead,
      threadId: email.threadId,
      messageId: email.id,
    });
  });
}

/**
 * Update counters for bulk move
 */
export function updateCountersForBulkMove(emails: BulkEmail[], toLabelId: string): void {
  console.log(`📊 Counter: Bulk move to ${toLabelId} (${emails.length} emails)`);
  
  emails.forEach(email => {
    updateCountersForMove({
      labelIds: email.labelIds || ['INBOX'],
      wasUnread: !email.isRead,
      toLabelId,
      threadId: email.threadId,
      messageId: email.id,
    });
  });
}
