import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Paperclip, Minimize, Maximize, CheckCircle } from 'lucide-react';
import { sendEmail, getThreadEmails, clearEmailCache } from '../services/emailService';
import { Email, Contact } from '../types';
import { getProfileInitial } from '../lib/utils';
import Modal from '../components/common/Modal';
import RichTextEditor from '../components/common/RichTextEditor';
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
  const { searchContacts } = useContacts();
  const [to, setTo] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [subject, setSubject] = useState('');
  const [newBodyHtml, setNewBodyHtml] = useState(''); // User's editable message (now HTML)
  const [originalEmailHtml, setOriginalEmailHtml] = useState(''); // Pre-filled HTML content
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [previewFile, setPreviewFile] = useState<AttachmentItem | null>(null);
  
  // Thread-related state
  const [isReply, setIsReply] = useState(false);
  const [threadEmails, setThreadEmails] = useState<Email[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(undefined);
  
  // Success message states
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successRecipient, setSuccessRecipient] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're replying to an email or have pre-filled data
  useEffect(() => {
    if (location.state) {
      const { 
        to: replyTo, 
        subject: replySubject, 
        body: plainTextBody,
        originalBody: htmlBody,
        replyToId: incomingReplyToId, 
        threadId,
        attachments: incomingAttachments 
      } = location.state as any;
      
      if (replyTo) setTo(replyTo);
      if (replySubject) setSubject(replySubject);
      
      // Set the user's editable text (convert plain text to HTML if needed)
      if (plainTextBody) {
        // Convert plain text to HTML for rich text editor
        const htmlBody = convertPlainTextToHtml(plainTextBody);
        setNewBodyHtml(htmlBody);
      }
      
      // Set the original HTML content (for final sending)
      if (htmlBody) setOriginalEmailHtml(htmlBody);
      
      // If this is a reply, fetch the thread emails
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to) {
      alert('Please specify at least one recipient');
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
        body: finalBodyHtml
      }, processedAttachments, currentThreadId);
      
      // Clear email cache to ensure fresh data when returning to thread
      clearEmailCache();
      
      // Show success message
      setSuccessRecipient(to);
      setShowSuccessMessage(true);
      
      // Determine navigation destination based on whether this is a reply
      const isThreadReply = !!currentThreadId;
      const navigationDestination = isThreadReply ? `/email/${currentThreadId}` : '/inbox';
      
      // Hide success message and navigate after 2 seconds (reduced for better UX)
      setTimeout(() => {
        setShowSuccessMessage(false);
        navigate(navigationDestination, { 
          state: isThreadReply ? { refresh: true } : undefined 
        });
      }, 2000);
      
    } catch (error) {
      console.error('Error sending email:', error);
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    navigate('/inbox');
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      const newAttachments = fileList.map(file => ({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        file: file,
        size: file.size
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
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

    // Update filtered contacts based on input
    const contacts = searchContacts(value, 5);
    setFilteredContacts(contacts);
    // Show dropdown as soon as user types any character (even if no matches)
    setShowContactDropdown(value.trim().length > 0);
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

  // Function to render attachment preview
  const renderAttachmentPreview = (attachment: AttachmentItem, index: number) => {
    // Create a compatible attachment object for FileThumbnail
    const compatibleAttachment = {
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size || attachment.file?.size || 0,
      attachmentId: attachment.attachmentId,
      partId: attachment.partId
    };

    return (
      <div key={index} className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
        {/* Thumbnail */}
        <div className="flex-shrink-0 mr-3">
          <FileThumbnail
            attachment={compatibleAttachment}
            emailId="compose" // Dummy emailId for compose mode
            size="small"
            showPreviewButton={true}
            onPreviewClick={() => handleAttachmentPreview(attachment)}
          />
        </div>
        
        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
          <p className="text-xs text-gray-500">
            {attachment.file ? formatFileSize(attachment.file.size) : attachment.size ? formatFileSize(attachment.size) : 'Generated attachment'}
            {attachment.mimeType !== 'application/octet-stream' && (
              <span className="ml-2">• {attachment.mimeType}</span>
            )}
          </p>
        </div>
        
        {/* Remove button */}
        <button 
          type="button" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            removeAttachment(index);
          }}
          className="flex-shrink-0 ml-3 text-gray-400 hover:text-red-500 transition-colors"
          title="Remove attachment"
        >
          <X size={16} />
        </button>
      </div>
    );
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 w-64 bg-white rounded-t-lg shadow-lg z-10">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-medium truncate">
            {subject || 'New Message'}
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

      <div className="max-w-4xl mx-auto p-4 slide-in">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">New Message</h2>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setIsMinimized(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Minimize size={18} />
              </button>
              <button 
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
              <div className="relative">
                <div className="flex items-center border-b border-gray-200 py-2">
                  <span className="w-20 text-gray-500 text-sm">To:</span>
                  <input
                    type="text"
                    value={to}
                    onChange={handleToInputChange}
                    onFocus={handleToInputFocus}
                    onBlur={handleToInputBlur}
                    className="flex-1 outline-none text-sm"
                    placeholder="Recipients"
                  />
                </div>
                
                {/* Contact dropdown */}
                {showContactDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
              
              <div className="flex items-center border-b border-gray-200 py-2">
                <span className="w-20 text-gray-500 text-sm">Subject:</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 outline-none text-sm"
                  placeholder="Subject"
                />
              </div>
              
              <div className="pt-2">
                <RichTextEditor
                  value={newBodyHtml}
                  onChange={setNewBodyHtml}
                  placeholder="Compose your message..."
                  minHeight="400px"
                  disabled={isSending}
                />
              </div>

              {/* Attachment list */}
              {attachments.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Attachments ({attachments.length})
                  </p>
                  <div className="space-y-3">
                    {attachments.map((attachment, index) => renderAttachmentPreview(attachment, index))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
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
              </div>
              
              <div>
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleAttachmentClick}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                  title="Attach files"
                >
                  <Paperclip size={18} />
                </button>
              </div>
            </div>
          </form>
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