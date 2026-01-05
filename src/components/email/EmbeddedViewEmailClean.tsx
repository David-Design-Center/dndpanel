import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Reply, ReplyAll, Forward, Trash, MoreVertical, Star, Paperclip, Download, ChevronDown, ChevronRight, Mail, MailOpen, Flag, MailWarning, Filter, Search, Settings, Plus, Maximize2, Minimize2, FolderInput } from 'lucide-react';
import { parseISO, format, formatDistanceToNow } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import MoveToFolderDialog from './MoveToFolderDialog';
import { useProfile } from '../../contexts/ProfileContext';
import { useContacts } from '../../contexts/ContactsContext';
import { getProfileInitial } from '../../lib/utils';
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
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { stripQuotedText } from '../../utils/emailContentProcessing';
import { 
  updateCountersForTrash, 
  updateCountersForSpam, 
  updateCountersForMove, 
  updateCountersForMarkRead, 
  updateCountersForMarkUnread 
} from '../../utils/counterUpdateUtils';

interface EmbeddedViewEmailProps {
  emailId: string;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
}

// Format time like Gmail: "Dec 19, 2025, 7:37 AM (4 days ago)"
const formatEmailTime = (dateString: string): { time: string; relative: string; fullDate: string } => {
  try {
    const date = parseISO(dateString);
    const time = format(date, 'h:mm a');
    const relative = formatDistanceToNow(date, { addSuffix: true });
    const fullDate = format(date, 'MMM d, yyyy, h:mm a');
    return { time, relative, fullDate };
  } catch {
    return { time: '', relative: '', fullDate: '' };
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
  const [sending, setSending] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set()); // Track which messages have images loaded
  const [expandedQuotedContent, setExpandedQuotedContent] = useState<Set<string>>(new Set()); // Track which messages have quoted content expanded
  const [quotedContentMap, setQuotedContentMap] = useState<Map<string, string>>(new Map()); // Store quoted content per message ID
  const [forwardingMessage, setForwardingMessage] = useState<Email | null>(null); // Track which message is being forwarded
  const [forwardType, setForwardType] = useState<'single' | 'all'>('single'); // Track forward type
  const [isReplyExpanded, setIsReplyExpanded] = useState(false); // Reply composer fullscreen mode
  const [showMetadata, setShowMetadata] = useState(false); // Email metadata dropdown
  
  // 🎯 CONSOLIDATED DRAFT STATE - Single source of truth prevents race conditions
  const [draftState, setDraftState] = useState({
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'saving' | 'sending' | 'error',
    showComposer: false,
    mode: 'reply' as 'reply' | 'replyAll' | 'forward',
    content: '',
    forwardTo: '',
    draftId: null as string | null,
    messageId: null as string | null, // Track message ID separately for UI operations
    version: 0,
    isDirty: false,
    isSaving: false,
    lastSavedAt: null as Date | null,
    lastHash: '',
    error: null as string | null
  });
  
  // Helper to update draft state atomically
  const updateDraftState = (updates: Partial<typeof draftState>) => {
    setDraftState(prev => ({ ...prev, ...updates }));
  };
  
  // Backward compatibility - individual setters (use updateDraftState internally)
  const setShowReplyComposer = (show: boolean) => updateDraftState({ showComposer: show });
  const setReplyMode = (mode: typeof draftState.mode) => updateDraftState({ mode });
  const setReplyContent = (content: string) => updateDraftState({ content });
  const setForwardTo = (to: string) => updateDraftState({ forwardTo: to });
  const setDraftId = (id: string | null) => updateDraftState({ draftId: id });
  const setDraftVersion = (version: number) => updateDraftState({ version });
  const setIsDirty = (dirty: boolean) => updateDraftState({ isDirty: dirty });
  const setIsSaving = (saving: boolean) => updateDraftState({ isSaving: saving });
  const setLastSavedAt = (date: Date | null) => updateDraftState({ lastSavedAt: date });
  const setLastHash = (hash: string) => updateDraftState({ lastHash: hash });
  
  // Backward compatibility - individual getters
  const showReplyComposer = draftState.showComposer;
  const replyMode = draftState.mode;
  const replyContent = draftState.content;
  const forwardTo = draftState.forwardTo;
  const draftId = draftState.draftId;
  const draftVersion = draftState.version;
  const isDirty = draftState.isDirty;
  const isSaving = draftState.isSaving;
  const lastSavedAt = draftState.lastSavedAt;
  const lastHash = draftState.lastHash;
  
  // Refs to store current values (avoid stale closure in timers)
  const draftStateRef = useRef(draftState);
  const replyContentRef = useRef(draftState.content);
  const forwardToRef = useRef(draftState.forwardTo);
  const replyModeRef = useRef(draftState.mode);
  const isDirtyRef = useRef(draftState.isDirty);
  
  const debounceSaveTimerRef = useRef<number | null>(null);
  const failsafeSaveTimerRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  
  // Image cache for inline attachments (cid: references)
  const imageCache = useRef<Map<string, string>>(new Map());
  
  // Update refs whenever draft state changes
  useEffect(() => {
    draftStateRef.current = draftState;
    replyContentRef.current = draftState.content;
    forwardToRef.current = draftState.forwardTo;
    replyModeRef.current = draftState.mode;
    isDirtyRef.current = draftState.isDirty;
  }, [draftState]);
  
  // Attachment preview modal state
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  
  // Three-dot menu state (same as context menu in EmailListItem)
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFilterSubmenu, setShowFilterSubmenu] = useState(false);
  const [showCreateFilterModal, setShowCreateFilterModal] = useState(false);
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [filterLabelQuery, setFilterLabelQuery] = useState('');
  const [selectedFilterLabel, setSelectedFilterLabel] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [nestUnder, setNestUnder] = useState(false);
  const [parentLabel, setParentLabel] = useState('');
  const [autoFilterFuture, setAutoFilterFuture] = useState(false);
  
  // CC/BCC state for reply composer
  const [showCc, setShowCc] = useState(false);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [showCcDropdown, setShowCcDropdown] = useState(false);
  const [filteredCcContacts, setFilteredCcContacts] = useState<any[]>([]);
  const [showBcc, setShowBcc] = useState(false);
  const [bccRecipients, setBccRecipients] = useState<string[]>([]);
  const [bccInput, setBccInput] = useState('');
  const [showBccDropdown, setShowBccDropdown] = useState(false);
  const [filteredBccContacts, setFilteredBccContacts] = useState<any[]>([]);
  
  const hideFilterTimerRef = useRef<number | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const filterSubmenuRef = useRef<HTMLDivElement>(null);
  const filterModalRef = useRef<HTMLDivElement>(null);
  const createLabelModalRef = useRef<HTMLDivElement>(null);
  const replyComposerRef = useRef<HTMLDivElement>(null); // Add ref for reply composer

  // Remove old add label modal state
  // const [showAddLabelModal, setShowAddLabelModal] = useState(false);
  // const [addLabelQuery, setAddLabelQuery] = useState('');
  // const addLabelModalRef = useRef<HTMLDivElement>(null);

  const { clearSelection } = useLayoutState();
  const { labels, addLabel } = useLabel(); // Get labels from context
  const { currentProfile } = useProfile(); // Get current profile for From field
  const { searchContacts, setShouldLoadContacts } = useContacts(); // For CC/BCC dropdown
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const draftIdParam = searchParams.get('draft'); // Check for draft query param
  
  // 📁 Extract folder context from URL to preserve when navigating back
  const labelNameParam = searchParams.get('labelName');
  const labelQueryParam = searchParams.get('labelQuery');
  const labelIdParam = searchParams.get('labelId');
  
  // Helper to build URL back to email list, preserving folder context if present
  const getBackToListUrl = (): string => {
    if (labelNameParam) {
      const params = new URLSearchParams();
      params.set('labelName', labelNameParam);
      if (labelQueryParam) params.set('labelQuery', labelQueryParam);
      if (labelIdParam) params.set('labelId', labelIdParam);
      return `/inbox?${params.toString()}`;
    }
    return '/inbox';
  };

  // 🎯 CONSOLIDATED DRAFT LOAD FUNCTION - Single async action prevents race conditions
  const loadDraftCompletely = async (messageId: string): Promise<boolean> => {
    console.log('🔄 START loadDraftCompletely:', messageId);
    
    try {
      // Step 1: Set loading state (hides composer until ready)
      updateDraftState({ 
        status: 'loading',
        messageId,
        showComposer: false 
      });
      
      // Step 2: Fetch draft list to find draft ID from message ID
      const draftResponse = await window.gapi.client.gmail.users.drafts.list({
        userId: 'me',
        maxResults: 100
      });

      const drafts = draftResponse.result.drafts || [];
      const matchingDraft = drafts.find((d: any) => d.message?.id === messageId);
      
      if (!matchingDraft) {
        throw new Error('Draft not found in list');
      }
      
      // Step 3: Fetch full draft details
      const draftDetails = await window.gapi.client.gmail.users.drafts.get({
        userId: 'me',
        id: matchingDraft.id,
        format: 'full'
      });

      if (!draftDetails.result?.message) {
        throw new Error('Draft message not found');
      }

      const payload = draftDetails.result.message.payload;
      
      // Step 4a: Extract CC and BCC headers
      const headers = payload?.headers || [];
      const ccHeader = headers.find((h: any) => h.name.toLowerCase() === 'cc')?.value || '';
      const bccHeader = headers.find((h: any) => h.name.toLowerCase() === 'bcc')?.value || '';
      
      // Parse CC/BCC into arrays of email addresses
      const parseCcEmails = (headerValue: string): string[] => {
        if (!headerValue) return [];
        // Split by comma, extract email from "Name <email>" or just "email" format
        return headerValue.split(',')
          .map(part => {
            const match = part.match(/<([^>]+)>/) || part.match(/([^\s,]+@[^\s,]+)/);
            return match ? match[1].trim() : '';
          })
          .filter(email => email && email.includes('@'));
      };
      
      const draftCcRecipients = parseCcEmails(ccHeader);
      const draftBccRecipients = parseCcEmails(bccHeader);
      
      console.log('📧 Draft CC recipients:', draftCcRecipients);
      console.log('📧 Draft BCC recipients:', draftBccRecipients);
      
      // Step 4b: Extract body content
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
      
      // Step 5: Find and replace inline images (cid: references)
      console.log('🖼️ Checking for inline images in draft...');
      const cidMatches = bodyHtml.match(/cid:([^"'\s>]+)/g);
      
      if (cidMatches && cidMatches.length > 0) {
        console.log(`🖼️ Found ${cidMatches.length} cid: references, fetching inline images...`);
        
        // Find all inline attachments
        const findInlineAttachments = (parts: any[]): any[] => {
          let attachments: any[] = [];
          for (const part of parts) {
            if (part.body?.attachmentId && part.headers) {
              const contentId = part.headers.find((h: any) => h.name.toLowerCase() === 'content-id')?.value;
              if (contentId) {
                attachments.push({
                  cid: contentId.replace(/[<>]/g, ''),
                  attachmentId: part.body.attachmentId,
                  mimeType: part.mimeType
                });
              }
            }
            if (part.parts) {
              attachments = attachments.concat(findInlineAttachments(part.parts));
            }
          }
          return attachments;
        };
        
        const inlineAttachments = payload?.parts ? findInlineAttachments(payload.parts) : [];
        console.log(`📎 Found ${inlineAttachments.length} inline attachments`);
        
        // Fetch and replace each inline image
        for (const attachment of inlineAttachments) {
          try {
            // Check cache first
            const cacheKey = `${messageId}:${attachment.attachmentId}`;
            let dataUrl = imageCache.current.get(cacheKey);
            
            if (!dataUrl) {
              const response = await window.gapi.client.gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: messageId,
                id: attachment.attachmentId
              });
              
              if (response.result?.data) {
                const base64Data = response.result.data.replace(/-/g, '+').replace(/_/g, '/');
                dataUrl = `data:${attachment.mimeType};base64,${base64Data}`;
                
                // Cache the data URL
                imageCache.current.set(cacheKey, dataUrl);
                console.log(`✅ Fetched and cached inline image: ${attachment.cid}`);
              }
            } else {
              console.log(`💾 Using cached inline image: ${attachment.cid}`);
            }
            
            if (dataUrl) {
              // Replace cid: reference with data URL
              const cidPattern = new RegExp(`cid:${attachment.cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
              bodyHtml = bodyHtml.replace(cidPattern, dataUrl);
              console.log(`✅ Replaced cid:${attachment.cid} with data URL`);
            }
          } catch (error) {
            console.error(`❌ Failed to fetch inline image ${attachment.cid}:`, error);
          }
        }
      }
      
      // Step 6: Set ALL state atomically
      updateDraftState({
        status: 'ready',
        showComposer: true,
        mode: 'reply',
        content: bodyHtml,
        draftId: matchingDraft.id,
        messageId,
        isDirty: false,
        error: null
      });
      
      // Step 7: Set CC/BCC state from draft
      if (draftCcRecipients.length > 0) {
        setCcRecipients(draftCcRecipients);
        setShowCc(true);
        console.log('📧 Set CC recipients from draft:', draftCcRecipients);
      }
      if (draftBccRecipients.length > 0) {
        setBccRecipients(draftBccRecipients);
        setShowBcc(true);
        console.log('📧 Set BCC recipients from draft:', draftBccRecipients);
      }
      
      console.log('✅ COMPLETE loadDraftCompletely - content length:', bodyHtml.length);
      return true;
      
    } catch (error: any) {
      console.error('❌ FAILED loadDraftCompletely:', error);
      
      // Handle 404 - draft no longer exists
      if (error.status === 404) {
        const isDraftEmail = email?.labelIds?.includes('DRAFT');
        
        if (isDraftEmail && email) {
          sonnerToast.error('Draft no longer exists');
          clearSelection();
          navigate(getBackToListUrl());
          onEmailDelete?.(email.id);
        }
      }
      
      updateDraftState({ 
        status: 'error',
        error: error.message || 'Failed to load draft'
      });
      return false;
    }
  };

  // Fetch email and thread when emailId changes or draft param changes
  // Don't reset composer state here - let fetchEmailAndThread() decide based on drafts
  useEffect(() => {
    console.log('🔄 Component effect triggered - emailId:', emailId, 'draftIdParam:', draftIdParam, 'showReplyComposer:', showReplyComposer);
    // Reset metadata dropdown when switching emails
    setShowMetadata(false);
    if (emailId) {
      fetchEmailAndThread();
    }
  }, [emailId, draftIdParam]);

  const fetchEmailAndThread = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the main email
      // If draftIdParam exists, fetch the draft first (coming from Drafts folder)
      let fetchedEmail: Email | undefined;
      const actualEmailId = draftIdParam || emailId;
      
      try {
        fetchedEmail = await optimizedEmailService.fetchEmailThread(actualEmailId).then(thread => thread[0]);
      } catch {
        fetchedEmail = await getEmailById(actualEmailId);
      }

      if (!fetchedEmail) {
        setError('Email not found');
        return;
      }

      setEmail(fetchedEmail);

      // Check if this is a new email draft (no thread) - redirect to compose page
      const isDraft = fetchedEmail.labelIds?.includes('DRAFT');
      if (isDraft && !fetchedEmail.threadId) {
        console.log('📝 New email draft detected, redirecting to compose page');
        navigate(`/compose?draftId=${fetchedEmail.id}`);
        return; // Exit early
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
            
            // If we loaded a draft initially but it's not in the thread, add it
            if (isDraft && !sorted.find(msg => msg.id === fetchedEmail.id)) {
              console.log('📝 Adding draft to thread (not returned by Gmail API)');
              sorted.push(fetchedEmail);
              sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }
            
            console.log('📧 Thread messages count:', sorted.length);
            console.log('📧 Is draft?', isDraft);
            
            // Check for drafts in the thread
            // Priority: URL draft param > any draft in thread
            let draftMessage = draftIdParam 
              ? sorted.find(msg => msg.id === draftIdParam)
              : sorted.find(msg => msg.labelIds?.includes('DRAFT'));
            
            console.log('📧 Draft message found?', !!draftMessage, draftMessage?.id);
            
            // Fetch draft separately if not in thread
            if (draftIdParam && !draftMessage) {
              const separateDraft = await getEmailById(draftIdParam);
              if (separateDraft) {
                draftMessage = separateDraft;
              }
            }
            
            if (draftMessage) {
              console.log('📧 Processing draft message in thread');
              // Filter out draft from thread display
              const nonDraftMessages = sorted.filter(msg => !msg.labelIds?.includes('DRAFT'));
              console.log('📧 Non-draft messages count:', nonDraftMessages.length);
              if (nonDraftMessages.length === 0) {
                // Show at least the original email
                setThreadMessages(sorted.filter(msg => !msg.labelIds?.includes('DRAFT')));
              } else {
                setThreadMessages(nonDraftMessages);
              }
              
              // 🎯 Use consolidated load function
              await loadDraftCompletely(draftMessage.id);
              
              // Expand all non-draft messages
              if (nonDraftMessages.length > 0) {
                setExpandedMessages(new Set(nonDraftMessages.map(m => m.id)));
              }
            } else {
              console.log('⚠️ No draft message found in thread!');
              console.log('⚠️ But composer state - showReplyComposer:', showReplyComposer, 'replyContent length:', replyContent.length);
              setThreadMessages(sorted);
              // Auto-expand all messages
              setExpandedMessages(new Set(sorted.map(m => m.id)));
            }
            
            setLoadedImages(new Set());
          } else {
            console.log('⚠️ Empty thread response from API');
            setThreadMessages([fetchedEmail]);
            setLoadedImages(new Set());
          }
        } catch {
          const thread = await getThreadEmails(fetchedEmail.threadId);
          const sorted = (thread || [fetchedEmail]).sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          // If we loaded a draft initially but it's not in the thread, add it
          if (isDraft && !sorted.find(msg => msg.id === fetchedEmail.id)) {
            console.log('📝 Adding draft to thread (not returned by Gmail API)');
            sorted.push(fetchedEmail);
            sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          }
          
          // Check for drafts in the thread
          // Priority: URL draft param > any draft in thread
          let draftMessage = draftIdParam 
            ? sorted.find(msg => msg.id === draftIdParam)
            : sorted.find(msg => msg.labelIds?.includes('DRAFT'));
          
          // Fetch draft separately if not in thread
          if (draftIdParam && !draftMessage) {
            const separateDraft = await getEmailById(draftIdParam);
            if (separateDraft) {
              draftMessage = separateDraft;
            }
          }
          
          if (draftMessage) {
            // Filter out draft from thread display
            const nonDraftMessages = sorted.filter(msg => !msg.labelIds?.includes('DRAFT'));
            if (nonDraftMessages.length === 0) {
              // Show at least the original email
              setThreadMessages(sorted.filter(msg => !msg.labelIds?.includes('DRAFT')));
            } else {
              setThreadMessages(nonDraftMessages);
            }
            
            // 🎯 Use consolidated load function
            await loadDraftCompletely(draftMessage.id);
            
            // Expand all non-draft messages
            if (nonDraftMessages.length > 0) {
              setExpandedMessages(new Set(nonDraftMessages.map(m => m.id)));
            }
          } else {
            setThreadMessages(sorted);
            setExpandedMessages(new Set(sorted.map(m => m.id)));
          }
          
          setLoadedImages(new Set());
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
      console.log('🏁 fetchEmailAndThread complete - setting loading to false');
      console.log('🏁 Current composer state before setLoading:', { showReplyComposer, replyContentLength: replyContent.length, draftId });
      setLoading(false);
      console.log('🏁 setLoading(false) called');
    }
  };

  // CC input handlers
  const handleCcInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCcInput(value);
    
    // Trigger contacts load if not yet loaded
    setShouldLoadContacts(true);

    // Update filtered contacts based on input
    const contacts = searchContacts(value, 5);
    setFilteredCcContacts(contacts);
    const shouldShow = value.trim().length > 0 && contacts.length > 0;
    setShowCcDropdown(shouldShow);
  };

  const handleCcContactSelect = (contact: { email: string; name: string }) => {
    if (!ccRecipients.includes(contact.email)) {
      setCcRecipients(prev => [...prev, contact.email]);
      handleDraftChange();
    }
    setCcInput('');
    setShowCcDropdown(false);
    setFilteredCcContacts([]);
  };

  const handleCcInputFocus = () => {
    setShouldLoadContacts(true);
    if (ccInput.trim().length > 0) {
      const contacts = searchContacts(ccInput, 5);
      setFilteredCcContacts(contacts);
      setShowCcDropdown(contacts.length > 0);
    }
  };

  const handleCcInputBlur = () => {
    setTimeout(() => {
      setShowCcDropdown(false);
    }, 150);
  };

  const handleCcInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const email = ccInput.trim();
      if (email && email.includes('@') && !ccRecipients.includes(email)) {
        setCcRecipients(prev => [...prev, email]);
        setCcInput('');
        handleDraftChange();
      }
    }
  };

  const removeCcRecipient = (email: string) => {
    setCcRecipients(prev => prev.filter(recipient => recipient !== email));
    handleDraftChange();
  };

  // BCC input handlers
  const handleBccInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBccInput(value);
    
    setShouldLoadContacts(true);

    const contacts = searchContacts(value, 5);
    setFilteredBccContacts(contacts);
    const shouldShow = value.trim().length > 0 && contacts.length > 0;
    setShowBccDropdown(shouldShow);
  };

  const handleBccContactSelect = (contact: { email: string; name: string }) => {
    if (!bccRecipients.includes(contact.email)) {
      setBccRecipients(prev => [...prev, contact.email]);
      handleDraftChange();
    }
    setBccInput('');
    setShowBccDropdown(false);
    setFilteredBccContacts([]);
  };

  const handleBccInputFocus = () => {
    setShouldLoadContacts(true);
    if (bccInput.trim().length > 0) {
      const contacts = searchContacts(bccInput, 5);
      setFilteredBccContacts(contacts);
      setShowBccDropdown(contacts.length > 0);
    }
  };

  const handleBccInputBlur = () => {
    setTimeout(() => {
      setShowBccDropdown(false);
    }, 150);
  };

  const handleBccInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const email = bccInput.trim();
      if (email && email.includes('@') && !bccRecipients.includes(email)) {
        setBccRecipients(prev => [...prev, email]);
        setBccInput('');
        handleDraftChange();
      }
    }
  };

  const removeBccRecipient = (email: string) => {
    setBccRecipients(prev => prev.filter(recipient => recipient !== email));
    handleDraftChange();
  };

  const handleSendReply = async () => {
    if (!email || !replyContent.trim()) return;

    setSending(true);
    try {
      // Prepare CC/BCC strings
      const userCc = ccRecipients.filter(e => e.trim()).join(',');
      const bccString = bccRecipients.filter(e => e.trim()).join(',');
      
      if (replyMode === 'reply' || replyMode === 'replyAll') {
        // 🔧 Get correct reply recipients (never reply to yourself)
        const { to: autoTo, cc: autoCc } = getReplyRecipients(replyToMessage, replyMode);
        
        if (!autoTo) {
          sonnerToast.error('Cannot send: No valid recipients');
          setSending(false);
          return;
        }
        
        // Merge auto-detected CC with user-added CC
        const finalCc = [autoCc, userCc].filter(Boolean).join(',');
        
        if (replyMode === 'reply') {
          // Use replyToMessage instead of email
          await sendReply(replyToMessage || email, replyContent, false, finalCc, bccString);
          toast({ title: 'Email sent' });
        } else {
          // Use replyToMessage instead of email
          await sendReplyAll(replyToMessage || email, replyContent, finalCc, bccString);
          toast({ title: 'Email sent' });
        }
      } else if (replyMode === 'forward' && forwardTo.trim()) {
        const subject = email.subject.startsWith('Fwd: ') ? email.subject : `Fwd: ${email.subject}`;
        await sendEmail({
          from: email.from,
          to: [{ name: '', email: forwardTo }],
          subject,
          body: replyContent,
          threadId: email.threadId,
          internalDate: null
        }, undefined, undefined, userCc, bccString);
        toast({ title: 'Email sent' });
      }

      // Delete draft after successful send
      if (draftId) {
        try {
          await deleteReplyDraft(draftId);
          console.log('🗑️ Draft deleted after send');
          
          // Emit event to decrement draft counter
          window.dispatchEvent(new CustomEvent('email-deleted', { 
            detail: { emailId: draftId } 
          }));
        } catch (err) {
          console.error('Failed to delete draft after send:', err);
          // Non-critical error, don't show to user
        }
      }

      // Reset composer state
      setShowReplyComposer(false);
      setReplyContent('');
      setForwardTo('');
      setCcRecipients([]);
      setBccRecipients([]);
      setShowCc(false);
      setShowBcc(false);
      setDraftId(null);
      setIsDirty(false);
      isDirtyRef.current = false;
      setDraftVersion(0);
      
      // Refresh thread to show sent message
      await fetchEmailAndThread();
      
      // Update parent to remove "Draft" badge if this was a draft in thread
      if (email && onEmailUpdate) {
        onEmailUpdate({ ...email, hasDraftInThread: false } as Email);
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      toast({ 
        title: 'Failed to send email', 
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
    
    // 📊 Update counters (decrement source labels if was unread)
    updateCountersForTrash({
      labelIds: email.labelIds || ['INBOX'],
      wasUnread: !email.isRead,
      threadId: email.threadId,
      messageId: email.id,
    });
    
    // ⚡ INSTANT: Navigate away immediately (user expects to leave this view)
    clearSelection();
    navigate(getBackToListUrl());
    
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
    
    // 📊 Update counters (decrement source labels if was unread)
    updateCountersForSpam({
      labelIds: email.labelIds || ['INBOX'],
      wasUnread: !email.isRead,
      threadId: email.threadId,
      messageId: email.id,
    });
    
    // ⚡ INSTANT: Navigate away immediately (user expects to leave this view)
    clearSelection();
    navigate(getBackToListUrl());
    
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

  const handleMoveToFolder = async (labelId: string, labelName: string) => {
    if (!email) return;
    
    const isMovingToInbox = labelId === 'INBOX';
    console.log(`📁 Moving email ${email.id} to ${isMovingToInbox ? 'Inbox' : `folder: ${labelName}`}`);
    
    // 📊 Update counters (decrement source, increment destination if was unread)
    updateCountersForMove({
      labelIds: email.labelIds || ['INBOX'],
      wasUnread: !email.isRead,
      toLabelId: labelId,
      threadId: email.threadId,
      messageId: email.id,
    });
    
    try {
      // Get current user labels to remove (exclude system labels)
      const systemLabels = ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'];
      const currentUserLabels = (email.labelIds || []).filter(id => 
        !systemLabels.includes(id) && !id.startsWith('CATEGORY_')
      );
      
      let labelsToAdd: string[];
      let labelsToRemove: string[];
      
      if (isMovingToInbox) {
        // Moving to Inbox: add INBOX, remove all user labels
        labelsToAdd = ['INBOX'];
        labelsToRemove = currentUserLabels;
        console.log(`📥 Moving to Inbox. Removing user labels:`, labelsToRemove);
      } else {
        // Moving to folder: add the folder label, remove INBOX + current user labels
        labelsToAdd = [labelId];
        labelsToRemove = [...new Set([...currentUserLabels, 'INBOX'])];
        console.log(`📁 Adding label: ${labelId}, Removing labels:`, labelsToRemove);
      }
      
      // Apply the new label and remove old labels
      await applyLabelsToEmail(email.id, labelsToAdd, labelsToRemove);
      
      // Navigate away
      clearSelection();
      navigate(getBackToListUrl());
      
      // Trigger inbox refetch to update the list (don't use onEmailDelete - that deletes the email!)
      window.dispatchEvent(new CustomEvent('inbox-refetch-required'));
      
      toast({ 
        title: isMovingToInbox 
          ? 'Moved to Inbox' 
          : `Moved to ${labelName}` 
      });
    } catch (err) {
      console.error('Failed to move email:', err);
      toast({ 
        title: 'Failed to move email',
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
    
    // 📊 Update counters immediately
    if (newReadStatus) {
      // Marking as read → decrement
      updateCountersForMarkRead({
        labelIds: email.labelIds || ['INBOX'],
        wasUnread: !email.isRead,
        threadId: email.threadId,
        messageId: email.id,
      });
    } else {
      // Marking as unread → increment
      updateCountersForMarkUnread({
        labelIds: email.labelIds || ['INBOX'],
        threadId: email.threadId,
        messageId: email.id,
      });
    }
    
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
    
    // 🔧 SELF-FILTER BUG FIX (Dec 2025): Prevent creating filter for own email
    const currentUserEmail = cleanEmailAddress(currentProfile?.userEmail || '').toLowerCase();
    if (sender.toLowerCase() === currentUserEmail) {
      sonnerToast.error('Cannot create rule for your own email address. This would affect all your sent emails.');
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

      sonnerToast.success(`Rule created! Emails from "${sender}" will be moved to "${selectedFilterLabel}"`);
      await fetchEmailAndThread();
    } catch (err) {
      console.error('Filter creation error:', err);
      sonnerToast.error('Could not create rule. Please check Gmail auth and try again.');
    } finally {
      handleCloseCreateFilterModal();
    }
  };

  const handleCreateLabelSubmit = async () => {
    const base = newLabelName.trim();
    if (!base) return;
    const fullName = nestUnder && parentLabel ? `${parentLabel}/${base}` : base;
    try {
      await addLabel(fullName);
      setShowCreateLabelModal(false);
      sonnerToast.success(`Folder "${fullName}" created`);
    } catch (err) {
      sonnerToast.error('Failed to create folder');
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

  useEffect(() => {
    return () => {
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
      const isInsideFilterSubmenu = filterSubmenuRef.current?.contains(target);
      const isInsideFilterButton = filterButtonRef.current?.contains(target);
      
      // Only close if click is outside all menus
      if (!isInsideDropdown && !isInsideFilterSubmenu && !isInsideFilterButton) {
        setShowMoreMenu(false);
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

  // Initialize reply/replyAll composer with signature
  useEffect(() => {
    // Only initialize when composer opens for reply/replyAll (not forward, not loading draft)
    if (showReplyComposer && (replyMode === 'reply' || replyMode === 'replyAll') && !draftId) {
      // Initialize with signature if available, otherwise empty
      const signatureContent = currentProfile?.signature 
        ? '<br><br>' + currentProfile.signature 
        : '';
      setReplyContent(signatureContent);
      console.log('✍️ Reply composer initialized with signature');
    }
  }, [showReplyComposer, replyMode, draftId, currentProfile?.signature]);

  // Format forwarded message content (with signature)
  useEffect(() => {
    if (replyMode === 'forward' && forwardingMessage && showReplyComposer) {
      // Add signature at top (before forwarded content)
      const signatureContent = currentProfile?.signature 
        ? '<br><br>' + currentProfile.signature 
        : '';
      
      let forwardedContent = signatureContent;
      
      if (forwardType === 'single') {
        // Format single message forward
        const { time } = formatEmailTime(forwardingMessage.date);
        const date = new Date(forwardingMessage.date).toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        
        forwardedContent += `<br><br>---------- Forwarded message ---------<br>` +
          `From: &lt;${forwardingMessage.from.email}&gt;<br>` +
          `Date: ${date} at ${time}<br>` +
          `Subject: ${forwardingMessage.subject}<br>` +
          `To: &lt;${forwardingMessage.to?.[0]?.email || ''}&gt;<br><br>` +
          `${forwardingMessage.body || ''}`;
      } else if (forwardType === 'all') {
        // Format all messages in thread
        forwardedContent += '<br><br>';
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
    }
    // 🎯 REMOVED: Auto-clear logic that caused race conditions
    // Content should only be cleared explicitly by user actions (close, discard, send)
  }, [replyMode, forwardingMessage, forwardType, showReplyComposer, threadMessages, currentProfile?.signature]);

  // Draft saving utilities
  const hashDraftState = useCallback(() => {
    const state = {
      to: forwardToRef.current,
      body: replyContentRef.current,
      mode: replyModeRef.current
    };
    return btoa(JSON.stringify(state));
  }, []); // No dependencies - uses refs

  const isEmpty = useCallback(() => {
    // For forward mode, check if both to and body are empty
    if (replyModeRef.current === 'forward') {
      return !forwardToRef.current.trim() && !replyContentRef.current.trim();
    }
    // For reply/replyAll mode, only check body
    return !replyContentRef.current.trim();
  }, []); // No dependencies - uses refs

  const saveDraft = useCallback(async () => {
    console.log('🔍 saveDraft called');
    console.log('  - isDirty:', isDirty);
    console.log('  - isDirtyRef.current:', isDirtyRef.current);
    console.log('  - replyContent:', replyContent.substring(0, 50));
    console.log('  - forwardTo:', forwardTo);
    console.log('  - replyMode:', replyMode);
    
    if (!isDirtyRef.current) {
      console.log('❌ Not dirty (ref check), skipping save');
      return;
    }
    
    // Check if empty - delete if exists
    const emptyCheck = isEmpty();
    console.log('🔍 isEmpty check:', emptyCheck);
    
    if (emptyCheck) {
      console.log('❌ Content is empty, skipping save');
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
    console.log('🔍 Hash comparison:');
    console.log('  - Current hash:', currentHash);
    console.log('  - Last hash:', lastHash);
    console.log('  - Are equal?:', currentHash === lastHash);
    
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
      // Use refs to get current values (avoid stale closures)
      const currentReplyContent = replyContentRef.current;
      const currentForwardTo = forwardToRef.current;
      const currentReplyMode = replyModeRef.current;
      
      // Determine recipient based on reply mode
      let recipientEmail = currentForwardTo; // For forward mode
      
      if (currentReplyMode === 'reply' || currentReplyMode === 'replyAll') {
        // For reply modes, use the original sender's email
        recipientEmail = email?.from?.email || '';
      }

      // Build CC/BCC strings from current state
      const ccString = ccRecipients.filter(e => e.trim()).join(',');
      const bccString = bccRecipients.filter(e => e.trim()).join(',');

      const payload = {
        to: recipientEmail,
        body: currentReplyContent,
        mode: currentReplyMode,
        threadId: email?.threadId,
        inReplyTo: email?.id,
        cc: ccString || undefined,
        bcc: bccString || undefined
      };

      console.log('📝 Draft payload:', { ...payload, body: payload.body.substring(0, 100) + '...' });

      let response;
      if (!draftId) {
        // Create new draft
        response = await createReplyDraft(payload);
        console.log('📝 Created draft:', response);
        setDraftId(response.id);
        setDraftVersion(response.version);
        
        // Emit event to increment draft counter
        window.dispatchEvent(new CustomEvent('draft-created', { 
          detail: { draftId: response.id } 
        }));
        console.log('📤 Emitted draft-created event for:', response.id);
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
  }, [isDirty, isEmpty, draftId, draftVersion, lastHash, hashDraftState, email]); // Removed replyContent, forwardTo, replyMode (using refs)

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

  const toggleQuotedContent = (messageId: string) => {
    setExpandedQuotedContent(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
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

    // Strip quoted content (Gmail/Outlook reply history)
    const { cleanBody, quotedContent } = stripQuotedText(htmlBody);
    
    // Store quoted content in map for later toggle
    if (quotedContent && !quotedContentMap.has(message.id)) {
      setQuotedContentMap(prev => new Map(prev).set(message.id, quotedContent));
      console.log('📝 Stored quoted content for message:', message.id, 'Length:', quotedContent.length);
    }
    
    console.log('✂️ Stripped quoted content. Original:', htmlBody.length, 'Clean:', cleanBody.length, 'Quoted:', quotedContent?.length || 0);

    // Sanitize with email-safe config - preserve formatting and images
    const clean = DOMPurify.sanitize(cleanBody, {
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
        style={{ minHeight: '50px', height: 'auto' }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          const iframe = e.target as HTMLIFrameElement;
          if (iframe.contentDocument) {
            // Use body scrollHeight for more accurate measurement
            const body = iframe.contentDocument.body;
            const height = body ? body.scrollHeight : iframe.contentDocument.documentElement.scrollHeight;
            // Reduce extra padding from 20px to 5px
            iframe.style.height = `${height + 5}px`;
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
            navigate(getBackToListUrl());
          }}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
        >
          Close
        </button>
      </div>
    );
  }

  // 🔧 Helper: Normalize email address for comparison
  const normalizeEmail = (emailStr: string): string => {
    if (!emailStr) return '';
    // Remove angle brackets and lowercase
    return emailStr.replace(/[<>]/g, '').trim().toLowerCase();
  };

  // 🔧 Helper: Find the correct message to reply to (never reply to yourself)
  const getReplyToMessage = (): Email | null => {
    if (!currentProfile?.userEmail) return latestMessage;
    
    const currentUserEmail = normalizeEmail(currentProfile.userEmail);
    const latestFromEmail = normalizeEmail(latestMessage.from.email);
    
    // Check if latest message is from current user
    const isLatestFromMe = latestFromEmail === currentUserEmail;
    
    if (isLatestFromMe && threadMessages.length > 1) {
      // Find the most recent message NOT from current user
      for (let i = threadMessages.length - 2; i >= 0; i--) {
        const msg = threadMessages[i];
        const msgFromEmail = normalizeEmail(msg.from.email);
        if (msgFromEmail !== currentUserEmail) {
          console.log('📧 Latest message is from me, replying to previous sender:', msg.from.email);
          return msg;
        }
      }
      // Edge case: All messages are from current user
      console.warn('⚠️ All messages in thread are from current user');
      return null;
    }
    
    return latestMessage;
  };

  // 🔧 Helper: Get reply recipients with self-exclusion and deduplication
  const getReplyRecipients = (message: Email | null, mode: 'reply' | 'replyAll'): { to: string; cc: string } => {
    if (!message || !currentProfile?.userEmail) return { to: '', cc: '' };
    
    const currentUserEmail = normalizeEmail(currentProfile.userEmail);
    
    if (mode === 'reply') {
      // Reply: Only to sender
      const senderEmail = normalizeEmail(message.from.email);
      if (senderEmail === currentUserEmail) {
        console.warn('⚠️ Cannot reply to yourself');
        return { to: '', cc: '' };
      }
      return { to: message.from.email, cc: '' };
    }
    
    // Reply All: Sender + all To + all CC, excluding current user
    const allRecipients: Array<{ email: string; name: string }> = [];
    
    // Add sender
    allRecipients.push(message.from);
    
    // Add all To recipients
    if (message.to && message.to.length > 0) {
      allRecipients.push(...message.to);
    }
    
    // Add all CC recipients
    if (message.cc && message.cc.length > 0) {
      allRecipients.push(...message.cc);
    }
    
    // Filter out current user and deduplicate
    const seen = new Set<string>();
    const filtered: Array<{ email: string; name: string }> = [];
    
    for (const recipient of allRecipients) {
      const normalizedEmail = normalizeEmail(recipient.email);
      
      // Skip current user
      if (normalizedEmail === currentUserEmail) continue;
      
      // Skip duplicates
      if (seen.has(normalizedEmail)) continue;
      
      seen.add(normalizedEmail);
      filtered.push(recipient);
    }
    
    if (filtered.length === 0) {
      console.warn('⚠️ No recipients after filtering current user');
      return { to: '', cc: '' };
    }
    
    // Gmail style: Original sender is primary recipient, everyone else goes to CC
    const primaryRecipient = filtered[0].email;
    const ccRecipients = filtered.slice(1).map(r => r.email).join(',');
    
    console.log('📧 Reply All recipients:', { to: primaryRecipient, cc: ccRecipients });
    
    return { to: primaryRecipient, cc: ccRecipients };
  };

  const latestMessage = threadMessages[threadMessages.length - 1] || email;
  const replyToMessage = getReplyToMessage();
  const { time, relative } = formatEmailTime(latestMessage.date);

  // Debug: Log render state
  console.log('🎨 RENDER STATE:', {
    showReplyComposer,
    replyContentLength: replyContent.length,
    draftId,
    isDirty,
    emailId: email?.id,
    threadMessagesCount: threadMessages.length
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Toolbar - Gmail style */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              clearSelection();
              navigate(getBackToListUrl());
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Back to list"
          >
            <X size={20} className="text-gray-700" />
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
          <button
            onClick={() => setShowMoveDialog(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Move to folder"
          >
            <FolderInput size={18} className="text-gray-700" />
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
            open={showMoreMenu || showFilterSubmenu} 
            onOpenChange={(open) => {
              // Don't close if submenus are open
              if (!open && !showFilterSubmenu) {
                setShowMoreMenu(false);
              } else if (open) {
                setShowMoreMenu(true);
              }
            }}
            modal={false}
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
                if (showFilterSubmenu) {
                  e.preventDefault();
                }
              }}
              onInteractOutside={(e) => {
                // Prevent closing when interacting with submenus
                if (showFilterSubmenu) {
                  e.preventDefault();
                }
              }}
              onEscapeKeyDown={(e) => {
                // Prevent closing on Escape if submenus are open
                if (showFilterSubmenu) {
                  e.preventDefault();
                }
              }}
              onFocusOutside={(e) => {
                // Prevent closing when focus moves to submenus
                if (showFilterSubmenu) {
                  e.preventDefault();
                }
              }}
            >
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
                      top: `${dropdownContentRef.current.getBoundingClientRect().top}px`,
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
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMetadata(!showMetadata);
                  }}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
                >
                  <span>to me</span>
                  <ChevronDown size={12} className={`transition-transform ${showMetadata ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Time */}
          <div className="text-xs text-gray-600 whitespace-nowrap ml-3">
            <div>{time}</div>
            <div className="text-gray-500">({relative})</div>
          </div>
        </div>
        
        {/* Metadata Dropdown - Rendered outside of overflow containers */}
        {showMetadata && (
          <div 
            className="mx-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5 text-xs">
              <div className="flex">
                <span className="text-gray-500 w-16">from:</span>
                <span className="text-gray-800 font-medium">{latestMessage.from.name} &lt;{latestMessage.from.email}&gt;</span>
              </div>
              <div className="flex">
                <span className="text-gray-500 w-16">to:</span>
                <span className="text-gray-800">{latestMessage.to?.map(t => t.email).join(', ') || 'me'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-500 w-16">date:</span>
                <span className="text-gray-800">{format(parseISO(latestMessage.date), 'MMM d, yyyy, h:mm a')}</span>
              </div>
              <div className="flex">
                <span className="text-gray-500 w-16">subject:</span>
                <span className="text-gray-800">{latestMessage.subject || '(no subject)'}</span>
              </div>
              {latestMessage.cc && latestMessage.cc.length > 0 && (
                <div className="flex">
                  <span className="text-gray-500 w-16">cc:</span>
                  <span className="text-gray-800">{latestMessage.cc.map(c => c.email).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Email Body - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Reply Composer - Clean, minimal design - AT TOP */}
        {showReplyComposer && !isReplyExpanded && (
          <div ref={replyComposerRef} className="mb-6 px-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  {replyMode === 'reply' && 'Reply'}
                  {replyMode === 'replyAll' && 'Reply all'}
                  {replyMode === 'forward' && 'Forward'}
                </h3>
                {/* Draft continuation indicator */}
                {draftId && !isDirty && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    Continuing draft
                  </span>
                )}
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
                type="button"
                onClick={() => setIsReplyExpanded(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                title="Expand"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            {/* Email metadata fields */}
            <div className="space-y-1 mb-3 text-xs border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-12">From:</span>
                <span className="text-gray-800">{currentProfile?.userEmail || 'me'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-12">To:</span>
                <span className="text-gray-800">
                  {(() => {
                    if (replyMode === 'forward') {
                      return forwardTo || 'Enter recipient...';
                    }
                    
                    // Get filtered recipients
                    const { to } = getReplyRecipients(replyToMessage, replyMode);
                    
                    // 🐛 Debug logging
                    console.log('📧 Reply To field:', {
                      replyMode,
                      to,
                      replyToMessage: replyToMessage?.from,
                      latestMessage: latestMessage?.from
                    });
                    
                    return to || 'No valid recipients';
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-12">Date:</span>
                <span className="text-gray-800">{format(new Date(), 'MMM d, yyyy, h:mm a')}</span>
              </div>
              {replyMode === 'replyAll' && (() => {
                const { cc } = getReplyRecipients(replyToMessage, 'replyAll');
                return cc ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-12">CC:</span>
                    <span className="text-gray-800 truncate">{cc}</span>
                  </div>
                ) : null;
              })()}
              
              {/* CC/BCC Toggle buttons */}
              {(!showCc || !showBcc) && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-200 mt-1">
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Add CC
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Add BCC
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* CC Section */}
            {showCc && (
              <div className="relative mb-2">
                <div className="flex items-center border border-gray-200 rounded-lg py-1.5 px-3 gap-2 bg-gray-50">
                  <span className="text-gray-500 text-xs w-10">CC:</span>
                  <div className="flex-1 flex flex-wrap items-center gap-1">
                    {/* Display existing CC recipients */}
                    {ccRecipients.map((email, index) => (
                      <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px]">
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => removeCcRecipient(email)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    
                    {/* CC Input field */}
                    <input
                      type="text"
                      value={ccInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleCcInputChange(e);
                        
                        // Auto-convert to badge when space or comma is detected
                        if (value.endsWith(' ') || value.endsWith(',')) {
                          const email = value.slice(0, -1).trim();
                          if (email && email.includes('@') && !ccRecipients.includes(email)) {
                            setCcRecipients([...ccRecipients, email]);
                            setCcInput('');
                            handleDraftChange();
                          }
                        }
                      }}
                      onFocus={handleCcInputFocus}
                      onBlur={() => {
                        // Convert to badge on blur if valid email
                        const email = ccInput.trim();
                        if (email && email.includes('@') && !ccRecipients.includes(email)) {
                          setCcRecipients([...ccRecipients, email]);
                          setCcInput('');
                          handleDraftChange();
                        }
                        handleCcInputBlur();
                      }}
                      onKeyDown={handleCcInputKeyDown}
                      className="flex-1 min-w-[100px] outline-none text-xs py-0.5 bg-transparent"
                      placeholder=""
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCc(false);
                      setCcRecipients([]);
                      setCcInput('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                {/* CC Contact dropdown */}
                {showCcDropdown && (
                  <div className="absolute top-full left-0 right-0 z-[998] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {filteredCcContacts.length > 0 ? (
                      filteredCcContacts.map((contact, index) => (
                        <div
                          key={`cc-${contact.email}-${index}`}
                          onClick={() => handleCcContactSelect(contact)}
                          className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          {contact.photoUrl ? (
                            <img
                              src={contact.photoUrl}
                              alt={contact.name}
                              className="w-6 h-6 rounded-full mr-2 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0">
                              {getProfileInitial(contact.name, contact.email)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-900 truncate">
                                {contact.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-2 text-gray-500 text-xs">No contacts found</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* BCC Section */}
            {showBcc && (
              <div className="relative mb-2">
                <div className="flex items-center border border-gray-200 rounded-lg py-1.5 px-3 gap-2 bg-gray-50">
                  <span className="text-gray-500 text-xs w-10">BCC:</span>
                  <div className="flex-1 flex flex-wrap items-center gap-1">
                    {/* Display existing BCC recipients */}
                    {bccRecipients.map((email, index) => (
                      <div key={index} className="flex items-center bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full text-[10px]">
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => removeBccRecipient(email)}
                          className="ml-1 text-purple-600 hover:text-purple-800"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    
                    {/* BCC Input field */}
                    <input
                      type="text"
                      value={bccInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleBccInputChange(e);
                        
                        // Auto-convert to badge when space or comma is detected
                        if (value.endsWith(' ') || value.endsWith(',')) {
                          const email = value.slice(0, -1).trim();
                          if (email && email.includes('@') && !bccRecipients.includes(email)) {
                            setBccRecipients([...bccRecipients, email]);
                            setBccInput('');
                            handleDraftChange();
                          }
                        }
                      }}
                      onFocus={handleBccInputFocus}
                      onBlur={() => {
                        // Convert to badge on blur if valid email
                        const email = bccInput.trim();
                        if (email && email.includes('@') && !bccRecipients.includes(email)) {
                          setBccRecipients([...bccRecipients, email]);
                          setBccInput('');
                          handleDraftChange();
                        }
                        handleBccInputBlur();
                      }}
                      onKeyDown={handleBccInputKeyDown}
                      className="flex-1 min-w-[100px] outline-none text-xs py-0.5 bg-transparent"
                      placeholder=""
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBcc(false);
                      setBccRecipients([]);
                      setBccInput('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                {/* BCC Contact dropdown */}
                {showBccDropdown && (
                  <div className="absolute top-full left-0 right-0 z-[998] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {filteredBccContacts.length > 0 ? (
                      filteredBccContacts.map((contact, index) => (
                        <div
                          key={`bcc-${contact.email}-${index}`}
                          onClick={() => handleBccContactSelect(contact)}
                          className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          {contact.photoUrl ? (
                            <img
                              src={contact.photoUrl}
                              alt={contact.name}
                              className="w-6 h-6 rounded-full mr-2 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0">
                              {getProfileInitial(contact.name, contact.email)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-900 truncate">
                                {contact.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-2 text-gray-500 text-xs">No contacts found</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {replyMode === 'forward' && (
              <div className="mb-3">
                <input
                  type="email"
                  value={forwardTo}
                  onChange={(e) => {
                    setForwardTo(e.target.value);
                    forwardToRef.current = e.target.value; // Update ref
                    handleDraftChange();
                  }}
                  placeholder="Forward to..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="border border-gray-300 rounded overflow-hidden mb-3" style={{ minHeight: '350px' }}>
              <RichTextEditor
                value={replyContent}
                onChange={(content) => {
                  setReplyContent(content);
                  replyContentRef.current = content; // Update ref
                  handleDraftChange();
                }}
                placeholder="Type your message..."
                minHeight="400px"
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
                        const draftIdToDelete = draftId;
                        const isDraftEmail = email?.labelIds?.includes('DRAFT');
                        
                        // Delete the draft
                        await deleteReplyDraft(draftIdToDelete);
                        console.log('🗑️ Draft deleted:', draftIdToDelete);
                        
                        // Emit event to decrement draft counter
                        window.dispatchEvent(new CustomEvent('email-deleted', { 
                          detail: { emailId: draftIdToDelete } 
                        }));
                        console.log('📤 Emitted email-deleted event for discarded draft:', draftIdToDelete);
                        
                        sonnerToast.success('Draft discarded');
                        
                        // Close composer and reset state
                        setShowReplyComposer(false);
                        setReplyContent('');
                        setForwardTo('');
                        setDraftId(null);
                        setIsDirty(false);
                        isDirtyRef.current = false;
                        replyContentRef.current = '';
                        forwardToRef.current = '';
                        
                        // CRITICAL UX: Context-aware navigation
                        if (isDraftEmail) {
                          // Case: Viewing draft from Drafts folder
                          // Draft already deleted from Gmail - just navigate away
                          console.log('🔄 Discarded draft from Drafts folder, navigating back to list');
                          clearSelection();
                          navigate(getBackToListUrl());
                          // DON'T call onEmailDelete - draft already deleted, would cause 404
                          // List removal happens via 'email-deleted' event listener
                        } else {
                          // Case: Draft in a thread (inbox view)
                          // The thread still exists, just refresh to show without draft
                          console.log('🔄 Discarded draft from thread, refreshing view');
                          await fetchEmailAndThread();
                          // Update parent to remove orange "Draft" badge
                          if (email && onEmailUpdate) {
                            onEmailUpdate({ ...email, hasDraftInThread: false } as Email);
                          }
                        }
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
            </div>
          </div>
        )}

        <div className="px-4 py-2">
          {threadMessages.length > 1 ? (
            <div className="space-y-1.5">
              {[...threadMessages].reverse().map((message) => {
                const isExpanded = expandedMessages.has(message.id);
                const { fullDate, relative } = formatEmailTime(message.date);
                
                // Extract recipients for expanded view
                const toEmails = message.to?.map(t => t.email).join(', ') || '';
                const ccEmails = message.cc?.map(c => c.email).join(', ') || '';

                return (
                  <div
                    key={message.id}
                    className={`overflow-hidden transition-all ${
                      isExpanded ? '' : ''
                    }`}
                  >
                    {/* Collapsed Header */}
                    <div className="w-full px-2 py-1.5 flex items-center gap-2 hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => toggleMessageExpansion(message.id)}
                        className="flex items-start gap-2 flex-1 min-w-0 text-left"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5 ${getSenderColor(message.from.email)}`}>
                          {getInitials(message.from.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{cleanDisplayName(message.from.name)}</span>
                            {message.attachments && message.attachments.length > 0 && (
                              <Paperclip size={12} className="text-gray-400" />
                            )}
                          </div>
                          <div className="text-xs text-black mt-0.5 font-bold">
                            {fullDate} ({relative})
                          </div>
                          {isExpanded && (
                            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                              {toEmails && (
                                <div className="truncate">
                                  <span className="text-gray-400">To:</span> {toEmails}
                                </div>
                              )}
                              {ccEmails && (
                                <div className="truncate">
                                  <span className="text-gray-400">CC:</span> {ccEmails}
                                </div>
                              )}
                            </div>
                          )}
                          {!isExpanded && (
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              {message.preview ? message.preview.substring(0, 100) : 'No preview'}
                            </div>
                          )}
                        </div>
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
                      <div className="px-2 pb-2 pt-1.5">
                        {renderMessageBody(message)}
                        
                        {/* Quoted Content Toggle - Gmail-style "..." */}
                        {quotedContentMap.has(message.id) && (
                          <div className="mt-3 pt-2">
                            <button
                              onClick={() => toggleQuotedContent(message.id)}
                              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                            >
                              {expandedQuotedContent.has(message.id) ? (
                                <ChevronDown size={12} className="text-gray-500" />
                              ) : (
                                <ChevronRight size={12} className="text-gray-500" />
                              )}
                            </button>
                            
                            {expandedQuotedContent.has(message.id) && (
                              <div className="mt-2 pl-3 border-l-2 border-gray-300">
                                <div 
                                  className="text-xs text-gray-600 opacity-75"
                                  dangerouslySetInnerHTML={{ 
                                    __html: DOMPurify.sanitize(quotedContentMap.get(message.id)!, {
                                      ADD_TAGS: ['style', 'link'],
                                      ADD_ATTR: ['target', 'style', 'class', 'href'],
                                      ALLOW_DATA_ATTR: false,
                                    })
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        
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
              
              {/* Quoted Content Toggle - Gmail-style "..." for single message */}
              {quotedContentMap.has(latestMessage.id) && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => toggleQuotedContent(latestMessage.id)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {expandedQuotedContent.has(latestMessage.id) ? (
                      <ChevronDown size={12} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={12} className="text-gray-500" />
                    )}
                    <span className="font-medium">
                      {expandedQuotedContent.has(latestMessage.id) ? 'Hide' : 'Show'} quoted text
                    </span>
                  </button>
                  
                  {expandedQuotedContent.has(latestMessage.id) && (
                    <div className="mt-2 pl-3 border-l-2 border-gray-300">
                      <div 
                        className="text-xs text-gray-600 opacity-75"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(quotedContentMap.get(latestMessage.id)!, {
                            ADD_TAGS: ['style', 'link'],
                            ADD_ATTR: ['target', 'style', 'class', 'href'],
                            ALLOW_DATA_ATTR: false,
                          })
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
              
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

        {/* Fullscreen Reply Composer */}
        {showReplyComposer && isReplyExpanded && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full h-full flex flex-col transition-all duration-300 ease-in-out">
              {/* Header */}
              <div className="px-4 py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between flex-shrink-0 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-gray-800">
                    {replyMode === 'reply' && 'Reply'}
                    {replyMode === 'replyAll' && 'Reply all'}
                    {replyMode === 'forward' && 'Forward'}
                  </h2>
                  {draftId && !isDirty && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      Continuing draft
                    </span>
                  )}
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
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsReplyExpanded(false)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    title="Minimize"
                  >
                    <Minimize2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplyExpanded(false);
                      setShowReplyComposer(false);
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col min-h-0 p-4">
                {/* CC/BCC Toggle buttons for expanded mode */}
                {(!showCc || !showBcc) && (
                  <div className="flex items-center gap-3 mb-3">
                    {!showCc && (
                      <button
                        type="button"
                        onClick={() => setShowCc(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Add CC
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        type="button"
                        onClick={() => setShowBcc(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Add BCC
                      </button>
                    )}
                  </div>
                )}

                {/* CC Section for expanded mode */}
                {showCc && (
                  <div className="relative mb-3">
                    <div className="flex items-center border border-gray-200 rounded-lg py-1.5 px-3 gap-2 bg-gray-50">
                      <span className="text-gray-500 text-xs w-10">CC:</span>
                      <div className="flex-1 flex flex-wrap items-center gap-1">
                        {ccRecipients.map((email, index) => (
                          <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px]">
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => removeCcRecipient(email)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <input
                          type="text"
                          value={ccInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            handleCcInputChange(e);
                            if (value.endsWith(' ') || value.endsWith(',')) {
                              const email = value.slice(0, -1).trim();
                              if (email && email.includes('@') && !ccRecipients.includes(email)) {
                                setCcRecipients([...ccRecipients, email]);
                                setCcInput('');
                                handleDraftChange();
                              }
                            }
                          }}
                          onFocus={handleCcInputFocus}
                          onBlur={() => {
                            const email = ccInput.trim();
                            if (email && email.includes('@') && !ccRecipients.includes(email)) {
                              setCcRecipients([...ccRecipients, email]);
                              setCcInput('');
                              handleDraftChange();
                            }
                            handleCcInputBlur();
                          }}
                          onKeyDown={handleCcInputKeyDown}
                          className="flex-1 min-w-[100px] outline-none text-xs py-0.5 bg-transparent"
                          placeholder=""
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCc(false);
                          setCcRecipients([]);
                          setCcInput('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {showCcDropdown && (
                      <div className="absolute top-full left-0 right-0 z-[10000] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                        {filteredCcContacts.length > 0 ? (
                          filteredCcContacts.map((contact, index) => (
                            <div
                              key={`cc-exp-${contact.email}-${index}`}
                              onClick={() => handleCcContactSelect(contact)}
                              className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              {contact.photoUrl ? (
                                <img src={contact.photoUrl} alt={contact.name} className="w-6 h-6 rounded-full mr-2 flex-shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0">
                                  {getProfileInitial(contact.name, contact.email)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-gray-900 truncate">{contact.name}</span>
                                <p className="text-[10px] text-gray-500 truncate">{contact.email}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-2 py-2 text-gray-500 text-xs">No contacts found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* BCC Section for expanded mode */}
                {showBcc && (
                  <div className="relative mb-3">
                    <div className="flex items-center border border-gray-200 rounded-lg py-1.5 px-3 gap-2 bg-gray-50">
                      <span className="text-gray-500 text-xs w-10">BCC:</span>
                      <div className="flex-1 flex flex-wrap items-center gap-1">
                        {bccRecipients.map((email, index) => (
                          <div key={index} className="flex items-center bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full text-[10px]">
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => removeBccRecipient(email)}
                              className="ml-1 text-purple-600 hover:text-purple-800"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <input
                          type="text"
                          value={bccInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            handleBccInputChange(e);
                            if (value.endsWith(' ') || value.endsWith(',')) {
                              const email = value.slice(0, -1).trim();
                              if (email && email.includes('@') && !bccRecipients.includes(email)) {
                                setBccRecipients([...bccRecipients, email]);
                                setBccInput('');
                                handleDraftChange();
                              }
                            }
                          }}
                          onFocus={handleBccInputFocus}
                          onBlur={() => {
                            const email = bccInput.trim();
                            if (email && email.includes('@') && !bccRecipients.includes(email)) {
                              setBccRecipients([...bccRecipients, email]);
                              setBccInput('');
                              handleDraftChange();
                            }
                            handleBccInputBlur();
                          }}
                          onKeyDown={handleBccInputKeyDown}
                          className="flex-1 min-w-[100px] outline-none text-xs py-0.5 bg-transparent"
                          placeholder=""
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBcc(false);
                          setBccRecipients([]);
                          setBccInput('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {showBccDropdown && (
                      <div className="absolute top-full left-0 right-0 z-[10000] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                        {filteredBccContacts.length > 0 ? (
                          filteredBccContacts.map((contact, index) => (
                            <div
                              key={`bcc-exp-${contact.email}-${index}`}
                              onClick={() => handleBccContactSelect(contact)}
                              className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              {contact.photoUrl ? (
                                <img src={contact.photoUrl} alt={contact.name} className="w-6 h-6 rounded-full mr-2 flex-shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0">
                                  {getProfileInitial(contact.name, contact.email)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-gray-900 truncate">{contact.name}</span>
                                <p className="text-[10px] text-gray-500 truncate">{contact.email}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-2 py-2 text-gray-500 text-xs">No contacts found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {replyMode === 'forward' && (
                  <div className="mb-3">
                    <input
                      type="email"
                      value={forwardTo}
                      onChange={(e) => {
                        setForwardTo(e.target.value);
                        forwardToRef.current = e.target.value;
                        handleDraftChange();
                      }}
                      placeholder="Forward to..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div className="flex-1 border border-gray-300 rounded overflow-hidden">
                  <RichTextEditor
                    value={replyContent}
                    onChange={(content) => {
                      setReplyContent(content);
                      replyContentRef.current = content;
                      handleDraftChange();
                    }}
                    placeholder="Type your message..."
                    minHeight="100%"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2 flex-shrink-0 rounded-b-lg">
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyContent.trim() || (replyMode === 'forward' && !forwardTo.trim())}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors shadow-sm"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
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
                {draftId && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to discard this draft?')) {
                        try {
                          await deleteReplyDraft(draftId);
                          window.dispatchEvent(new CustomEvent('email-deleted', { detail: { emailId: draftId } }));
                          sonnerToast.success('Draft discarded');
                          setIsReplyExpanded(false);
                          setShowReplyComposer(false);
                          setReplyContent('');
                          setForwardTo('');
                          setDraftId(null);
                          setIsDirty(false);
                          isDirtyRef.current = false;
                          replyContentRef.current = '';
                          forwardToRef.current = '';
                          await fetchEmailAndThread();
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
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Action Bar - Hidden when replying */}
      {!showReplyComposer && (
        <div className="px-4 py-1.5 border-t border-gray-200 flex items-center gap-2 bg-white flex-shrink-0">
          <button
            onClick={() => {
              // Check if we have valid recipients before opening composer
              if (!replyToMessage) {
                sonnerToast.error('Cannot reply: All messages in this thread are from you');
                return;
              }
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
              // Check if we have valid recipients before opening composer
              if (!replyToMessage) {
                sonnerToast.error('Cannot reply: All messages in this thread are from you');
                return;
              }
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
                      <div className="px-3 py-3 text-sm text-gray-500">No folders found</div>
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
                <h2 className="text-lg font-semibold text-gray-900">New folder</h2>
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
                  <label className="text-sm text-gray-600">Folder name</label>
                  <Input
                    placeholder="Enter folder name"
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
                    Nest folder under
                  </label>
                </div>

                {nestUnder && (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Parent folder</label>
                    <Select value={parentLabel} onValueChange={setParentLabel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose parent folder..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {filteredFilterLabels.map((label: any) => (
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
                    Also auto-move future emails from {cleanEmailAddress(email?.from?.email || '') || 'this sender'}
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
      
      {/* Move to Folder Dialog */}
      <MoveToFolderDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        selectedCount={1}
        onMove={handleMoveToFolder}
      />
    </div>
  );
}

export default EmbeddedViewEmailClean;