import { useState, useEffect, useRef } from 'react';
import { X, Reply, ReplyAll, Forward, Trash, MoreVertical, Star, Paperclip, Download, ChevronLeft, Mail, Flag, MailWarning, Filter, Tag, Search, ChevronRight, Settings, Plus } from 'lucide-react';
import { parseISO, format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  getEmailById, 
  markEmailAsTrash, 
  getThreadEmails, 
  sendReply, 
  sendReplyAll, 
  sendEmail, 
  markAsUnread, 
  markAsImportant,
  markAsUnimportant,
  markAsStarred,
  markAsUnstarred,
  applyLabelsToEmail
} from '../../services/emailService';
import { createGmailFilter } from '../../integrations/gapiService';
import { optimizedEmailService } from '../../services/optimizedEmailService';
import { Email } from '../../types';
import { useInboxLayout } from '../../contexts/InboxLayoutContext';
import { useLabel } from '../../contexts/LabelContext';
import { cleanEmailAddress } from '../../utils/emailFormatting';
import { toast as sonnerToast } from 'sonner';
import RichTextEditor from '../common/RichTextEditor';
import { useToast } from '../ui/use-toast';
import DOMPurify from 'dompurify';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface EmbeddedViewEmailProps {
  emailId: string;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
}

// Format time like Gmail: "10:32 AM (15 min ago)"
const formatEmailTime = (dateString: string): { time: string; relative: string } => {
  try {
    const date = parseISO(dateString);
    const time = format(date, 'h:mm a');
    const relative = formatDistanceToNow(date, { addSuffix: true });
    return { time, relative };
  } catch {
    return { time: '', relative: '' };
  }
};

