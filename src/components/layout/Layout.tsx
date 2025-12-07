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
import { MoveEmailDialog, MoveDialogType } from '../email/MoveEmailDialog';
import { Email } from '../../types';

const Compose = lazy(() => import('../../pages/Compose'));

function Layout() {
  const location = useLocation();
  const { isFoldersColumnExpanded, toggleFoldersColumn } = useLayoutState();
  const { isComposeOpen, openCompose } = useCompose();
  const { incrementLabelUnreadCount } = useLabel();

  // Move dialog state (for Trash and custom folders)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [pendingMoveDrop, setPendingMoveDrop] = useState<{
    emailIds: string[];
    emails: Email[];
    unreadCount: number;
    dialogType: MoveDialogType;
    folderId: string;
    folderName: string;
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
        setPendingMoveDrop({ 
          emailIds, 
          emails, 
          unreadCount, 
          dialogType: 'trash',
          folderId,
          folderName: 'Trash'
        });
        setMoveDialogOpen(true);
        return; // Wait for dialog confirmation
      }
      
      // Special handling for custom labels/folders - show dialog to create filter
      if (folderId.startsWith('Label_')) {
        setPendingMoveDrop({ 
          emailIds, 
          emails, 
          unreadCount, 
          dialogType: 'folder',
          folderId,
          folderName
        });
        setMoveDialogOpen(true);
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
      
      // Other system folders (SENT, STARRED, IMPORTANT, etc.)
      await batchApplyLabelsToEmails(emailIds, [folderId], []);
      toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} moved to ${folderName}`);
      
    } catch (error) {
      console.error('Error moving emails to folder:', error);
      toast.error('Failed to move emails');
      
      // Revert optimistic update on error - trigger refetch
      window.dispatchEvent(new CustomEvent('inbox-refetch-required', {
        detail: { action: 'error-revert' }
      }));
    }
  }, [incrementLabelUnreadCount]);

  // Handle move dialog confirmation (for both Trash and custom folders)
  const handleMoveConfirm = useCallback(async () => {
    if (!pendingMoveDrop) return;
    
    const { emailIds, unreadCount, dialogType, folderId, folderName } = pendingMoveDrop;
    const emailCount = emailIds.length;
    
    // Close dialog
    setMoveDialogOpen(false);
    
    // Immediately remove emails from UI (optimistic update)
    window.dispatchEvent(new CustomEvent('emails-moved', {
      detail: { emailIds, targetFolder: folderId, targetFolderName: folderName }
    }));
    
    // Clear selection
    window.dispatchEvent(new CustomEvent('clear-email-selection'));
    
    try {
      if (dialogType === 'trash') {
        // Move to trash one by one (trash has special API)
        for (const emailId of emailIds) {
          await markEmailAsTrash(emailId);
        }
        toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} moved to Trash`);
        
        // Locally increment Trash unread counter
        if (unreadCount > 0) {
          incrementLabelUnreadCount('TRASH', unreadCount);
          incrementLabelUnreadCount('INBOX', -unreadCount);
        }
      } else {
        // Moving to a custom label/folder - add label and remove from INBOX
        await batchApplyLabelsToEmails(emailIds, [folderId], ['INBOX']);
        toast.success(`${emailCount} email${emailCount > 1 ? 's' : ''} moved to ${folderName}`);
        
        // Locally increment custom folder unread counter
        if (unreadCount > 0) {
          incrementLabelUnreadCount(folderId, unreadCount);
          incrementLabelUnreadCount('INBOX', -unreadCount);
        }
      }
    } catch (error) {
      console.error(`Error moving to ${folderName}:`, error);
      toast.error(`Failed to move emails to ${folderName}`);
      
      // Revert optimistic update on error
      window.dispatchEvent(new CustomEvent('inbox-refetch-required', {
        detail: { action: 'error-revert' }
      }));
    }
    
    // Clear pending state
    setPendingMoveDrop(null);
  }, [pendingMoveDrop, incrementLabelUnreadCount]);

  const handleMoveDialogClose = useCallback(() => {
    setMoveDialogOpen(false);
    setPendingMoveDrop(null);
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

      {/* Move Email Dialog - asks if user wants to create filter for sender */}
      <MoveEmailDialog
        isOpen={moveDialogOpen}
        onClose={handleMoveDialogClose}
        onConfirm={handleMoveConfirm}
        emails={pendingMoveDrop?.emails || []}
        dialogType={pendingMoveDrop?.dialogType || 'trash'}
        targetFolderId={pendingMoveDrop?.folderId}
        targetFolderName={pendingMoveDrop?.folderName}
      />
    </ProfileGuard>
  );
}

export default Layout;
