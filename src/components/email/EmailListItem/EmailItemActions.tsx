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
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        title="Delete email"
      >
        <Trash2 size={14} className="text-gray-500" />
      </Button>
      {isDraft && onDeleteDraft && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDeleteDraft}
          title="Discard draft"
          className="hover:bg-red-50"
        >
          <Trash2 size={14} className="text-red-500" />
        </Button>
      )}
    </div>
  );
}
