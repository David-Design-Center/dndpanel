import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { createGmailFilter } from '@/integrations/gapiService';
import { cleanEmailAddress } from '@/utils/emailFormatting';
import { toast } from 'sonner';
import { Email } from '@/types';

interface SpamFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (createFilter: boolean) => void;
  emails: Email[];
}

/**
 * Dialog shown when user drags emails to Trash folder.
 * Asks if they want to create a filter to auto-delete future emails from these senders.
 * 
 * Note: Gmail API doesn't allow directly adding SPAM label via filters.
 * Instead, we create a filter that:
 * - Removes from INBOX (skips inbox)
 * - Adds TRASH label to delete automatically
 * 
 * This effectively blocks the sender.
 */
export function SpamFilterDialog({ isOpen, onClose, onConfirm, emails }: SpamFilterDialogProps) {
  const [createFilter, setCreateFilter] = useState(false);
  const [isCreatingFilter, setIsCreatingFilter] = useState(false);

  // Extract unique sender emails
  const senderEmails = [...new Set(
    emails
      .map(email => cleanEmailAddress(email.from?.email || ''))
      .filter(Boolean)
  )];

  const handleConfirm = async () => {
    if (createFilter && senderEmails.length > 0) {
      setIsCreatingFilter(true);
      try {
        // Create filter for each unique sender
        // Gmail API doesn't support adding SPAM label via filters
        // Instead, we skip inbox and delete - effectively blocking the sender
        for (const sender of senderEmails) {
          await createGmailFilter(
            { from: sender },
            { 
              // Skip inbox and send to trash - this blocks the sender
              addLabelIds: ['TRASH'],
              removeLabelIds: ['INBOX']
            }
          );
        }
        toast.success(
          senderEmails.length === 1
            ? `Sender blocked. Future emails from ${senderEmails[0]} will be deleted.`
            : `${senderEmails.length} senders blocked. Future emails will be deleted.`
        );
      } catch (error) {
        console.error('Failed to create spam filter:', error);
        toast.error('Failed to block sender. Emails were still moved to Spam.');
      } finally {
        setIsCreatingFilter(false);
      }
    }
    
    onConfirm(createFilter);
    setCreateFilter(false); // Reset for next time
  };

  const handleCancel = () => {
    setCreateFilter(false);
    onClose();
  };

  const senderDisplay = senderEmails.length === 1 
    ? senderEmails[0] 
    : `${senderEmails.length} senders`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Trash</DialogTitle>
          <DialogDescription>
            {emails.length === 1 
              ? 'This email will be moved to Trash.'
              : `${emails.length} emails will be moved to Trash.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start space-x-3 py-4">
          <Checkbox
            id="create-filter"
            checked={createFilter}
            onCheckedChange={(checked) => setCreateFilter(checked === true)}
            disabled={isCreatingFilter}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="create-filter"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Block {senderDisplay}
            </label>
            <p className="text-sm text-muted-foreground">
              Future emails from {senderEmails.length === 1 ? 'this sender' : 'these senders'} will be automatically deleted.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isCreatingFilter}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isCreatingFilter}>
            {isCreatingFilter ? 'Creating filter...' : 'Move to Trash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SpamFilterDialog;
