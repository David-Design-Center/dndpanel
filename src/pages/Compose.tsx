import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Paperclip, Minimize, Maximize, CheckCircle, Plus, FileText, Receipt } from 'lucide-react';
import { sendEmail, getThreadEmails, clearEmailCache, saveDraft, deleteDraft } from '../services/emailService';
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
import PriceRequestAddon from '../components/common/PriceRequestAddon';
import FileThumbnail from '../components/common/FileThumbnail';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { useProfile } from '../contexts/ProfileContext';
import { useContacts } from '../contexts/ContactsContext';

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
  const { currentProfile } = useProfile();
  const { searchContacts, setShouldLoadContacts } = useContacts();
  const [to, setTo] = useState('');
  const [ccRecipients, setCcRecipients] = useState<string[]>([]); // Start empty, will be set in useEffect
  const [showCc, setShowCc] = useState(true); // Show CC by default since we have hardcoded recipient
  const [ccInput, setCcInput] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showCcContactDropdown, setShowCcContactDropdown] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [filteredCcContacts, setFilteredCcContacts] = useState<Contact[]>([]);
  const [subject, setSubject] = useState('');
  const [newBodyHtml, setNewBodyHtml] = useState(''); // User's editable message (now HTML)
  const [originalEmailHtml, setOriginalEmailHtml] = useState(''); // Pre-filled HTML content
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [previewFile, setPreviewFile] = useState<AttachmentItem | null>(null);
  const [showPriceRequestModal, setShowPriceRequestModal] = useState(false);
  
  // Thread-related state
  const [isReply, setIsReply] = useState(false);
  const [threadEmails, setThreadEmails] = useState<Email[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(undefined);
  
  // Success message states
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successRecipient, setSuccessRecipient] = useState('');
  
  // Draft auto-save states
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(undefined);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Attachment panel state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [attachmentPanelTab, setAttachmentPanelTab] = useState<'invoices' | 'orders'>('invoices');
  const [isLoadingAttachmentData, setIsLoadingAttachmentData] = useState(false);
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
  const handleClosePriceRequest = () => {
    setShowPriceRequestModal(false);
  };

  // Handle price request table insertion
  const handlePriceRequestInsert = (html: string, recipientEmail?: string, attachments?: Array<{ name: string; mimeType: string; data: string; cid: string }>) => {
    // Insert the HTML table into the editor
    setNewBodyHtml(prev => prev + html);
    
    // If recipientEmail is provided, update the To field
    if (recipientEmail && !to) {
      setTo(recipientEmail);
    }
    
    // If attachments are provided, add them to the email
    if (attachments && attachments.length > 0) {
      const newAttachments: AttachmentItem[] = attachments.map(att => ({
        name: att.name,
        mimeType: att.mimeType,
        data: att.data,
        size: undefined, // Size not available for base64 data
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    
    // Close the panel
    setShowPriceRequestModal(false);
  };

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
      
      // Add signature if available
      if (currentProfile?.signature) {
        if (finalBodyHtml) {
          finalBodyHtml += '<br><br>' + currentProfile.signature;
        } else {
          finalBodyHtml = currentProfile.signature;
        }
      }
      
      // Fallback if no content
      if (!finalBodyHtml) {
        finalBodyHtml = '<div style="font-family: Arial, sans-serif; color: #333;"></div>';
      }

      // Prepare CC recipients string for saving
      const ccRecipientsString = ccRecipients.filter(email => email.trim()).join(',');

      const result = await saveDraft({
        from: {
          name: 'Me',
          email: 'me@example.com'
        },
        to: [
          {
            name: '',
            email: to
          }
        ],
        subject,
        body: finalBodyHtml,
        internalDate: new Date().toISOString()
      }, processedAttachments, currentDraftId, ccRecipientsString);

      if (result.success) {
        setCurrentDraftId(result.draftId);
        setIsDraftDirty(false);
        setLastSavedAt(new Date());
        console.log('✅ Draft auto-saved successfully');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to) {
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
      
      // Add signature if available
      if (currentProfile?.signature) {
        if (finalBodyHtml) {
          finalBodyHtml += '<br><br>' + currentProfile.signature;
        } else {
          finalBodyHtml = currentProfile.signature;
        }
      }
      
      // Fallback if no content
      if (!finalBodyHtml) {
        finalBodyHtml = '<div style="font-family: Arial, sans-serif; color: #333;"></div>';
      }
      
      // Prepare CC recipients string (filter out empty values)
      const ccRecipientsString = ccRecipients.filter(email => email.trim()).join(',');

      await sendEmail({
        from: {
          name: 'Me',
          email: 'me@example.com'
        },
        to: [
          {
            name: '',
            email: to
          }
        ],
        subject,
        body: finalBodyHtml,
        internalDate: new Date().toISOString() // Add this line
      }, processedAttachments, currentThreadId, ccRecipientsString);
      
      // Delete the draft if it exists (since we just sent the email)
      if (currentDraftId) {
        try {
          await deleteDraft(currentDraftId);
          console.log('✅ Draft deleted after sending email');
        } catch (draftError) {
          console.error('❌ Error deleting draft after sending:', draftError);
          // Continue anyway since the email was sent successfully
        }
      }
      
      // Clear email cache to ensure fresh data when returning to thread
      clearEmailCache();
      
      // Show success message
      setSuccessRecipient(to);
      setShowSuccessMessage(true);
      
      // Determine navigation destination - ALWAYS stay in thread if we have a threadId
      const isThreadReply = !!currentThreadId;
      const navigationDestination = isThreadReply ? `/email/${currentThreadId}` : '/inbox';
      
      // For thread replies, navigate immediately with refresh state
      // For new emails, still show success message for 2 seconds
      if (isThreadReply) {
        // Navigate immediately to thread with refresh state
        setTimeout(() => {
          setShowSuccessMessage(false);
          navigate(navigationDestination, { 
            state: { refresh: true } 
          });
        }, 500); // Shorter delay for thread replies
      } else {
        // For new emails, wait 2 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
          navigate(navigationDestination);
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error sending email:', error);
      setIsSending(false);
    }
  };

  const handleCancel = async () => {
    // Save as draft before canceling
    if (isDraftDirty && (to || subject || newBodyHtml)) {
      try {
        await autoSaveDraft();
      } catch (error) {
        console.error('Error saving draft on cancel:', error);
      }
    }
    navigate('/inbox');
  };

  const handleManualSaveDraft = async () => {
    try {
      await autoSaveDraft();
    } catch (error) {
      console.error('Error manually saving draft:', error);
    }
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
  const handleToInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTo(value);
    handleContentChange();

    // Update filtered contacts based on input
    const contacts = searchContacts(value, 5);
    setFilteredContacts(contacts);
    // Show dropdown as soon as user types any character (even if no matches)
    const shouldShow = value.trim().length > 0;
    setShowContactDropdown(shouldShow);
  };

  const handleContactSelect = (contact: Contact) => {
    setTo(contact.email);
    setShowContactDropdown(false);
    setFilteredContacts([]);
  };

  const handleToInputFocus = () => {
    if (to.trim().length > 0) {
      const contacts = searchContacts(to, 5);
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

  const handleCcInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && ccInput.trim()) {
      e.preventDefault();
      // Add email if it's valid and not already in the list
      const email = ccInput.trim();
      if (email && !ccRecipients.includes(email) && email.includes('@')) {
        setCcRecipients(prev => [...prev, email]);
        setCcInput('');
      }
    }
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
    // Allow David to remove any CC recipients, including himself
    // For other users, don't allow removing the hardcoded David email
    if (email === 'david.v@dnddesigncenter.com' && currentProfile?.name !== 'David') {
      return; // Non-David users cannot remove David's CC
    }
    setCcRecipients(prev => prev.filter(recipient => recipient !== email));
  };

  const addCcRecipient = () => {
    setCcRecipients(prev => [...prev, '']);
  };



  // Drag and drop handlers for invoices and orders
  const handleDragStart = (e: React.DragEvent, item: any, type: 'invoice' | 'order' | 'customer-order' | 'supplier-order') => {
    e.dataTransfer.setData('application/json', JSON.stringify({ item, type }));
    e.dataTransfer.effectAllowed = 'copy';
  };

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

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 w-64 bg-white rounded-t-lg shadow-lg z-10">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-medium truncate">
            {subject || (currentDraftId ? 'Edit Draft' : 'New Message')}
          </h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsMinimized(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Maximize size={16} />
            </button>
            <button 
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center animate-fade-in">
          <CheckCircle size={24} className="mr-3" />
          <div>
            <p className="font-semibold">
              {currentThreadId ? 'Reply sent successfully!' : 'Email sent successfully!'}
            </p>
            <p className="text-sm opacity-90">Sent to: {successRecipient}</p>
            {currentThreadId && (
              <p className="text-sm opacity-90">Returning to conversation...</p>
            )}
          </div>
        </div>
      )}

      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="flex gap-4 h-full max-w-7xl w-full">
          {/* Main Compose Window */}
          <div 
            className="flex-1 max-w-4xl bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col h-full"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {/* PDF Generation Overlay */}
            {isGeneratingPDF && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-700 font-medium">Generating PDF...</p>
                  <p className="text-gray-500 text-sm">Please wait while we create your document</p>
                </div>
              </div>
            )}
            
            <div className="px-4 py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">
                  {currentDraftId ? 'Edit Draft' : 'New Message'}
                </h2>
              </div>
              <div className="flex space-x-2">
                <button 
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Minimize size={18} />
                </button>
                <button 
                  type="button"
                  onClick={handleCancel}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="relative">
                <div className="flex items-center border-b border-gray-200 py-2">
                  <span className="w-20 text-gray-500 text-sm">To:</span>
                  <input
                    type="text"
                    value={to}
                    onChange={handleToInputChange}
                    onFocus={handleToInputFocus}
                    onBlur={handleToInputBlur}
                    onKeyDown={handleToInputKeyDown}
                    className="flex-1 outline-none text-sm"
                    placeholder="Recipients"
                  />
                </div>
                
                {/* Contact dropdown */}
                {showContactDropdown && (
                  <div className="absolute top-full left-0 right-0 z-[999] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact, index) => (
                        <div
                          key={`${contact.email}-${index}`}
                          onClick={() => handleContactSelect(contact)}
                          className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          {contact.photoUrl ? (
                            <img
                              src={contact.photoUrl}
                              alt={contact.name}
                              className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                              {getProfileInitial(contact.name, contact.email)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {contact.name}
                              </span>
                              {contact.isFrequentlyContacted && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                                  Frequent
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-sm">No contacts found</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* CC Section */}
              {showCc && (
                <div className="relative">
                  <div className="flex items-start border-b border-gray-200 py-2">
                    <span className="w-20 text-gray-500 text-sm pt-2">CC:</span>
                    <div className="flex-1">
                      {/* Display existing CC recipients */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {ccRecipients.map((email, index) => (
                          <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                            <span className={email === 'david.v@dnddesigncenter.com' && currentProfile?.name !== 'David' ? 'text-blue-600 font-medium' : ''}>
                              {email === 'david.v@dnddesigncenter.com' && currentProfile?.name !== 'David' 
                                ? email + ' (owner)' 
                                : email}
                            </span>
                            {/* Show remove button based on user permissions */}
                            {(email !== 'david.v@dnddesigncenter.com' || currentProfile?.name === 'David') && (
                              <button
                                type="button"
                                onClick={() => removeCcRecipient(email)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* CC Input field */}
                      <input
                        type="text"
                        value={ccInput}
                        onChange={handleCcInputChange}
                        onFocus={handleCcInputFocus}
                        onBlur={handleCcInputBlur}
                        onKeyDown={handleCcInputKeyDown}
                        onKeyPress={handleCcInputKeyPress}
                        className="w-full outline-none text-sm"
                        placeholder="Add CC recipients..."
                      />
                    </div>
                    
                    {/* Add CC button */}
                    <button
                      type="button"
                      onClick={addCcRecipient}
                      className="ml-2 p-1 text-blue-600 hover:text-blue-800 rounded"
                      title="Add another CC recipient"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  {/* CC Contact dropdown */}
                  {showCcContactDropdown && (
                    <div className="absolute top-full left-0 right-0 z-[998] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredCcContacts.length > 0 ? (
                        filteredCcContacts.map((contact, index) => (
                          <div
                            key={`cc-${contact.email}-${index}`}
                            onClick={() => handleCcContactSelect(contact)}
                            className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            {contact.photoUrl ? (
                              <img
                                src={contact.photoUrl}
                                alt={contact.name}
                                className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                                {getProfileInitial(contact.name, contact.email)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {contact.name}
                                </span>
                                {contact.isFrequentlyContacted && (
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex-shrink-0">
                                    Frequent
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-sm">No contacts found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Show/Hide CC toggle */}
              {!showCc && (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add CC
                  </button>
                </div>
              )}
              
              <div className="flex items-center border-b border-gray-200 py-2">
                <span className="w-20 text-gray-500 text-sm">Subject:</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    handleContentChange();
                  }}
                  className="flex-1 outline-none text-sm"
                  placeholder="Subject"
                />
              </div>
              
              <div className="pt-2 flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
                  <RichTextEditor
                    value={newBodyHtml}
                    onChange={(value) => {
                      setNewBodyHtml(value);
                      handleContentChange();
                    }}
                    placeholder="Compose your message..."
                    minHeight="300px"
                    disabled={isSending}
                    showPriceRequestButton={true}
                    onOpenPriceRequest={handleOpenPriceRequest}
                    showFileAttachmentButton={true}
                    onFileAttachment={handleRichTextFileAttachment}
                  />
                  
                  {/* Attachment thumbnails at bottom of editor */}
                  {attachments.length > 0 && (
                    <div className="bg-gray-50 border-t border-gray-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Paperclip size={14} className="text-gray-500" />
                        <span className="text-xs font-medium text-gray-600">
                          {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="group relative bg-white border border-gray-200 rounded-lg p-2 hover:border-gray-300 transition-colors cursor-pointer"
                            onClick={() => handleAttachmentPreview(attachment)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0">
                                <FileThumbnail
                                  attachment={{
                                    name: attachment.name,
                                    mimeType: attachment.mimeType,
                                    size: attachment.size || attachment.file?.size || 0,
                                    attachmentId: attachment.attachmentId,
                                    partId: attachment.partId
                                  }}
                                  emailId="compose"
                                  userEmail="me@example.com"
                                  size="small"
                                  showPreviewButton={false}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate max-w-[80px]">
                                  {attachment.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {attachment.size ? formatFileSize(attachment.size) : 
                                   attachment.file ? formatFileSize(attachment.file.size) : 'Unknown'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Remove button - only visible on hover */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeAttachment(index);
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                              title="Remove attachment"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-end">
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className="btn btn-primary"
                >
                  {isSending ? 'Sending...' : 'Send'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualSaveDraft}
                  disabled={isAutoSaving || !isDraftDirty}
                  className="btn btn-secondary"
                >
                  {isAutoSaving ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Draft status indicator */}
                <div className="text-sm text-gray-500">
                  {isAutoSaving && (
                    <span className="flex items-center">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving draft...
                    </span>
                  )}
                  {!isAutoSaving && lastSavedAt && (
                    <span>
                      Draft saved {formatDistanceToNow(lastSavedAt, { addSuffix: true })}
                    </span>
                  )}
                  {!isAutoSaving && !lastSavedAt && isDraftDirty && (
                    <span className="text-amber-600">Unsaved changes</span>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Attachments Panel */}
        <div className="w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col h-full">
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Quick Attach</h3>
                <p className="text-sm text-gray-600 mt-1">Drag items to email to attach</p>
              </div>
              <button
                onClick={() => {
                  if (currentProfile?.name) {
                    // Trigger data reload
                    const loadInvoicesAndOrders = async () => {
                      setIsLoadingAttachmentData(true);
                      try {
                        let invoicesQuery = supabase
                          .from('invoices')
                          .select('id, po_number, customer_name, total_amount, invoice_date, created_by, created_at')
                          .order('created_at', { ascending: false })
                          .limit(20);

                        if (currentProfile.name !== 'David' && ['Marti', 'Natalia', 'Dimitry'].includes(currentProfile.name)) {
                          invoicesQuery = invoicesQuery.eq('created_by', currentProfile.name);
                        }

                        const { data: invoicesData } = await invoicesQuery;
                        
                        const transformedInvoices = (invoicesData || []).map((invoice) => ({
                          id: invoice.id,
                          number: invoice.po_number || 'N/A',
                          client: invoice.customer_name || 'Unknown Client',
                          amount: `$${Number(invoice.total_amount || 0).toLocaleString()}`,
                          date: invoice.invoice_date || invoice.created_at?.split('T')[0] || 'N/A'
                        }));
                        setInvoices(transformedInvoices);

                        // Reload supplier orders instead of customer orders
                        let supplierOrdersQuery = supabase
                          .from('orders')
                          .select('id, order_number, order_date, created_by, suppliers(display_name)')
                          .order('created_at', { ascending: false })
                          .limit(20);

                        if (currentProfile.name !== 'David' && ['Marti', 'Natalia', 'Dimitry'].includes(currentProfile.name)) {
                          supplierOrdersQuery = supplierOrdersQuery.eq('created_by', currentProfile.name);
                        }

                        const { data: supplierOrdersData } = await supplierOrdersQuery;
                        const transformedSupplierOrders = (supplierOrdersData || []).map((po: any) => ({
                          id: po.id,
                          number: po.order_number || 'N/A',
                          customer: po.suppliers?.display_name || 'Supplier',
                          total: '-',
                          status: 'Supplier Order',
                          orderSource: 'supplier-order'
                        }));
                        setOrders(transformedSupplierOrders);
                      } catch (error) {
                        console.error('Error refreshing data:', error);
                      } finally {
                        setIsLoadingAttachmentData(false);
                      }
                    };
                    loadInvoicesAndOrders();
                  }
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                title="Refresh data"
                disabled={isLoadingAttachmentData}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setAttachmentPanelTab('invoices')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                attachmentPanelTab === 'invoices'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Receipt size={16} className="inline mr-2" />
              Invoices
            </button>
            <button
              onClick={() => setAttachmentPanelTab('orders')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                attachmentPanelTab === 'orders'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <FileText size={16} className="inline mr-2" />
              Orders
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingAttachmentData ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            ) : (
              <>
                {attachmentPanelTab === 'invoices' && (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-500 mb-3">Drag invoices to attach as PDF</div>
                    {invoices.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Receipt size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-sm">No invoices available</p>
                      </div>
                    ) : (
                      invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, invoice, 'invoice')}
                          className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing transition-all bg-gradient-to-r from-white to-blue-50"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <Receipt size={16} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{invoice.number}</p>
                              <p className="text-xs text-gray-500">{invoice.client}</p>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-blue-600 font-medium">{invoice.amount}</p>
                                <p className="text-xs text-gray-400">{invoice.date}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {attachmentPanelTab === 'orders' && (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-500 mb-3">Drag orders to attach as PDF</div>
                    {orders.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-sm">No orders available</p>
                      </div>
                    ) : (
                      orders.map((order) => (
                        <div
                          key={order.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, order, 'order')}
                          className="p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md cursor-grab active:cursor-grabbing transition-all bg-gradient-to-r from-white to-green-50"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                              <FileText size={16} className="text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{order.number}</p>
                              <p className="text-xs text-gray-500">{order.customer}</p>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-green-600 font-medium">{order.total}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  order.status === 'Paid in Full' || order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                  order.status === 'Order in Progress' || order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sliding Product Table Panel */}
        <div className={`transition-all duration-300 ease-in-out bg-white rounded-lg shadow-md overflow-hidden ${
          showPriceRequestModal ? 'w-80 opacity-100' : 'w-0 opacity-0'
        }`}>
          {showPriceRequestModal && (
            <PriceRequestAddon
              isOpen={showPriceRequestModal}
              onClose={handleClosePriceRequest}
              onInsertTable={handlePriceRequestInsert}
            />
          )}
        </div>
        </div>
      </div>

      {/* Email Thread Display (when replying) */}
      {isReply && (
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
                        dangerouslySetInnerHTML={{ __html: email.body }}
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