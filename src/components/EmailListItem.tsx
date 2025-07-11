import { formatDistanceToNow, parseISO } from 'date-fns';
import { Email } from '../types';
import { Paperclip, Mail, MailOpen, Star } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { markAsRead, markAsUnread, markAsImportant, markAsUnimportant } from '../services/emailService';
import { useState } from 'react';

interface EmailListItemProps {
  email: Email;
  onClick: (id: string) => void;
  isDraggable?: boolean;
  onEmailUpdate?: (email: Email) => void;
}

function EmailListItem({ email, onClick, isDraggable = true, onEmailUpdate }: EmailListItemProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isTogglingImportance, setIsTogglingImportance] = useState(false);
  const formattedDate = formatDistanceToNow(parseISO(email.date), { addSuffix: true });
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: email.id,
    disabled: !isDraggable
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const handleToggleReadStatus = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    setIsToggling(true);
    
    const newReadStatus = !email.isRead;
    
    // Optimistic UI update - immediately update the UI
    const updatedEmail = { ...email, isRead: newReadStatus };
    onEmailUpdate?.(updatedEmail);
    
    try {
      if (email.isRead) {
        await markAsUnread(email.id);
      } else {
        await markAsRead(email.id);
      }
      
      console.log(`✅ Successfully toggled read status for email ${email.id} to ${newReadStatus ? 'read' : 'unread'}`);
      
    } catch (error) {
      console.error('Error toggling read status:', error);
      
      // Revert the optimistic update on error
      const revertedEmail = { ...email, isRead: email.isRead };
      onEmailUpdate?.(revertedEmail);
    } finally {
      setIsToggling(false);
    }
  };

  const handleToggleImportance = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    setIsTogglingImportance(true);
    
    const currentImportantStatus = email.isImportant ?? false; // Default to false if undefined
    const newImportantStatus = !currentImportantStatus;
    
    // Optimistic UI update - immediately update the UI
    const updatedEmail = { ...email, isImportant: newImportantStatus };
    onEmailUpdate?.(updatedEmail);
    
    try {
      if (currentImportantStatus) {
        await markAsUnimportant(email.id);
      } else {
        await markAsImportant(email.id);
      }
      
      console.log(`⭐ Successfully toggled importance for email ${email.id} to ${newImportantStatus ? 'important' : 'not important'}`);
      
    } catch (error) {
      console.error('Error toggling importance:', error);
      
      // Revert the optimistic update on error
      const revertedEmail = { ...email, isImportant: currentImportantStatus };
      onEmailUpdate?.(revertedEmail);
    } finally {
      setIsTogglingImportance(false);
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(email.id)}
      className={`p-3 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 ${
        !email.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white'
      } ${isDragging ? 'opacity-50 z-10' : ''}`}
      data-dragging={isDragging}
    >
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm ${!email.isRead ? 'font-bold text-gray-900' : 'font-normal text-gray-700'} truncate`}>
              {email.from.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{formattedDate}</span>
              <button
                onClick={handleToggleReadStatus}
                disabled={isToggling}
                className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                  isToggling ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={email.isRead ? 'Mark as unread' : 'Mark as read'}
              >
                {email.isRead ? (
                  <MailOpen size={14} className="text-gray-500" />
                ) : (
                  <Mail size={14} className="text-blue-600" />
                )}
              </button>
              <button
                onClick={handleToggleImportance}
                disabled={isTogglingImportance}
                className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                  isTogglingImportance ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={email.isImportant ? 'Mark as unimportant' : 'Mark as important'}
              >
                {email.isImportant ? (
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                ) : (
                  <Star size={14} className="text-gray-500 hover:text-yellow-400" />
                )}
              </button>
            </div>
          </div>
          <p className={`text-sm ${!email.isRead ? 'font-semibold text-gray-900' : 'font-normal text-gray-600'} truncate`}>
            {email.subject}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {email.attachments && email.attachments.length > 0 && (
              <Paperclip className="inline-block h-3 w-3 mr-1" />
            )}
            {email.preview}
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmailListItem;