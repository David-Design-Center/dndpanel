/**
 * Email Repository - Single Source of Truth
 * 
 * This service manages ALL emails in a single master collection
 * and provides computed views for each tab/folder.
 * 
 * Problem it solves:
 * - Before: 26+ parallel arrays with no sync
 * - After: 1 master Map + derived views (always in sync)
 */

import { Email } from '../types';

interface RepositoryMetadata {
  lastSync: number;
  profileId?: string;
  totalCount: number;
}

export class EmailRepository {
  private masterEmails: Map<string, Email> = new Map();
  
  // Reverse indices for fast label lookups
  private labelIndices: Map<string, Set<string>> = new Map();
  
  // Metadata
  private metadata: RepositoryMetadata = {
    lastSync: 0,
    totalCount: 0
  };

  /**
   * Initialize indices
   */
  initializeIndices() {
    const allLabels = [
      'INBOX', 'UNREAD', 'SENT', 'DRAFT', 'DRAFTS',
      'TRASH', 'SPAM', 'STARRED', 'IMPORTANT', 'ARCHIVE',
      'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES'
    ];
    
    allLabels.forEach(label => {
      if (!this.labelIndices.has(label)) {
        this.labelIndices.set(label, new Set());
      }
    });
  }

  /**
   * Add or update email in master collection
   */
  addEmail(email: Email): void {
    if (!email.id) {
      console.warn('⚠️ EmailRepository: Email has no ID, skipping');
      return;
    }

    // If email already exists, remove it from old label indices
    if (this.masterEmails.has(email.id)) {
      const oldEmail = this.masterEmails.get(email.id);
      if (oldEmail?.labelIds) {
        oldEmail.labelIds.forEach(label => {
          this.labelIndices.get(label)?.delete(email.id);
        });
      }
    }

    // Add to master
    this.masterEmails.set(email.id, email);

    // Add to Folder indices
    if (email.labelIds && Array.isArray(email.labelIds)) {
      email.labelIds.forEach(label => {
        if (!this.labelIndices.has(label)) {
          this.labelIndices.set(label, new Set());
        }
        this.labelIndices.get(label)!.add(email.id);
      });
    }

    // Track special properties
    if (email.isStarred && !this.labelIndices.has('STARRED')) {
      this.labelIndices.set('STARRED', new Set());
    }
    if (email.isStarred) {
      this.labelIndices.get('STARRED')?.add(email.id);
    }

    if (email.isImportant && !this.labelIndices.has('IMPORTANT')) {
      this.labelIndices.set('IMPORTANT', new Set());
    }
    if (email.isImportant) {
      this.labelIndices.get('IMPORTANT')?.add(email.id);
    }

    this.metadata.totalCount = this.masterEmails.size;
  }

  /**
   * Bulk add emails
   */
  addEmails(emails: Email[]): void {
    emails.forEach(email => this.addEmail(email));
  }

  /**
   * Delete email from master
   */
  deleteEmail(emailId: string): void {
    const email = this.masterEmails.get(emailId);
    if (!email) return;

    // Remove from label indices
    if (email.labelIds) {
      email.labelIds.forEach(label => {
        this.labelIndices.get(label)?.delete(emailId);
      });
    }

    // Remove from special properties
    this.labelIndices.get('STARRED')?.delete(emailId);
    this.labelIndices.get('IMPORTANT')?.delete(emailId);

    // Remove from master
    this.masterEmails.delete(emailId);
    this.metadata.totalCount = this.masterEmails.size;

    console.log(`🗑️  EmailRepository: Deleted email ${emailId}`);
  }

  /**
   * Move email to different labels (atomic operation)
   */
  moveEmail(emailId: string, fromLabels: string[], toLabels: string[]): void {
    const email = this.masterEmails.get(emailId);
    if (!email) {
      console.warn(`⚠️ EmailRepository: Email ${emailId} not found`);
      return;
    }

    // Remove from old labels
    fromLabels.forEach(label => {
      this.labelIndices.get(label)?.delete(emailId);
    });

    // Add to new labels
    toLabels.forEach(label => {
      if (!this.labelIndices.has(label)) {
        this.labelIndices.set(label, new Set());
      }
      this.labelIndices.get(label)?.add(emailId);
    });

    // Update email's labelIds
    const newLabelIds = [
      ...(email.labelIds || []).filter(l => !fromLabels.includes(l)),
      ...toLabels
    ];
    email.labelIds = newLabelIds;

    console.log(`↔️  EmailRepository: Moved email ${emailId} from [${fromLabels}] to [${toLabels}]`);
  }

  /**
   * Get all emails for a tab (derived view)
   */
  getInboxEmails(): Email[] {
    return Array.from(this.labelIndices.get('INBOX')?.values() || [])
      .map(id => this.masterEmails.get(id)!)
      .filter(e => !e.labelIds?.includes('SENT') && !e.labelIds?.includes('SPAM') && !e.labelIds?.includes('TRASH'));
  }

  /**
   * Get unread emails (derived view)
   */
  getUnreadEmails(): Email[] {
    return Array.from(this.masterEmails.values())
      .filter(e => !e.isRead || e.labelIds?.includes('UNREAD'));
  }

  /**
   * Get sent emails (derived view)
   */
  getSentEmails(): Email[] {
    return Array.from(this.labelIndices.get('SENT')?.values() || [])
      .map(id => this.masterEmails.get(id)!);
  }

