import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Reply, ReplyAll, Forward, Trash, MoreVertical, Star, Paperclip, Download, ChevronLeft, Mail, MailOpen, Flag, MailWarning, Filter, Tag, Search, ChevronRight, Settings, Plus } from 'lucide-react';
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
  markAsRead,
  markAsUnread, 
  markAsImportant,
  markAsUnimportant,
  markAsStarred,
  markAsUnstarred,
  applyLabelsToEmail
} from '../../services/emailService';
import { 
  createGmailFilter,
  createReplyDraft,
  updateReplyDraft,
  deleteReplyDraft,
} from '../../integrations/gapiService';
import { optimizedEmailService } from '../../services/optimizedEmailService';
import { replaceCidReferences } from '../../integrations/gmail/fetch/messages';
import { Email } from '../../types';
import { useLayoutState } from '../../contexts/LayoutStateContext';
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
  // Remove angle brackets if present
  const cleanName = name.replace(/[<>]/g, '').trim();
  const parts = cleanName.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return cleanName.substring(0, 2).toUpperCase();
};

// Clean display name by removing angle brackets
const cleanDisplayName = (name: string): string => {
  if (!name) return '';
  // Remove < and > brackets
  return name.replace(/[<>]/g, '').trim();
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

function EmbeddedViewEmailClean({ emailId, onEmailUpdate, onEmailDelete }: EmbeddedViewEmailProps) {
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
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set()); // Track which messages have images loaded
  const [forwardingMessage, setForwardingMessage] = useState<Email | null>(null); // Track which message is being forwarded
  const [forwardType, setForwardType] = useState<'single' | 'all'>('single'); // Track forward type
  
  // Draft saving state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState<number>(0);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastHash, setLastHash] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const debounceSaveTimerRef = useRef<number | null>(null);
  const failsafeSaveTimerRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const isDirtyRef = useRef(false); // Add ref to avoid stale closures
  
  // Attachment preview modal state
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  
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
  const replyComposerRef = useRef<HTMLDivElement>(null); // Add ref for reply composer

  // Remove old add label modal state
  // const [showAddLabelModal, setShowAddLabelModal] = useState(false);
  // const [addLabelQuery, setAddLabelQuery] = useState('');
  // const addLabelModalRef = useRef<HTMLDivElement>(null);

  const { clearSelection } = useLayoutState();
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

      // Check if this is a draft
      const isDraft = fetchedEmail.labelIds?.includes('DRAFT');
      if (isDraft) {
        console.log('📝 Draft detected:', fetchedEmail.id);
        
        // Check if this is a reply draft (has threadId and is in a conversation)
        if (fetchedEmail.threadId) {
          console.log('📝 Reply draft detected, opening inline composer in thread view');
          
          // Fetch the draft to get its content
          try {
            const draftResponse = await window.gapi.client.gmail.users.drafts.list({
              userId: 'me',
              maxResults: 100
            });

            const drafts = draftResponse.result.drafts || [];
            const matchingDraft = drafts.find((d: any) => d.message?.id === fetchedEmail.id);
            
            if (matchingDraft) {
              const draftDetails = await window.gapi.client.gmail.users.drafts.get({
                userId: 'me',
                id: matchingDraft.id,
                format: 'full'
              });

              if (draftDetails.result?.message) {
                const draftMessage = draftDetails.result.message;
                const payload = draftMessage.payload;
                const headers = payload?.headers || [];

                const getHeader = (name: string) => {
                  const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
                  return header?.value || '';
                };

                const toHeader = getHeader('To');

                // Extract body content
                let bodyHtml = '';
                const findBody = (parts: any[]): { html: string; text: string } => {
                  let html = '';
                  let text = '';
                  for (const part of parts) {
                    if (part.mimeType === 'text/html' && part.body?.data) {
                      html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    } else if (part.mimeType === 'text/plain' && part.body?.data && !html) {
                      text = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    } else if (part.parts) {
                      const found = findBody(part.parts);
                      if (found.html) html = found.html;
                      if (found.text && !html) text = found.text;
                    }
                  }
                  return { html, text };
                };

                if (payload?.parts) {
                  const { html, text } = findBody(payload.parts);
                  bodyHtml = html || text;
                } else if (payload?.body?.data) {
                  bodyHtml = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                }

                // Open inline reply composer with draft content
                setShowReplyComposer(true);
                setReplyMode('reply');
                setReplyContent(bodyHtml);
                setDraftId(matchingDraft.id);
                setForwardTo(toHeader);
                setIsDirty(false);
                isDirtyRef.current = false;

                console.log('✅ Loaded reply draft into inline composer');
              }
            }
          } catch (error) {
            console.error('❌ Failed to load draft content:', error);
          }
          
          // Continue to load the thread
        } else {
          // New email draft (no thread) - navigate to compose page
          console.log('📝 New email draft detected, redirecting to compose page');
          navigate(`/compose?draftId=${fetchedEmail.id}`);
          return; // Exit early
        }
      }

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
            setLoadedImages(new Set());
            // Auto-expand the latest message
            setExpandedMessages(new Set([sorted[sorted.length - 1].id]));
          } else {
            setThreadMessages([fetchedEmail]);
            setLoadedImages(new Set());
            setExpandedMessages(new Set([fetchedEmail.id]));
          }
        } catch {
          const thread = await getThreadEmails(fetchedEmail.threadId);
          const sorted = (thread || [fetchedEmail]).sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setThreadMessages(sorted);
          setLoadedImages(new Set());
          setExpandedMessages(new Set([sorted[sorted.length - 1].id]));
        }
      } else {
        setThreadMessages([fetchedEmail]);
        setLoadedImages(new Set());
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

      // Delete draft after successful send
      if (draftId) {
        try {
          await deleteReplyDraft(draftId);
          console.log('🗑️ Draft deleted after send');
        } catch (err) {
          console.error('Failed to delete draft after send:', err);
          // Non-critical error, don't show to user
        }
      }

      // Reset composer state
      setShowReplyComposer(false);
      setReplyContent('');
      setForwardTo('');
      setDraftId(null);
      setIsDirty(false);
      isDirtyRef.current = false;
      setDraftVersion(0);
      
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

  const handleTrash = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!email) return;
    
    console.log(`🗑️ Moving email ${email.id} to trash`);
    
    // ⚡ INSTANT: Navigate away immediately (user expects to leave this view)
    clearSelection();
    navigate('/inbox');
    
    // ⚡ INSTANT: Notify parent immediately to remove from list
    onEmailDelete?.(email.id);
    
    // Show toast
    toast({ title: 'Moved to trash' });
    
    // 🔄 BACKGROUND: Update on server
    try {
      await markEmailAsTrash(email.id);
    } catch (err) {
      console.error('Failed to move to trash:', err);
      toast({ 
        title: 'Failed to move to trash',
        variant: 'destructive'
      });
    }
  };

  const handleMarkAsSpam = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!email) return;
    
    console.log(`🚫 Marking email ${email.id} as spam`);
    
    // ⚡ INSTANT: Navigate away immediately (user expects to leave this view)
    clearSelection();
    navigate('/inbox');
    
    // ⚡ INSTANT: Notify parent immediately to remove from list
    onEmailDelete?.(email.id);
    
    // Show toast
    toast({ title: 'Marked as spam' });
    
    // 🔄 BACKGROUND: Update on server
    try {
      await applyLabelsToEmail(email.id, ['SPAM'], ['INBOX']);
    } catch (err) {
      console.error('Failed to mark as spam:', err);
      toast({ 
        title: 'Failed to mark as spam',
        variant: 'destructive'
      });
    }
  };

  const handleMarkAsUnread = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!email) return;
    
    // Toggle between read and unread
    const newReadStatus = !email.isRead;
    
    console.log(`🔄 Toggling read status: ${email.isRead} → ${newReadStatus}`);
    
    // ⚡ INSTANT: Update local state immediately (optimistic update)
    const updatedEmail = {
      ...email,
      isRead: newReadStatus,
      labelIds: newReadStatus 
        ? email.labelIds?.filter(id => id !== 'UNREAD') 
        : [...(email.labelIds || []), 'UNREAD']
    };
    
    setEmail(updatedEmail);
    
    // ⚡ INSTANT: Notify parent component to update email list immediately
    if (onEmailUpdate) {
      onEmailUpdate(updatedEmail);
    }
    
    // Show appropriate toast
    toast({ title: newReadStatus ? 'Marked as read' : 'Marked as unread' });
    
    // 🔄 BACKGROUND: Update on server
    try {
      if (newReadStatus) {
        await markAsRead(email.id);
      } else {
        await markAsUnread(email.id);
      }
      // ✅ No refresh needed - optimistic update already done
    } catch (err) {
      console.error('Failed to update read status:', err);
      // Revert on error
      setEmail(email);
      if (onEmailUpdate) {
        onEmailUpdate(email);
      }
      toast({ 
        title: 'Failed to update read status',
        variant: 'destructive'
      });
    }
  };

  const handleToggleImportant = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!email) return;
    
    const isImportant = email.labelIds?.includes('IMPORTANT');
    const newImportantStatus = !isImportant;
    
    console.log(`🚩 Toggling important: ${isImportant} → ${newImportantStatus}`);
    
    // ⚡ INSTANT: Update local state immediately
    const updatedLabelIds = newImportantStatus 
      ? [...(email.labelIds || []), 'IMPORTANT']
      : email.labelIds?.filter(id => id !== 'IMPORTANT') || [];
    
    const updatedEmail = {
      ...email,
      isImportant: newImportantStatus,
      labelIds: updatedLabelIds
    };
    
    setEmail(updatedEmail);
    
    // ⚡ INSTANT: Notify parent component
    if (onEmailUpdate) {
      onEmailUpdate(updatedEmail);
    }
    
    // Show toast
    toast({ title: newImportantStatus ? 'Marked as important' : 'Removed from important' });
    
    // 🔄 BACKGROUND: Update on server
    try {
      if (newImportantStatus) {
        await markAsImportant(email.id);
      } else {
        await markAsUnimportant(email.id);
      }
      // ✅ No refresh needed - optimistic update already done
    } catch (err) {
      console.error('Failed to update important status:', err);
      // Revert on error
      setEmail(email);
      if (onEmailUpdate) {
        onEmailUpdate(email);
      }
      toast({ 
        title: 'Failed to update important status',
        variant: 'destructive'
      });
    }
  };

  const handleToggleStarred = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!email) return;
    
    const isStarred = email.labelIds?.includes('STARRED');
    const newStarredStatus = !isStarred;
    
    console.log(`⭐ Toggling starred: ${isStarred} → ${newStarredStatus}`);
    
    // ⚡ INSTANT: Update local state immediately
    const updatedLabelIds = newStarredStatus 
      ? [...(email.labelIds || []), 'STARRED']
      : email.labelIds?.filter(id => id !== 'STARRED') || [];
    
    const updatedEmail = {
      ...email,
      isStarred: newStarredStatus,
      labelIds: updatedLabelIds
    };
    
    setEmail(updatedEmail);
    
    // ⚡ INSTANT: Notify parent component
    if (onEmailUpdate) {
      onEmailUpdate(updatedEmail);
    }
    
    // Show toast
    toast({ title: newStarredStatus ? 'Added star' : 'Removed star' });
    
    // 🔄 BACKGROUND: Update on server
    try {
      if (newStarredStatus) {
        await markAsStarred(email.id);
      } else {
        await markAsUnstarred(email.id);
      }
      // ✅ No refresh needed - optimistic update already done
    } catch (err) {
      console.error('Failed to update starred status:', err);
      // Revert on error
      setEmail(email);
      if (onEmailUpdate) {
        onEmailUpdate(email);
      }
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

  // Forward handlers
  const handleForwardSingle = (message: Email) => {
    setForwardingMessage(message);
    setForwardType('single');
    setReplyMode('forward');
    setShowReplyComposer(true);
  };

  const handleForwardAll = () => {
    setForwardingMessage(email);
    setForwardType('all');
    setReplyMode('forward');
    setShowReplyComposer(true);
  };

  // Format forwarded message content
  useEffect(() => {
    if (replyMode === 'forward' && forwardingMessage && showReplyComposer) {
      let forwardedContent = '';
      
      if (forwardType === 'single') {
        // Format single message forward
        const { time } = formatEmailTime(forwardingMessage.date);
        const date = new Date(forwardingMessage.date).toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        
        forwardedContent = `<br><br>---------- Forwarded message ---------<br>` +
          `From: &lt;${forwardingMessage.from.email}&gt;<br>` +
          `Date: ${date} at ${time}<br>` +
          `Subject: ${forwardingMessage.subject}<br>` +
          `To: &lt;${forwardingMessage.to?.[0]?.email || ''}&gt;<br><br>` +
          `${forwardingMessage.body || ''}`;
      } else if (forwardType === 'all') {
        // Format all messages in thread
        forwardedContent = '<br><br>';
        threadMessages.forEach((msg, index) => {
          const { time } = formatEmailTime(msg.date);
          const date = new Date(msg.date).toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          
          if (index > 0) forwardedContent += '<br><br>';
          forwardedContent += `---------- Forwarded message ---------<br>` +
            `From: &lt;${msg.from.email}&gt;<br>` +
            `Date: ${date} at ${time}<br>` +
            `Subject: ${msg.subject}<br>` +
            `To: &lt;${msg.to?.[0]?.email || ''}&gt;<br><br>` +
            `${msg.body || ''}`;
        });
      }
      
      setReplyContent(forwardedContent);
    } else if (replyMode !== 'forward') {
      setReplyContent('');
    }
  }, [replyMode, forwardingMessage, forwardType, showReplyComposer, threadMessages]);

  // Draft saving utilities
  const hashDraftState = useCallback(() => {
    const state = {
      to: forwardTo,
      body: replyContent,
      mode: replyMode
    };
    return btoa(JSON.stringify(state));
  }, [forwardTo, replyContent, replyMode]);

  const isEmpty = useCallback(() => {
    // For forward mode, check if both to and body are empty
    if (replyMode === 'forward') {
      return !forwardTo.trim() && !replyContent.trim();
    }
    // For reply/replyAll mode, only check body
    return !replyContent.trim();
  }, [forwardTo, replyContent, replyMode]);

  const saveDraft = useCallback(async () => {
    console.log('🔍 saveDraft called, isDirty:', isDirty, 'isDirtyRef:', isDirtyRef.current);
    
    if (!isDirtyRef.current) {
      console.log('❌ Not dirty (ref check), skipping save');
      return;
    }
    
    // Check if empty - delete if exists
    const emptyCheck = isEmpty();
    console.log('🔍 isEmpty check:', emptyCheck);
    
    if (emptyCheck) {
      if (draftId) {
        try {
          // Delete empty draft
          await deleteReplyDraft(draftId);
          console.log('🗑️ Deleted empty draft:', draftId);
          setDraftId(null);
          setDraftVersion(0);
        } catch (err) {
          console.error('Failed to delete draft:', err);
        }
      }
      setIsDirty(false);
      isDirtyRef.current = false;
      return;
    }

    // Check if content actually changed
    const currentHash = hashDraftState();
    console.log('🔍 Current hash:', currentHash, 'Last hash:', lastHash);
    
    if (currentHash === lastHash) {
      console.log('❌ Hash unchanged, skipping save');
      return;
    }

    // Rate limit: ensure at least 2s between saves
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    console.log('🔍 Time since last save:', timeSinceLastSave, 'ms');
    
    if (timeSinceLastSave < 2000) {
      console.log('❌ Rate limited, skipping save');
      return;
    }

    console.log('✅ All checks passed, saving draft...');
    setIsSaving(true);
    lastSaveTimeRef.current = now;

    try {
      // Determine recipient based on reply mode
      let recipientEmail = forwardTo; // For forward mode
      
      if (replyMode === 'reply' || replyMode === 'replyAll') {
        // For reply modes, use the original sender's email
        recipientEmail = email?.from?.email || '';
      }

      const payload = {
        to: recipientEmail,
        body: replyContent,
        mode: replyMode,
        threadId: email?.threadId,
        inReplyTo: email?.id
      };

      console.log('📝 Draft payload:', { ...payload, body: payload.body.substring(0, 100) + '...' });

      let response;
      if (!draftId) {
        // Create new draft
        response = await createReplyDraft(payload);
        console.log('📝 Created draft:', response);
        setDraftId(response.id);
        setDraftVersion(response.version);
      } else {
        // Update existing draft
        response = await updateReplyDraft(draftId, payload, draftVersion);
        console.log('📝 Updated draft:', response);
        setDraftVersion(response.version);
      }

      setLastHash(currentHash);
      setIsDirty(false);
      isDirtyRef.current = false;
      setLastSavedAt(new Date());
      console.log('✅ Draft saved:', response.id);
    } catch (err: any) {
      console.error('Failed to save draft:', err);
      
      // Handle version conflict (412)
      if (err.status === 412) {
        console.log('⚠️ Version conflict, will retry');
        // TODO: Implement conflict resolution
      }
      
      // Handle draft not found (404) - recreate
      if (err.status === 404) {
        setDraftId(null);
        setDraftVersion(0);
        // Will retry on next trigger
      }
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, isEmpty, draftId, draftVersion, lastHash, hashDraftState, forwardTo, replyContent, replyMode, email]);

  const scheduleDebouncedSave = useCallback(() => {
    console.log('⏰ scheduleDebouncedSave called');
    
    // Clear existing timers
    if (debounceSaveTimerRef.current) {
      clearTimeout(debounceSaveTimerRef.current);
      console.log('⏰ Cleared existing debounce timer');
    }

    // Schedule debounced save (3s after last change)
    debounceSaveTimerRef.current = window.setTimeout(() => {
      console.log('⏰ Debounce timer fired, calling saveDraft');
      saveDraft();
    }, 3000);
    console.log('⏰ Scheduled debounced save in 3s');

    // Schedule failsafe save (30s if user never idles)
    if (!failsafeSaveTimerRef.current) {
      failsafeSaveTimerRef.current = window.setTimeout(() => {
        console.log('⏰ Failsafe timer fired, calling saveDraft');
        saveDraft();
        failsafeSaveTimerRef.current = null;
      }, 30000);
      console.log('⏰ Scheduled failsafe save in 30s');
    }
  }, [saveDraft]);

  const handleDraftChange = useCallback(() => {
    console.log('📝 handleDraftChange called');
    setIsDirty(true);
    isDirtyRef.current = true;
    scheduleDebouncedSave();
  }, [scheduleDebouncedSave]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && showReplyComposer) {
        // Attempt synchronous save
        saveDraft();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, showReplyComposer, saveDraft]);

  // Cleanup timers on unmount or when composer closes
  useEffect(() => {
    if (!showReplyComposer) {
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
        debounceSaveTimerRef.current = null;
      }
      if (failsafeSaveTimerRef.current) {
        clearTimeout(failsafeSaveTimerRef.current);
        failsafeSaveTimerRef.current = null;
      }
      
      // Final save when closing if dirty
      if (isDirty) {
        saveDraft();
      }
    } else {
      // Scroll to reply composer when it opens
      setTimeout(() => {
        replyComposerRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
    
    return () => {
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
      }
      if (failsafeSaveTimerRef.current) {
        clearTimeout(failsafeSaveTimerRef.current);
      }
    };
  }, [showReplyComposer, isDirty, saveDraft]);

  const loadInlineImagesForMessage = useCallback(async (messageId: string) => {
    if (loadedImages.has(messageId)) return;

    const message = threadMessages.find(m => m.id === messageId);
    if (!message || !message.inlineAttachments || message.inlineAttachments.length === 0) {
      return;
    }

    console.log(`🖼️ Loading ${message.inlineAttachments.length} inline images for message ${messageId}`);

    const maxRetries = 3;
    const delayMs = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} to load images for message ${messageId}`);

        const updatedBody = await replaceCidReferences(
          message.body,
          message.inlineAttachments || [],
          messageId
        );

        setThreadMessages(prev => 
          prev.map(m => m.id === messageId ? { ...m, body: updatedBody } : m)
        );

        setLoadedImages(prev => new Set(prev).add(messageId));
        console.log(`✅ Inline images loaded for message ${messageId} on attempt ${attempt}`);
        return;
      } catch (error) {
        console.error(`❌ Attempt ${attempt}/${maxRetries} failed to load inline images:`, error);
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    console.error(`❌ All ${maxRetries} attempts failed for message ${messageId}`);
  }, [loadedImages, threadMessages, setThreadMessages]);

  const toggleMessageExpansion = async (messageId: string) => {
    const wasExpanded = expandedMessages.has(messageId);
    
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
    
    if (!wasExpanded) {
      loadInlineImagesForMessage(messageId);
    }
  };

  // Ensure inline images load for any message currently expanded (including initial single-message threads)
  useEffect(() => {
    if (!threadMessages.length) return;

    const targetIds = expandedMessages.size > 0
      ? Array.from(expandedMessages)
      : [threadMessages[threadMessages.length - 1].id];

    targetIds.forEach(id => {
      loadInlineImagesForMessage(id);
    });
  }, [expandedMessages, threadMessages, loadInlineImagesForMessage]);

  const handleDownloadAttachment = async (messageId: string, attachmentId: string, filename: string) => {
    try {
      console.log(`⬇️ Downloading attachment: ${filename}`);
      
      const response = await window.gapi.client.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
      });
      
      if (response.result?.data) {
        // Convert base64url to base64
        const base64Data = response.result.data
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        
        // Add padding
        const padding = '='.repeat((4 - base64Data.length % 4) % 4);
        const paddedBase64 = base64Data + padding;
        
        // Convert to blob and download
        const byteCharacters = atob(paddedBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({ title: `Downloaded ${filename}` });
      }
    } catch (error) {
      console.error('Failed to download attachment:', error);
      toast({ 
        title: 'Download failed',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const handlePreviewAttachment = async (messageId: string, attachmentId: string, filename: string, mimeType: string) => {
    try {
      console.log(`👁️ Previewing attachment: ${filename}`);
      
      const response = await window.gapi.client.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
      });
      
      if (response.result?.data) {
        // Convert base64url to base64
        const base64Data = response.result.data
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        
        // Add padding
        const padding = '='.repeat((4 - base64Data.length % 4) % 4);
        const paddedBase64 = base64Data + padding;
        
        // Create data URL
        const dataUrl = `data:${mimeType};base64,${paddedBase64}`;
        
        setPreviewAttachment({
          url: dataUrl,
          name: filename,
          type: mimeType
        });
      }
    } catch (error) {
      console.error('Failed to preview attachment:', error);
      toast({ 
        title: 'Preview failed',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const renderMessageBody = (message: Email) => {
    const htmlBody = message.body || '';
    
    if (!htmlBody) {
      return <div className="text-gray-500 text-sm italic">No content</div>;
    }

    console.log('🖼️ Rendering email body, length:', htmlBody.length);
    console.log('🖼️ First 300 chars:', htmlBody.substring(0, 300));

    // Sanitize with email-safe config - preserve formatting and images
    const clean = DOMPurify.sanitize(htmlBody, {
      ADD_TAGS: ['style', 'link'],
      ADD_ATTR: ['target', 'style', 'class', 'id', 'width', 'height', 'src', 'href', 'alt', 'title', 'align', 'valign', 'border', 'cellpadding', 'cellspacing', 'bgcolor', 'color', 'size', 'face'],
      ALLOW_DATA_ATTR: false,
    });

    // Wrap in constrained HTML with forced responsive CSS
    const wrappedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="referrer" content="no-referrer">
        <base target="_blank">
        <style>
          * { 
            font-size: 12px !important; 
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          body { 
            margin: 0; 
            padding: 16px; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow-x: hidden;
            word-wrap: break-word;
            font-size: 12px !important;
          }
          img { 
            max-width: 100% !important; 
            height: auto !important; 
            display: block;
          }
          table { 
            max-width: 100% !important;
            border-collapse: collapse;
          }
          td, th {
            word-wrap: break-word;
            font-size: 12px !important;
          }
          a {
            color: #1a73e8;
            font-size: 12px !important;
          }
          p, div, span, li {
            font-size: 12px !important;
          }
        </style>
        <script>
          // Ensure all links open in new tab
          document.addEventListener('DOMContentLoaded', function() {
            document.addEventListener('click', function(e) {
              if (e.target.tagName === 'A' || e.target.closest('a')) {
                const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
                if (link.href) {
                  e.preventDefault();
                  window.open(link.href, '_blank', 'noopener,noreferrer');
                }
              }
            });
          });
        </script>
      </head>
      <body>
        ${clean}
      </body>
      </html>
    `;

    return (
      <iframe
        srcDoc={wrappedHtml}
        title="Email content"
        className="w-full border-0"
        style={{ minHeight: '400px', height: 'auto' }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          const iframe = e.target as HTMLIFrameElement;
          if (iframe.contentDocument) {
            const height = iframe.contentDocument.documentElement.scrollHeight;
            iframe.style.height = `${height + 20}px`;
          }
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
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
            title={email?.isRead ? "Mark as unread" : "Mark as read"}
          >
            {email?.isRead ? (
              <Mail size={18} className="text-gray-700" />
            ) : (
              <MailOpen size={18} className="text-gray-700" />
            )}
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
              className={email?.labelIds?.includes('IMPORTANT') ? 'text-orange-500 fill-orange-500' : 'text-gray-700'}
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
              {/* Add to Folder with Submenu */}
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
                    Add to Folder
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
                      Manage Rules
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={handleCreateNewFilter}
                    >
                      <Plus size={16} className="mr-3 text-gray-500" />
                      Create Rules
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
      <div className="px-4 py-2 border-b border-gray-200">
        <h1 className="text-base font-normal text-gray-900 mb-2 break-words overflow-wrap-anywhere whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          {latestMessage.subject || '(no subject)'}
        </h1>
        
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-start gap-2 flex-1">
            {/* Sender Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-medium text-xs ${getSenderColor(latestMessage.from.email)}`}>
              {getInitials(latestMessage.from.name)}
            </div>

            {/* Sender Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-sm text-gray-900">{cleanDisplayName(latestMessage.from.name)}</span>
                <span className="text-xs text-gray-500">{cleanEmailAddress(latestMessage.from.email)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>to me</span>
              </div>
            </div>
          </div>

          {/* Time */}
          <div className="text-xs text-gray-600 whitespace-nowrap ml-3">
            <div>{time}</div>
            <div className="text-gray-500">({relative})</div>
          </div>
        </div>
      </div>

      {/* Email Body - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          {threadMessages.length > 1 ? (
            <div className="space-y-1.5">
              {threadMessages.map((message) => {
                const isExpanded = expandedMessages.has(message.id);
                const { time: msgTime } = formatEmailTime(message.date);

                return (
                  <div
                    key={message.id}
                    className={`border border-gray-200 rounded overflow-hidden transition-all ${
                      isExpanded ? 'shadow-sm' : ''
                    }`}
                  >
                    {/* Collapsed Header */}
                    <div className="w-full px-2 py-1.5 flex items-center gap-2 hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => toggleMessageExpansion(message.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium ${getSenderColor(message.from.email)}`}>
                          {getInitials(message.from.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{cleanDisplayName(message.from.name)}</span>
                            {message.attachments && message.attachments.length > 0 && (
                              <Paperclip size={12} className="text-gray-400" />
                            )}
                          </div>
                          {!isExpanded && (
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              {message.preview ? message.preview.substring(0, 100) : 'No preview'}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{msgTime}</div>
                      </button>
                      
                      {/* Action Icons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleForwardSingle(message);
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Forward"
                        >
                          <Forward size={16} className="text-gray-600" />
                        </button>
                        {threadMessages.length > 1 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                title="Forward all"
                              >
                                <MoreVertical size={16} className="text-gray-600" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="z-[10001]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleForwardAll();
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center gap-2"
                              >
                                <Forward size={14} />
                                Forward entire thread ({threadMessages.length} messages)
                              </button>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Expanded Body */}
                    {isExpanded && (
                      <div className="px-2 pb-2 pt-1.5 border-t border-gray-100">
                        {renderMessageBody(message)}
                        
                        {/* Attachments Section */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-2">
                              <Paperclip size={12} />
                              <span>{message.attachments.length} Attachment{message.attachments.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {message.attachments.map((att, idx) => {
                                const ext = att.name.split('.').pop()?.toUpperCase() || 'FILE';
                                const isImage = att.mimeType?.startsWith('image/');
                                const isPdf = att.mimeType === 'application/pdf';
                                const isDoc = att.mimeType?.includes('word') || att.mimeType?.includes('document');
                                const isSpreadsheet = att.mimeType?.includes('spreadsheet') || att.mimeType?.includes('excel');
                                const isPresentation = att.mimeType?.includes('presentation') || att.mimeType?.includes('powerpoint');
                                const isZip = att.mimeType?.includes('zip') || att.mimeType?.includes('compressed');
                                const isPreviewable = isImage || isPdf || 
                                  att.mimeType?.startsWith('text/') ||
                                  isDoc || isSpreadsheet;
                                
                                // Determine background color and icon
                                let bgColor = 'bg-gray-100';
                                let textColor = 'text-gray-700';
                                let icon = ext;
                                
                                if (isPdf) {
                                  bgColor = 'bg-red-50';
                                  textColor = 'text-red-700';
                                  icon = 'PDF';
                                } else if (isDoc) {
                                  bgColor = 'bg-blue-50';
                                  textColor = 'text-blue-700';
                                  icon = 'DOC';
                                } else if (isSpreadsheet) {
                                  bgColor = 'bg-green-50';
                                  textColor = 'text-green-700';
                                  icon = 'XLS';
                                } else if (isPresentation) {
                                  bgColor = 'bg-orange-50';
                                  textColor = 'text-orange-700';
                                  icon = 'PPT';
                                } else if (isZip) {
                                  bgColor = 'bg-purple-50';
                                  textColor = 'text-purple-700';
                                  icon = 'ZIP';
                                }
                                
                                // Truncate filename to max 25 characters
                                const truncatedName = att.name.length > 25 
                                  ? att.name.substring(0, 22) + '...' 
                                  : att.name;
                                
                                return (
                                  <div
                                    key={idx}
                                    className="relative group w-24 h-24 flex-shrink-0"
                                  >
                                    {/* Thumbnail - Clickable for preview */}
                                    <button
                                      onClick={() => {
                                        console.log(`🖱️ Clicked attachment: ${att.name}, isPdf: ${isPdf}, isPreviewable: ${isPreviewable}, attachmentId: ${att.attachmentId}`);
                                        if (isPreviewable) {
                                          handlePreviewAttachment(message.id, att.attachmentId!, att.name, att.mimeType!);
                                        }
                                      }}
                                      className={`w-full h-full rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 ${bgColor} ${isPreviewable ? 'cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-blue-500' : 'cursor-default'}`}
                                      title={isPreviewable ? `Click to preview ${att.name}` : att.name}
                                    >
                                      {isImage && att.attachmentId ? (
                                        <img
                                          src={`data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`}
                                          alt={att.name}
                                          className="w-full h-full object-contain"
                                          onLoad={async (e) => {
                                            try {
                                              const response = await window.gapi.client.gmail.users.messages.attachments.get({
                                                userId: 'me',
                                                messageId: message.id,
                                                id: att.attachmentId!
                                              });
                                              if (response.result?.data) {
                                                const base64Data = response.result.data.replace(/-/g, '+').replace(/_/g, '/');
                                                const padding = '='.repeat((4 - base64Data.length % 4) % 4);
                                                (e.target as HTMLImageElement).src = `data:${att.mimeType};base64,${base64Data}${padding}`;
                                              }
                                            } catch (err) {
                                              console.error('Failed to load thumbnail:', err);
                                            }
                                          }}
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center gap-1">
                                          <span className={`text-lg font-bold ${textColor}`}>{icon}</span>
                                          {ext !== icon && (
                                            <span className={`text-[8px] ${textColor} opacity-70`}>{ext}</span>
                                          )}
                                        </div>
                                      )}
                                    </button>
                                    
                                    {/* Hover overlay with filename and download */}
                                    <div className="absolute inset-0 bg-black bg-opacity-75 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 pointer-events-none">
                                      <div className="text-white text-[10px] text-center break-words w-full mb-1 px-1 line-clamp-2">
                                        {truncatedName}
                                      </div>
                                      <div className="text-white text-[10px] mb-2">
                                        {formatFileSize(att.size || 0)}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadAttachment(message.id, att.attachmentId!, att.name);
                                        }}
                                        className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors pointer-events-auto"
                                        title="Download"
                                      >
                                        <Download size={14} className="text-white" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {renderMessageBody(latestMessage)}
              
              {/* Attachments Section for single email */}
              {latestMessage.attachments && latestMessage.attachments.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-2">
                    <Paperclip size={12} />
                    <span>{latestMessage.attachments.length} Attachment{latestMessage.attachments.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {latestMessage.attachments.map((att, idx) => {
                      const ext = att.name.split('.').pop()?.toUpperCase() || 'FILE';
                      const isImage = att.mimeType?.startsWith('image/');
                      const isPdf = att.mimeType === 'application/pdf';
                      const isDoc = att.mimeType?.includes('word') || att.mimeType?.includes('document');
                      const isSpreadsheet = att.mimeType?.includes('spreadsheet') || att.mimeType?.includes('excel');
                      const isPresentation = att.mimeType?.includes('presentation') || att.mimeType?.includes('powerpoint');
                      const isZip = att.mimeType?.includes('zip') || att.mimeType?.includes('compressed');
                      const isPreviewable = isImage || isPdf || 
                        att.mimeType?.startsWith('text/') ||
                        isDoc || isSpreadsheet;
                      
                      // Determine background color and icon
                      let bgColor = 'bg-gray-100';
                      let textColor = 'text-gray-700';
                      let icon = ext;
                      
                      if (isPdf) {
                        bgColor = 'bg-red-50';
                        textColor = 'text-red-700';
                        icon = 'PDF';
                      } else if (isDoc) {
                        bgColor = 'bg-blue-50';
                        textColor = 'text-blue-700';
                        icon = 'DOC';
                      } else if (isSpreadsheet) {
                        bgColor = 'bg-green-50';
                        textColor = 'text-green-700';
                        icon = 'XLS';
                      } else if (isPresentation) {
                        bgColor = 'bg-orange-50';
                        textColor = 'text-orange-700';
                        icon = 'PPT';
                      } else if (isZip) {
                        bgColor = 'bg-purple-50';
                        textColor = 'text-purple-700';
                        icon = 'ZIP';
                      }
                      
                      const truncatedName = att.name.length > 25 
                        ? att.name.substring(0, 22) + '...' 
                        : att.name;
                      
                      return (
                        <div
                          key={idx}
                          className="relative group w-24 h-24 flex-shrink-0"
                        >
                          <button
                            onClick={() => {
                              console.log(`🖱️ Clicked attachment: ${att.name}, isPdf: ${isPdf}, isPreviewable: ${isPreviewable}, attachmentId: ${att.attachmentId}`);
                              if (isPreviewable) {
                                handlePreviewAttachment(latestMessage.id, att.attachmentId!, att.name, att.mimeType!);
                              }
                            }}
                            className={`w-full h-full rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 ${bgColor} ${isPreviewable ? 'cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-blue-500' : 'cursor-default'}`}
                            title={isPreviewable ? `Click to preview ${att.name}` : att.name}
                          >
                            {isImage && att.attachmentId ? (
                              <img
                                src={`data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`}
                                alt={att.name}
                                className="w-full h-full object-contain"
                                onLoad={async (e) => {
                                  try {
                                    const response = await window.gapi.client.gmail.users.messages.attachments.get({
                                      userId: 'me',
                                      messageId: latestMessage.id,
                                      id: att.attachmentId!
                                    });
                                    if (response.result?.data) {
                                      const base64Data = response.result.data.replace(/-/g, '+').replace(/_/g, '/');
                                      const padding = '='.repeat((4 - base64Data.length % 4) % 4);
                                      (e.target as HTMLImageElement).src = `data:${att.mimeType};base64,${base64Data}${padding}`;
                                    }
                                  } catch (err) {
                                    console.error('Failed to load thumbnail:', err);
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className={`text-lg font-bold ${textColor}`}>{icon}</span>
                                {ext !== icon && (
                                  <span className={`text-[8px] ${textColor} opacity-70`}>{ext}</span>
                                )}
                              </div>
                            )}
                          </button>
                          
                          <div className="absolute inset-0 bg-black bg-opacity-75 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 pointer-events-none">
                            <div className="text-white text-[10px] text-center break-words w-full mb-1 px-1 line-clamp-2">
                              {truncatedName}
                            </div>
                            <div className="text-white text-[10px] mb-2">
                              {formatFileSize(att.size || 0)}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadAttachment(latestMessage.id, att.attachmentId!, att.name);
                              }}
                              className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors pointer-events-auto"
                              title="Download"
                            >
                              <Download size={14} className="text-white" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Reply Composer - Clean, minimal design */}
        {showReplyComposer && (
          <div ref={replyComposerRef} className="mt-6 mb-20 px-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  {replyMode === 'reply' && 'Reply'}
                  {replyMode === 'replyAll' && 'Reply all'}
                  {replyMode === 'forward' && 'Forward'}
                </h3>
                {/* Draft status indicator - More visible */}
                {isSaving && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    <span className="animate-pulse">●</span>
                    Saving...
                  </span>
                )}
                {!isSaving && lastSavedAt && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                    <span>✓</span>
                    Saved {format(lastSavedAt, 'h:mm a')}
                  </span>
                )}
                {!isSaving && !lastSavedAt && isDirty && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Unsaved changes
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setShowReplyComposer(false);
                  setReplyContent('');
                  setForwardTo('');
                  setDraftId(null);
                  setIsDirty(false);
                  isDirtyRef.current = false;
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {replyMode === 'forward' && (
              <div className="mb-3">
                <input
                  type="email"
                  value={forwardTo}
                  onChange={(e) => {
                    setForwardTo(e.target.value);
                    handleDraftChange();
                  }}
                  placeholder="To:"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="border border-gray-300 rounded overflow-hidden mb-3" style={{ minHeight: '150px' }}>
              <RichTextEditor
                value={replyContent}
                onChange={(content) => {
                  setReplyContent(content);
                  handleDraftChange();
                }}
                placeholder="Type your message..."
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSendReply}
                disabled={sending || !replyContent.trim() || (replyMode === 'forward' && !forwardTo.trim())}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors shadow-sm"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
              
              {/* Manual Save Draft button */}
              <button
                onClick={() => {
                  if (!isDirty) {
                    sonnerToast.info('No changes to save');
                    return;
                  }
                  saveDraft();
                }}
                disabled={isSaving || !isDirty}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              
              {/* Discard Draft button - only show if this is a draft */}
              {draftId && (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to discard this draft?')) {
                      try {
                        await deleteReplyDraft(draftId);
                        sonnerToast.success('Draft discarded');
                        // Close composer but stay in thread view
                        setShowReplyComposer(false);
                        setReplyContent('');
                        setForwardTo('');
                        setDraftId(null);
                        setIsDirty(false);
                        isDirtyRef.current = false;
                        // Don't navigate away - stay in thread view
                      } catch (error) {
                        console.error('Failed to discard draft:', error);
                        sonnerToast.error('Failed to discard draft');
                      }
                    }
                  }}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                >
                  Discard Draft
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowReplyComposer(false);
                  setReplyContent('');
                  setForwardTo('');
                  setDraftId(null);
                  setIsDirty(false);
                  isDirtyRef.current = false;
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar - Hidden when replying */}
      {!showReplyComposer && (
        <div className="px-4 py-1.5 border-t border-gray-200 flex items-center gap-2 bg-white flex-shrink-0">
          <button
            onClick={() => {
              setReplyMode('reply');
              setShowReplyComposer(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Reply size={14} />
            Reply
          </button>
          <button
            onClick={() => {
              setReplyMode('replyAll');
              setShowReplyComposer(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 rounded text-sm font-medium transition-colors border border-gray-300"
          >
            <ReplyAll size={14} />
            Reply all
          </button>
          <button
            onClick={() => {
              setForwardingMessage(latestMessage);
              setForwardType('single');
              setReplyMode('forward');
              setShowReplyComposer(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 rounded text-sm font-medium transition-colors border border-gray-300"
          >
            <Forward size={14} />
            Forward
          </button>
        </div>
      )}

      <style>{`
        .email-body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          line-height: 1.6;
          max-width: 100%;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
        }
        /* Force consistent small font size (12px) */
        .email-body,
        .email-body * {
          font-size: 12px !important;
          max-width: 100%;
          box-sizing: border-box;
        }
        .email-body p {
          margin-bottom: 0.5em;
          font-size: 12px !important;
        }
        .email-body a {
          color: #1a73e8;
          text-decoration: none;
          font-size: 12px !important;
        }
        .email-body a:hover {
          text-decoration: underline;
        }
        .email-body img {
          max-width: 100%;
          height: auto;
          display: block;
        }
        .email-body table {
          max-width: 100%;
          font-size: 12px !important;
        }
        .email-body td,
        .email-body th {
          font-size: 12px !important;
          overflow-wrap: break-word;
        }
        .email-body blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-size: 12px !important;
        }
        .email-body div,
        .email-body span {
          font-size: 12px !important;
        }
        /* Force 12px in RichTextEditor */
        .ProseMirror,
        .ProseMirror * {
          font-size: 12px !important;
        }
        .ProseMirror p {
          font-size: 12px !important;
        }
        .ProseMirror div,
        .ProseMirror span {
          font-size: 12px !important;
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

      {/* Attachment Preview Modal */}
      {previewAttachment && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[10000]"
          onClick={() => setPreviewAttachment(null)}
        >
          <div 
            className="relative max-w-7xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-75 px-4 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-3 text-white">
                <h3 className="text-sm font-medium truncate">{previewAttachment.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewAttachment.url;
                    link.download = previewAttachment.name;
                    link.click();
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors text-white"
                  title="Download"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors text-white"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg overflow-hidden mt-14 max-h-[calc(90vh-56px)]">
              {previewAttachment.type.startsWith('image/') ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="w-full h-full object-contain"
                />
              ) : previewAttachment.type === 'application/pdf' ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-[calc(90vh-56px)]"
                  title={previewAttachment.name}
                />
              ) : previewAttachment.type.startsWith('text/') ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-[calc(90vh-56px)]"
                  title={previewAttachment.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                  <p className="mb-4">Preview not available for this file type</p>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewAttachment.url;
                      link.download = previewAttachment.name;
                      link.click();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default EmbeddedViewEmailClean;
