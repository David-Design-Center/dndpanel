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
import { useProfile } from '@/contexts/ProfileContext';

export type MoveDialogType = 'trash' | 'folder';

interface MoveEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (createFilter: boolean) => void;
  emails: Email[];
  dialogType: MoveDialogType;
  targetFolderId?: string;
  targetFolderName?: string;
}

/**
 * Dialog shown when user drags emails to Trash or a custom folder.
 * Asks if they want to create a filter to auto-route future emails from these senders.
 * 
 * For Trash: Creates filter to delete future emails (addLabelIds: ['TRASH'])
 * For Custom Folder: Creates filter to skip inbox and apply label (addLabelIds: [labelId], removeLabelIds: ['INBOX'])
 */
export function MoveEmailDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  emails, 
  dialogType,
  targetFolderId,
  targetFolderName 
}: MoveEmailDialogProps) {
  const [createFilter, setCreateFilter] = useState(false);
  const [skipInbox, setSkipInbox] = useState(false);
  const [isCreatingFilter, setIsCreatingFilter] = useState(false);
  const { currentProfile } = useProfile();

  // 🔧 SELF-FILTER BUG FIX (Dec 2025): Get current user's email to exclude from filters
  const currentUserEmail = cleanEmailAddress(currentProfile?.userEmail || '').toLowerCase();

  // Extract unique sender emails, excluding current user's own email
  const senderEmails = [...new Set(
    emails
      .map(email => cleanEmailAddress(email.from?.email || ''))
      .filter(Boolean)
      .filter(email => email.toLowerCase() !== currentUserEmail) // Exclude self
  )];

  const isTrash = dialogType === 'trash';
  const folderDisplayName = isTrash ? 'Trash' : (targetFolderName || 'folder');

  const handleConfirm = async () => {
    if (createFilter && senderEmails.length > 0) {
      setIsCreatingFilter(true);
      try {
        for (const sender of senderEmails) {
          if (isTrash) {
            // For Trash: Skip inbox and delete
            await createGmailFilter(
              { from: sender },
              { 
                addLabelIds: ['TRASH'],
                removeLabelIds: ['INBOX']
              }
            );
          } else if (targetFolderId) {
            // For Custom Folder: Apply label, optionally skip inbox
            const action: { addLabelIds: string[]; removeLabelIds?: string[] } = {
              addLabelIds: [targetFolderId]
            };
            if (skipInbox) {
              action.removeLabelIds = ['INBOX'];
            }
            await createGmailFilter({ from: sender }, action);
          }
        }
        
        if (isTrash) {
          toast.success(
            senderEmails.length === 1
              ? `Sender blocked. Future emails from ${senderEmails[0]} will be deleted.`
              : `${senderEmails.length} senders blocked. Future emails will be deleted.`
          );
        } else {
          toast.success(
            senderEmails.length === 1
              ? `Rule created. Future emails from ${senderEmails[0]} will go to ${folderDisplayName}.`
              : `Rules created. Future emails from ${senderEmails.length} senders will go to ${folderDisplayName}.`
          );
        }
      } catch (error) {
        console.error('Failed to create filter:', error);
        toast.error(`Failed to create rule. Emails were still moved to ${folderDisplayName}.`);
      } finally {
        setIsCreatingFilter(false);
      }
    }
    
    onConfirm(createFilter);
    setCreateFilter(false); // Reset for next time
    setSkipInbox(false); // Reset for next time
  };

  const handleCancel = () => {
    setCreateFilter(false);
    setSkipInbox(false);
    onClose();
  };

  const senderDisplay = senderEmails.length === 1 
    ? senderEmails[0] 
    : `${senderEmails.length} senders`;

  // Dynamic text based on dialog type
  const title = `Move to ${folderDisplayName}`;
  const description = emails.length === 1 
    ? `This email will be moved to ${folderDisplayName}.`
    : `${emails.length} emails will be moved to ${folderDisplayName}.`;
  
  // 🔧 SELF-FILTER BUG FIX (Dec 2025): Check if all senders were filtered out (all were self)
  const allSendersAreSelf = senderEmails.length === 0 && emails.length > 0;
  const canCreateFilter = senderEmails.length > 0;

  const checkboxLabel = isTrash 
    ? `Block ${senderDisplay}`
    : `Always move emails from ${senderDisplay} here`;
  
  const checkboxDescription = isTrash
    ? `Future emails from ${senderEmails.length === 1 ? 'this sender' : 'these senders'} will be automatically deleted.`
    : `Future emails from ${senderEmails.length === 1 ? 'this sender' : 'these senders'} will go to ${folderDisplayName}.`;

  const confirmButtonText = isCreatingFilter 
    ? 'Creating rule...' 
    : `Move to ${folderDisplayName}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* 🔧 SELF-FILTER BUG FIX: Show checkbox only if there are external senders */}
        {canCreateFilter ? (
        <div className="space-y-3 py-4">
          <div className="flex items-start space-x-3">
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
                {checkboxLabel}
              </label>
              <p className="text-sm text-muted-foreground">
                {checkboxDescription}
              </p>
            </div>
          </div>

          {/* Skip Inbox checkbox - only show for folder moves when createFilter is checked */}
          {createFilter && !isTrash && (
            <div className="flex items-center space-x-3 ml-6">
              <Checkbox
                id="skip-inbox-move"
                checked={skipInbox}
                onCheckedChange={(checked) => setSkipInbox(checked === true)}
                disabled={isCreatingFilter}
              />
              <label
                htmlFor="skip-inbox-move"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Skip Inbox
              </label>
            </div>
          )}
        </div>
        ) : allSendersAreSelf ? (
          <div className="py-4 px-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Cannot create auto-filter for your own sent emails. 
              The email{emails.length > 1 ? 's' : ''} will still be moved to {folderDisplayName}.
            </p>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isCreatingFilter}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isCreatingFilter}>
            {confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MoveEmailDialog;
