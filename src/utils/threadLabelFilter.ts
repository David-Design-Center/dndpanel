/**
 * Thread-level label filtering utility
 * 
 * Gmail's search operators (has:nouserlabels, in:inbox) work on individual messages,
 * not threads. This means a thread can appear in inbox even if some messages have labels.
 * 
 * This utility enforces thread-level filtering: a thread is only unlabeled if ALL
 * messages in the thread have no user-created labels.
 */

// Known Gmail system labels (hardcoded for fast lookup)
const HARDCODED_SYSTEM_LABELS = new Set([
  'INBOX',
  'UNREAD',
  'SENT',
  'DRAFT',
  'TRASH',
  'SPAM',
  'IMPORTANT',
  'STARRED',
  'CHAT', // Gmail chat messages
  'CATEGORY_PERSONAL',
  'CATEGORY_UPDATES',
  'CATEGORY_PROMOTIONS',
  'CATEGORY_SOCIAL',
  'CATEGORY_FORUMS',
]);

/**
 * Robust system label detection
 * Handles current labels + future Gmail additions via pattern matching
 */
export function isSystemLabel(labelId: string): boolean {
  // Fast path: known system labels
  if (HARDCODED_SYSTEM_LABELS.has(labelId)) return true;
  
  // Pattern matching for future-proof detection
  // Gmail category labels always start with CATEGORY_
  if (labelId.startsWith('CATEGORY_')) return true;
  
  // Gmail user-created labels start with Label_ or are custom strings without prefixes
  // System labels never start with Label_
  if (labelId.startsWith('Label_')) return false;
  
  // If it has an uppercase format and no Label_ prefix, likely a system label
  // This catches future additions like SCHEDULED, SNOOZED, etc.
  if (labelId === labelId.toUpperCase() && !labelId.includes(' ')) return true;
  
  // Everything else is user-created
  return false;
}

/**
 * Check if a thread belongs in inbox (thread-level filtering)
 * A thread belongs in inbox only if ALL messages have ONLY system labels
 * 
 * @param messages - All messages in the thread (from threads.get)
 * @returns true if thread belongs in inbox, false if it should be excluded
 */
export function threadBelongsInInbox(messages: any[]): boolean {
  // DISABLED: Now showing ALL inbox emails including those with user labels
  // This ensures counter matches displayed emails
  return true;
  
  // OLD LOGIC (commented out):
  // if (!messages || messages.length === 0) return false;
  // for (const message of messages) {
  //   const labelIds: string[] = message.labelIds || [];
  //   for (const labelId of labelIds) {
  //     if (!isSystemLabel(labelId)) {
  //       console.log(`🚫 Thread excluded: message ${message.id} has user label: ${labelId}`);
  //       return false;
  //     }
  //   }
  // }
  // return true;
}

/**
 * Check if a thread should be excluded from inbox (inverse of threadBelongsInInbox)
 * Kept for backward compatibility
 */
export function shouldExcludeThreadFromInbox(messages: any[]): boolean {
  return !threadBelongsInInbox(messages);
}

/**
 * Get user-created labels from a list of label IDs
 */
export function getUserLabels(labelIds: string[]): string[] {
  return labelIds.filter(labelId => !isSystemLabel(labelId));
}
