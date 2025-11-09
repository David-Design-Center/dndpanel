import { format, parseISO, isThisYear } from 'date-fns';
import { Email } from '@/types';
import { Paperclip, Mail, MailOpen, Star, Trash2, Tag, Filter, ChevronRight, Search, Settings, X, Plus, Flag } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { markAsRead, markAsUnread, markAsImportant, markAsUnimportant, deleteDraft, deleteEmail, applyLabelsToEmail, markAsStarred, markAsUnstarred } from '@/services/emailService';
import { toast } from 'sonner';
import { createGmailFilter, fetchGmailLabels } from '@/integrations/gapiService';
import { emitLabelUpdateEvent } from '@/utils/labelUpdateEvents';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useLabel } from '@/contexts/LabelContext';
import { useInboxLayout } from '@/contexts/InboxLayoutContext';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanEmailSubject, cleanEncodingIssues } from '@/utils/textEncoding';
import { cleanEmailAddress } from '@/utils/emailFormatting';

interface EmailListItemProps {
  email: Email;
  onClick: (id: string) => void;
  isDraggable?: boolean;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
  isDraft?: boolean;
  currentTab?: 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important' | 'starred' | 'spam' | 'archive' | 'allmail';
  onCreateFilter?: (email: Email) => void;
  isSelected?: boolean;
  onToggleSelect?: (emailId: string) => void;
  renderAsTableRow?: boolean; // when true, render shadcn TableRow; fallback to div for drag overlay
}