  /**
   * Get trash emails (derived view)
   */
  getTrashEmails(): Email[] {
    return Array.from(this.labelIndices.get('TRASH')?.values() || [])
      .map(id => this.masterEmails.get(id)!);
  }

  /**
   * Get spam emails (derived view)
   */
  getSpamEmails(): Email[] {
    return Array.from(this.labelIndices.get('SPAM')?.values() || [])
      .map(id => this.masterEmails.get(id)!);
  }

  /**
   * Get important emails (derived view)
   */
  getImportantEmails(): Email[] {
    return Array.from(this.masterEmails.values())
      .filter(e => e.isImportant || e.labelIds?.includes('IMPORTANT'));
  }

  /**
   * Get starred emails (derived view)
   */
  getStarredEmails(): Email[] {
    return Array.from(this.masterEmails.values())
      .filter(e => e.isStarred || e.labelIds?.includes('STARRED'));
  }

  /**
   * Get archive emails (derived view) - everything NOT in INBOX/SPAM/TRASH
   */
  getArchiveEmails(): Email[] {
    return Array.from(this.masterEmails.values())
      .filter(e => 
        !e.labelIds?.includes('INBOX') && 
        !e.labelIds?.includes('SPAM') && 
        !e.labelIds?.includes('TRASH')
      );
  }

  /**
   * Get drafts (derived view)
   */
  getDraftEmails(): Email[] {
    return Array.from(this.masterEmails.values())
      .filter(e => e.labelIds?.includes('DRAFT') || e.labelIds?.includes('DRAFTS'));
  }

  /**
   * Get all mail (derived view) - everything except spam/trash
   */
  getAllMailEmails(): Email[] {
    return Array.from(this.masterEmails.values())
      .filter(e => !e.labelIds?.includes('SPAM') && !e.labelIds?.includes('TRASH'));
  }

  /**
   * Get category emails (derived view)
   */
  getCategoryEmails(category: 'primary' | 'updates' | 'promotions' | 'social', folderType: 'all' | 'archive' | 'spam' | 'trash'): Email[] {
    const categoryLabel = `CATEGORY_${category.toUpperCase()}`;
    
    return Array.from(this.masterEmails.values())
      .filter(e => {
        // Check category label
        if (!e.labelIds?.includes(categoryLabel)) return false;

        // Check folder type
        switch (folderType) {
          case 'all':
            return !e.labelIds.includes('SPAM') && !e.labelIds.includes('TRASH');
          case 'archive':
            return !e.labelIds.includes('INBOX') && !e.labelIds.includes('SPAM') && !e.labelIds.includes('TRASH');
          case 'spam':
            return e.labelIds.includes('SPAM');
          case 'trash':
            return e.labelIds.includes('TRASH');
          default:
            return false;
        }
      });
  }

  /**
   * Get count for a tab
   */
  getCount(tab: string): number {
    switch (tab) {
      case 'all':
        return this.getInboxEmails().length;
      case 'unread':
        return this.getUnreadEmails().length;
      case 'sent':
        return this.getSentEmails().length;
      case 'trash':
        return this.getTrashEmails().length;
      case 'spam':
        return this.getSpamEmails().length;
      case 'drafts':
        return this.getDraftEmails().length;
      case 'important':
        return this.getImportantEmails().length;
      case 'starred':
        return this.getStarredEmails().length;
      case 'archive':
        return this.getArchiveEmails().length;
      case 'allmail':
        return this.getAllMailEmails().length;
      default:
        return 0;
    }
  }

  /**
   * Get single email by ID
   */
  getEmailById(id: string): Email | undefined {
    return this.masterEmails.get(id);
  }

  /**
   * Check if email exists
   */
  hasEmail(id: string): boolean {
    return this.masterEmails.has(id);
  }

  /**
   * Clear all emails
   */
  clear(): void {
    this.masterEmails.clear();
    this.labelIndices.forEach(set => set.clear());
    this.metadata.totalCount = 0;
    console.log('🗑️  EmailRepository: Cleared all emails');
  }

  /**
   * Get metadata
   */
  getMetadata(): RepositoryMetadata {
    return { ...this.metadata };
  }

  /**
   * Update metadata
   */
  updateMetadata(updates: Partial<RepositoryMetadata>): void {
    this.metadata = { ...this.metadata, ...updates };
  }

  /**
   * Get total count
   */
  getTotalCount(): number {
    return this.masterEmails.size;
  }

  /**
   * Validate repository state
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for duplicates
    const allIds = new Set<string>();
    this.masterEmails.forEach((_email, id) => {
      if (allIds.has(id)) {
        errors.push(`Duplicate email ID: ${id}`);
      }
      allIds.add(id);
    });

    // Check label consistency
    this.labelIndices.forEach((emailIds, label) => {
      emailIds.forEach(emailId => {
        const email = this.masterEmails.get(emailId);
        if (!email) {
          errors.push(`Index inconsistency: Email ${emailId} in ${label} index but not in master`);
        }
      });
    });

    // Check that all emails have correct labels in indices
    this.masterEmails.forEach((_email, id) => {
      const email = this.masterEmails.get(id);
      if (!email) return;
      
      if (email.labelIds) {
        email.labelIds.forEach(label => {
          if (!this.labelIndices.has(label)) {
            errors.push(`Email ${id} has label ${label} but index doesn't exist`);
          } else if (!this.labelIndices.get(label)?.has(id)) {
            errors.push(`Email ${id} has label ${label} but not in index`);
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
export const emailRepository = new EmailRepository();