// Extract initials for avatar
const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Generate consistent color for sender
const getSenderColor = (email: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

function EmbeddedViewEmailClean({ emailId, onEmailDelete }: EmbeddedViewEmailProps) {
  const [email, setEmail] = useState<Email | null>(null);
  const [threadMessages, setThreadMessages] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward'>('reply');
  const [replyContent, setReplyContent] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  
  // Three-dot menu state (same as context menu in EmailListItem)
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLabelSubmenu, setShowLabelSubmenu] = useState(false);
  const [showFilterSubmenu, setShowFilterSubmenu] = useState(false);
  const [showCreateFilterModal, setShowCreateFilterModal] = useState(false);
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  const [isApplyingLabel, setIsApplyingLabel] = useState<string | null>(null);
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [filterLabelQuery, setFilterLabelQuery] = useState('');
  const [selectedFilterLabel, setSelectedFilterLabel] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [nestUnder, setNestUnder] = useState(false);
  const [parentLabel, setParentLabel] = useState('');
  const [autoFilterFuture, setAutoFilterFuture] = useState(false);
  
  const hideLabelTimerRef = useRef<number | null>(null);
  const hideFilterTimerRef = useRef<number | null>(null);
  const labelButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const labelSubmenuRef = useRef<HTMLDivElement>(null);
  const filterSubmenuRef = useRef<HTMLDivElement>(null);
  const labelSearchRef = useRef<HTMLInputElement>(null);
  const filterModalRef = useRef<HTMLDivElement>(null);
  const createLabelModalRef = useRef<HTMLDivElement>(null);

  // Remove old add label modal state
  // const [showAddLabelModal, setShowAddLabelModal] = useState(false);
  // const [addLabelQuery, setAddLabelQuery] = useState('');
  // const addLabelModalRef = useRef<HTMLDivElement>(null);

  const { clearSelection } = useInboxLayout();
  const { labels, addLabel } = useLabel(); // Get labels from context
  const navigate = useNavigate();
  const { toast } = useToast();

  // Reset reply state when email changes
  useEffect(() => {
    if (emailId) {
      // Close any open reply composer and reset all reply-related state
      setShowReplyComposer(false);
      setReplyContent('');
      setForwardTo('');
      setReplyMode('reply');
      
      fetchEmailAndThread();
    }
  }, [emailId]);

  const fetchEmailAndThread = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the main email
      let fetchedEmail: Email | undefined;
      try {
        fetchedEmail = await optimizedEmailService.fetchEmailThread(emailId).then(thread => thread[0]);
      } catch {
        fetchedEmail = await getEmailById(emailId);
      }

      if (!fetchedEmail) {
        setError('Email not found');
        return;
      }

      setEmail(fetchedEmail);

      // Fetch thread if exists
      if (fetchedEmail.threadId) {
        try {
          const thread = await optimizedEmailService.fetchEmailThread(fetchedEmail.threadId);
          if (thread.length > 0) {
            // Sort by date ascending (oldest first)
            const sorted = thread.sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            setThreadMessages(sorted);
            // Auto-expand the latest message
            setExpandedMessages(new Set([sorted[sorted.length - 1].id]));
          } else {
            setThreadMessages([fetchedEmail]);
            setExpandedMessages(new Set([fetchedEmail.id]));
          }
        } catch {
          const thread = await getThreadEmails(fetchedEmail.threadId);
          const sorted = (thread || [fetchedEmail]).sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setThreadMessages(sorted);
          setExpandedMessages(new Set([sorted[sorted.length - 1].id]));
        }
      } else {
        setThreadMessages([fetchedEmail]);
        setExpandedMessages(new Set([fetchedEmail.id]));
      }
    } catch (err) {
      console.error('Error fetching email:', err);
      setError('Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!email || !replyContent.trim()) return;

    setSending(true);
    try {
      if (replyMode === 'reply') {
        await sendReply(email, replyContent);
        toast({ title: 'Reply sent successfully' });
      } else if (replyMode === 'replyAll') {
        await sendReplyAll(email, replyContent);
        toast({ title: 'Reply sent to all recipients' });
      } else if (replyMode === 'forward' && forwardTo.trim()) {
        const subject = email.subject.startsWith('Fwd: ') ? email.subject : `Fwd: ${email.subject}`;
        await sendEmail({
          from: email.from,
          to: [{ name: '', email: forwardTo }],
          subject,
          body: replyContent,
          threadId: email.threadId,
          internalDate: null
        });
        toast({ title: 'Email forwarded successfully' });
      }

      setShowReplyComposer(false);
      setReplyContent('');
      setForwardTo('');
      await fetchEmailAndThread();
    } catch (err) {
      console.error('Error sending reply:', err);
      toast({ 
        title: 'Failed to send', 
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleTrash = async () => {
    if (!email) return;
    
    try {
      await markEmailAsTrash(email.id);
      toast({ title: 'Moved to trash' });
      onEmailDelete?.(email.id);
      clearSelection();
      navigate('/inbox');
    } catch (err) {
      toast({ 
        title: 'Failed to move to trash',
        variant: 'destructive'
      });
    }
  };

  const handleMarkAsSpam = async () => {
    if (!email) return;
    
    try {
      await applyLabelsToEmail(email.id, ['SPAM'], ['INBOX']);
      toast({ title: 'Marked as spam' });
      onEmailDelete?.(email.id);
      clearSelection();
      navigate('/inbox');
    } catch (err) {
      toast({ 
        title: 'Failed to mark as spam',
        variant: 'destructive'
      });
    }
  };

  const handleMarkAsUnread = async () => {
    if (!email) return;
    
    try {
      await markAsUnread(email.id);
      toast({ title: 'Marked as unread' });
      // Optionally refresh the email
      await fetchEmailAndThread();
    } catch (err) {
      toast({ 
        title: 'Failed to mark as unread',
        variant: 'destructive'
      });
    }
  };

  const handleToggleImportant = async () => {
    if (!email) return;
    
    const isImportant = email.labelIds?.includes('IMPORTANT');
    
    try {
      if (isImportant) {
        await markAsUnimportant(email.id);
        toast({ title: 'Removed from important' });
      } else {
        await markAsImportant(email.id);
        toast({ title: 'Marked as important' });
      }
      await fetchEmailAndThread();
    } catch (err) {
      toast({ 
        title: 'Failed to update important status',
        variant: 'destructive'
      });
    }
  };

  const handleToggleStarred = async () => {
    if (!email) return;
    
    const isStarred = email.labelIds?.includes('STARRED');
    
    try {
      if (isStarred) {
        await markAsUnstarred(email.id);
        toast({ title: 'Removed star' });
      } else {
        await markAsStarred(email.id);
        toast({ title: 'Added star' });
      }
      await fetchEmailAndThread();
    } catch (err) {
      toast({ 
        title: 'Failed to update starred status',
        variant: 'destructive'
      });
    }
  };


  const handleCloseCreateFilterModal = () => {
    setShowCreateFilterModal(false);
    setFilterLabelQuery('');
    setSelectedFilterLabel('');
  };

  const handleSelectFilterLabel = (_labelId: string, labelName: string) => {
    setSelectedFilterLabel(labelName);
    setFilterLabelQuery(labelName);
  };

  const handleCreateFilterWithLabel = async () => {
    const sender = cleanEmailAddress(email?.from?.email || '');
    if (!sender) {
      sonnerToast.error('No sender email available');
      return;
    }
    if (!selectedFilterLabel) {
      sonnerToast.error('Please select a folder');
      return;
    }

    try {
      sonnerToast.message('Creating rule…');
      // 1) Find the label id by display name
      const labelsList = await fetchGmailLabels();
      const match = labelsList
        .map(l => ({ id: (l as any).id, name: (l as any).name }))
        .find(l => (l.name?.startsWith('INBOX/') ? l.name.substring(6) : l.name) === selectedFilterLabel);

      if (!match?.id) {
        sonnerToast.error('Selected folder not found in Gmail');
        return;
      }

      // 2) Create the Gmail filter
      await createGmailFilter(
        { from: sender },
        { addLabelIds: [match.id] }
      );

      sonnerToast.success(`Filter created! Emails from "${sender}" will be moved to "${selectedFilterLabel}"`);
      await fetchEmailAndThread();
    } catch (err) {
      console.error('Filter creation error:', err);
      sonnerToast.error('Could not create rule. Please check Gmail auth and try again.');
    } finally {
      handleCloseCreateFilterModal();
    }
  };

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
      sonnerToast.success(`Label "${fullName}" created`);
    } catch (err) {
      sonnerToast.error('Failed to create label');
    }
  };

  const handleApplyLabel = async (labelId: string) => {
    if (!email) return;
    setIsApplyingLabel(labelId);
    try {
      await applyLabelsToEmail(email.id, [labelId]);
      setShowMoreMenu(false);
      setShowLabelSubmenu(false);
      setLabelSearchQuery('');
      toast({ title: 'Label applied successfully' });
      await fetchEmailAndThread();
    } catch (error) {
      console.error('Error applying label:', error);
      toast({
        title: 'Failed to apply label',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsApplyingLabel(null);
    }
  };

  const handleManageFilters = () => {
    setShowMoreMenu(false);
    setShowFilterSubmenu(false);
    navigate('/settings?tab=filters');
  };

  const handleCreateNewFilter = () => {
    setShowMoreMenu(false);
    setShowFilterSubmenu(false);
    setShowCreateFilterModal(true);
  };

  const handleShowFilterSubmenu = () => {
    if (hideFilterTimerRef.current) {
      clearTimeout(hideFilterTimerRef.current);
      hideFilterTimerRef.current = null;
    }
    setShowFilterSubmenu(true);
    setShowMoreMenu(true); // Keep dropdown open
  };

  const handleHideFilterSubmenu = () => {
    if (hideFilterTimerRef.current) return;
    hideFilterTimerRef.current = window.setTimeout(() => {
      setShowFilterSubmenu(false);
      hideFilterTimerRef.current = null;
    }, 300); // 300ms delay
  };

  const cancelHideFilterSubmenu = () => {
    if (hideFilterTimerRef.current) {
      clearTimeout(hideFilterTimerRef.current);
      hideFilterTimerRef.current = null;
    }
    setShowFilterSubmenu(true);
    setShowMoreMenu(true);
  };

  const handleShowLabelSubmenu = () => {
    if (hideLabelTimerRef.current) {
      clearTimeout(hideLabelTimerRef.current);
      hideLabelTimerRef.current = null;
    }
    setShowLabelSubmenu(true);
    setShowMoreMenu(true); // Keep dropdown open
    requestAnimationFrame(() => {
      labelSearchRef.current?.focus();
    });
  };

  const handleHideLabelSubmenu = () => {
    if (hideLabelTimerRef.current) return;
    hideLabelTimerRef.current = window.setTimeout(() => {
      setShowLabelSubmenu(false);
      setLabelSearchQuery('');
      hideLabelTimerRef.current = null;
    }, 300); // Increased to 300ms for more time
  };

  const cancelHideLabelSubmenu = () => {
    if (hideLabelTimerRef.current) {
      clearTimeout(hideLabelTimerRef.current);
      hideLabelTimerRef.current = null;
    }
    setShowLabelSubmenu(true);
    setShowMoreMenu(true); // Keep dropdown open
  };

  useEffect(() => {
    return () => {
      if (hideLabelTimerRef.current) {
        clearTimeout(hideLabelTimerRef.current);
      }
      if (hideFilterTimerRef.current) {
        clearTimeout(hideFilterTimerRef.current);
      }
    };
  }, []);

  // Handle clicking outside more menu
  useEffect(() => {
    if (!showMoreMenu && !showCreateFilterModal && !showCreateLabelModal) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is inside any of the menus or submenus
      const isInsideDropdown = dropdownContentRef.current?.contains(target);
      const isInsideLabelSubmenu = labelSubmenuRef.current?.contains(target);
      const isInsideFilterSubmenu = filterSubmenuRef.current?.contains(target);
      const isInsideLabelButton = labelButtonRef.current?.contains(target);
      const isInsideFilterButton = filterButtonRef.current?.contains(target);
      
      // Only close if click is outside all menus
      if (!isInsideDropdown && !isInsideLabelSubmenu && !isInsideFilterSubmenu && 
          !isInsideLabelButton && !isInsideFilterButton) {
        setShowMoreMenu(false);
        setShowLabelSubmenu(false);
        setShowFilterSubmenu(false);
      }
      
      if (filterModalRef.current && !filterModalRef.current.contains(target)) {
        handleCloseCreateFilterModal();
      }
      if (createLabelModalRef.current && !createLabelModalRef.current.contains(target)) {
        setShowCreateLabelModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu, showCreateFilterModal, showCreateLabelModal]);

  // Import missing function
  const fetchGmailLabels = async () => {
    const { fetchGmailLabels: fetchLabels } = await import('../../integrations/gapiService');
    return fetchLabels();
  };

  // Filter labels based on search query - matching EmailListItem logic
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

  // Filter labels for label submenu (same as EmailListItem's filteredLabels)
  const filteredLabels = labels
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
    .filter(label => label.displayName.toLowerCase().includes(labelSearchQuery.toLowerCase()))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  // Check if there's an exact match for the label search query
  const hasExactLabelMatch = (() => {
    const q = labelSearchQuery.trim().toLowerCase();
    if (!q) return false;
    return filteredLabels.some(l => (l as any).displayName.toLowerCase() === q);
  })();

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const renderMessageBody = (message: Email) => {
    const htmlBody = message.body || '';
    
    if (!htmlBody) {
      return <div className="text-gray-500 text-sm italic">No content</div>;
    }

    // Sanitize HTML
    const clean = DOMPurify.sanitize(htmlBody, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'img'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target'],
    });

    return (
      <div 
        className="email-body text-sm text-gray-800 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: clean }}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="mb-4">{error || 'Email not found'}</p>
        <button
          onClick={() => {
            clearSelection();
            navigate('/inbox');
          }}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
        >
          Close
        </button>
      </div>
    );
  }

  const latestMessage = threadMessages[threadMessages.length - 1] || email;
  const { time, relative } = formatEmailTime(latestMessage.date);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Toolbar - Gmail style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              clearSelection();
              navigate('/inbox');
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Back to inbox"
          >
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          <button
            onClick={handleTrash}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Delete"
          >
            <Trash size={18} className="text-gray-700" />
          </button>
          <button
            onClick={handleMarkAsUnread}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Mark as unread"
          >
            <Mail size={18} className="text-gray-700" />
          </button>
          <button
            onClick={handleMarkAsSpam}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Mark as spam"
          >
            <MailWarning size={18} className="text-gray-700" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          <button
            onClick={handleToggleStarred}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title={email?.labelIds?.includes('STARRED') ? 'Remove star' : 'Add star'}
          >
            <Star 
              size={18} 
              className={email?.labelIds?.includes('STARRED') ? 'text-yellow-500 fill-yellow-500' : 'text-gray-700'}
            />
          </button>
          <button
            onClick={handleToggleImportant}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title={email?.labelIds?.includes('IMPORTANT') ? 'Remove from important' : 'Mark as important'}
          >
            <Flag 
              size={18} 
              className={email?.labelIds?.includes('IMPORTANT') ? 'text-yellow-500 fill-yellow-500' : 'text-gray-700'}
            />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* More Options Dropdown - Now matching EmailListItem structure */}
          <DropdownMenu 
            open={showMoreMenu || showLabelSubmenu || showFilterSubmenu} 
            onOpenChange={(open) => {
              // Don't close if submenus are open
              if (!open && !showLabelSubmenu && !showFilterSubmenu) {
                setShowMoreMenu(false);
              } else if (open) {
                setShowMoreMenu(true);
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="More options"
              >
                <MoreVertical size={18} className="text-gray-700" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              ref={dropdownContentRef}
              align="start" 
              className="w-56 p-0"
              onPointerDownOutside={(e) => {
                // Prevent closing when clicking on submenus
                if (showLabelSubmenu || showFilterSubmenu) {
                  e.preventDefault();
                }
              }}
              onInteractOutside={(e) => {
                // Prevent closing when interacting with submenus
                if (showLabelSubmenu || showFilterSubmenu) {
                  e.preventDefault();
                }
              }}
              onEscapeKeyDown={(e) => {
                // Prevent closing on Escape if submenus are open
                if (showLabelSubmenu || showFilterSubmenu) {
                  e.preventDefault();
                }
              }}
              onFocusOutside={(e) => {
                // Prevent closing when focus moves to submenus
                if (showLabelSubmenu || showFilterSubmenu) {
                  e.preventDefault();
                }
              }}
            >
              {/* Add to Label with Submenu */}
              <div 
                className="relative"
                onMouseEnter={handleShowLabelSubmenu}
                onMouseLeave={handleHideLabelSubmenu}
              >
                <button
                  ref={labelButtonRef}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Tag size={16} className="mr-3 text-gray-500" />
                    Add to Label
                  </div>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                {/* Label Submenu */}
                {showLabelSubmenu && dropdownContentRef.current && createPortal(
                  <div
                    ref={labelSubmenuRef}
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-lg w-80 h-80 flex flex-col overflow-hidden z-[10001]"
                    style={{
                      right: `${window.innerWidth - dropdownContentRef.current.getBoundingClientRect().left + 4}px`,
                      top: `${dropdownContentRef.current.getBoundingClientRect().top}px`,
                      pointerEvents: 'auto',
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      cancelHideLabelSubmenu();
                      console.log('Mouse entered submenu');
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      handleHideLabelSubmenu();
                      console.log('Mouse left submenu');
                    }}
                    onMouseMove={(e) => {
                      e.stopPropagation();
                      cancelHideLabelSubmenu();
                    }}
                  >
                    {/* Hover bridge to eliminate dead zone between menu and submenu */}
                    <div
                      className="absolute top-0 left-full w-20 h-full"
                      style={{ pointerEvents: 'auto' }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        cancelHideLabelSubmenu();
                        console.log('Mouse entered bridge');
                      }}
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
                          onClick={(e) => e.stopPropagation()}
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
                      {/* Create new label CTA */}
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
                  </div>,
                  document.body
                )}
              </div>

              <DropdownMenuSeparator />

              {/* Filter Menu with Submenu */}
              <div 
                className="relative"
                onMouseEnter={handleShowFilterSubmenu}
                onMouseLeave={handleHideFilterSubmenu}
              >
                <button
                  ref={filterButtonRef}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Filter size={16} className="mr-3 text-gray-500" />
                    Filter
                  </div>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                {/* Filter Submenu */}
                {showFilterSubmenu && dropdownContentRef.current && createPortal(
                  <div
                    ref={filterSubmenuRef}
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-lg min-w-56 max-h-80 overflow-hidden z-[10001]"
                    style={{
                      right: `${window.innerWidth - dropdownContentRef.current.getBoundingClientRect().left + 4}px`,
                      top: `${dropdownContentRef.current.getBoundingClientRect().top + (labelButtonRef.current ? labelButtonRef.current.offsetHeight : 0) + 1}px`,
                      pointerEvents: 'auto',
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      cancelHideFilterSubmenu();
                      console.log('Mouse entered filter submenu');
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      handleHideFilterSubmenu();
                      console.log('Mouse left filter submenu');
                    }}
                    onMouseMove={(e) => {
                      e.stopPropagation();
                      cancelHideFilterSubmenu();
                    }}
                  >
                    {/* Hover bridge to eliminate dead zone between menu and submenu */}
                    <div
                      className="absolute top-0 left-full w-20 h-full"
                      style={{ pointerEvents: 'auto' }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        cancelHideFilterSubmenu();
                        console.log('Mouse entered filter bridge');
                      }}
                    />
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={handleManageFilters}
                    >
                      <Settings size={16} className="mr-3 text-gray-500" />
                      Manage Filters
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={handleCreateNewFilter}
                    >
                      <Plus size={16} className="mr-3 text-gray-500" />
                      Create Filter
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email Header - Gmail style */}
      <div className="px-8 py-6 border-b border-gray-200">
        <h1 className="text-[22px] font-normal text-gray-900 mb-6">{latestMessage.subject || '(no subject)'}</h1>
        
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Sender Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${getSenderColor(latestMessage.from.email)}`}>
              {getInitials(latestMessage.from.name)}
            </div>

            {/* Sender Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900">{latestMessage.from.name}</span>
                <span className="text-xs text-gray-600">&lt;{cleanEmailAddress(latestMessage.from.email)}&gt;</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>to me</span>
              </div>
            </div>
          </div>

          {/* Time */}
          <div className="text-xs text-gray-600 whitespace-nowrap ml-4">
            <div>{time}</div>
            <div className="text-gray-500">({relative})</div>
          </div>
        </div>

        {/* Attachments Preview */}
        {latestMessage.attachments && latestMessage.attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-3">
              <Paperclip size={14} />
              <span>{latestMessage.attachments.length} Attachment{latestMessage.attachments.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {latestMessage.attachments.map((att, idx) => {
                const ext = att.name.split('.').pop()?.toUpperCase() || 'FILE';
                const isImage = att.mimeType?.startsWith('image/');
                
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
                  >
                    <div className={`w-10 h-10 ${isImage ? 'bg-green-100' : 'bg-red-100'} rounded flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xs font-semibold ${isImage ? 'text-green-700' : 'text-red-700'}`}>{ext}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{att.name}</div>
                      <div className="text-xs text-gray-500">{formatFileSize(att.size || 0)}</div>
                    </div>
                    <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-opacity">
                      <Download size={16} className="text-gray-600" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Email Body - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-6">
          {threadMessages.length > 1 ? (
            <div className="space-y-4">
              {threadMessages.map((message) => {
                const isExpanded = expandedMessages.has(message.id);
                const { time: msgTime } = formatEmailTime(message.date);

                return (
                  <div
                    key={message.id}
                    className={`border border-gray-200 rounded-lg overflow-hidden transition-all ${
                      isExpanded ? 'shadow-sm' : ''
                    }`}
                  >
                    {/* Collapsed Header */}
                    <button
                      onClick={() => toggleMessageExpansion(message.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium ${getSenderColor(message.from.email)}`}>
                        {getInitials(message.from.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{message.from.name}</div>
                        {!isExpanded && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">{message.preview || 'No preview'}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{msgTime}</div>
                    </button>

                    {/* Expanded Body */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                        {renderMessageBody(message)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            renderMessageBody(latestMessage)
          )}
        </div>
      </div>

      {/* Action Bar */}
      {!showReplyComposer && (
        <div className="px-8 py-4 border-t border-gray-200 flex items-center gap-2 bg-white">
          <button
            onClick={() => {
              setReplyMode('reply');
              setShowReplyComposer(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            <Reply size={16} />
            Reply
          </button>
          <button
            onClick={() => {
              setReplyMode('replyAll');
              setShowReplyComposer(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium transition-colors border border-gray-300"
          >
            <ReplyAll size={16} />
            Reply all
          </button>
          <button
            onClick={() => {
              setReplyMode('forward');
              setShowReplyComposer(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium transition-colors border border-gray-300"
          >
            <Forward size={16} />
            Forward
          </button>
        </div>
      )}

      {/* Reply Composer */}
      {showReplyComposer && (
        <div className="border-t border-gray-200 bg-white">
          <div className="px-8 py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">
                {replyMode === 'reply' && 'Reply'}
                {replyMode === 'replyAll' && 'Reply all'}
                {replyMode === 'forward' && 'Forward'}
              </h3>
              <button
                onClick={() => {
                  setShowReplyComposer(false);
                  setReplyContent('');
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {replyMode === 'forward' && (
              <input
                type="email"
                value={forwardTo}
                onChange={(e) => setForwardTo(e.target.value)}
                placeholder="To:"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}

            <div className="border border-gray-300 rounded-md overflow-hidden mb-4">
              <RichTextEditor
                value={replyContent}
                onChange={setReplyContent}
                placeholder="Type your message..."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSendReply}
                disabled={sending || !replyContent.trim() || (replyMode === 'forward' && !forwardTo.trim())}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                {sending ? 'Sending...' : 'Send now'}
              </button>
              <button
                onClick={() => {
                  setShowReplyComposer(false);
                  setReplyContent('');
                  setForwardTo('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .email-body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          line-height: 1.6;
        }
        .email-body p {
          margin-bottom: 1em;
        }
        .email-body p:last-child {
          margin-bottom: 0;
        }
        .email-body a {
          color: #1a73e8;
          text-decoration: none;
        }
        .email-body a:hover {
          text-decoration: underline;
        }
        .email-body img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }
        .email-body blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }
        .email-body code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        .email-body pre {
          background-color: #f3f4f6;
          padding: 1rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
      `}</style>

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
                  Always move messages from <span className="font-semibold">{email?.from.name || cleanEmailAddress(email?.from.email || '')}</span> to this folder:
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
                    Also auto-label future emails from {cleanEmailAddress(email?.from?.email || '') || 'this sender'}
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
    </div>
  );
}

export default EmbeddedViewEmailClean;
