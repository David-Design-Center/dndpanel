/**
 * Gmail System Labels - Correct label ID mappings
 * 
 * These are the actual Gmail system label IDs that must be used
 * with the labelIds parameter in Gmail API calls.
 */

export const GMAIL_SYSTEM_LABELS = {
  // Core system labels
  INBOX: 'INBOX',
  SENT: 'SENT', 
  DRAFT: 'DRAFT',
  TRASH: 'TRASH',
  SPAM: 'SPAM',
  UNREAD: 'UNREAD',
  STARRED: 'STARRED',
  IMPORTANT: 'IMPORTANT',
  
  // Category labels (note the naming differences!)
  CATEGORY: {
    PRIMARY: 'CATEGORY_PERSONAL',    // ⚠️ UI shows "Primary" but API uses "PERSONAL"
    SOCIAL: 'CATEGORY_SOCIAL',
    PROMOTIONS: 'CATEGORY_PROMOTIONS', 
    UPDATES: 'CATEGORY_UPDATES',
    FORUMS: 'CATEGORY_FORUMS'
  }
} as const;

// Valid label IDs for sanity checking
const VALID_LABEL_IDS = new Set([
  'INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'UNREAD', 'STARRED', 'IMPORTANT',
  'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'
]);

/**
 * Validates Gmail label IDs before API calls to prevent 400 errors
 */
export function validateLabelIds(labelIds: string[]): void {
  const invalidLabels = labelIds.filter(id => !VALID_LABEL_IDS.has(id));
  
  if (invalidLabels.length > 0) {
    console.error('❌ Invalid Gmail labelIds detected:', invalidLabels);
    throw new Error(`Invalid Gmail labelIds: ${invalidLabels.join(', ')}. Check GMAIL_SYSTEM_LABELS mapping.`);
  }
  
  console.log('✅ Valid Gmail labelIds:', labelIds);
}

/**
 * Helper to map UI category names to correct system label IDs
 */
export function getCategoryLabelId(uiCategory: 'primary' | 'social' | 'promotions' | 'updates' | 'forums'): string {
  const categoryMap = {
    primary: GMAIL_SYSTEM_LABELS.CATEGORY.PRIMARY,
    social: GMAIL_SYSTEM_LABELS.CATEGORY.SOCIAL,
    promotions: GMAIL_SYSTEM_LABELS.CATEGORY.PROMOTIONS,
    updates: GMAIL_SYSTEM_LABELS.CATEGORY.UPDATES,
    forums: GMAIL_SYSTEM_LABELS.CATEGORY.FORUMS
  };
  
  return categoryMap[uiCategory];
}
