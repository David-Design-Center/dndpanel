import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { X, Paperclip, SendHorizontal, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { sendEmail, getThreadEmails, clearEmailCache, saveDraft, deleteDraft } from '../services/emailService';
import { emailRepository } from '../services/emailRepository';
import { sanitizeEmailHtml } from '../utils/sanitize';
// Customer orders (type 'Customer Order') are already included in invoices query; here we fetch supplier orders from 'orders' table
import { supabase } from '../lib/supabase';
// Use the same print components pipeline to ensure consistent preview as Invoice/Orders tabs
import { exportInvoiceDocToPDF, exportSupplierOrderToPDF } from '@/services/printExport';
// Use existing shared supabase client to avoid multiple GoTrueClient instances
import { supabase as sharedSupabase } from '@/lib/supabase';
import type { Invoice as InvoiceDoc } from '@/components/invoice/InvoicePrintView';
import type { SupplierOrderDoc } from '@/components/invoice/SupplierOrderPrintView';
import { Email, Contact } from '../types';
import { getProfileInitial } from '../lib/utils';
import Modal from '../components/common/Modal';
import RichTextEditor from '../components/common/RichTextEditor';
import FileThumbnail from '../components/common/FileThumbnail';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { useProfile } from '../contexts/ProfileContext';
import { useContacts } from '../contexts/ContactsContext';
import { useCompose } from '../contexts/ComposeContext';
import { toast } from 'sonner';

// Utility functions for text/HTML conversion
const convertPlainTextToHtml = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
};

// Define attachment interface that supports both File objects and generated attachments
interface AttachmentItem {
  name: string;
  mimeType: string;
  data?: string; // Base64 data for generated attachments
  dataUrl?: string; // Data URL for thumbnail preview
  file?: File; // File object for user uploads
  size?: number; // File size for display
  // For compatibility with FilePreview component
  attachmentId?: string;
  partId?: string;
}

