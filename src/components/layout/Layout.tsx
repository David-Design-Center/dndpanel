import { Suspense, lazy, useMemo, useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import FoldersColumn from '../email labels/FoldersColumn';
import { ProfileGuard } from '../profile/ProfileGuard';
import { useLayoutState } from '../../contexts/LayoutStateContext';
import { useCompose } from '../../contexts/ComposeContext';
import { EmailDndProvider } from '../../contexts/EmailDndContext';
import { useLabel } from '../../contexts/LabelContext';
import { batchApplyLabelsToEmails, markEmailAsTrash } from '../../services/emailService';
import { toast } from 'sonner';
import { SpamFilterDialog } from '../email/SpamFilterDialog';
import { Email } from '../../types';

const Compose = lazy(() => import('../../pages/Compose'));

function Layout() {
  const location = useLocation();
  const { isFoldersColumnExpanded, toggleFoldersColumn } = useLayoutState();
  const { isComposeOpen, openCompose } = useCompose();
  const { incrementLabelUnreadCount } = useLabel();

  // Trash filter dialog state (asks to block sender)
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);
  const [pendingTrashDrop, setPendingTrashDrop] = useState<{
    emailIds: string[];
    emails: Email[];
    unreadCount: number;
  } | null>(null);

  // Check if we're on an email-related route that should show folders column
  const isEmailRoute = location.pathname.startsWith('/inbox') || 
                       location.pathname.startsWith('/unread');

  // Animation key to keep EmailPageLayout mounted when viewing email details
  const animationKey = useMemo(() => {
    if (isEmailRoute) {
      const basePath = location.pathname.split('/email/')[0];
      return basePath || location.pathname;
    }
    return location.pathname;
  }, [location.pathname, isEmailRoute]);

  const handleCompose = () => {
    openCompose();
  };

  // Handle dropping emails on folders
  const handleDropOnFolder = useCallback(async (emailIds: string[], folderId: string, folderName: string, unreadCount: number, emails: Email[]) => {
    try {
      const emailCount = emailIds.length;
      
      // Special handling for Trash - show dialog first to ask about blocking sender
      if (folderId === 'TRASH') {
        // Store pending drop and show dialog
        setPendingTrashDrop({ emailIds, emails, unreadCount });
        setTrashDialogOpen(true);
        return; // Wait for dialog confirmation
      }
      
      // Immediately remove emails from UI (optimistic update)
      window.dispatchEvent(new CustomEvent('emails-moved', {
        detail: { emailIds, targetFolder: folderId, targetFolderName: folderName }
      }));
      
      // Clear selection after drag
      window.dispatchEvent(new CustomEvent('clear-email-selection'));
      
      // Special handling for Spam
      if (folderId === 'SPAM') {
        await batchApplyLabelsToEmails(emailIds, ['SPAM'], ['INBOX']);
        toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} marked as Spam`);
        
        // Locally increment Spam unread counter
        if (unreadCount > 0) {
          incrementLabelUnreadCount('SPAM', unreadCount);
          // Decrement INBOX counter
          incrementLabelUnreadCount('INBOX', -unreadCount);
        }
        return;
      }
      
      // Moving to Inbox
      if (folderId === 'INBOX') {
        await batchApplyLabelsToEmails(emailIds, ['INBOX'], []);
        toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} moved to Inbox`);
        
        // Locally increment Inbox unread counter
        if (unreadCount > 0) {
          incrementLabelUnreadCount('INBOX', unreadCount);
        }
        return;
      }
      
      // Moving to a custom label/folder
      // Add the new label, remove from INBOX
      await batchApplyLabelsToEmails(emailIds, [folderId], ['INBOX']);
      toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} moved to ${folderName}`);
      
      // Locally increment custom folder unread counter
      if (unreadCount > 0) {
        incrementLabelUnreadCount(folderId, unreadCount);
        // Decrement INBOX counter
        incrementLabelUnreadCount('INBOX', -unreadCount);
      }
      
    } catch (error) {
      console.error('Error moving emails to folder:', error);
      toast.error('Failed to move emails');
      
      // Revert optimistic update on error - trigger refetch
      window.dispatchEvent(new CustomEvent('inbox-refetch-required', {
        detail: { action: 'error-revert' }
      }));
    }
  }, [incrementLabelUnreadCount]);

  // Handle trash dialog confirmation
  const handleTrashConfirm = useCallback(async () => {
    if (!pendingTrashDrop) return;
    
    const { emailIds, unreadCount } = pendingTrashDrop;
    const emailCount = emailIds.length;
    
    // Close dialog
    setTrashDialogOpen(false);
    
    // Immediately remove emails from UI (optimistic update)
    window.dispatchEvent(new CustomEvent('emails-moved', {
      detail: { emailIds, targetFolder: 'TRASH', targetFolderName: 'Trash' }
    }));
    
    // Clear selection
    window.dispatchEvent(new CustomEvent('clear-email-selection'));
    
    try {
      // Move to trash one by one (trash has special API)
      for (const emailId of emailIds) {
        await markEmailAsTrash(emailId);
      }
      toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} moved to Trash`);
      
      // Locally increment Trash unread counter
      if (unreadCount > 0) {
        incrementLabelUnreadCount('TRASH', unreadCount);
        // Decrement INBOX counter
        incrementLabelUnreadCount('INBOX', -unreadCount);
      }
    } catch (error) {
      console.error('Error moving to trash:', error);
      toast.error('Failed to move emails to Trash');
      
      // Revert optimistic update on error
      window.dispatchEvent(new CustomEvent('inbox-refetch-required', {
        detail: { action: 'error-revert' }
      }));
    }
    
    // Clear pending state
    setPendingTrashDrop(null);
  }, [pendingTrashDrop, incrementLabelUnreadCount]);

  const handleTrashDialogClose = useCallback(() => {
    setTrashDialogOpen(false);
    setPendingTrashDrop(null);
  }, []);

  // Wrap email content with DnD provider
  const emailContent = (
    <>
      {/* Folders Column - only for email routes */}
      <div className={`${isFoldersColumnExpanded ? 'w-64' : 'w-12'} border-r border-gray-200 transition-all duration-300 flex-shrink-0`}>
        <FoldersColumn 
          isExpanded={isFoldersColumnExpanded} 
          onToggle={toggleFoldersColumn}
          onCompose={handleCompose}
        />
      </div>
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden" key={animationKey} style={{ animation: 'fadeInFromTop 0.6s ease-out' }}>
          <div className="w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );

  return (
    <ProfileGuard>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        
        {isEmailRoute ? (
          <EmailDndProvider onDropOnFolder={handleDropOnFolder}>
            {emailContent}
          </EmailDndProvider>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto p-4" key={animationKey} style={{ animation: 'fadeInFromTop 0.6s ease-out' }}>
              <div className="max-w-6xl mx-auto">
                <Outlet />
              </div>
            </main>
          </div>
        )}
      </div>

      {/* Compose Popup - Rendered as overlay */}
      {isComposeOpen && (
        <Suspense fallback={null}>
          <Compose />
        </Suspense>
      )}

      {/* Trash Filter Dialog - asks if user wants to block sender */}
      <SpamFilterDialog
        isOpen={trashDialogOpen}
        onClose={handleTrashDialogClose}
        onConfirm={handleTrashConfirm}
        emails={pendingTrashDrop?.emails || []}
      />
    </ProfileGuard>
  );
}

export default Layout;