function EmailListItem({ email, onClick, isDraggable = true, onEmailUpdate, onEmailDelete, isDraft = false, onCreateFilter, isSelected = false, onToggleSelect, renderAsTableRow = true }: EmailListItemProps) {
  const navigate = useNavigate();
  const { selectedEmailId } = useInboxLayout(); // Get currently viewed email ID
  // const { startFilterCreation } = useFilterCreation();
  const [isToggling, setIsToggling] = useState(false);
  const [isTogglingImportance, setIsTogglingImportance] = useState(false);
  
  // Check if this email is currently being viewed
  const isActiveEmail = selectedEmailId === email.id;
  const [isTogglingStar, setIsTogglingStar] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const [showLabelSubmenu, setShowLabelSubmenu] = useState(false);
  const hideLabelTimerRef = useRef<number | null>(null);
  const [showFilterSubmenu, setShowFilterSubmenu] = useState(false);
  const [showCreateFilterModal, setShowCreateFilterModal] = useState(false);
  const [isApplyingLabel, setIsApplyingLabel] = useState<string | null>(null);
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  // Label picker state for the Create Filter modal
  const [filterLabelQuery, setFilterLabelQuery] = useState('');
  const [selectedFilterLabel, setSelectedFilterLabel] = useState<string>('');
  // Removed unused filter label states after extraction of portals
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const labelSearchRef = useRef<HTMLInputElement>(null);
  const filterModalRef = useRef<HTMLDivElement>(null);
  const createLabelModalRef = useRef<HTMLDivElement>(null);
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [nestUnder, setNestUnder] = useState(false);
  const [parentLabel, setParentLabel] = useState('');
  const [autoFilterFuture, setAutoFilterFuture] = useState(false);
  const { labels, addLabel } = useLabel();
  // Gmail-style date/time display
  const formattedDate = (() => {
    try {
      const d = parseISO(email.date);
      const now = new Date();
      const hoursDiff = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
      
      // Within 24 hours: show time only (12-hour format with AM/PM)
      if (hoursDiff < 24 && hoursDiff >= 0) {
        return format(d, 'h:mm a');
      }
      
      // This year but older than 24h: show date without year
      if (isThisYear(d)) {
        return format(d, 'MMM d');
      }
      
      // Older than this year: show date with year
      return format(d, 'MMM d, yyyy');
    } catch {
      return email.date;
    }
  })();

  // Format sender text for display
  // Determine if this is a sent email to show recipient instead of sender
  const isSentEmail = email.labelIds?.includes('SENT');
  
  const senderText = (() => {
    // For sent emails, show recipient (TO) instead of sender (FROM)
    if (isSentEmail) {
      const firstRecipient = email.to?.[0];
      if (firstRecipient?.name) {
        return cleanEncodingIssues(firstRecipient.name);
      }
      if (firstRecipient?.email) {
        return cleanEmailAddress(firstRecipient.email);
      }
      return 'Unknown Recipient';
    }
    
    // For other emails, show sender (FROM)
    if (email.from?.name) {
      return cleanEncodingIssues(email.from.name);
    }
    if (email.from?.email) {
      return cleanEmailAddress(email.from.email);
    }
    return 'Unknown Sender';
  })();
  
  // Filter labels based on FoldersColumn rules and search query
  const filteredLabels = labels
    // 1) Remove system and special labels (match FoldersColumn.tsx)
    .filter(label => {
      const name = (label.name || '').toLowerCase();
      return name !== 'sent' &&
             name !== 'drafts' &&
             name !== 'draft' &&
             name !== 'spam' &&
             name !== 'trash' &&
             name !== 'important' &&
             name !== 'starred' &&
             name !== 'unread' &&
             name !== 'yellow_star' &&
             name !== 'deleted messages' &&
             name !== 'chat' &&
             name !== 'blocked' &&
             name !== '[imap]' &&
             name !== 'junk e-mail' &&
             name !== 'notes' &&
             !name.startsWith('category_') &&
             !name.startsWith('label_') &&
             !name.startsWith('[imap');
    })
    // 2) Remove direct INBOX label and normalize INBOX/ children
    .filter(label => (label.name || '').toLowerCase() !== 'inbox')
    .map(label => {
      const rawName = label.name || '';
      const displayName = rawName.startsWith('INBOX/') ? rawName.substring(6) : rawName;
      return { ...label, displayName } as typeof label & { displayName: string };
    })
    // 3) Drop any empties after normalization
    .filter(label => label.displayName.length > 0)
    // 4) Search on the display name
    .filter(label => label.displayName.toLowerCase().includes(labelSearchQuery.toLowerCase()))
    // 5) Sort alphabetically by display name
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const hasExactLabelMatch = (() => {
    const q = labelSearchQuery.trim().toLowerCase();
    if (!q) return false;
    return filteredLabels.some(l => (l as any).displayName.toLowerCase() === q);
  })();
  
  // Filter labels for the Create Filter modal (use the same system-label exclusions and INBOX/ normalization)
  const filteredFilterLabels = labels
    .filter(label => {
      const name = (label.name || '').toLowerCase();
      return name !== 'sent' &&
             name !== 'drafts' &&
             name !== 'draft' &&
             name !== 'spam' &&
             name !== 'trash' &&
             name !== 'important' &&
             name !== 'starred' &&
             name !== 'unread' &&
             name !== 'yellow_star' &&
             name !== 'deleted messages' &&
             name !== 'chat' &&
             name !== 'blocked' &&
             name !== '[imap]' &&
             name !== 'junk e-mail' &&
             name !== 'notes' &&
             !name.startsWith('category_') &&
             !name.startsWith('label_') &&
             !name.startsWith('[imap');
    })
    .filter(label => (label.name || '').toLowerCase() !== 'inbox')
    .map(label => {
      const rawName = label.name || '';
      const displayName = rawName.startsWith('INBOX/') ? rawName.substring(6) : rawName;
      return { ...label, displayName } as typeof label & { displayName: string };
    })
    .filter(label => label.displayName.length > 0)
    .filter(label => label.displayName.toLowerCase().includes(filterLabelQuery.toLowerCase()))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  // We intentionally do not render user-visible label chips in the row to keep single-line layout
  
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

  // Clean Gmail-style layout without preview text for better readability

  const handleToggleReadStatus = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    setIsToggling(true);
    
    const newReadStatus = !email.isRead;
    
    console.log(`🔄 Toggling read status for email ${email.id}: ${email.isRead} → ${newReadStatus}`);
    
    // Optimistic UI update - immediately update the UI
    const updatedEmail = { ...email, isRead: newReadStatus };
    onEmailUpdate?.(updatedEmail);
    
    // Emit immediate event for folder unread counter updates
    if (email.labelIds && email.labelIds.length > 0) {
      emitLabelUpdateEvent({
        labelIds: email.labelIds,
        action: newReadStatus ? 'mark-read' : 'mark-unread',
        threadId: email.threadId,
        messageId: email.id
      });
    }

    // Call API in background - don't await to avoid blocking UI
    const apiCall = email.isRead ? markAsUnread(email.id) : markAsRead(email.id);
    
    apiCall
      .then(() => {
        console.log(`✅ Successfully toggled read status for email ${email.id} to ${newReadStatus ? 'read' : 'unread'}`);
      })
      .catch((error) => {
        console.error('Error toggling read status:', error);
        
        // Revert the optimistic update on error
        const revertedEmail = { ...email, isRead: email.isRead };
        onEmailUpdate?.(revertedEmail);
        
        // Emit revert event
        if (email.labelIds && email.labelIds.length > 0) {
          emitLabelUpdateEvent({
            labelIds: email.labelIds,
            action: email.isRead ? 'mark-read' : 'mark-unread',
            threadId: email.threadId,
            messageId: email.id
          });
        }
      })
      .finally(() => {
        setIsToggling(false);
      });
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

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTogglingStar(true);
    const current = email.isStarred ?? false;
    const updated = { ...email, isStarred: !current };
    onEmailUpdate?.(updated);
    try {
      if (current) await markAsUnstarred(email.id); else await markAsStarred(email.id);
    } catch (err) {
      onEmailUpdate?.({ ...email, isStarred: current });
    } finally {
      setIsTogglingStar(false);
    }
  };

  // Handle email click - mark as read if unread, then call parent onClick
  const handleEmailClick = () => {
    // Mark as read optimistically if email is unread
    if (!email.isRead && onEmailUpdate) {
      console.log(`📧 Clicking email ${email.id}: marking as read`);
      
      const updatedEmail = { ...email, isRead: true };
      
      // Update UI immediately (optimistic update)
      onEmailUpdate(updatedEmail);
      
      // Emit event for folder unread counter updates immediately
      if (email.labelIds && email.labelIds.length > 0) {
        emitLabelUpdateEvent({
          labelIds: email.labelIds,
          action: 'mark-read',
          threadId: email.threadId,
          messageId: email.id
        });
      }
      
      // Call API in background - don't await it to avoid blocking UI
      markAsRead(email.id)
        .then(() => {
          console.log(`✅ Successfully marked email ${email.id} as read`);
        })
        .catch((error) => {
          console.error('Failed to mark email as read:', error);
          // Revert the optimistic update on error
          onEmailUpdate(email);
          
          // Emit revert event
          if (email.labelIds && email.labelIds.length > 0) {
            emitLabelUpdateEvent({
              labelIds: email.labelIds,
              action: 'mark-unread',
              threadId: email.threadId,
              messageId: email.id
            });
          }
        });
    }
    
    // Call parent onClick handler for navigation
    onClick(email.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    
    // Optimistic UI update - remove from UI immediately
    onEmailDelete?.(email.id);
    
    // Show success toast immediately
    toast.success('Draft discarded successfully!');
    
    // Emit event to update draft counter
    window.dispatchEvent(new CustomEvent('email-deleted', { 
      detail: { emailId: email.id } 
    }));
    
    // Run API call in background without blocking UI
    try {
      await deleteDraft(email.id);
      console.log(`✅ Successfully discarded draft ${email.id}`);
    } catch (error) {
      console.error('Error discarding draft:', error);
      // Show error and potentially restore the email in UI
      toast.error('Failed to discard draft. Please try again.');
    }
  };

  const handleDeleteEmail = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    
    // Optimistic UI update - remove from UI immediately
    onEmailDelete?.(email.id);
    
    // Show success toast immediately
    toast.success('Email deleted successfully!');
    
    // Run API call in background without blocking UI
    try {
      await deleteEmail(email.id);
      console.log(`✅ Successfully deleted email ${email.id}`);
    } catch (error) {
      console.error('Error deleting email:', error);
      // Show error and potentially restore the email in UI
      toast.error('Failed to delete email. Please try again.');
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the exact mouse position relative to the viewport
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Estimated menu dimensions
    const menuWidth = 200; // min-w-48 = 192px + padding
    const menuHeight = 120; // Approximate height for 2 items
    
    // Calculate position - start exactly where mouse clicked
    let x = mouseX;
    let y = mouseY;
    
    // Adjust if menu would go off-screen to the right
    if (x + menuWidth > viewportWidth) {
      x = mouseX - menuWidth; // Show to the left of cursor
    }
    
    // Adjust if menu would go off-screen at the bottom
    if (y + menuHeight > viewportHeight) {
      y = mouseY - menuHeight; // Show above cursor
    }
    
    // Ensure menu doesn't go off the left or top edges
    x = Math.max(4, x);
    y = Math.max(4, y);
    
    console.log('Context menu position:', { mouseX, mouseY, x, y });
    
    setContextMenu({
      x,
      y,
      show: true
    });
  };

  // Handle clicking outside context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // While the Create Label modal is open, don't auto-close anything via outside clicks.
      // This prevents the Select's portal clicks from collapsing the menus.
      if (showCreateLabelModal) {
        return;
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ x: 0, y: 0, show: false });
        setShowLabelSubmenu(false);
        setShowFilterSubmenu(false);
        setLabelSearchQuery(''); // Clear search when closing
      }
      
      // Handle clicking outside filter modal
      if (filterModalRef.current && !filterModalRef.current.contains(event.target as Node) && showCreateFilterModal) {
        handleCloseCreateFilterModal();
      }

      // Handle clicking outside create label modal
      if (createLabelModalRef.current && !createLabelModalRef.current.contains(event.target as Node) && showCreateLabelModal) {
        setShowCreateLabelModal(false);
      }
    };

    const handleScroll = (event: Event) => {
      if (showCreateLabelModal) return; // don't close while creating a label
      // Allow scrolling inside the context menu/submenus without closing
      const target = event.target as Node | null;
      if (contextMenuRef.current && target && contextMenuRef.current.contains(target)) {
        return; // Ignore internal scrolls
      }
      // Close on page/outer container scrolls
      if (contextMenu.show) {
        setContextMenu({ x: 0, y: 0, show: false });
        setShowLabelSubmenu(false);
        setShowFilterSubmenu(false);
        setLabelSearchQuery(''); // Clear search when closing
      }
    };

    const handleResize = () => {
      if (showCreateLabelModal) return; // don't close while creating a label
      // Close context menu on window resize
      if (contextMenu.show) {
        setContextMenu({ x: 0, y: 0, show: false });
        setShowLabelSubmenu(false);
        setShowFilterSubmenu(false);
        setLabelSearchQuery(''); // Clear search when closing
      }
    };

    if (contextMenu.show || showCreateFilterModal || showCreateLabelModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events
      window.addEventListener('resize', handleResize);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [contextMenu.show, showCreateFilterModal, showCreateLabelModal]);

  const openCreateLabelModal = () => {
    setNewLabelName(labelSearchQuery.trim());
    setNestUnder(false);
    setParentLabel('');
    setShowCreateLabelModal(true);
  };

  const handleCreateLabelSubmit = async () => {
    const base = newLabelName.trim();
    if (!base) return;
    const fullName = nestUnder && parentLabel ? `${parentLabel}/${base}` : base;
    try {
      await addLabel(fullName);
      // Close modal and keep submenu open, set search to created label
      setShowCreateLabelModal(false);
      setLabelSearchQuery(fullName);
      setShowLabelSubmenu(true);
      // focus search input to show the result
      setTimeout(() => labelSearchRef.current?.focus(), 0);
      toast.success(`Label "${fullName}" created`);

      // (Auto-filter feature temporarily disabled and code removed to reduce complexity.)
    } catch (err) {
      toast.error('Failed to create label');
    }
  };

  // Handle applying label to email
  const handleApplyLabel = async (labelId: string) => {
    setIsApplyingLabel(labelId);
    try {
      await applyLabelsToEmail(email.id, [labelId]);
      setContextMenu({ x: 0, y: 0, show: false });
      setShowLabelSubmenu(false);
      setLabelSearchQuery(''); // Clear search when applying label
      // Could add a toast notification here
    } catch (error) {
      console.error('Error applying label:', error);
      alert('Failed to apply label. Please try again.');
    } finally {
      setIsApplyingLabel(null);
    }
  };

  // Handle manage filters navigation
  const handleManageFilters = () => {
    setContextMenu({ x: 0, y: 0, show: false });
    setShowFilterSubmenu(false);
    navigate('/settings?tab=filters');
  };

  // Handle create new filter modal
  const handleCreateNewFilter = () => {
    setContextMenu({ x: 0, y: 0, show: false });
    setShowFilterSubmenu(false);
    setShowCreateFilterModal(true);
  };

  // Handle filter submenu show/hide
  const handleShowFilterSubmenu = () => {
    setShowFilterSubmenu(true);
  };

  const handleHideFilterSubmenu = () => {
    setShowFilterSubmenu(false);
  };

  // Handle create filter modal
  const handleCloseCreateFilterModal = () => {
    setShowCreateFilterModal(false);
    // Reset label picker state
    setFilterLabelQuery('');
    setSelectedFilterLabel('');
  };

  const handleCreateFilterWithLabel = async () => {
    const sender = cleanEmailAddress(email.from?.email || '');
    if (!sender) {
      toast.error('Missing sender email');
      return;
    }
    if (!selectedFilterLabel) {
      toast.error('Please select a folder');
      return;
    }

    try {
      toast.message('Creating rule…');
      // 1) Find the label id by display name
      const labelsList = await fetchGmailLabels();
      const match = labelsList
        .map(l => ({ id: (l as any).id, name: (l as any).name }))
        .find(l => (l.name?.startsWith('INBOX/') ? l.name.substring(6) : l.name) === selectedFilterLabel);

      if (!match?.id) {
        toast.error('Selected folder not found in Gmail');
        return;
      }

      // 2) Create the Gmail filter
      await createGmailFilter(
        { from: sender },
        { addLabelIds: [match.id] }
      );

      toast.success('Rule created. Future emails will be moved.');
      // Let parent know (optional hook)
      onCreateFilter?.(email);
    } catch (err) {
      console.error('Failed to create Gmail filter:', err);
      toast.error('Could not create rule. Please check Gmail auth and try again.');
    } finally {
      handleCloseCreateFilterModal();
    }
  };

  const handleSelectFilterLabel = (_labelId: string, labelName: string) => {
    setSelectedFilterLabel(labelName);
    setFilterLabelQuery(labelName);
  };

  // const handleCreateNewLabel = () => {
  //   if (filterLabelQuery.trim()) {
  //     // Here you would implement label creation logic
  //     console.log('Creating new label:', filterLabelQuery);
  //     setSelectedFilterLabel(filterLabelQuery);
  //   }
  // };

  // Handle more options - use context to store email data and navigate
  // const handleMoreOptions = () => {
  //   // Close the modal first
  //   handleCloseCreateFilterModal();
  //   
  //   // Store the email data in context for the settings page to use
  //   startFilterCreation(email);
  //   
  //   // Navigate to settings filters tab
  //   navigate('/settings?tab=filters');
  // };

  // Handle label submenu show/hide
  const handleShowLabelSubmenu = () => {
    // Cancel any pending hide and open immediately
    if (hideLabelTimerRef.current) {
      clearTimeout(hideLabelTimerRef.current);
      hideLabelTimerRef.current = null;
    }
    setShowLabelSubmenu(true);
    // Focus search input after submenu is shown
    requestAnimationFrame(() => {
      labelSearchRef.current?.focus();
    });
  };

  const handleHideLabelSubmenu = () => {
    // Add a small grace period for hover intent to avoid zero-zone issues
    if (hideLabelTimerRef.current) return;
    hideLabelTimerRef.current = window.setTimeout(() => {
      setShowLabelSubmenu(false);
      setLabelSearchQuery(''); // Clear search when hiding submenu
      hideLabelTimerRef.current = null;
    }, 200);
  };

  const cancelHideLabelSubmenu = () => {
    if (hideLabelTimerRef.current) {
      clearTimeout(hideLabelTimerRef.current);
      hideLabelTimerRef.current = null;
    }
    setShowLabelSubmenu(true);
  };

  useEffect(() => {
    return () => {
      if (hideLabelTimerRef.current) {
        clearTimeout(hideLabelTimerRef.current);
        hideLabelTimerRef.current = null;
      }
    };
  }, []);

  // Shared portal content (context menu + modals) so it renders for both table and non-table modes
  const Portals = (
    <>
      {/* Context Menu - Rendered in Portal */}
      {contextMenu.show && createPortal(
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl py-2 min-w-48"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            transform: 'translate(0, 0)', // Ensure no transform interferes
          }}
        >
          {/* Add to Folder */}
          <div className="relative">
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
              onMouseEnter={handleShowLabelSubmenu}
              onMouseLeave={handleHideLabelSubmenu}
            >
              <div className="flex items-center">
                <Tag size={16} className="mr-3 text-gray-500" />
                Add to Folder
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
            {/* Enhanced Label Submenu with Search */}
            {showLabelSubmenu && (
              <div
                className="absolute left-full -top-2 ml-0 bg-white border border-gray-200 rounded-lg shadow-lg w-80 h-80 flex flex-col overflow-hidden"
                onMouseEnter={cancelHideLabelSubmenu}
                onMouseLeave={handleHideLabelSubmenu}
              >
                {/* Hover bridge to eliminate dead zone between menu and submenu */}
                <div
                  className="absolute top-0 right-full w-2 h-full"
                  onMouseEnter={cancelHideLabelSubmenu}
                />
                {/* Search Bar */}
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      ref={labelSearchRef}
                      type="text"
                      placeholder="Search labels..."
                      value={labelSearchQuery}
                      onChange={(e) => setLabelSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onClick={(e) => e.stopPropagation()} // Prevent closing on input click
                    />
                  </div>
                </div>
                {/* Scrollable Labels List */}
                <div className="flex-1 overflow-y-auto overscroll-contain pr-1" onWheelCapture={(e) => e.stopPropagation()}>
                  {filteredLabels.length > 0 ? (
                    filteredLabels.map(label => (
                      <button
                        key={label.id}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                        onClick={() => handleApplyLabel(label.id)}
                        disabled={isApplyingLabel === label.id}
                      >
                        <div className="w-2 h-2 rounded-full mr-2 bg-blue-500 flex-shrink-0"></div>
                        <span className="truncate">
                          {isApplyingLabel === label.id ? 'Applying...' : (label as any).displayName}
                        </span>
                      </button>
                    ))
                  ) : labelSearchQuery ? (
                    <div className="px-3 py-2 text-xs text-gray-500">
                      No labels found for "{labelSearchQuery}"
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-500">No labels available</div>
                  )}
                  {/* Create new label CTA as the last option (sticky footer) */}
                  {labelSearchQuery.trim() && !hasExactLabelMatch && (
                    <div className="sticky bottom-0 bg-white border-t border-gray-100 p-2 mt-2">
                      <button
                        className="w-full text-left text-xs text-blue-600 hover:text-blue-700 font-medium px-1 py-1 rounded hover:bg-blue-50"
                        onClick={(e) => { e.stopPropagation(); openCreateLabelModal(); }}
                      >
                        Create label "{labelSearchQuery.trim()}"
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filter Menu */}
          <div className="relative">
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
              onMouseEnter={handleShowFilterSubmenu}
              onMouseLeave={handleHideFilterSubmenu}
            >
              <div className="flex items-center">
                <Filter size={16} className="mr-3 text-gray-500" />
                Rules
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
            {/* Filter Submenu */}
            {showFilterSubmenu && (
              <div
                className="absolute left-full -top-2 ml-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-56 max-h-80 overflow-hidden"
                onMouseEnter={() => setShowFilterSubmenu(true)}
                onMouseLeave={handleHideFilterSubmenu}
              >
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={handleManageFilters}
                >
                  <Settings size={16} className="mr-3 text-gray-500" />
                  Manage Rules
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={handleCreateNewFilter}
                >
                  <Plus size={16} className="mr-3 text-gray-500" />
                  Create Rules
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Create Filter Modal */}
      {showCreateFilterModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div
            ref={filterModalRef}
            className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw] max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Create a rule</h2>
                <button
                  onClick={handleCloseCreateFilterModal}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>
            {/* Modal Body */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-4">
                  Always move messages from <span className="font-semibold">{cleanEncodingIssues(email.from.name) || cleanEmailAddress(email.from.email)}</span> to this folder:
                </p>
                {/* Label Selection UI */}
                <div className="border border-gray-200 rounded-lg">
                  {/* Search Bar */}
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search for a folder"
                        value={filterLabelQuery}
                        onChange={(e) => setFilterLabelQuery(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      {filterLabelQuery && (
                        <button
                          onClick={() => setFilterLabelQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                          aria-label="Clear search"
                        >
                          <X size={12} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Labels List */}
                  <div className="max-h-56 overflow-y-auto">
                    {filteredFilterLabels.length > 0 ? (
                      filteredFilterLabels.map((label: any) => (
                        <button
                          key={label.id}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${selectedFilterLabel === label.displayName ? 'bg-blue-50' : ''}`}
                          onClick={() => handleSelectFilterLabel(label.id, label.displayName)}
                        >
                          <span className="truncate text-gray-800">{label.displayName}</span>
                          {selectedFilterLabel === label.displayName && (
                            <span className="text-xs text-blue-600">Selected</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm text-gray-500">No labels found</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCloseCreateFilterModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFilterWithLabel}
                disabled={!selectedFilterLabel}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Label Modal */}
      {showCreateLabelModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div
            ref={createLabelModalRef}
            className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw] max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">New label</h2>
                <button
                  onClick={() => setShowCreateLabelModal(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>
            {/* Modal Body */}
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Label name</label>
                  <Input
                    placeholder="Enter label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="w-full"
                    autoFocus
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="nest-under-create"
                    checked={nestUnder}
                    onCheckedChange={(checked) => setNestUnder(!!checked)}
                  />
                  <label htmlFor="nest-under-create" className="text-sm text-gray-600">
                    Nest label under
                  </label>
                </div>

                {nestUnder && (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Parent label</label>
                    <Select value={parentLabel} onValueChange={setParentLabel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose parent label..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {filteredLabels.map((label: any) => (
                          <SelectItem key={label.id} value={label.displayName}>
                            {label.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="auto-filter-future"
                    checked={autoFilterFuture}
                    onCheckedChange={(checked) => setAutoFilterFuture(!!checked)}
                  />
                  <label htmlFor="auto-filter-future" className="text-sm text-gray-600">
                    Also auto-label future emails from {cleanEmailAddress(email.from?.email) || 'this sender'}
                  </label>
                </div>
              </div>
            </div>
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateLabelModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLabelSubmit}
                disabled={!newLabelName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );

  const RowInner = (
    <div
      ref={setNodeRef}
      style={{ ...style, maxHeight: '32px', height: '32px', lineHeight: '32px' }}
      {...attributes}
      {...listeners}
      onClick={handleEmailClick}
      onContextMenu={handleContextMenu}
      className={`group flex items-center px-4 pr-4 overflow-hidden border-b border-gray-100 cursor-pointer select-none transition-colors ${
        isActiveEmail
          ? 'bg-blue-200 hover:bg-blue-200'      // Active/viewing
          : isSelected 
            ? 'bg-blue-200 hover:bg-blue-200'    // Selected
            : !email.isRead 
              ? 'bg-blue-100 hover:bg-blue-150 font-extrabold' // Unread - darker blue + extra bold
              : 'bg-white hover:bg-gray-50'       // Read
      } ${isDragging ? 'opacity-50 z-10' : ''}`}
      data-dragging={isDragging}
    >
      {/* Selection Checkbox */}
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(email.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      )}

      {/* Star */}
      <button
        onClick={handleToggleStar}
        disabled={isTogglingStar}
        className={`mr-3 p-1 rounded transition-colors ${isTogglingStar ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
        title={email.isStarred ? 'Remove star' : 'Add star'}
      >
        {email.isStarred ? (
          <Star size={16} className="text-yellow-500 fill-yellow-500" />
        ) : (
          <Star size={16} className="text-gray-400 group-hover:text-yellow-400" />
        )}
      </button>

      {/* Important */}
      <button
        onClick={handleToggleImportance}
        disabled={isTogglingImportance}
        className={`mr-3 p-1 rounded transition-colors ${isTogglingImportance ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
        title={email.isImportant ? 'Mark not important' : 'Mark important'}
      >
        {email.isImportant ? (
          <Flag size={16} className="text-orange-500 fill-orange-500" />
        ) : (
          <Flag size={16} className="text-gray-400 group-hover:text-orange-400" />
        )}
      </button>

      {/* Content grid */}
      <div className="email-row grid grid-cols-[minmax(0,1fr)_9rem] flex-1 min-w-0 items-center gap-3">
        <div className="min-w-0 overflow-hidden flex items-center gap-2 text-sm">
          <span
            className={`sender w-44 shrink-0 truncate whitespace-nowrap leading-5 ${!email.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}
            title={senderText}
          >
            {senderText}
          </span>
          <span
            className={`subject ${!email.isRead ? 'text-gray-900' : 'text-gray-700'} shrink-0 max-w-[45%] truncate whitespace-nowrap leading-5`}
            title={email.subject || 'No Subject'}
          >
            {cleanEmailSubject(email.subject || 'No Subject')}
          </span>
          <span
            className="snippet min-w-0 flex-1 truncate whitespace-nowrap text-gray-500 leading-5"
            title={email.body}
          >
            {email.body}
          </span>
          {(email.attachments?.length ?? 0) > 0 && (
            <Paperclip size={14} className="text-gray-400 shrink-0" />
          )}
        </div>
        <div className="w-40 flex items-center justify-end gap-1">
          <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums group-hover:hidden">
            {formattedDate}
          </span>
          <div className="hidden group-hover:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleReadStatus}
              disabled={isToggling}
              title={email.isRead ? 'Mark as unread' : 'Mark as read'}
            >
              {email.isRead ? <MailOpen size={14} className="text-gray-500" /> : <Mail size={14} className="text-blue-600" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteEmail}
              title="Delete email"
            >
              <Trash2 size={14} className="text-gray-500" />
            </Button>
            {isDraft && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                title="Discard draft"
                className="hover:bg-red-50"
              >
                <Trash2 size={14} className="text-red-500" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (renderAsTableRow) {
    return (
      <>
      <TableRow
        ref={setNodeRef as unknown as React.Ref<HTMLTableRowElement>}
        {...attributes}
        {...listeners}
        onClick={handleEmailClick}
        onContextMenu={handleContextMenu}
        className={`group cursor-pointer select-none transition-colors ${
          isActiveEmail
            ? 'bg-blue-200 hover:bg-blue-200'      // Active/viewing
            : isSelected 
              ? 'bg-blue-200 hover:bg-blue-200'    // Selected
              : !email.isRead 
                ? 'bg-blue-100 hover:bg-blue-150 font-bold' // Unread - darker blue + extra bold
                : 'hover:bg-gray-50'                // Read
        } ${isDragging ? 'opacity-50 z-10' : ''}`}
        data-dragging={isDragging}
        style={{ height: '32px' }}
      >
        {/* LEFT cell: controls + sender + subject + snippet */}
        <TableCell className="p-0">
          <div className="flex items-center px-4 pr-4 overflow-hidden" style={{ height: '32px', lineHeight: '32px' }} onContextMenu={handleContextMenu}>
            {/* Selection Checkbox */}
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect(email.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            )}

            {/* Star */}
            <button
              onClick={handleToggleStar}
              disabled={isTogglingStar}
              className={`mr-3 p-1 rounded transition-colors ${isTogglingStar ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
              title={email.isStarred ? 'Remove star' : 'Add star'}
            >
              {email.isStarred ? (
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
              ) : (
                <Star size={16} className="text-gray-400 group-hover:text-yellow-400" />
              )}
            </button>

            {/* Important */}
            <button
              onClick={handleToggleImportance}
              disabled={isTogglingImportance}
              className={`mr-3 p-1 rounded transition-colors ${isTogglingImportance ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
              title={email.isImportant ? 'Mark not important' : 'Mark important'}
            >
              {email.isImportant ? (
                <Flag size={16} className="text-orange-500 fill-orange-500" />
              ) : (
                <Flag size={16} className="text-gray-400 group-hover:text-orange-400" />
              )}
            </button>

            {/* Left content with a local grid for text alignment; ensure truncation */}
            <div className="email-row grid grid-cols-[auto_minmax(0,1fr)] min-w-0 flex-1 items-center gap-2 text-sm">
              {/* Sender */}
              <span
                className={`sender block w-44 shrink-0 truncate whitespace-nowrap leading-5 ${!email.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}
                title={senderText}
              >
                {senderText}
              </span>

              {/* Subject + Snippet row */}
              <div className="min-w-0 flex items-center gap-2">
                <span
                  className={`subject block ${!email.isRead ? 'text-gray-900' : 'text-gray-700'} shrink-0 max-w-[100%] truncate whitespace-nowrap leading-5`}
                  title={email.subject || 'No Subject'}
                >
                  {cleanEmailSubject(email.subject || 'No Subject')}
                </span>
                <span
                  className="snippet block min-w-0 flex-1 truncate whitespace-nowrap text-gray-500 leading-5"
                  title={email.body}
                >
                  {email.body}
                </span>
                {(email.attachments?.length ?? 0) > 0 && (
                  <Paperclip size={14} className="text-gray-400 shrink-0" />
                )}
              </div>
            </div>
          </div>
        </TableCell>

        {/* RIGHT cell: fixed width wall */}
  <TableCell className="p-0 w-28 sm:w-32 align-middle">
    <div className="flex items-center justify-end gap-1 pr-2" style={{ height: '32px' }} onContextMenu={handleContextMenu}>
            <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums group-hover:hidden">
              {formattedDate}
            </span>
            <div className="hidden group-hover:flex items-center gap-1">
              <button
                onClick={handleToggleReadStatus}
                disabled={isToggling}
                className={`p-1 rounded hover:bg-gray-200 transition-colors ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={email.isRead ? 'Mark as unread' : 'Mark as read'}
              >
                {email.isRead ? (
                  <MailOpen size={14} className="text-gray-500" />
                ) : (
                  <Mail size={14} className="text-blue-600" />
                )}
              </button>
              <button
                onClick={handleDeleteEmail}
                className="p-1 rounded hover:bg-red-100 transition-colors"
                title="Delete email"
              >
                <Trash2 size={14} className="text-gray-500" />
              </button>
              {isDraft && (
                <button
                  onClick={handleDelete}
                  className="p-1 rounded hover:bg-red-50 transition-colors"
                  title="Discard draft"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              )}
            </div>
          </div>
        </TableCell>
      </TableRow>
      {Portals}
      </>
    );
  }

  // Fallback div structure (e.g., drag overlay)
  return RowInner as unknown as JSX.Element;
}

export default EmailListItem;
