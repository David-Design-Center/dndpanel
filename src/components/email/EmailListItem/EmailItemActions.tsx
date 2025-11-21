import { Email } from '@/types';
import { Mail, MailOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmailItemActionsProps {
  email: Email;
  isDraft: boolean;
  onToggleRead: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onDeleteDraft?: (e: React.MouseEvent) => void;
  isToggling: boolean;
}

export function EmailItemActions({
  email,
  isDraft,
  onToggleRead,
  onDelete,
  onDeleteDraft,
  isToggling
}: EmailItemActionsProps) {
  return (
    <div className="hidden group-hover:flex items-center gap-1">
      {/* Mark as read/unread - only show for non-drafts */}
      {!isDraft && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleRead}
          disabled={isToggling}
          title={email.isRead ? 'Mark as unread' : 'Mark as read'}
        >
          {email.isRead ? (
            <MailOpen size={14} className="text-gray-500" />
          ) : (
            <Mail size={14} className="text-blue-600" />
          )}
        </Button>
      )}
      
      {/* Delete button - different behavior for drafts vs regular emails */}
      {isDraft && onDeleteDraft ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteDraft}
          title="Discard draft"
          className="hover:bg-red-50 text-red-600 hover:text-red-700 px-2"
        >
          <Trash2 size={14} className="mr-1" />
          Discard
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          title="Delete email"
        >
          <Trash2 size={14} className="text-gray-500" />
        </Button>
      )}
    </div>
  );
}