function Compose() {
  const { currentProfile, gmailSignature } = useProfile();
  const { searchContacts, setShouldLoadContacts } = useContacts();
  const { closeCompose, draftId: contextDraftId, isExpanded, toggleExpand } = useCompose();
  const [searchParams] = useSearchParams();
  const [toRecipients, setToRecipients] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [to, setTo] = useState(''); // Keep for backward compatibility
  const [ccRecipients, setCcRecipients] = useState<string[]>([]); // Start empty, will be set in useEffect
  const [ccInput, setCcInput] = useState('');
  const [bccRecipients, setBccRecipients] = useState<string[]>([]);
  const [bccInput, setBccInput] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showCcContactDropdown, setShowCcContactDropdown] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [filteredCcContacts, setFilteredCcContacts] = useState<Contact[]>([]);
  const [subject, setSubject] = useState('');
  const [newBodyHtml, setNewBodyHtml] = useState(''); // User's editable message (now HTML)
  const [originalEmailHtml, setOriginalEmailHtml] = useState(''); // Pre-filled HTML content
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [previewFile, setPreviewFile] = useState<AttachmentItem | null>(null);
  const [, setShowPriceRequestModal] = useState(false);

  // Thread-related state
  const [isReply, setIsReply] = useState(false);
  const [threadEmails, setThreadEmails] = useState<Email[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(undefined);

  // Draft auto-save states
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(undefined);
  const [messageIdForUI, setMessageIdForUI] = useState<string | undefined>(undefined); // Track message ID for UI removal
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Attachment panel state
  const [, setInvoices] = useState<any[]>([]);
  const [, setOrders] = useState<any[]>([]);
  const [] = useState<'invoices' | 'orders'>('invoices');
  const [, setIsLoadingAttachmentData] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Set initial CC recipients based on profile
  useEffect(() => {
    if (currentProfile?.name === 'David') {
      // David can choose whether to CC himself or not - start with empty CC
      setCcRecipients([]);
    } else {
      // All other users must CC David by default
      setCcRecipients(['david.v@dnddesigncenter.com']);
    }
  }, [currentProfile?.name]);

  // Expert optimization: Trigger contact loading when user opens Compose (user intent)
  useEffect(() => {
    setShouldLoadContacts(true);
  }, [setShouldLoadContacts]);

  // Handle Price Request insertion
  // Handle opening the price request panel
  const handleOpenPriceRequest = () => {
    setShowPriceRequestModal(true);
  };

  // Handle closing the price request panel

  // Handle price request table insertion

  // Check if we're replying to an email or have pre-filled data
  useEffect(() => {
    if (location.state) {
      const {
        to: replyTo,
        cc: replyCC,
        subject: replySubject,
        body: plainTextBody,
        originalBody: htmlBody,
        replyToId: incomingReplyToId,
        threadId,
        attachments: incomingAttachments,
        draftId,
        isDraft
      } = location.state as any;

      if (replyTo) setTo(replyTo);
      if (replySubject) setSubject(replySubject);

      // Handle CC recipients from reply all
      if (replyCC) {
        const incomingCcRecipients = replyCC.split(',').map((email: string) => email.trim()).filter((email: string) => email);
        // Add to existing CC recipients, but avoid duplicates
        setCcRecipients(prev => {
          const combined = [...prev, ...incomingCcRecipients];
          return Array.from(new Set(combined)); // Remove duplicates
        });
      }

      // If this is a draft being edited, set the draft ID
      if (isDraft && draftId) {
        setCurrentDraftId(draftId);
        setIsDraftDirty(false); // Start clean since we're loading existing draft
      }

      // Set the user's editable text
      if (plainTextBody) {
        if (isDraft) {
          // For drafts, the body might already be HTML or plain text
          // If it contains HTML tags, use it directly, otherwise convert to HTML
          if (plainTextBody.includes('<') && plainTextBody.includes('>')) {
            setNewBodyHtml(plainTextBody);
          } else {
            setNewBodyHtml(convertPlainTextToHtml(plainTextBody));
          }
        } else {
          // For replies, convert plain text to HTML for rich text editor
          const htmlBody = convertPlainTextToHtml(plainTextBody);
          setNewBodyHtml(htmlBody);
        }
      }

      // Set the original HTML content (for final sending) - but not for drafts
      if (htmlBody && !isDraft) setOriginalEmailHtml(htmlBody);

      // If this is a reply or draft with thread, fetch the thread emails
      if (incomingReplyToId || threadId) {
        setIsReply(true);

        if (threadId) {
          setCurrentThreadId(threadId);
          fetchThreadEmails(threadId);
        }
      }

      // Handle incoming attachments (from invoice generator)
      if (incomingAttachments && Array.isArray(incomingAttachments)) {
        setAttachments(incomingAttachments.map((att: any) => ({
          name: att.name,
          mimeType: att.mimeType,
          data: att.data,
          dataUrl: att.dataUrl,
          size: att.size || 0
        })));
      }
    }
  }, [location.state]);

  // Load draft from context (when opened via context)
  useEffect(() => {
    if (contextDraftId && window.gapi?.client?.gmail) {
      console.log('📝 Loading draft from context:', contextDraftId);
      loadDraftFromGmail(contextDraftId);
    }
  }, [contextDraftId]);

  // Initialize signature for new emails (not replies, drafts, or forwards)
  useEffect(() => {
    // Only add signature if:
    // 1. User has a signature (from Gmail API via ProfileContext)
    // 2. This is a brand new compose (no location.state and no draft being loaded)
    // 3. Body is currently empty
    const isNewCompose = !location.state && !contextDraftId && !searchParams.get('draftId');

    if (isNewCompose && gmailSignature && !newBodyHtml) {
      console.log('✍️ Initializing new email with Gmail signature');
      setNewBodyHtml('<br><br>' + gmailSignature);
    }
  }, [gmailSignature, location.state, contextDraftId, searchParams]);

  // Load draft from URL query parameter
  useEffect(() => {
    const draftIdParam = searchParams.get('draftId');
    if (draftIdParam && window.gapi?.client?.gmail) {
      console.log('📝 Loading draft from URL param:', draftIdParam);
      loadDraftFromGmail(draftIdParam);
    }
  }, [searchParams]);

  // Function to load draft from Gmail API
  const loadDraftFromGmail = async (messageId: string) => {
    try {
      console.log('📧 Looking for draft with message ID:', messageId);

      // Store the message ID for UI removal later
      setMessageIdForUI(messageId);

      // First, list all drafts to find the one with this message ID
      const draftsListResponse = await window.gapi.client.gmail.users.drafts.list({
        userId: 'me',
        maxResults: 100
      });

      const drafts = draftsListResponse.result.drafts || [];
      console.log(`📋 Found ${drafts.length} drafts total`);

      // Find the draft that matches this message ID
      const matchingDraft = drafts.find((d: any) => d.message?.id === messageId);

      if (!matchingDraft) {
        console.error('❌ No draft found with message ID:', messageId);
        // Fallback: try using the messageId as draftId directly
        await loadDraftById(messageId);
        return;
      }

      const draftId = matchingDraft.id;
      console.log('✅ Found draft ID:', draftId);

      await loadDraftById(draftId);
    } catch (error) {
      console.error('❌ Failed to find draft:', error);
    }
  };

  // Function to load draft by draft ID
  const loadDraftById = async (draftId: string) => {
    try {
      console.log('📧 Fetching draft from Gmail API with ID:', draftId);
      const draftResponse = await window.gapi.client.gmail.users.drafts.get({
        userId: 'me',
        id: draftId,
        format: 'full'
      });

      if (draftResponse.result?.message) {
        const draftMessage = draftResponse.result.message;
        const payload = draftMessage.payload;
        const headers = payload?.headers || [];

        // Extract headers
        const getHeader = (name: string) => {
          const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
          return header?.value || '';
        };

        const toHeader = getHeader('To');
        const ccHeader = getHeader('Cc');
        const subjectHeader = getHeader('Subject');
        const inReplyToHeader = getHeader('In-Reply-To');
        const referencesHeader = getHeader('References');

        console.log('📧 Draft headers:', {
          to: toHeader,
          cc: ccHeader,
          subject: subjectHeader,
          inReplyTo: inReplyToHeader,
          references: referencesHeader,
          threadId: draftMessage.threadId
        });

        // Check if this is a reply draft (has threadId different from message id)
        // AND check if thread has other messages
        const hasRealThread = draftMessage.threadId && draftMessage.threadId !== draftMessage.id;

        if (hasRealThread) {
          // Verify the thread actually has other messages besides this draft
          try {
            const threadResponse = await window.gapi.client.gmail.users.threads.get({
              userId: 'me',
              id: draftMessage.threadId,
              format: 'metadata'
            });

            const messages = threadResponse.result?.messages || [];
            const nonDraftMessages = messages.filter((msg: any) =>
              !msg.labelIds?.includes('DRAFT')
            );

            if (nonDraftMessages.length > 0) {
              console.log('📝 Reply draft detected (thread has', nonDraftMessages.length, 'messages), redirecting to thread view');
              navigate(`/inbox/email/${draftMessage.threadId}?draft=${draftId}`);
              return; // Exit early
            } else {
              console.log('📝 Standalone draft (thread only has draft), loading in compose');
            }
          } catch (error) {
            console.error('Error checking thread:', error);
            console.log('📝 Error checking thread, loading in compose as fallback');
          }
        } else {
          console.log('📝 New email draft detected (no real thread), loading in compose');
        }

        // Set recipients - populate both old and new format
        if (toHeader) {
          const toEmails = toHeader.split(',').map((email: string) => email.trim()).filter((email: string) => email);
          setToRecipients(toEmails);
          setTo(toHeader); // Keep for backward compatibility
        }
        if (subjectHeader) setSubject(subjectHeader);

        // Set CC recipients
        if (ccHeader) {
          const ccEmails = ccHeader.split(',').map((email: string) => email.trim()).filter((email: string) => email);
          setCcRecipients(ccEmails);
        }

        // Extract body content
        let bodyHtml = '';

        const findBody = (parts: any[]): { html: string; text: string } => {
          let html = '';
          let text = '';

          for (const part of parts) {
            if (part.mimeType === 'text/html' && part.body?.data) {
              // Properly decode UTF-8 from base64
              const base64Data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              html = new TextDecoder('utf-8').decode(bytes);
            } else if (part.mimeType === 'text/plain' && part.body?.data && !html) {
              // Properly decode UTF-8 from base64
              const base64Data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              text = new TextDecoder('utf-8').decode(bytes);
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
          // Properly decode UTF-8 from base64
          const base64Data = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          bodyHtml = new TextDecoder('utf-8').decode(bytes);
        }

        console.log('📧 Draft body loaded, length:', bodyHtml.length);

        // Process inline images - convert cid: references to data URLs
        if (bodyHtml && payload?.parts) {
          const inlineImages: { [cid: string]: string } = {};

          // Extract inline images from parts
          const extractInlineImages = async (parts: any[]) => {
            for (const part of parts) {
              const headers = part.headers || [];
              const contentIdHeader = headers.find((h: any) => h.name.toLowerCase() === 'content-id');

              // Check if this is an inline image (has Content-ID)
              if (contentIdHeader && part.mimeType?.startsWith('image/')) {
                // Extract CID (remove < and >)
                let cid = contentIdHeader.value.replace(/[<>]/g, '');

                // Check if we have inline data or need to fetch it
                if (part.body?.data) {
                  // We have the data inline
                  const base64Data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
                  const dataUrl = `data:${part.mimeType};base64,${base64Data}`;
                  inlineImages[cid] = dataUrl;
                  console.log('📧 Found inline image with CID (inline data):', cid);
                } else if (part.body?.attachmentId) {
                  // Need to fetch the attachment
                  try {
                    const response = await window.gapi.client.gmail.users.messages.attachments.get({
                      userId: 'me',
                      messageId: draftMessage.id,
                      id: part.body.attachmentId
                    });

                    if (response.result?.data) {
                      const base64Data = response.result.data.replace(/-/g, '+').replace(/_/g, '/');
                      const dataUrl = `data:${part.mimeType};base64,${base64Data}`;
                      inlineImages[cid] = dataUrl;
                      console.log('📧 Fetched inline image with CID:', cid);
                    }
                  } catch (error) {
                    console.error('❌ Failed to fetch inline image:', cid, error);
                  }
                }
              }

              // Recursively check nested parts
              if (part.parts) {
                await extractInlineImages(part.parts);
              }
            }
          };

          await extractInlineImages(payload.parts);

          // Replace cid: references with data URLs
          Object.entries(inlineImages).forEach(([cid, dataUrl]) => {
            // Try both with and without "cid:" prefix
            bodyHtml = bodyHtml.replace(new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), dataUrl);
            bodyHtml = bodyHtml.replace(new RegExp(cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), dataUrl);
          });

          console.log('📧 Processed', Object.keys(inlineImages).length, 'inline images');
        }

        // Extract attachments from draft
        const extractedAttachments: AttachmentItem[] = [];
        
        const extractAttachments = async (parts: any[]) => {
          for (const part of parts) {
            const headers = part.headers || [];
            const contentDisposition = headers.find((h: any) => h.name.toLowerCase() === 'content-disposition')?.value || '';
            const contentId = headers.find((h: any) => h.name.toLowerCase() === 'content-id')?.value;
            
            // Check if this is a real attachment (not inline image)
            const isAttachment = contentDisposition.toLowerCase().includes('attachment') || 
              (part.filename && !contentId && part.body?.attachmentId);
            
            if (isAttachment && part.filename) {
              console.log('📎 Found attachment:', part.filename, part.mimeType);
              
              // Fetch the attachment data
              if (part.body?.attachmentId) {
                try {
                  const attachmentResponse = await window.gapi.client.gmail.users.messages.attachments.get({
                    userId: 'me',
                    messageId: draftMessage.id,
                    id: part.body.attachmentId
                  });
                  
                  if (attachmentResponse.result?.data) {
                    // Convert URL-safe base64 to regular base64
                    const base64Data = attachmentResponse.result.data.replace(/-/g, '+').replace(/_/g, '/');
                    
                    extractedAttachments.push({
                      name: part.filename,
                      mimeType: part.mimeType || 'application/octet-stream',
                      size: attachmentResponse.result.size || part.body.size || 0,
                      data: base64Data,
                      attachmentId: part.body.attachmentId
                    });
                    console.log('✅ Loaded attachment:', part.filename);
                  }
                } catch (error) {
                  console.error('❌ Failed to fetch attachment:', part.filename, error);
                }
              } else if (part.body?.data) {
                // Attachment data is inline
                const base64Data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
                extractedAttachments.push({
                  name: part.filename,
                  mimeType: part.mimeType || 'application/octet-stream',
                  size: part.body.size || 0,
                  data: base64Data
                });
                console.log('✅ Loaded inline attachment:', part.filename);
              }
            }
            
            // Recursively check nested parts
            if (part.parts) {
              await extractAttachments(part.parts);
            }
          }
        };
        
        if (payload?.parts) {
          await extractAttachments(payload.parts);
        }
        
        if (extractedAttachments.length > 0) {
          setAttachments(extractedAttachments);
          console.log('📎 Loaded', extractedAttachments.length, 'attachments from draft');
        }

        // Set body content
        if (bodyHtml) {
          setNewBodyHtml(bodyHtml);
        }

        // Set draft ID and message ID for UI updates
        setCurrentDraftId(draftId);
        setMessageIdForUI(draftMessage.id);
        setIsDraftDirty(false); // Start clean since we're loading existing draft

        console.log('✅ Draft loaded successfully');
      }
    } catch (error) {
      console.error('❌ Failed to load draft:', error);
    }
  };

  // Function to fetch thread emails
  const fetchThreadEmails = async (threadId: string) => {
    try {
      setThreadLoading(true);
      const emails = await getThreadEmails(threadId);
      setThreadEmails(emails);
    } catch (error) {
      console.error('Error fetching thread emails:', error);
    } finally {
      setThreadLoading(false);
    }
  };

  // Auto-save draft functionality
  const autoSaveDraft = async () => {
    // Only auto-save if there's meaningful content and we have changes
    if (!isDraftDirty || (!newBodyHtml.trim() && !subject.trim() && !to.trim()) || isSending) {
      return;
    }

    try {
      setIsAutoSaving(true);

      // Process attachments for draft saving
      const processedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          if (attachment.file) {
            // Handle File object uploads
            return new Promise<{
              name: string;
              mimeType: string;
              data: string;
            }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                // Extract base64 data without the prefix
                const base64data = reader.result as string;
                const base64Content = base64data.split(',')[1];

                resolve({
                  name: attachment.name,
                  mimeType: attachment.mimeType,
                  data: base64Content
                });
              };
              reader.onerror = reject;
              reader.readAsDataURL(attachment.file!);
            });
          } else if (attachment.data) {
            // Handle generated attachments (already have base64 data)
            return {
              name: attachment.name,
              mimeType: attachment.mimeType,
              data: attachment.data
            };
          }

          throw new Error('Invalid attachment format');
        })
      );

      // Prepare draft content
      let finalBodyHtml = '';

      if (newBodyHtml.trim()) {
        finalBodyHtml = newBodyHtml;
      }

      if (originalEmailHtml) {
        if (finalBodyHtml) {
          finalBodyHtml += '<br><br>' + originalEmailHtml;
        } else {
          finalBodyHtml = originalEmailHtml;
        }
      }

      // Signature is now added at compose initialization, not at save/send time

      // Fallback if no content
      if (!finalBodyHtml) {
        finalBodyHtml = '<div style="font-family: Arial, sans-serif; color: #333;"></div>';
      }

      // Prepare CC recipients string for saving
      const ccRecipientsString = ccRecipients.filter(email => email.trim()).join(',');

      // Prepare TO recipients - include both toRecipients array AND current toInput if valid
      let allToRecipients = [...toRecipients];

      // If user has typed an email but hasn't pressed Enter/comma/space yet, include it
      if (toInput.trim() && toInput.includes('@') && !allToRecipients.includes(toInput.trim())) {
        allToRecipients.push(toInput.trim());
      }

      const toRecipientsForDraft = allToRecipients.length > 0
        ? allToRecipients.map(email => ({ name: '', email }))
        : (to && to.trim() ? [{ name: '', email: to }] : []); // Fallback to old format if array is empty

      console.log('💾 Saving draft - TO recipients:', toRecipientsForDraft);
      console.log('💾 Saving draft - toRecipients array:', toRecipients);
      console.log('💾 Saving draft - toInput:', toInput);

      const result = await saveDraft({
        from: {
          name: 'Me',
          email: 'me@example.com'
        },
        to: toRecipientsForDraft,
        subject,
        body: finalBodyHtml,
        internalDate: new Date().toISOString()
      }, processedAttachments, currentDraftId, ccRecipientsString);

      if (result.success) {
        const wasNewDraft = !currentDraftId;
        const oldDraftId = currentDraftId;
        const draftIdChanged = oldDraftId && oldDraftId !== result.draftId;

        setCurrentDraftId(result.draftId);
        setIsDraftDirty(false);
        setLastSavedAt(new Date());

        console.log('✅ Draft saved:', {
          wasNew: wasNewDraft,
          idChanged: draftIdChanged,
          oldId: oldDraftId,
          newId: result.draftId
        });

        // Update UI and counters
        if (wasNewDraft) {
          // New draft created - emit event to add to UI and increment counter
          window.dispatchEvent(new CustomEvent('draft-created', {
            detail: { draftId: result.draftId }
          }));
          console.log('📤 Emitted draft-created event for:', result.draftId);
        } else if (draftIdChanged) {
          // Gmail changed the draft ID during update - delete old, show new
          console.log('⚠️ Gmail changed draft ID during update - cleaning up old draft');

          // Delete the old draft ID from UI
          emailRepository.deleteEmail(oldDraftId);
          window.dispatchEvent(new CustomEvent('email-deleted', {
            detail: { emailId: contextDraftId || oldDraftId }
          }));

          // Add the new draft ID
          window.dispatchEvent(new CustomEvent('draft-created', {
            detail: { draftId: result.draftId }
          }));
        } else {
          // Same draft ID - just an update, no UI change needed
          console.log('✅ Draft updated in place (same ID)');
        }
      }
    } catch (error) {
      console.error('❌ Error auto-saving draft:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Trigger auto-save when content changes
  const handleContentChange = () => {
    setIsDraftDirty(true);

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (3 seconds after user stops typing)
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveDraft();
    }, 3000);
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Save draft when browser/tab closes, visibility changes, or connection might be lost
  useEffect(() => {
    const saveDraftImmediately = () => {
      // Only save if there's content worth saving
      if (isDraftDirty && (toRecipients.length > 0 || subject.trim() || newBodyHtml.trim())) {
        // Use synchronous beacon API for reliability when browser is closing
        // This is a backup - autoSaveDraft handles the actual save
        autoSaveDraft();
      }
    };

    // Handle page unload (browser close, tab close, navigation away)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDraftDirty && (toRecipients.length > 0 || subject.trim() || newBodyHtml.trim())) {
        saveDraftImmediately();
        // Show browser confirmation dialog
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Handle tab becoming hidden (user switches tabs, minimizes browser)
    const handleVisibilityChange = () => {
      if (document.hidden && isDraftDirty) {
        saveDraftImmediately();
      }
    };

    // Handle potential connection loss
    const handleOffline = () => {
      console.log('📡 Connection lost - attempting to save draft locally');
      // Save to localStorage as backup
      if (isDraftDirty && (toRecipients.length > 0 || subject.trim() || newBodyHtml.trim())) {
        try {
          localStorage.setItem('compose-draft-backup', JSON.stringify({
            toRecipients,
            ccRecipients,
            bccRecipients,
            subject,
            body: newBodyHtml,
            draftId: currentDraftId,
            timestamp: new Date().toISOString()
          }));
          console.log('💾 Draft backed up to localStorage');
        } catch (error) {
          console.error('Failed to backup draft to localStorage:', error);
        }
      }
    };

    // Handle connection restored
    const handleOnline = () => {
      console.log('📡 Connection restored');
      // Try to sync localStorage backup to server
      const backup = localStorage.getItem('compose-draft-backup');
      if (backup) {
        try {
          const backupData = JSON.parse(backup);
          // If backup is recent (less than 1 hour old) and we don't have a newer draft, restore it
          const backupTime = new Date(backupData.timestamp).getTime();
          const isRecent = Date.now() - backupTime < 60 * 60 * 1000;
          if (isRecent) {
            console.log('📤 Syncing backed up draft to server');
            autoSaveDraft();
          }
          localStorage.removeItem('compose-draft-backup');
        } catch (error) {
          console.error('Failed to sync backup:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [isDraftDirty, toRecipients, subject, newBodyHtml, ccRecipients, bccRecipients, currentDraftId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Include both toRecipients array AND current toInput if valid
    let allToRecipients = [...toRecipients];

    // If user has typed an email but hasn't pressed Enter/comma/space yet, include it
    if (toInput.trim() && toInput.includes('@') && !allToRecipients.includes(toInput.trim())) {
      allToRecipients.push(toInput.trim());
    }

    // Combine toRecipients array into comma-separated string
    const combinedTo = allToRecipients.join(', ');

    if (!combinedTo && allToRecipients.length === 0) {
      alert('Please specify at least one recipient');
      return;
    }

    // Validate CC recipients (email format)
    const invalidCcEmails = ccRecipients.filter(email =>
      email.trim() && !email.includes('@')
    );

    if (invalidCcEmails.length > 0) {
      alert(`Invalid CC email addresses: ${invalidCcEmails.join(', ')}`);
      return;
    }

    setIsSending(true);

    try {
      // Process attachments - convert both File objects and generated attachments to the expected format
      const processedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          if (attachment.file) {
            // Handle File object uploads
            return new Promise<{
              name: string;
              mimeType: string;
              data: string;
            }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                // Extract base64 data without the prefix
                const base64data = reader.result as string;
                const base64Content = base64data.split(',')[1];

                resolve({
                  name: attachment.name,
                  mimeType: attachment.mimeType,
                  data: base64Content
                });
              };
              reader.onerror = reject;
              reader.readAsDataURL(attachment.file!);
            });
          } else if (attachment.data) {
            // Handle generated attachments (already have base64 data)
            return {
              name: attachment.name,
              mimeType: attachment.mimeType,
              data: attachment.data
            };
          }

          throw new Error('Invalid attachment format');
        })
      );

      // Combine user's HTML content with original HTML content
      let finalBodyHtml = '';

      if (newBodyHtml.trim()) {
        // User's content is already in HTML format from rich text editor
        finalBodyHtml = newBodyHtml;
      }

      if (originalEmailHtml) {
        if (finalBodyHtml) {
          finalBodyHtml += '<br><br>' + originalEmailHtml;
        } else {
          finalBodyHtml = originalEmailHtml;
        }
      }

      // Signature is now added at compose initialization, not at save/send time

      // Fallback if no content
      if (!finalBodyHtml) {
        finalBodyHtml = '<div style="font-family: Arial, sans-serif; color: #333;"></div>';
      }

      // Prepare CC recipients string (filter out empty values)
      const ccRecipientsString = ccRecipients.filter(email => email.trim()).join(',');

      const sendResult = await sendEmail({
        from: {
          name: 'Me',
          email: 'me@example.com'
        },
        to: allToRecipients.map(email => ({
          name: '',
          email: email
        })),
        subject,
        body: finalBodyHtml,
        internalDate: new Date().toISOString() // Add this line
      }, processedAttachments, currentThreadId, ccRecipientsString);

      // Check if send was successful
      if (!sendResult.success) {
        toast.error('Failed to send email. Please try again.');
        setIsSending(false);
        return;
      }

      // Delete the draft if it exists (since we just sent the email)
      if (currentDraftId) {
        try {
          await deleteDraft(currentDraftId);
          console.log('✅ Draft deleted after sending email');

          // Emit event to remove from UI and update counter
          // Use messageIdForUI (the message ID from the email list)
          const emailIdToRemove = messageIdForUI || contextDraftId || currentDraftId;
          console.log('🗑️ Removing draft from UI - draftId:', currentDraftId, 'messageId:', emailIdToRemove);

          emailRepository.deleteEmail(emailIdToRemove);
          window.dispatchEvent(new CustomEvent('email-deleted', {
            detail: { emailId: emailIdToRemove }
          }));
          console.log('📤 Emitted email-deleted event after sending with message ID:', emailIdToRemove);
        } catch (draftError) {
          console.error('❌ Error deleting draft after sending:', draftError);
          // Continue anyway since the email was sent successfully
        }
      }

      // Clear email cache to ensure fresh data when returning to thread
      clearEmailCache();

      // Show success toast with recipient info
      const recipientCount = allToRecipients.length;
      const recipientDisplay = recipientCount === 1 
        ? allToRecipients[0] 
        : `${recipientCount} recipients`;
      toast.success(`Email sent successfully to ${recipientDisplay}`);

      // Close compose window immediately
      closeCompose();

      // Reset sending state
      setIsSending(false);

      // Determine navigation destination
      const isThreadReply = !!currentThreadId;
      const isDraftEmail = !!contextDraftId; // Sent from a draft

      // If sent from draft, always go to inbox (the draft thread might be stale)
      // Otherwise, stay in thread if replying
      const navigationDestination = isDraftEmail
        ? '/inbox'
        : (isThreadReply ? `/email/${currentThreadId}` : '/inbox');

      console.log('📍 Navigation:', { isDraftEmail, isThreadReply, destination: navigationDestination });

      // For thread replies (not from drafts), navigate immediately with refresh state
      // For new emails or drafts, show success message for 2 seconds
      if (isThreadReply && !isDraftEmail) {
        // Navigate immediately to thread with refresh state
        setTimeout(() => {
          navigate(navigationDestination, {
            state: { refresh: true }
          });
        }, 500); // Shorter delay for thread replies
      } else {
        // For new emails or draft sends, navigate after brief delay
        setTimeout(() => {
          navigate(navigationDestination);
        }, 1000);
      }

    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please try again.');
      setIsSending(false);
    }
  };

  const handleCancel = async () => {
    // Actually discard/delete the draft
    if (currentDraftId) {
      try {
        console.log('🗑️ Discarding draft:', currentDraftId);
        await deleteDraft(currentDraftId);
        
        // Dispatch event to remove draft from UI
        if (messageIdForUI) {
          window.dispatchEvent(new CustomEvent('draft-deleted', { 
            detail: { messageId: messageIdForUI, draftId: currentDraftId } 
          }));
        }
        console.log('✅ Draft discarded successfully');
      } catch (error) {
        console.error('❌ Error discarding draft:', error);
      }
    }
    closeCompose();
  };

  const handleManualSaveDraft = async () => {
    try {
      await autoSaveDraft();
    } catch (error) {
      console.error('Error manually saving draft:', error);
    }
  };

  // Save draft and close compose window
  const handleSaveAndClose = async () => {
    if (toRecipients.length > 0 || subject.trim() || newBodyHtml.trim()) {
      try {
        await autoSaveDraft();
        toast.success('Draft saved');
      } catch (error) {
        console.error('Error saving draft:', error);
        toast.error('Failed to save draft');
      }
    }
    closeCompose();
  };



  // Handle file attachments from RichTextEditor
  const handleRichTextFileAttachment = (files: FileList) => {
    const fileList = Array.from(files);
    const newAttachments = fileList.map(file => ({
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      file: file,
      size: file.size
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    // Reset the file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Function to handle attachment preview
  const handleAttachmentPreview = (attachment: AttachmentItem) => {
    setPreviewFile(attachment);
  };

  // Contact dropdown handlers
  const handleContactSelect = (contact: Contact) => {
    setToRecipients([...toRecipients, contact.email]);
    setToInput('');
    setTo([...toRecipients, contact.email].join(', ')); // Backward compat
    setShowContactDropdown(false);
    setFilteredContacts([]);
  };

  const handleToInputFocus = () => {
    if (toInput.trim().length > 0) {
      const contacts = searchContacts(toInput, 5);
      setFilteredContacts(contacts);
      setShowContactDropdown(contacts.length > 0);
    }
  };

  const handleToInputBlur = () => {
    // Delay hiding dropdown to allow click on contact
    setTimeout(() => {
      setShowContactDropdown(false);
    }, 150);
  };

  const handleToInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToInput(value);

    // Search contacts
    if (value.trim().length > 0) {
      const contacts = searchContacts(value, 5);
      setFilteredContacts(contacts);
      setShowContactDropdown(contacts.length > 0);
    } else {
      setShowContactDropdown(false);
      setFilteredContacts([]);
    }
  };

  // CC input handlers
  const handleCcInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCcInput(value);

    // Update filtered contacts based on input
    const contacts = searchContacts(value, 5);
    setFilteredCcContacts(contacts);
    const shouldShow = value.trim().length > 0;
    setShowCcContactDropdown(shouldShow);
  };

  const handleCcContactSelect = (contact: Contact) => {
    // Add to CC recipients if not already present
    if (!ccRecipients.includes(contact.email)) {
      setCcRecipients(prev => [...prev, contact.email]);
    }
    setCcInput('');
    setShowCcContactDropdown(false);
    setFilteredCcContacts([]);
  };

  const handleCcInputFocus = () => {
    if (ccInput.trim().length > 0) {
      const contacts = searchContacts(ccInput, 5);
      setFilteredCcContacts(contacts);
      setShowCcContactDropdown(contacts.length > 0);
    }
  };

  const handleCcInputBlur = () => {
    setTimeout(() => {
      setShowCcContactDropdown(false);
    }, 150);
  };


  // Prevent pressing Enter in the To field from submitting the entire form.
  const handleToInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Optionally we could finalize the typed email here (similar to chips) but requirement says: must click Send.
      if (to && !to.includes('@')) {
        // Basic feedback for malformed quick Enter
        // (Silent ignore otherwise)
        console.warn('Email not added: missing @');
      }
    }
  };

  // Also block Enter in CC input when empty (already handled when adding) to stop form submit bubbling.
  const handleCcInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const removeCcRecipient = (email: string) => {
    // Allow David and Marti to remove any CC recipients
    // For other users, don't allow removing the hardcoded David email
    if (email === 'david.v@dnddesigncenter.com' &&
      currentProfile?.name !== 'David' &&
      currentProfile?.name !== 'Marti') {
      return; // Only David and Marti can remove David's CC
    }
    setCcRecipients(prev => prev.filter(recipient => recipient !== email));
  };




  // Drag and drop handlers for invoices and orders

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsGeneratingPDF(true);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { item, type } = data;

      console.log(`Generating PDF for ${type}:`, item);

      const sb = sharedSupabase;

      let pdfBlob: Blob;
      let filename: string;

      if (type === 'invoice' || type === 'customer-order') {
        // Fetch real invoice and its line items
        const invoiceId = item.id;
        const { data: invoiceData, error: invoiceError } = await sb
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();
        if (invoiceError) throw invoiceError;

        const { data: lineItemsData, error: lineError } = await sb
          .from('invoice_line_items')
          .select('*')
          .eq('invoice_id', invoiceId);
        if (lineError) throw lineError;

        // Transform to InvoicePrintView props (reuse logic similar to InvoicePreviewModal)
        let payments: any[] = [];
        if (invoiceData.payments_history) {
          try {
            if (typeof invoiceData.payments_history === 'object') {
              payments = Array.isArray(invoiceData.payments_history) ? invoiceData.payments_history : [];
            } else {
              payments = JSON.parse(invoiceData.payments_history);
            }
          } catch {
            payments = [];
          }
        }

        const invoiceDoc: InvoiceDoc = {
          poNumber: invoiceData.po_number,
          date: invoiceData.invoice_date,
          customerName: invoiceData.customer_name,
          address: invoiceData.customer_address,
          city: invoiceData.customer_city,
          state: invoiceData.customer_state,
          zip: invoiceData.customer_zip,
          tel1: invoiceData.customer_tel1 || '',
          tel2: invoiceData.customer_tel2 || '',
          email: invoiceData.customer_email || '',
          lineItems: (lineItemsData || []).map((it: any) => ({
            id: it.id,
            item: it.item_code || '',
            description: it.description,
            brand: it.brand,
            quantity: it.quantity,
            price: it.unit_price
          })),
          subtotal: invoiceData.subtotal,
          discount: invoiceData.discount_amount || 0,
          tax: invoiceData.tax_amount,
          total: invoiceData.total_amount,
          balance: invoiceData.balance_due,
          payments
        };

        pdfBlob = await exportInvoiceDocToPDF(invoiceDoc);
        filename = `invoice-${invoiceData.po_number || invoiceData.id}.pdf`;
      } else if (type === 'order' || type === 'supplier-order') {
        // For orders, fetch from orders + orders_line_items
        const orderId = item.id;
        const { data: orderData, error: orderError } = await sb
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        if (orderError) throw orderError;

        const { data: items, error: itemsError } = await sb
          .from('orders_line_items')
          .select('*')
          .eq('order_id', orderId);
        if (itemsError) throw itemsError;

        // Fetch brand details if supplier_id exists
        let supplierName = '';
        let address = '';
        let city = '';
        let state = '';
        let zip = '';
        let tel1 = '';
        let tel2 = '';
        let email = '';

        if (orderData.supplier_id) {
          const { data: brandData } = await sb
            .from('brands')
            .select('*')
            .eq('id', orderData.supplier_id)
            .single();

          if (brandData) {
            supplierName = brandData.name || '';
            address = brandData.address_line1 || '';
            city = brandData.city || '';
            state = brandData.state || '';
            zip = brandData.postal_code || '';
            tel1 = brandData.phone_primary || '';
            tel2 = brandData.phone_secondary || '';
            email = brandData.email || '';
          }
        }

        const orderDoc: SupplierOrderDoc = {
          poNumber: orderData.order_number || '',
          date: orderData.order_date || '',
          supplierName: supplierName,
          address: address,
          city: city,
          state: state,
          zip: zip,
          tel1: tel1,
          tel2: tel2,
          email: email,
          lineItems: (items || []).map((it: any, idx: number) => ({
            id: it.id,
            item: ((idx + 1) as number).toString(),
            description: it.description || '',
            brand: it.brand || '',
            quantity: it.quantity || 1,
          })),
        };

        pdfBlob = await exportSupplierOrderToPDF(orderDoc);
        filename = `order-${orderData.order_number || orderData.id}.pdf`;
      } else {
        throw new Error('Unknown item type');
      }

      // Convert blob to file for attachment
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // Create attachment with actual PDF file
      const attachment: AttachmentItem = {
        name: filename,
        mimeType: 'application/pdf',
        file: pdfFile,
        size: pdfFile.size,
        dataUrl: URL.createObjectURL(pdfBlob), // For preview
      };

      setAttachments(prev => [...prev, attachment]);
      console.log(`Successfully attached ${filename}`);
    } catch (error) {
      console.error('Error processing dropped item:', error);
      // Show user-friendly error
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Load real invoices and orders data from Supabase
  useEffect(() => {
    const loadInvoicesAndOrders = async () => {
      setIsLoadingAttachmentData(true);
      try {
        // Fetch invoices from Supabase
        let invoicesQuery = supabase
          .from('invoices')
          .select('id, po_number, customer_name, total_amount, invoice_date, created_by, created_at')
          .order('created_at', { ascending: false })
          .limit(20); // Limit to recent 20 invoices

        // Role-based filtering for invoices
        if (currentProfile?.name === 'David') {
          // David can see all invoices
        } else if (currentProfile?.name && ['Marti', 'Natalia', 'Dimitry'].includes(currentProfile.name)) {
          // Staff can only see their own invoices
          invoicesQuery = invoicesQuery.eq('created_by', currentProfile.name);
        }

        const { data: invoicesData, error: invoicesError } = await invoicesQuery;

        if (invoicesError) {
          console.error('Error fetching invoices:', invoicesError);
        } else {
          const transformedInvoices = (invoicesData || []).map((invoice) => ({
            id: invoice.id,
            number: invoice.po_number || 'N/A',
            client: invoice.customer_name || 'Unknown Client',
            amount: `$${Number(invoice.total_amount || 0).toLocaleString()}`,
            date: invoice.invoice_date || invoice.created_at?.split('T')[0] || 'N/A'
          }));
          setInvoices(transformedInvoices);
        }

        // Fetch supplier orders (purchase orders to suppliers)
        let supplierOrdersQuery = supabase
          .from('orders')
          .select('id, order_number, order_date, created_by, suppliers(display_name)')
          .order('created_at', { ascending: false })
          .limit(20);

        if (currentProfile?.name && currentProfile.name !== 'David' && ['Marti', 'Natalia', 'Dimitry'].includes(currentProfile.name)) {
          supplierOrdersQuery = supplierOrdersQuery.eq('created_by', currentProfile.name);
        }

        const { data: supplierOrdersData, error: supplierOrdersError } = await supplierOrdersQuery;
        if (supplierOrdersError) {
          console.error('Error fetching supplier orders:', supplierOrdersError);
          setOrders([]);
        } else {
          const transformedSupplierOrders = (supplierOrdersData || []).map((po: any) => ({
            id: po.id,
            number: po.order_number || 'N/A',
            customer: po.suppliers?.display_name || 'Supplier',
            total: '-', // Supplier orders may not have a total in this table
            status: 'Supplier Order',
            orderSource: 'supplier-order'
          }));
          setOrders(transformedSupplierOrders);
        }

      } catch (error) {
        console.error('Error loading invoices and orders:', error);
        // Fallback to empty arrays
        setInvoices([]);
        setOrders([]);
      } finally {
        setIsLoadingAttachmentData(false);
      }
    };

    if (currentProfile?.name) {
      loadInvoicesAndOrders();
    }
  }, [currentProfile?.name]);

  return (
    <>
      <div className={`fixed z-50 flex flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'inset-4' : 'bottom-4 right-4 w-[600px]'}`}>
        {/* Main Compose Window - Gmail-style popup */}
        <div
          className={`bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'h-full' : 'h-[580px]'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* PDF Generation Overlay */}
          {isGeneratingPDF && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-700 text-sm font-medium">Generating PDF...</p>
              </div>
            </div>
          )}
          {/* Outlook-style Header */}
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {/* Send Button */}
              <div className="flex">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSending || !toRecipients.length}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                >
                  <SendHorizontal size={12} />
                  Send
                </button>
              </div>

              {/* From selector */}
              <div className="flex items-center gap-1 text-xs text-gray-700">
                <span className="text-gray-500">From:</span>
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  <span>{currentProfile?.userEmail || 'me@example.com'}</span>
                </button>
              </div>
            </div>

            {/* Right side icons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSaveAndClose}
                className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-xs transition-colors"
                title="Save & Close"
              >
                <X size={12} />
                Close
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1 px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded text-xs transition-colors"
                title="Discard draft permanently"
              >
                <Trash2 size={12} />
                Discard
              </button>
              <button
                type="button"
                onClick={toggleExpand}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>

          {/* Compose Form */}
          {(
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              {/* Recipient fields section - Outlook style */}
              <div className="flex-shrink-0 px-3 py-1 space-y-1 overflow-visible max-h-[280px]">
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
                      {!showCcBcc && (
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
                      {/* Display existing TO recipients */}
                      {toRecipients.map((email, index) => (
                        <div key={index} className="flex items-center bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">
                          <span>{email}</span>
                          <button
                            type="button"
                            onClick={() => setToRecipients(toRecipients.filter((_, i) => i !== index))}
                            className="ml-1 text-gray-500 hover:text-gray-800"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {/* TO Input field */}
                      <input
                        type="text"
                        value={toInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setToInput(value);
                          handleToInputChange(e);

                          // Auto-convert to badge when space, comma, or Enter is detected
                          if (value.endsWith(' ') || value.endsWith(',')) {
                            const email = value.slice(0, -1).trim();
                            if (email && email.includes('@') && !toRecipients.includes(email)) {
                              setToRecipients([...toRecipients, email]);
                              setToInput('');
                              setTo([...toRecipients, email].join(', '));
                            }
                          }
                        }}
                        onFocus={handleToInputFocus}
                        onBlur={() => {
                          // Convert to badge on blur if valid email
                          const email = toInput.trim();
                          if (email && email.includes('@') && !toRecipients.includes(email)) {
                            setToRecipients([...toRecipients, email]);
                            setToInput('');
                            setTo([...toRecipients, email].join(', '));
                          }
                          handleToInputBlur();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const email = toInput.trim();
                            if (email && email.includes('@') && !toRecipients.includes(email)) {
                              setToRecipients([...toRecipients, email]);
                              setToInput('');
                              setTo([...toRecipients, email].join(', '));
                            }
                          } else {
                            handleToInputKeyDown(e);
                          }
                        }}
                        className="flex-1 min-w-[120px] outline-none text-xs py-0.5 bg-transparent"
                        placeholder=""
                      />
                    </div>
                  </div>

                  {/* Contact dropdown */}
                  {showContactDropdown && (
                    <div className="absolute top-full left-14 right-0 z-[9999] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map((contact, index) => (
                          <div
                            key={`${contact.email}-${index}`}
                            onClick={() => handleContactSelect(contact)}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            {contact.photoUrl ? (
                              <img
                                src={contact.photoUrl}
                                alt={contact.name}
                                className="w-7 h-7 rounded-full mr-2.5 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium mr-2.5 flex-shrink-0">
                                {getProfileInitial(contact.name, contact.email)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {contact.name}
                                </span>
                                {contact.isFrequentlyContacted && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                                    Frequent
                                  </span>
                                )}
                              </div>
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

                {showCcBcc && (
                  <>
                    {/* CC Section */}
                    <div className="relative">
                      <div className="flex items-start gap-2 py-1">
                        <button
                          type="button"
                          className="px-2 py-0.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex-shrink-0"
                        >
                          Cc
                        </button>
                        <div className="flex-1 flex flex-wrap items-center gap-1.5 border-b border-gray-300 pb-1 min-h-[28px]">
                          {/* Display existing CC recipients */}
                          {ccRecipients.map((email, index) => (
                            <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                              <span className={email === 'david.v@dnddesigncenter.com' && currentProfile?.name !== 'David' ? 'text-blue-600 font-medium' : ''}>
                                {email === 'david.v@dnddesigncenter.com' && currentProfile?.name !== 'David'
                                  ? email + ' (owner)'
                                  : email}
                              </span>
                              {/* Show remove button based on user permissions */}
                              {(email !== 'david.v@dnddesigncenter.com' ||
                                currentProfile?.name === 'David' ||
                                currentProfile?.name === 'Marti' ||
                                currentProfile?.userEmail === 'info@effidigi.com') && (
                                  <button
                                    type="button"
                                    onClick={() => removeCcRecipient(email)}
                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                  >
                                    <X size={10} />
                                  </button>
                                )}
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
                              }
                              handleCcInputBlur();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const email = ccInput.trim();
                                if (email && email.includes('@') && !ccRecipients.includes(email)) {
                                  setCcRecipients([...ccRecipients, email]);
                                  setCcInput('');
                                }
                              } else {
                                handleCcInputKeyDown(e);
                              }
                            }}
                            className="flex-1 min-w-[120px] outline-none text-xs py-0.5 bg-transparent"
                            placeholder=""
                          />
                        </div>
                      </div>

                      {/* CC Contact dropdown */}
                      {showCcContactDropdown && (
                        <div className="absolute top-full left-14 right-0 z-[9999] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredCcContacts.length > 0 ? (
                            filteredCcContacts.map((contact, index) => (
                              <div
                                key={`cc-${contact.email}-${index}`}
                                onClick={() => handleCcContactSelect(contact)}
                                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                {contact.photoUrl ? (
                                  <img
                                    src={contact.photoUrl}
                                    alt={contact.name}
                                    className="w-7 h-7 rounded-full mr-2.5 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium mr-2.5 flex-shrink-0">
                                    {getProfileInitial(contact.name, contact.email)}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm font-medium text-gray-900 truncate">
                                      {contact.name}
                                    </span>
                                    {contact.isFrequentlyContacted && (
                                      <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                                        Frequent
                                      </span>
                                    )}
                                  </div>
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
                      <div className="flex items-start gap-2 py-1">
                        <button
                          type="button"
                          className="px-2 py-0.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex-shrink-0"
                        >
                          Bcc
                        </button>
                        <div className="flex-1 flex flex-wrap items-center gap-1.5 border-b border-gray-300 pb-1 min-h-[28px]">
                          {bccRecipients.map((email, index) => (
                            <div key={index} className="flex items-center bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">
                              <span>{email}</span>
                              <button
                                type="button"
                                onClick={() => setBccRecipients(bccRecipients.filter((_, i) => i !== index))}
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
                              setBccInput(value);
                              if (value.endsWith(' ') || value.endsWith(',')) {
                                const email = value.slice(0, -1).trim();
                                if (email && email.includes('@') && !bccRecipients.includes(email)) {
                                  setBccRecipients([...bccRecipients, email]);
                                  setBccInput('');
                                }
                              }
                            }}
                            onBlur={() => {
                              const email = bccInput.trim();
                              if (email && email.includes('@') && !bccRecipients.includes(email)) {
                                setBccRecipients([...bccRecipients, email]);
                                setBccInput('');
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const email = bccInput.trim();
                                if (email && email.includes('@') && !bccRecipients.includes(email)) {
                                  setBccRecipients([...bccRecipients, email]);
                                  setBccInput('');
                                }
                              }
                            }}
                            className="flex-1 min-w-[120px] outline-none text-xs py-0.5 bg-transparent"
                            placeholder=""
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Subject field */}
                <div className="flex items-start gap-2 py-1">
                  <button
                    type="button"
                    className="px-2 py-0.5 text-xs text-gray-700 flex-shrink-0"
                  >
                    Subject
                  </button>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      handleContentChange();
                    }}
                    className="flex-1 outline-none text-xs py-0.5 border-b border-gray-300 bg-transparent"
                    placeholder=""
                  />
                </div>
                {/* Compact Attachment thumbnails */}
{attachments.length > 0 && (
  <div className="py-1">
    <div className="flex gap-1 overflow-x-auto overflow-y-hidden">
      {attachments.map((attachment, index) => (
        <div
          key={index}
          className="group flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors cursor-pointer flex-shrink-0 min-w-[200px] max-w-[250px]"
          onClick={() => handleAttachmentPreview(attachment)}
        >
          {/* File icon */}
          <div className="flex-shrink-0 w-8 h-8 bg-red-50 rounded flex items-center justify-center">
            <Paperclip size={16} className="text-red-600" />
          </div>
          
          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-900 truncate font-medium">
              {attachment.name}
            </p>
            <p className="text-[10px] text-gray-500">
              {attachment.size ? formatFileSize(attachment.size) :
                attachment.file ? formatFileSize(attachment.file.size) : 'Unknown'}
            </p>
          </div>
          
          {/* Remove button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeAttachment(index);
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
              </div>

              {/* Flex editor section - fills remaining space */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0">
                  <RichTextEditor
                    value={newBodyHtml}
                    onChange={(value) => {
                      setNewBodyHtml(value);
                      handleContentChange();
                    }}
                    minHeight="100%"
                    disabled={isSending}
                    showPriceRequestButton={false}
                    onOpenPriceRequest={handleOpenPriceRequest}
                    showFileAttachmentButton={true}
                    onFileAttachment={handleRichTextFileAttachment}
                    compact={false}
                  />
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Thread display removed - compose window only */}
      {false && isReply && (
        <div className="mt-8">
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Email Thread</h3>

            {/* All Thread Attachments Summary */}
            {threadEmails.length > 0 && (
              (() => {
                const allAttachments = threadEmails.flatMap(email =>
                  email.attachments?.map(att => ({ ...att, emailFrom: email.from.name, emailDate: email.date })) || []
                );
                return allAttachments.length > 0 ? (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                      <Paperclip size={16} className="mr-2" />
                      All Files in Thread ({allAttachments.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {allAttachments.map((attachment, index) => (
                        <div key={index} className="bg-white border border-blue-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                          <div className="flex items-center mb-2">
                            {attachment.mimeType.startsWith('image/') ? (
                              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                                <span className="text-green-600 text-xs font-bold">IMG</span>
                              </div>
                            ) : attachment.mimeType.includes('pdf') ? (
                              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                                <span className="text-red-600 text-xs font-bold">PDF</span>
                              </div>
                            ) : attachment.mimeType.includes('word') || attachment.mimeType.includes('document') ? (
                              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                <span className="text-blue-600 text-xs font-bold">DOC</span>
                              </div>
                            ) : attachment.mimeType.includes('excel') || attachment.mimeType.includes('sheet') ? (
                              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                                <span className="text-green-600 text-xs font-bold">XLS</span>
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                <Paperclip size={14} className="text-gray-600" />
                              </div>
                            )}
                            <div className="ml-2 flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{attachment.name}</p>
                              <p className="text-xs text-gray-500">{(attachment.size / 1000).toFixed(0)} KB</p>
                            </div>
                          </div>
                          <p className="text-xs text-blue-600 truncate">From: {attachment.emailFrom}</p>
                          <p className="text-xs text-gray-500">{formatDistanceToNow(parseISO(attachment.emailDate), { addSuffix: true })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()
            )}

            {threadLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                <span className="ml-3 text-gray-600">Loading thread...</span>
              </div>
            ) : threadEmails.length > 0 ? (
              <div className="space-y-4">
                {threadEmails.map((email) => (
                  <div key={email.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm">
                            {getProfileInitial(email.from.name, email.from.email)}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{email.from.name}</p>
                            <p className="text-xs text-gray-500">{email.from.email}</p>
                          </div>
                          {/* Attachment indicator */}
                          {email.attachments && email.attachments.length > 0 && (
                            <div className="ml-3 flex items-center text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                              <Paperclip size={12} className="mr-1" />
                              {email.attachments.length} file{email.attachments.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500" title={format(parseISO(email.date), 'PPpp')}>
                          {formatDistanceToNow(parseISO(email.date), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <div
                        className="prose max-w-none text-sm email-body-content"
                        dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(email.body) }}
                      />

                      {/* Enhanced Attachment Display */}
                      {email.attachments && email.attachments.length > 0 && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                            <Paperclip size={16} className="mr-2" />
                            Attachments ({email.attachments.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {email.attachments.map((attachment, attachIndex) => (
                              <div key={attachIndex} className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                {/* File type icon/thumbnail */}
                                <div className="flex-shrink-0 mr-3">
                                  {attachment.mimeType.startsWith('image/') ? (
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">IMG</span>
                                    </div>
                                  ) : attachment.mimeType.includes('pdf') ? (
                                    <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">PDF</span>
                                    </div>
                                  ) : attachment.mimeType.includes('word') || attachment.mimeType.includes('document') ? (
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">DOC</span>
                                    </div>
                                  ) : attachment.mimeType.includes('excel') || attachment.mimeType.includes('sheet') ? (
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">XLS</span>
                                    </div>
                                  ) : attachment.mimeType.includes('powerpoint') || attachment.mimeType.includes('presentation') ? (
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">PPT</span>
                                    </div>
                                  ) : attachment.mimeType.includes('zip') || attachment.mimeType.includes('archive') ? (
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">ZIP</span>
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center">
                                      <Paperclip size={20} className="text-white" />
                                    </div>
                                  )}
                                </div>

                                {/* File info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {(attachment.size / 1000).toFixed(0)} KB
                                    {attachment.mimeType !== 'application/octet-stream' && (
                                      <span className="ml-2">• {attachment.mimeType.split('/')[1].toUpperCase()}</span>
                                    )}
                                  </p>
                                </div>

                                {/* Download button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Handle download - for now just log, but you could implement download logic here
                                    console.log('Download attachment:', attachment.name);
                                  }}
                                  className="ml-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  title="Download file"
                                >
                                  Download
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No thread history available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewFile && (
        <Modal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          title={previewFile.name || 'Attachment Preview'}
          size="lg"
        >
          <div className="p-4">
            {/* Image Preview */}
            {previewFile.mimeType.startsWith('image/') && (
              <div className="flex items-center justify-center">
                <img
                  src={previewFile.dataUrl || (previewFile.file ? URL.createObjectURL(previewFile.file) : '')}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              </div>
            )}

            {/* PDF Preview */}
            {previewFile.mimeType === 'application/pdf' && previewFile.file && (
              <div className="flex items-center justify-center">
                <iframe
                  src={URL.createObjectURL(previewFile.file)}
                  className="w-full h-[70vh] border rounded"
                  title={previewFile.name}
                />
              </div>
            )}

            {/* Text/Code Preview */}
            {(previewFile.mimeType.startsWith('text/') ||
              previewFile.mimeType === 'application/json' ||
              previewFile.mimeType === 'application/xml') && previewFile.file && (
                <div className="bg-gray-50 rounded p-4 max-h-[70vh] overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap">
                    {/* File content would be loaded here */}
                    <span className="text-gray-500">Text preview available when file is opened</span>
                  </pre>
                </div>
              )}

            {/* Other file types */}
            {!previewFile.mimeType.startsWith('image/') &&
              previewFile.mimeType !== 'application/pdf' &&
              !previewFile.mimeType.startsWith('text/') &&
              previewFile.mimeType !== 'application/json' &&
              previewFile.mimeType !== 'application/xml' && (
                <div className="text-center text-gray-500 py-8">
                  <Paperclip size={48} className="mx-auto mb-4" />
                  <p>Preview not available for this file type.</p>
                  <p className="text-sm mt-2">{previewFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{previewFile.mimeType}</p>
                </div>
              )}

            {/* File Info */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Size: {previewFile.file ? formatFileSize(previewFile.file.size) : previewFile.size ? formatFileSize(previewFile.size) : 'Unknown'}</span>
                <span>Type: {previewFile.mimeType}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default Compose;