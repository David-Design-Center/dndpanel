import { formatDistanceToNow, parseISO } from 'date-fns';
import { Email } from '../types';
import { Paperclip, Mail, MailOpen, Star, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { markAsRead, markAsUnread, markAsImportant, markAsUnimportant, deleteDraft, deleteEmail } from '../services/emailService';
import { useState } from 'react';

interface EmailListItemProps {
  email: Email;
  onClick: (id: string) => void;
  isDraggable?: boolean;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
  isDraft?: boolean;
  currentTab?: 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important';
}

function EmailListItem({ email, onClick, isDraggable = true, onEmailUpdate, onEmailDelete, isDraft = false, currentTab }: EmailListItemProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isTogglingImportance, setIsTogglingImportance] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingEmail, setIsDeletingEmail] = useState(false);
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    
    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      await deleteDraft(email.id);
      onEmailDelete?.(email.id);
      console.log(`✅ Successfully deleted draft ${email.id}`);
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Failed to delete draft. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteEmail = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }
    
    setIsDeletingEmail(true);
    
    try {
      await deleteEmail(email.id);
      onEmailDelete?.(email.id);
      console.log(`✅ Successfully deleted email ${email.id}`);
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Failed to delete email. Please try again.');
    } finally {
      setIsDeletingEmail(false);
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(email.id)}
      className={`group px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
        !email.isRead ? 'bg-blue-50/30' : 'bg-white'
      } ${isDragging ? 'opacity-50 z-10' : ''} min-w-0`}
      data-dragging={isDragging}
    >
      <div className="flex items-start justify-between min-w-0">
        <div className="flex-1 min-w-0 mr-6 overflow-hidden">
          {/* Sender/Recipient Name */}
          <div className="flex items-center mb-1 min-w-0">
            <span className={`text-sm ${!email.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'} truncate flex-1 min-w-0`}>
              {currentTab === 'sent' 
                ? (email.to && email.to.length > 0 
                    ? (email.to[0].name && email.to[0].name !== 'Me' && email.to[0].name.trim() !== ''
                        ? email.to[0].name 
                        : email.to[0].email || 'Unknown recipient')
                    : 'Unknown recipient')
                : (email.from.name || email.from.email)
              }
            </span>
            {!email.isRead && (
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 ml-2"></span>
            )}
          </div>
          
          {/* Subject */}
          <h3 className={`text-xs ${!email.isRead ? 'font-medium text-gray-900' : 'font-normal text-gray-600'} truncate mb-1 leading-relaxed`}>
            {email.subject || 'No Subject'}
          </h3>
          
          {/* Preview */}
          <p className="text-xs text-gray-500 truncate leading-relaxed">
            {email.preview}
          </p>
        </div>
        
        {/* Right side - Date and Actions */}
        <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-4">
          <span className="text-xs text-gray-500 whitespace-nowrap">{formattedDate}</span>
          
          <div className="flex items-center space-x-1">
            {/* Attachment indicator */}
            {email.attachments && email.attachments.length > 0 && (
              <Paperclip size={14} className="text-gray-400" />
            )}
            
            {/* Action buttons */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleToggleReadStatus}
                disabled={isToggling}
                className={`p-1 rounded hover:bg-gray-200 transition-colors ${
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
                className={`p-1 rounded hover:bg-gray-200 transition-colors ${
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
              
              {/* Delete email button for all users */}
              <button
                onClick={handleDeleteEmail}
                disabled={isDeletingEmail}
                className={`p-1 rounded hover:bg-red-100 transition-colors ${
                  isDeletingEmail ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Delete email"
              >
                {isDeletingEmail ? (
                  <div className="w-3.5 h-3.5 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 size={14} className="text-red-500 hover:text-red-700" />
                )}
              </button>
              
              {isDraft && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`p-1 rounded hover:bg-red-100 transition-colors ${
                    isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Delete draft"
                >
                  {isDeleting ? (
                    <div className="w-3.5 h-3.5 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 size={14} className="text-red-500 hover:text-red-700" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailListItem;