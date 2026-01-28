import { useState, useEffect, useRef } from 'react';
import { X, Reply, ReplyAll, Forward, Trash, MoreVertical, Star, Paperclip, Download, ChevronDown, ChevronRight, Mail, MailOpen, Flag, MailWarning, Filter, Settings, Plus, Maximize2, Minimize2, FolderInput, Trash2, SendHorizontal } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  getEmailById,
  getThreadEmails,
  sendReply,
  sendReplyAll,
  sendEmail,
} from '../../services/emailService';
import {
  createGmailFilter,
  createReplyDraft,
  updateReplyDraft,
  deleteReplyDraft,
} from '../../integrations/gapiService';
import { optimizedEmailService } from '../../services/optimizedEmailService';
import { AttachmentCache } from '../../services/attachmentCache';
import { generatePdfThumbnailFromBase64, getCachedThumbnail, hasCachedThumbnail } from '../../services/pdfThumbnailService';
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
import DOMPurify from 'dompurify';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { queueGmailRequest } from '../../utils/requestQueue';

// Extracted utilities
import { formatEmailTime, getInitials, formatFileSize } from './EmbeddedViewEmail/utils/formatters';
import { getSenderColor, cleanDisplayName } from './EmbeddedViewEmail/utils/senderColors';
import type { EmbeddedViewEmailProps } from './EmbeddedViewEmail/types';

// Extracted modal components
import { AttachmentPreviewModal } from './EmbeddedViewEmail/components/AttachmentPreviewModal';
import { CreateFilterModal } from './EmbeddedViewEmail/components/CreateFilterModal';
import { CreateLabelModal } from './EmbeddedViewEmail/components/CreateLabelModal';
import { MessageBodyRenderer } from './EmbeddedViewEmail/components/MessageBodyRenderer';

// Extracted hooks
import { useEmailActions } from './EmbeddedViewEmail/hooks/useEmailActions';
import { useDraftComposer } from './EmbeddedViewEmail/hooks/useDraftComposer';
import { useInlineImages } from './EmbeddedViewEmail/hooks/useInlineImages';

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

  // Track previous email ID to detect navigation between emails
  const prevEmailIdRef = useRef<string | null>(null);

  // Image cache for inline attachments (cid: references)
  // Replaced by global AttachmentCache
  // const imageCache = useRef<Map<string, string>>(new Map());

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
  const [showCcBcc, setShowCcBcc] = useState(false); // Toggle for Cc/Bcc visibility
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

  // Reply Attachments state
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);

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
  const { currentProfile, gmailSignature } = useProfile(); // Get current profile for From field and Gmail signature
  const { searchContacts, setShouldLoadContacts } = useContacts(); // For CC/BCC dropdown
  const navigate = useNavigate();
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

  // 🎯 Email action handlers (extracted to hook)
  const {
    handleTrash,
    handleMarkAsSpam,
    handleMoveToFolder,
    handleMarkAsUnread,
    handleToggleImportant,
    handleToggleStarred,
  } = useEmailActions({
    email,
    setEmail,
    clearSelection,
    getBackToListUrl,
    onEmailUpdate,
    onEmailDelete,
  });

  // 🎯 Draft composer (extracted to hook)
  const {
    handleDraftChange,
    // saveDraft, scheduleDebouncedSave, hashDraftState, isEmpty - available but handled internally
  } = useDraftComposer({
    email,
    ccRecipients,
    bccRecipients,
    showReplyComposer,
    draftId,
    draftVersion,
    isDirty,
    lastHash,
    replyContentRef,
    forwardToRef,
    replyModeRef,
    isDirtyRef,
    debounceSaveTimerRef,
    failsafeSaveTimerRef,
    setDraftId,
    setDraftVersion,
    setIsDirty,
    setLastHash,
    setIsSaving,
    setLastSavedAt,
  });

  // 🎯 Inline images loader (extracted to hook) - now with batch loading support
  const { loadInlineImagesForMessage, loadImagesForVisibleMessages } = useInlineImages({
    loadedImages,
    threadMessages,
    setThreadMessages,
    setLoadedImages,
  });

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
            // Use global cache
            let dataUrl = AttachmentCache.get(attachment.attachmentId); // Cache by attachmentId (globally unique enough usually, or we can use cacheKey if needed. Actually attachmentId is unique per message but Gmail reuse IDs? No, they are unique.)
            // Note: The original code used a composite key. The new cache uses attachmentId. 
            // RFC says Content-ID is unique within message. attachmentId is unique global handle?
            // Actually reusing the logic from the plan: simple Map<string, string> by attachmentId.
            // Let's stick to attachmentId as key for simplicity and global sharing.

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
                AttachmentCache.set(attachment.attachmentId, dataUrl);
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
  // Reset reply composer state when switching to a different email (not on initial mount)
  useEffect(() => {
    console.log('🔄 Component effect triggered - emailId:', emailId, 'draftIdParam:', draftIdParam, 'showReplyComposer:', showReplyComposer);
    console.log('🔄 Previous emailId:', prevEmailIdRef.current);

    // Detect actual email change (not initial mount, and not same email)
    const isEmailChange = prevEmailIdRef.current !== null && prevEmailIdRef.current !== emailId;

    if (isEmailChange) {
      console.log('🔄 Email navigation detected - resetting reply state');

      // 1. Clear pending debounce/failsafe timers first
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
        debounceSaveTimerRef.current = null;
        console.log('🔄 Cleared debounce timer');
      }
      if (failsafeSaveTimerRef.current) {
        clearTimeout(failsafeSaveTimerRef.current);
        failsafeSaveTimerRef.current = null;
        console.log('🔄 Cleared failsafe timer');
      }

      // 2. Save dirty draft for previous email before resetting (auto-save before discard)
      if (isDirtyRef.current && draftStateRef.current.showComposer) {
        console.log('📝 Saving dirty draft before navigation...');
        // Use refs to get current values and save synchronously
        const currentContent = replyContentRef.current;
        const currentForwardTo = forwardToRef.current;
        const currentMode = replyModeRef.current;
        const currentDraftId = draftStateRef.current.draftId;

        // Only save if there's actual content
        const hasContent = currentMode === 'forward'
          ? currentForwardTo.trim() || currentContent.trim()
          : currentContent.trim();

        if (hasContent && email) {
          // Fire and forget async save for the previous email's draft
          (async () => {
            try {
              const ccString = ccRecipients.filter(e => e.trim()).join(',');
              const bccString = bccRecipients.filter(e => e.trim()).join(',');

              let recipientEmail = currentForwardTo;
              if (currentMode === 'reply' || currentMode === 'replyAll') {
                recipientEmail = email?.from?.email || '';
              }

              const payload = {
                to: recipientEmail,
                body: currentContent,
                mode: currentMode,
                threadId: email?.threadId,
                inReplyTo: email?.id,
                cc: ccString || undefined,
                bcc: bccString || undefined
              };

              if (!currentDraftId) {
                const response = await createReplyDraft(payload);
                console.log('📝 Created draft on navigation:', response.id);
                window.dispatchEvent(new CustomEvent('draft-created', {
                  detail: { draftId: response.id }
                }));
              } else {
                await updateReplyDraft(currentDraftId, payload, draftStateRef.current.version);
                console.log('📝 Updated draft on navigation:', currentDraftId);
              }
            } catch (err) {
              console.error('Failed to save draft on navigation:', err);
            }
          })();
        }
      }

      // 3. Reset all reply composer state for fresh start
      updateDraftState({
        status: 'idle',
        showComposer: false,
        mode: 'reply',
        content: '',
        forwardTo: '',
        draftId: null,
        messageId: null,
        version: 0,
        isDirty: false,
        isSaving: false,
        lastSavedAt: null,
        lastHash: '',
        error: null
      });

      // Reset CC/BCC state
      setCcRecipients([]);
      setBccRecipients([]);
      setCcInput('');
      setBccInput('');
      setShowCc(false);
      setShowBcc(false);

      // Reset other view state
      setIsReplyExpanded(false);
      setForwardingMessage(null);

      console.log('✅ Reply state reset complete');
    }

    // Update prev email ref for next comparison
    prevEmailIdRef.current = emailId;

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

  // Helper to convert File to base64 for Gmail API
  const convertFileToBase64 = (file: File): Promise<{ name: string; mimeType: string; data: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]; // Remove data URL prefix
        resolve({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handler for file attachment from RichTextEditor
  const handleReplyFileAttachment = (files: FileList) => {
    const newFiles = Array.from(files);
    setReplyAttachments(prev => [...prev, ...newFiles]);
    handleDraftChange();
  };

  // Remove an attachment from the list
  const removeReplyAttachment = (index: number) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
    handleDraftChange();
  };

  const handleSendReply = async () => {
    if (!email || !replyContent.trim()) return;

    setSending(true);
    try {
      // Convert attachments to base64
      const attachmentsForSend = await Promise.all(
        replyAttachments.map(file => convertFileToBase64(file))
      );

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
          const replyResult = await sendReply(replyToMessage || email, replyContent, false, finalCc, bccString, attachmentsForSend);
          if (!replyResult.success) {
            sonnerToast.error('Failed to send reply. Please try again.');
            setSending(false);
            return;
          }
          sonnerToast.success(`Email sent successfully to ${autoTo}`);
        } else {
          // Use replyToMessage instead of email
          const replyResult = await sendReplyAll(replyToMessage || email, replyContent, finalCc, bccString, attachmentsForSend);
          if (!replyResult.success) {
            sonnerToast.error('Failed to send reply. Please try again.');
            setSending(false);
            return;
          }
          const allRecipients = [autoTo, finalCc].filter(Boolean).join(', ');
          const recipientCount = allRecipients.split(',').filter(r => r.trim()).length;
          const recipientDisplay = recipientCount === 1 ? autoTo : `${recipientCount} recipients`;
          sonnerToast.success(`Email sent successfully to ${recipientDisplay}`);
        }
      } else if (replyMode === 'forward' && forwardTo.trim()) {
        const subject = email.subject.startsWith('Fwd: ') ? email.subject : `Fwd: ${email.subject}`;
        const sendResult = await sendEmail({
          from: email.from,
          to: [{ name: '', email: forwardTo }],
          subject,
          body: replyContent,
          threadId: email.threadId,
          internalDate: null
        }, attachmentsForSend, undefined, userCc, bccString);
        
        if (!sendResult.success) {
          sonnerToast.error('Failed to forward email. Please try again.');
          setSending(false);
          return;
        }
        sonnerToast.success(`Email sent successfully to ${forwardTo}`);
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
      setReplyAttachments([]); // Clear attachments

      // Refresh thread to show sent message
      await fetchEmailAndThread();

      // Update parent to remove "Draft" badge if this was a draft in thread
      if (email && onEmailUpdate) {
        onEmailUpdate({ ...email, hasDraftInThread: false } as Email);
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      sonnerToast.error('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // NOTE: handleTrash, handleMarkAsSpam, handleMoveToFolder, handleMarkAsUnread, 
  // handleToggleImportant, handleToggleStarred are now provided by useEmailActions hook

  const handleCloseCreateFilterModal = () => {
    setShowCreateFilterModal(false);
    setFilterLabelQuery('');
    setSelectedFilterLabel('');
  };

  const handleSelectFilterLabel = (_labelId: string, labelName: string) => {
    setSelectedFilterLabel(labelName);
    setFilterLabelQuery(labelName);
  };

  // 🔧 COUNTERPARTY LOGIC (Jan 2026): Find the external sender for filter creation
  // In a thread, find the person who initiated or is the main external participant
  const getFilterCounterparty = (): { email: string; name: string } => {
    const currentUserEmail = cleanEmailAddress(currentProfile?.userEmail || '').toLowerCase();
    
    // First, check the first message in thread (original initiator)
    if (threadMessages.length > 0) {
      const firstMessage = threadMessages[0];
      const firstFromEmail = cleanEmailAddress(firstMessage.from?.email || '');
      if (firstFromEmail && firstFromEmail.toLowerCase() !== currentUserEmail) {
        return { 
          email: firstFromEmail, 
          name: firstMessage.from?.name || firstFromEmail 
        };
      }
    }
    
    // If first message is from me, check all thread messages for first external sender
    for (const msg of threadMessages) {
      const msgFromEmail = cleanEmailAddress(msg.from?.email || '');
      if (msgFromEmail && msgFromEmail.toLowerCase() !== currentUserEmail) {
        return { 
          email: msgFromEmail, 
          name: msg.from?.name || msgFromEmail 
        };
      }
    }
    
    // Fallback: check current email's recipients for non-me address
    const currentFromEmail = cleanEmailAddress(email?.from?.email || '');
    if (currentFromEmail.toLowerCase() !== currentUserEmail) {
      return { 
        email: currentFromEmail, 
        name: email?.from?.name || currentFromEmail 
      };
    }
    
    // Last resort: first recipient that's not me
    const recipients = [...(email?.to || []), ...(email?.cc || [])];
    for (const recipient of recipients) {
      const recipientEmail = cleanEmailAddress(recipient.email || '');
      if (recipientEmail && recipientEmail.toLowerCase() !== currentUserEmail) {
        return { 
          email: recipientEmail, 
          name: recipient.name || recipientEmail 
        };
      }
    }
    
    return { email: currentFromEmail, name: email?.from?.name || '' };
  };

  const handleCreateFilterWithLabel = async (skipInbox: boolean = false) => {
    const counterparty = getFilterCounterparty();
    const counterpartyEmail = counterparty.email;
    
    if (!counterpartyEmail) {
      sonnerToast.error('No sender email available');
      return;
    }
    if (!selectedFilterLabel) {
      sonnerToast.error('Please select a folder');
      return;
    }

    // 🔧 SELF-FILTER BUG FIX: Prevent creating filter for own email
    const currentUserEmail = cleanEmailAddress(currentProfile?.userEmail || '').toLowerCase();
    if (counterpartyEmail.toLowerCase() === currentUserEmail) {
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
      const action: { addLabelIds: string[]; removeLabelIds?: string[] } = { 
        addLabelIds: [match.id] 
      };
      if (skipInbox) {
        action.removeLabelIds = ['INBOX'];
      }
      await createGmailFilter({ from: counterpartyEmail }, action);

      sonnerToast.success(`Rule created! Emails from "${counterpartyEmail}" will be moved to "${selectedFilterLabel}"`);
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

  // NOTE: handleForwardAll was removed - unused function. 
  // If "Forward All" feature is needed, add a button that calls handleForwardSingle(email) with forwardType='all'

  // Initialize reply/replyAll composer with signature
  useEffect(() => {
    // Only initialize when composer opens for reply/replyAll (not forward, not loading draft)
    if (showReplyComposer && (replyMode === 'reply' || replyMode === 'replyAll') && !draftId) {
      // Initialize with Gmail signature if available, otherwise empty
      const signatureContent = gmailSignature
        ? '<br><br>' + gmailSignature
        : '';
      setReplyContent(signatureContent);
      console.log('✍️ Reply composer initialized with Gmail signature');
    }
  }, [showReplyComposer, replyMode, draftId, gmailSignature]);

  // Format forwarded message content (with signature)
  useEffect(() => {
    if (replyMode === 'forward' && forwardingMessage && showReplyComposer) {
      // Add Gmail signature at top (before forwarded content)
      const signatureContent = gmailSignature
        ? '<br><br>' + gmailSignature
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
  }, [replyMode, forwardingMessage, forwardType, showReplyComposer, threadMessages, gmailSignature]);

  // 🎯 Draft saving logic moved to useDraftComposer hook
  // 🎯 Inline images loading moved to useInlineImages hook

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
  // Uses batch loading to prevent rate limiting - loads first 3 messages, more on scroll
  useEffect(() => {
    if (!threadMessages.length) return;

    const targetIds = expandedMessages.size > 0
      ? Array.from(expandedMessages)
      : [threadMessages[threadMessages.length - 1].id];

    // Use batch loading - will only load first 3 at a time
    loadImagesForVisibleMessages(targetIds);
  }, [expandedMessages.size, threadMessages.length, loadImagesForVisibleMessages]);

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

        sonnerToast.success(`Downloaded ${filename}`);
      }
    } catch (error) {
      console.error('Failed to download attachment:', error);
      sonnerToast.error('Download failed. Please try again.');
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
      sonnerToast.error('Preview failed. Please try again.');
    }
  };

  // Callback for memoized MessageBodyRenderer to report quoted content
  const handleQuotedContentFound = (messageId: string, quotedContent: string) => {
    if (!quotedContentMap.has(messageId)) {
      setQuotedContentMap(prev => new Map(prev).set(messageId, quotedContent));
    }
  };

  // 🎯 Render message body using memoized component (prevents re-processing on resize)
  const renderMessageBody = (message: Email) => {
    return (
      <MessageBodyRenderer
        message={message}
        imagesLoaded={loadedImages.has(message.id)}
        onQuotedContentFound={handleQuotedContentFound}
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

 /* // Debug: Log render state
  console.log('🎨 RENDER STATE:', {
    showReplyComposer,
    replyContentLength: replyContent.length,
    draftId,
    isDirty,
    emailId: email?.id,
    threadMessagesCount: threadMessages.length
  }); */

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
                    Rules
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
                      onClick={handleCreateNewFilter}
                    >
                      <Plus size={16} className="mr-3 text-gray-500" />
                      Create Rule
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

          {/* Reply Action Buttons - Always visible */}
          <div className="flex items-center gap-1 mr-3">
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
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Reply"
            >
              <Reply size={22} className="text-gray-700" />
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
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Reply all"
            >
              <ReplyAll size={22} className="text-gray-700" />
            </button>
            <button
              onClick={() => {
                setForwardingMessage(latestMessage);
                setForwardType('single');
                setReplyMode('forward');
                setShowReplyComposer(true);
              }}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Forward"
            >
              <Forward size={22} className="text-gray-700" />
            </button>
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
      <div className="flex-1 overflow-y-auto min-w-0">
        {/* Reply Composer - Compose.tsx style design */}
        {showReplyComposer && !isReplyExpanded && (
          <div ref={replyComposerRef} className="mb-6 border-y border-gray-200 overflow-hidden bg-white min-w-0">
            {/* Compact Header - matching Compose.tsx */}
            <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                {/* Send Button - compact */}
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={sending || !replyContent.trim() || (replyMode === 'forward' && !forwardTo.trim())}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                >
                  <SendHorizontal size={12} />
                  {sending ? 'Sending...' : 'Send'}
                </button>

                {/* Draft status indicator */}
                {isSaving && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <span className="animate-pulse">●</span>
                    Saving...
                  </span>
                )}
                {!isSaving && lastSavedAt && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <span>Saved</span>
                  </span>
                )}

                {/* From display - compact */}
                <div className="flex items-center gap-1 text-xs text-gray-700">
                  <span className="text-gray-500">From:</span>
                  <span>{currentProfile?.userEmail || 'me@example.com'}</span>
                </div>
              </div>

              {/* Right side - Close and Discard with text */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowReplyComposer(false)}
                  className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-xs transition-colors"
                  title="Save & Close"
                >
                  <X size={12} />
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Discard composer without saving
                    setShowReplyComposer(false);
                    setReplyContent('');
                    setForwardTo('');
                    setReplyMode('reply');
                    setCcRecipients([]);
                    setBccRecipients([]);
                    setCcInput('');
                    setBccInput('');
                    setShowCc(false);
                    setShowBcc(false);
                    setShowCcBcc(false);
                    replyContentRef.current = '';
                    forwardToRef.current = '';
                    setIsDirty(false);
                    isDirtyRef.current = false;
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded text-xs transition-colors"
                  title="Discard draft"
                >
                  <Trash2 size={12} />
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => setIsReplyExpanded(true)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title="Expand"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>

            {/* Recipient fields section - Compact style matching Compose.tsx */}
            <div className="flex-shrink-0 px-3 py-1 space-y-1 overflow-x-hidden overflow-y-visible">
              {/* TO Section */}
              <div className="relative">
                <div className="flex items-start gap-2 py-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="px-2 py-0.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex-shrink-0"
                    >
                      To
                    </button>
                    {!showCcBcc && (ccRecipients.length === 0 && bccRecipients.length === 0) && replyMode !== 'replyAll' && (
                      <button
                        type="button"
                        onClick={() => setShowCcBcc(true)}
                        className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200 rounded flex-shrink-0"
                      >
                        Cc/Bcc
                      </button>
                    )}
                  </div>
                  <div className="flex-1 flex flex-wrap items-center gap-1.5 border-b border-gray-300 pb-1 min-h-[28px]">
                    {replyMode === 'forward' ? (
                      /* Forward mode - editable input */
                      <input
                        type="email"
                        value={forwardTo}
                        onChange={(e) => {
                          setForwardTo(e.target.value);
                          forwardToRef.current = e.target.value;
                          handleDraftChange();
                        }}
                        className="flex-1 min-w-[120px] outline-none text-sm py-0.5 bg-transparent"
                        placeholder="Enter recipient email..."
                      />
                    ) : (
                      /* Reply mode - show recipient as badge */
                      (() => {
                        const { to } = getReplyRecipients(replyToMessage, replyMode);
                        return to ? (
                          <div className="flex items-center bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-sm">
                            <span>{to}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No valid recipients</span>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>

              {/* CC Section - shown when showCcBcc is true or replyAll mode */}
              {(showCcBcc || replyMode === 'replyAll' || ccRecipients.length > 0) && (
              <div className="relative">
                <div className="flex items-start gap-2 py-1">
                  <button
                    type="button"
                    onClick={() => setShowCc(!showCc)}
                    className="px-2 py-0.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex-shrink-0"
                  >
                    Cc
                  </button>
                  <div className="flex-1 flex flex-wrap items-center gap-1.5 border-b border-gray-300 pb-1 min-h-[28px]">
                    {/* Display replyAll CC recipients as read-only badges */}
                    {replyMode === 'replyAll' && (() => {
                      const { cc } = getReplyRecipients(replyToMessage, 'replyAll');
                      return cc ? cc.split(', ').map((email, idx) => (
                        <div key={`auto-cc-${idx}`} className="flex items-center bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-sm">
                          <span>{email}</span>
                        </div>
                      )) : null;
                    })()}
                    
                    {/* Display manually added CC recipients */}
                    {ccRecipients.map((email, index) => (
                      <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm">
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => removeCcRecipient(email)}
                          className="ml-1.5 text-blue-600 hover:text-blue-800"
                        >
                          <X size={12} />
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
                      className="flex-1 min-w-[120px] outline-none text-sm py-0.5 bg-transparent"
                      placeholder=""
                    />
                  </div>
                </div>

                {/* CC Contact dropdown */}
                {showCcDropdown && (
                  <div className="absolute top-full left-14 right-0 z-[999] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredCcContacts.length > 0 ? (
                      filteredCcContacts.map((contact, index) => (
                        <div
                          key={`cc-${contact.email}-${index}`}
                          onClick={() => handleCcContactSelect(contact)}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          {contact.photoUrl ? (
                            <img src={contact.photoUrl} alt={contact.name} className="w-7 h-7 rounded-full mr-2.5 flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium mr-2.5 flex-shrink-0">
                              {getProfileInitial(contact.name, contact.email)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 truncate">{contact.name}</span>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">No contacts found</div>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* BCC Section - shown when showCcBcc is true */}
              {(showCcBcc || bccRecipients.length > 0) && (
              <div className="relative">
                <div className="flex items-start gap-2 py-1">
                  <button
                    type="button"
                    onClick={() => setShowBcc(!showBcc)}
                    className="px-2 py-0.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex-shrink-0"
                  >
                    Bcc
                  </button>
                  <div className="flex-1 flex flex-wrap items-center gap-1.5 border-b border-gray-300 pb-1 min-h-[28px]">
                    {bccRecipients.map((email, index) => (
                      <div key={index} className="flex items-center bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-sm">
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => removeBccRecipient(email)}
                          className="ml-1.5 text-purple-600 hover:text-purple-800"
                        >
                          <X size={12} />
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
                      className="flex-1 min-w-[120px] outline-none text-sm py-0.5 bg-transparent"
                      placeholder=""
                    />
                  </div>
                </div>

                {/* BCC Contact dropdown */}
                {showBccDropdown && (
                  <div className="absolute top-full left-14 right-0 z-[999] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredBccContacts.length > 0 ? (
                      filteredBccContacts.map((contact, index) => (
                        <div
                          key={`bcc-${contact.email}-${index}`}
                          onClick={() => handleBccContactSelect(contact)}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          {contact.photoUrl ? (
                            <img src={contact.photoUrl} alt={contact.name} className="w-7 h-7 rounded-full mr-2.5 flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-medium mr-2.5 flex-shrink-0">
                              {getProfileInitial(contact.name, contact.email)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 truncate">{contact.name}</span>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">No contacts found</div>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Compact Attachment thumbnails - below recipient fields, matching Compose.tsx */}
            {replyAttachments.length > 0 && (
              <div className="px-3 py-1 w-full overflow-hidden">
                <div className="flex gap-1 pb-1 overflow-x-auto overflow-y-hidden min-w-0" style={{ scrollbarWidth: 'thin' }}>
                  {replyAttachments.map((file, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors cursor-pointer flex-shrink-0 min-w-[200px] max-w-[250px]"
                      onClick={() => {
                        // Preview local File attachment using blob URL
                        const blobUrl = URL.createObjectURL(file);
                        setPreviewAttachment({
                          url: blobUrl,
                          name: file.name,
                          type: file.type
                        });
                      }}
                    >
                      {/* File icon */}
                      <div className="flex-shrink-0 w-8 h-8 bg-red-50 rounded flex items-center justify-center">
                        <Paperclip size={16} className="text-red-600" />
                      </div>
                      
                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-900 truncate font-medium">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering preview
                          removeReplyAttachment(index);
                        }}
                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Remove attachment"
                      >
                        <X size={14} className="text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rich Text Editor */}
            <div className="border-t border-gray-200" style={{ minHeight: '350px' }}>
              <RichTextEditor
                value={replyContent}
                onChange={(content) => {
                  setReplyContent(content);
                  replyContentRef.current = content;
                  handleDraftChange();
                }}
                placeholder="Type your message..."
                minHeight="350px"
                showFileAttachmentButton={true}
                onFileAttachment={handleReplyFileAttachment}
              />
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
                    className={`overflow-hidden transition-all ${isExpanded ? '' : ''
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
                            // Check if we have valid recipients before opening composer
                            if (!replyToMessage) {
                              sonnerToast.error('Cannot reply: All messages in this thread are from you');
                              return;
                            }
                            setReplyMode('reply');
                            setShowReplyComposer(true);
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Reply"
                        >
                          <Reply size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Check if we have valid recipients before opening composer
                            if (!replyToMessage) {
                              sonnerToast.error('Cannot reply: All messages in this thread are from you');
                              return;
                            }
                            setReplyMode('replyAll');
                            setShowReplyComposer(true);
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Reply all"
                        >
                          <ReplyAll size={16} className="text-gray-600" />
                        </button>
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
                      </div>
                    </div>

                    {/* Expanded Body */}
                    {isExpanded && (
                      <div className="px-2 pb-2 pt-1.5">
                        {/* Attachments Section - Outlook style, at top */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mb-3 pb-2 border-b border-gray-100">
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
                                              const attachmentId = att.attachmentId!;

                                              // 1. Check Cache First
                                              if (AttachmentCache.has(attachmentId)) {
                                                const cachedData = AttachmentCache.get(attachmentId);
                                                if (cachedData) {
                                                  (e.target as HTMLImageElement).src = cachedData;
                                                  return;
                                                }
                                              }

                                              // 2. Queue the Request (Throttled)
                                              const response = await queueGmailRequest(`fetch-attachment-${attachmentId}`, () =>
                                                window.gapi.client.gmail.users.messages.attachments.get({
                                                  userId: 'me',
                                                  messageId: message.id,
                                                  id: attachmentId
                                                })
                                              );

                                              if ((response as any).result?.data) {
                                                const base64Data = (response as any).result.data.replace(/-/g, '+').replace(/_/g, '/');
                                                const padding = '='.repeat((4 - base64Data.length % 4) % 4);
                                                const dataUrl = `data:${att.mimeType};base64,${base64Data}${padding}`;

                                                // 3. Update Cache & Set Src
                                                AttachmentCache.set(attachmentId, dataUrl);
                                                (e.target as HTMLImageElement).src = dataUrl;
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {/* Attachments Section for single email - Outlook style, at top */}
              {latestMessage.attachments && latestMessage.attachments.length > 0 && (
                <div className="mb-4 pb-3 border-b border-gray-100">
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

                      const truncatedName = att.name.length > 20
                        ? att.name.substring(0, 17) + '...'
                        : att.name;
                      
                      const fileSize = att.size ? `${Math.round(att.size / 1024)} KB` : '';

                      return (
                        <div
                          key={idx}
                          className="relative group flex-shrink-0"
                        >
                          {/* Gmail-style attachment card */}
                          <div 
                            onClick={() => {
                              console.log(`🖱️ Clicked attachment: ${att.name}, isPdf: ${isPdf}, isPreviewable: ${isPreviewable}, attachmentId: ${att.attachmentId}`);
                              if (isPreviewable) {
                                handlePreviewAttachment(latestMessage.id, att.attachmentId!, att.name, att.mimeType!);
                              }
                            }}
                            className={`w-48 border border-gray-200 rounded-lg overflow-hidden bg-white ${isPreviewable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'} transition-shadow`}
                          >
                            {/* Thumbnail area */}
                            <div className={`relative h-28 ${bgColor} flex items-center justify-center overflow-hidden`}>
                              {(isImage || isPdf) && att.attachmentId ? (
                                <img
                                  src={`data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`}
                                  alt={att.name}
                                  className="w-full h-full object-contain"
                                  onLoad={async (e) => {
                                    try {
                                      const attachmentId = att.attachmentId!;
                                      const cacheKey = isPdf ? `pdf-thumb-${attachmentId}` : attachmentId;

                                      // 1. Check Cache First (different cache for PDF thumbnails)
                                      if (isPdf && hasCachedThumbnail(cacheKey)) {
                                        const cachedThumbnail = getCachedThumbnail(cacheKey);
                                        if (cachedThumbnail) {
                                          (e.target as HTMLImageElement).src = cachedThumbnail;
                                          return;
                                        }
                                      } else if (!isPdf && AttachmentCache.has(attachmentId)) {
                                        const cachedData = AttachmentCache.get(attachmentId);
                                        if (cachedData) {
                                          (e.target as HTMLImageElement).src = cachedData;
                                          return;
                                        }
                                      }

                                      // 2. Queue the Request (Throttled)
                                      const response = await queueGmailRequest(`fetch-attachment-${attachmentId}`, () =>
                                        window.gapi.client.gmail.users.messages.attachments.get({
                                          userId: 'me',
                                          messageId: latestMessage.id,
                                          id: attachmentId
                                        })
                                      );

                                      if ((response as any).result?.data) {
                                        const base64Data = (response as any).result.data.replace(/-/g, '+').replace(/_/g, '/');
                                        const padding = '='.repeat((4 - base64Data.length % 4) % 4);
                                        
                                        if (isPdf) {
                                          // Generate PDF thumbnail using PDF.js
                                          console.log('📄 Generating PDF thumbnail for:', att.name);
                                          const thumbnailDataUrl = await generatePdfThumbnailFromBase64(base64Data + padding, cacheKey);
                                          (e.target as HTMLImageElement).src = thumbnailDataUrl;
                                        } else {
                                          // Regular image
                                          const dataUrl = `data:${att.mimeType};base64,${base64Data}${padding}`;
                                          AttachmentCache.set(attachmentId, dataUrl);
                                          (e.target as HTMLImageElement).src = dataUrl;
                                        }
                                      }
                                    } catch (err) {
                                      console.error('Failed to load thumbnail:', err);
                                      // Show fallback icon on error
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                    }
                                  }}
                                />
                              ) : null}
                              {/* Fallback icon */}
                              <div className={`flex flex-col items-center justify-center gap-1 ${(isImage || isPdf) && att.attachmentId ? 'fallback-icon hidden absolute inset-0' : ''} ${bgColor}`}>
                                <span className={`text-2xl font-bold ${textColor}`}>{icon}</span>
                              </div>
                              
                              {/* Hover overlay with actions */}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadAttachment(latestMessage.id, att.attachmentId!, att.name);
                                  }}
                                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                                  title="Download"
                                >
                                  <Download size={16} className="text-gray-700" />
                                </button>
                              </div>
                            </div>
                            
                            {/* File info footer */}
                            <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-2">
                              <div className={`w-6 h-6 rounded flex items-center justify-center ${bgColor}`}>
                                <span className={`text-[10px] font-bold ${textColor}`}>{icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900 truncate" title={att.name}>
                                  {truncatedName}
                                </div>
                                {fileSize && (
                                  <div className="text-[10px] text-gray-500">{fileSize}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
            </div>
          )}
        </div>

        {/* Fullscreen Reply Composer - Compose.tsx style */}
        {showReplyComposer && isReplyExpanded && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full h-full flex flex-col transition-all duration-300 ease-in-out overflow-hidden">
              {/* Outlook-style Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  {/* Send Button */}
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sending || !replyContent.trim() || (replyMode === 'forward' && !forwardTo.trim())}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                  >
                    <SendHorizontal size={14} />
                    {sending ? 'Sending...' : 'Send'}
                  </button>

                  {/* Draft status indicator */}
                  {isSaving && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                      <span className="animate-pulse">●</span>
                      Saving...
                    </span>
                  )}
                  {!isSaving && lastSavedAt && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                      <span>✓</span>
                      Saved {format(lastSavedAt, 'h:mm a')}
                    </span>
                  )}

                  {/* From display */}
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <span className="text-gray-500">From:</span>
                    <span>{currentProfile?.userEmail || 'me@example.com'}</span>
                  </div>
                </div>

                {/* Right side icons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplyExpanded(false);
                      setShowReplyComposer(false);
                      setReplyContent('');
                      setForwardTo('');
                      setReplyMode('reply');
                      setCcRecipients([]);
                      setBccRecipients([]);
                      setCcInput('');
                      setBccInput('');
                      setShowCc(false);
                      setShowBcc(false);
                      replyContentRef.current = '';
                      forwardToRef.current = '';
                      setIsDirty(false);
                      isDirtyRef.current = false;
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Discard"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReplyExpanded(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Minimize"
                  >
                    <Minimize2 size={18} />
                  </button>
                </div>
              </div>

              {/* Body with recipient fields */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Recipient fields section */}
                <div className="flex-shrink-0 px-4 py-2 space-y-2 border-b border-gray-100">
                  {/* TO Section */}
                  <div className="relative">
                    <div className="flex items-start gap-3 py-2">
                      <button
                        type="button"
                        className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex-shrink-0"
                      >
                        To
                      </button>
                      <div className="flex-1 flex flex-wrap items-center gap-1.5 border-b border-gray-300 pb-2 min-h-[32px]">
                        {replyMode === 'forward' ? (
                          <input
                            type="email"
                            value={forwardTo}
                            onChange={(e) => {
                              setForwardTo(e.target.value);
                              forwardToRef.current = e.target.value;
                              handleDraftChange();
                            }}
                            className="flex-1 min-w-[120px] outline-none text-sm py-0.5 bg-transparent"
                            placeholder="Enter recipient email..."
                          />
                        ) : (
                          (() => {
                            const { to } = getReplyRecipients(replyToMessage, replyMode);
                            return to ? (
                              <div className="flex items-center bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-sm">
                                <span>{to}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No valid recipients</span>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CC Section */}
                  <div className="relative">
                    <div className="flex items-start gap-3 py-2">
                      <button
                        type="button"
                        onClick={() => setShowCc(!showCc)}
                        className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex-shrink-0"
                      >
                        Cc
                      </button>
                      <div className="flex-1 flex flex-wrap items-center gap-1.5 border-b border-gray-300 pb-2 min-h-[32px]">
                        {replyMode === 'replyAll' && (() => {
                          const { cc } = getReplyRecipients(replyToMessage, 'replyAll');
                          return cc ? cc.split(', ').map((email, idx) => (
                            <div key={`auto-cc-${idx}`} className="flex items-center bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-sm">
                              <span>{email}</span>
                            </div>
                          )) : null;
                        })()}
                        
                        {ccRecipients.map((email, index) => (
                          <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm">
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => removeCcRecipient(email)}
                              className="ml-1.5 text-blue-600 hover:text-blue-800"
                            >
                              <X size={12} />
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
                          className="flex-1 min-w-[120px] outline-none text-sm py-0.5 bg-transparent"
                          placeholder=""
                        />
                      </div>
                    </div>

                    {showCcDropdown && (
                      <div className="absolute top-full left-14 right-0 z-[10000] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredCcContacts.length > 0 ? (
                          filteredCcContacts.map((contact, index) => (
                            <div
                              key={`cc-exp-${contact.email}-${index}`}
                              onClick={() => handleCcContactSelect(contact)}
                              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              {contact.photoUrl ? (
                                <img src={contact.photoUrl} alt={contact.name} className="w-7 h-7 rounded-full mr-2.5 flex-shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium mr-2.5 flex-shrink-0">
                                  {getProfileInitial(contact.name, contact.email)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900 truncate">{contact.name}</span>
                                <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No contacts found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* BCC Section */}
                  <div className="relative">
                    <div className="flex items-start gap-3 py-2">
                      <button
                        type="button"
                        onClick={() => setShowBcc(!showBcc)}
                        className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex-shrink-0"
                      >
                        Bcc
                      </button>
                      <div className="flex-1 flex flex-wrap items-center gap-1.5 border-b border-gray-300 pb-2 min-h-[32px]">
                        {bccRecipients.map((email, index) => (
                          <div key={index} className="flex items-center bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-sm">
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => removeBccRecipient(email)}
                              className="ml-1.5 text-purple-600 hover:text-purple-800"
                            >
                              <X size={12} />
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
                          className="flex-1 min-w-[120px] outline-none text-sm py-0.5 bg-transparent"
                          placeholder=""
                        />
                      </div>
                    </div>

                    {showBccDropdown && (
                      <div className="absolute top-full left-14 right-0 z-[10000] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredBccContacts.length > 0 ? (
                          filteredBccContacts.map((contact, index) => (
                            <div
                              key={`bcc-exp-${contact.email}-${index}`}
                              onClick={() => handleBccContactSelect(contact)}
                              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              {contact.photoUrl ? (
                                <img src={contact.photoUrl} alt={contact.name} className="w-7 h-7 rounded-full mr-2.5 flex-shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-medium mr-2.5 flex-shrink-0">
                                  {getProfileInitial(contact.name, contact.email)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900 truncate">{contact.name}</span>
                                <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No contacts found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rich Text Editor - fills remaining space */}
                <div className="flex-1 min-h-0">
                  <RichTextEditor
                    value={replyContent}
                    onChange={(content) => {
                      setReplyContent(content);
                      replyContentRef.current = content;
                      handleDraftChange();
                    }}
                    placeholder="Type your message..."
                    minHeight="100%"
                    showFileAttachmentButton={true}
                    onFileAttachment={handleReplyFileAttachment}
                  />
                </div>

                {/* Attachment thumbnails section */}
                {replyAttachments.length > 0 && (
                  <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Paperclip size={12} className="text-gray-500" />
                      <span className="text-[10px] font-medium text-gray-600">
                        {replyAttachments.length} file{replyAttachments.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {replyAttachments.map((file, index) => (
                        <div key={index} className="group relative bg-white border border-gray-200 rounded p-1.5 hover:border-gray-300 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <Paperclip size={12} className="text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate max-w-[100px]">{file.name}</p>
                              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeReplyAttachment(index)}
                              className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                              title="Remove attachment"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

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
      {(() => {
        const counterparty = getFilterCounterparty();
        return (
          <CreateFilterModal
            isOpen={showCreateFilterModal}
            modalRef={filterModalRef}
            senderName={counterparty.name}
            senderEmail={counterparty.email}
            selectedFilterLabel={selectedFilterLabel}
            onSelectLabel={handleSelectFilterLabel}
            onClose={handleCloseCreateFilterModal}
            onCreateFilter={handleCreateFilterWithLabel}
          />
        );
      })()}

      {/* Create Label Modal */}
      <CreateLabelModal
        isOpen={showCreateLabelModal}
        modalRef={createLabelModalRef}
        senderEmail={cleanEmailAddress(email?.from?.email || '')}
        newLabelName={newLabelName}
        onLabelNameChange={setNewLabelName}
        nestUnder={nestUnder}
        onNestUnderChange={setNestUnder}
        parentLabel={parentLabel}
        onParentLabelChange={setParentLabel}
        autoFilterFuture={autoFilterFuture}
        onAutoFilterFutureChange={setAutoFilterFuture}
        availableLabels={filteredFilterLabels}
        onClose={() => setShowCreateLabelModal(false)}
        onSubmit={handleCreateLabelSubmit}
      />

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />

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