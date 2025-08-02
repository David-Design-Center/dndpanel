import { useState, useEffect } from 'react';
import { X, Reply, Trash, Paperclip, Forward, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getEmailById, markEmailAsTrash, getThreadEmails } from '../services/emailService';
import { optimizedEmailService } from '../services/optimizedEmailService';
import { Email } from '../types';
import { getProfileInitial } from '../lib/utils';
import { useInboxLayout } from '../contexts/InboxLayoutContext';
import EmailViewer from './common/EmailViewer';
import RichTextEditor from './common/RichTextEditor';

interface EmbeddedViewEmailProps {
  emailId: string;
  onEmailUpdate?: (email: Email) => void;
}

// Process thread messages - simplified since Shadow DOM handles sanitization
const processThreadMessages = async (threadEmails: Email[]): Promise<Email[]> => {
  if (!threadEmails || threadEmails.length === 0) return [];
  
  console.log(`✨ Processing ${threadEmails.length} pre-separated Gmail messages`);
  
  // Sort by date (newest to oldest - newest emails at the top)
  const sortedEmails = [...threadEmails].sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    return bTime - aTime; // Reversed: newest first
  });
  
  // Since Shadow DOM handles all sanitization, we just return the emails as-is
  console.log(`✅ Successfully processed ${sortedEmails.length} thread messages`);
  return sortedEmails;
};

// Function to generate consistent colors for email senders
const getSenderColor = (email: string): string => {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600', 
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-indigo-500 to-indigo-600',
    'from-red-500 to-red-600',
    'from-yellow-500 to-yellow-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-cyan-500 to-cyan-600'
  ];
  
  // Generate a consistent hash from the email address
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick a color consistently
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

function EmbeddedViewEmail({ emailId, onEmailUpdate }: EmbeddedViewEmailProps) {
  const [email, setEmail] = useState<Email | null>(null);
  const [processedThreadMessages, setProcessedThreadMessages] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingThread, setProcessingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [showInlineReply, setShowInlineReply] = useState(false);
  const [replyContent, setReplyContent] = useState<string>('');
  
  const { clearSelection } = useInboxLayout();
  const navigate = useNavigate();

  useEffect(() => {
    if (emailId) {
      fetchEmailAndThread();
    }
  }, [emailId]);

  // Optimized email fetching with fallback to standard method
  const fetchEmailOptimized = async (emailId: string): Promise<Email | undefined> => {
    console.log(`🔍 fetchEmailOptimized called for email ID: ${emailId}`);
    
    try {
      // Check if optimized service is available
      const isOptimizedAvailable = await optimizedEmailService.isAvailable();
      
      if (!isOptimizedAvailable) {
        console.log('Optimized service not available, using fallback');
        throw new Error('Optimized service is not available');
      }

      // Try to fetch as a thread first, then as single message
      try {
        const threadEmails = await optimizedEmailService.fetchEmailThread(emailId);
        if (threadEmails.length > 0) {
          return threadEmails[0]; // Return the main email
        }
      } catch (threadError) {
        const singleEmail = await optimizedEmailService.fetchSingleEmail(emailId);
        return singleEmail;
      }
    } catch (error) {
      console.error('Optimized fetch failed, falling back to standard method:', error);
      // Fallback to standard method
      try {
        const fallbackEmail = await getEmailById(emailId);
        return fallbackEmail;
      } catch (fallbackError) {
        console.error('Standard API also failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  // Optimized thread fetching with fallback
  const fetchThreadEmailsOptimized = async (threadId: string) => {
    try {
      const isOptimizedAvailable = await optimizedEmailService.isAvailable();
      
      if (!isOptimizedAvailable) {
        console.log('Optimized service not available for thread, using fallback');
        throw new Error('Optimized service not available');
      }

      const threadEmails = await optimizedEmailService.fetchEmailThread(threadId);
      
      if (threadEmails.length > 1) {
        return await processThreadMessages(threadEmails);
      } else {
        console.log(`📧 Single email thread, no processing needed`);
        return threadEmails;
      }
    } catch (error) {
      console.error('❌ Error fetching thread emails optimized, trying fallback:', error);
      
      // Fallback: try to get thread messages via standard Gmail API
      try {
        console.log('🔄 Falling back to standard Gmail API for thread');
        const standardThreadEmails = await getThreadEmails(threadId);
        
        if (standardThreadEmails && standardThreadEmails.length > 0) {
          console.log(`🧵 Standard API got ${standardThreadEmails.length} emails in thread`);
          if (standardThreadEmails.length > 1) {
            return await processThreadMessages(standardThreadEmails);
          } else {
            return standardThreadEmails;
          }
        } else {
          console.log('⚠️ Standard API returned no thread emails');
          return [];
        }
      } catch (fallbackError) {
        console.error('❌ Fallback thread fetch also failed:', fallbackError);
        return [];
      }
    }
  };

  const fetchEmailAndThread = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔍 Starting to fetch email: ${emailId}`);
      
      let fetchedEmail: Email | undefined;
      
      try {
        // Try optimized fetching first
        fetchedEmail = await fetchEmailOptimized(emailId);
        console.log('✅ Successfully fetched email:', fetchedEmail ? 'Found' : 'Not found');
      } catch (optimizedError) {
        console.log('🔄 Optimized fetch failed, falling back to standard method');
        // Fallback to standard method
        fetchedEmail = await getEmailById(emailId);
        console.log('✅ Standard fetch result:', fetchedEmail ? 'Found' : 'Not found');
      }

      if (fetchedEmail) {
        setEmail(fetchedEmail);
        console.log('📧 Email details:', {
          id: fetchedEmail.id,
          subject: fetchedEmail.subject,
          threadId: fetchedEmail.threadId,
          hasThreadId: !!fetchedEmail.threadId
        });
        
        // If this email has a threadId and it's not just a single message, fetch the thread
        if (fetchedEmail.threadId) {
          setProcessingThread(true);
          try {
            const threadMessages = await fetchThreadEmailsOptimized(fetchedEmail.threadId);
            if (threadMessages.length > 0) {
              setProcessedThreadMessages(threadMessages);
              // Auto-expand the latest message
              setExpandedMessages(new Set([threadMessages[0].id]));
            } else {
              // Fallback: if thread fetch fails, just show the single email
              console.log('⚠️ Thread fetch returned no messages, showing single email');
              setProcessedThreadMessages([fetchedEmail]);
              setExpandedMessages(new Set([fetchedEmail.id]));
            }
          } catch (threadError) {
            console.error('Error processing thread, showing single email:', threadError);
            // If thread processing fails, just show the single email
            setProcessedThreadMessages([fetchedEmail]);
            setExpandedMessages(new Set([fetchedEmail.id]));
          } finally {
            setProcessingThread(false);
          }
        } else {
          // Single email, no thread
          console.log('📧 Email has no threadId, showing as single email');
          setProcessedThreadMessages([fetchedEmail]);
          setExpandedMessages(new Set([fetchedEmail.id]));
        }
      } else {
        console.error('❌ No email found');
        setError('Email not found');
      }
    } catch (error) {
      console.error('Error fetching email:', error);
      setError('Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToTrash = async () => {
    if (!email) return;
    
    try {
      await markEmailAsTrash(email.id);
      clearSelection();
      if (onEmailUpdate) {
        onEmailUpdate(email);
      }
    } catch (error) {
      console.error('Error moving email to trash:', error);
    }
  };

  // Handle Reply functionality - Modified to show inline reply
  const handleReply = () => {
    if (!email) return;
    
    // Toggle inline reply instead of navigating to compose
    setShowInlineReply(!showInlineReply);
    
    // Clear reply content when opening the reply
    if (!showInlineReply) {
      setReplyContent('');
    }
  };

  // Handle Forward functionality
  const handleForward = () => {
    if (!email) return;
    
    // Create a forward subject with "Fwd: " prefix
    const subject = email.subject.startsWith('Fwd: ') ? email.subject : `Fwd: ${email.subject}`;
    
    // Format the original email for forwarding
    const formattedDate = format(parseISO(email.date), 'PPpp');
    const forwardedBody = `
<br><br>
---------- Forwarded message ---------<br>
From: ${email.from.name} <${email.from.email}><br>
Date: ${formattedDate}<br>
Subject: ${email.subject}<br>
To: ${email.to?.map(t => `${t.name} <${t.email}>`).join(', ') || 'Undisclosed recipients'}<br>
<br>
${email.body}
`;
    
    // Navigate to compose with prefilled data for forwarding
    navigate('/compose', { 
      state: { 
        subject: subject,
        originalBody: forwardedBody,
        attachments: email.attachments // Include attachments when forwarding
      } 
    });
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const isMessageExpanded = (messageId: string) => {
    return expandedMessages.has(messageId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="mb-4">{error || 'Email not found'}</p>
        <button
          onClick={clearSelection}
          className="btn btn-secondary"
        >
          Close
        </button>
      </div>
    );
  }

  const subject = email.subject || 'No Subject';
  const messagesToShow = processedThreadMessages.length > 0 
    ? processedThreadMessages.filter(msg => msg !== null) 
    : (email ? [email] : []);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-base font-semibold truncate flex-1 mr-4 min-w-0">{subject}</h2>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {processingThread && (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500"></div>
          )}
          <button
            onClick={() => {
              console.log('Close button clicked, calling clearSelection and navigating back...');
              clearSelection();
              navigate('/inbox');
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Thread conversation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-0 max-w-full">
          {messagesToShow.length > 0 ? messagesToShow.map((message, index) => {
            // Safety check for message object
            if (!message || !message.id) {
              console.warn('⚠️ Invalid message object:', message);
              return null;
            }

            const isExpanded = isMessageExpanded(message.id);
            const isLatest = index === 0;
            
            // Safety checks for message properties
            const fromData = message.from || { email: 'unknown@example.com', name: 'Unknown Sender' };
            const senderEmail = fromData.email || 'unknown@example.com';
            const senderName = fromData.name || fromData.email || 'Unknown Sender';
            const toData = message.to || [];
            const toEmails = Array.isArray(toData) ? toData.map(recipient => recipient?.email || 'unknown').join(', ') : 'Unknown Recipients';

            let displayDate = 'Unknown date';
            if (message.date) {
              try {
                const parsedDate = parseISO(message.date);
                displayDate = formatDistanceToNow(parsedDate, { addSuffix: true });
              } catch {
                displayDate = message.date;
              }
            }

            return (
              <div key={message.id} className={`border-b border-gray-100 ${isLatest ? 'bg-blue-50/30' : 'bg-white'} max-w-full`}>
                {/* Message header - always visible */}
                <div 
                  className="px-6 py-3 cursor-pointer hover:bg-gray-50/80 flex items-center justify-between transition-colors min-w-0"
                  onClick={() => toggleMessageExpansion(message.id)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`w-7 h-7 bg-gradient-to-br ${getSenderColor(senderEmail)} text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0`}>
                      {getProfileInitial(senderName, senderEmail)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm flex-1 min-w-0">{senderName}</p>
                        <span className="text-xs text-gray-500 flex-shrink-0">{displayDate}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{senderEmail}</p>
                      {!isExpanded && (
                        <p className="text-xs text-gray-600 truncate mt-1">
                          {message.preview || (message.body ? message.body.substring(0, 100).replace(/<[^>]*>/g, '') + '...' : 'No preview available')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {message.attachments && message.attachments.length > 0 && (
                      <Paperclip size={14} className="text-gray-400" />
                    )}
                    {isExpanded ? (
                      <ChevronDown size={18} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Message content - shown when expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-white max-w-full">
                    <div className="px-6 py-4 max-w-full overflow-hidden">
                      {/* To field */}
                      <div className="mb-3 text-xs text-gray-600 overflow-hidden">
                        <span className="font-medium">To:</span> 
                        <span className="ml-1 break-all">{toEmails}</span>
                      </div>

                      {/* Attachments - prominently displayed like in the image */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-4 max-w-full">
                          <h4 className="font-medium text-gray-900 mb-2 text-sm">Attachments</h4>
                          <div className="space-y-2 max-w-full">
                            {message.attachments.map((attachment, attIndex) => (
                              <div key={attIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors max-w-full min-w-0">
                                <div className="flex items-center space-x-2 flex-1 min-w-0 overflow-hidden">
                                  <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                                    <Paperclip size={12} className="text-red-600" />
                                  </div>
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    <p className="font-medium text-gray-900 truncate text-xs">{attachment.name}</p>
                                    {attachment.size && (
                                      <p className="text-xs text-gray-500">
                                        {(attachment.size / 1024).toFixed(1)} KB
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  {attachment.url && (
                                    <>
                                      <button
                                        onClick={() => window.open(attachment.url, '_blank')}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                      >
                                        View
                                      </button>
                                      <a
                                        href={attachment.url}
                                        download={attachment.name}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                      >
                                        Download
                                      </a>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message body - Styled and Isolated */}
                      <div className="prose max-w-none prose-sm overflow-hidden">
                        <EmailViewer 
                          htmlContent={message.body || ''}
                          className="email-body-content max-w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="p-6 text-center text-gray-500">
              <p>No messages to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Inline Reply Component - appears at the bottom of the thread */}
      {showInlineReply && email && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-2">
            <div className="bg-white rounded border border-gray-200">
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xs font-medium text-gray-700">
                  Reply to: {email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`}
                </h3>
                <button
                  onClick={() => setShowInlineReply(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-2">
                <div className="mb-2">
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">To:</span> {email.from.email}
                  </div>
                </div>
                
                <div className="mb-2">
                  <RichTextEditor
                    value={replyContent}
                    onChange={setReplyContent}
                    placeholder="Type your reply..."
                    minHeight="180px"
                    className="border border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => {
                      // Handle sending the reply with the rich text content
                      console.log('Sending reply with content:', replyContent);
                      // TODO: Implement actual email sending logic here
                      // For now, we'll just close the reply window
                      setShowInlineReply(false);
                      setReplyContent(''); // Clear the content
                    }}
                    className="btn btn-primary flex items-center text-xs px-3 py-1.5"
                    disabled={!replyContent.trim()}
                  >
                    <Reply size={14} className="mr-1" />
                    Send Reply
                  </button>
                  
                  <button 
                    onClick={() => {
                      // Create a reply subject with "Re: " prefix if it doesn't already have it
                      const subject = email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`;
                      
                      // Format the original email for the reply
                      const formattedDate = format(parseISO(email.date), 'PPpp');
                      const quotedBody = `
<br><br>
<div style="padding-left: 1em; margin-left: 1em; border-left: 2px solid #ccc;">
  <p>On ${formattedDate}, ${email.from.name} <${email.from.email}> wrote:</p>
  ${email.body}
</div>
`;
                      
                      // Combine current reply content with quoted original
                      const fullBody = replyContent + quotedBody;
                      
                      // Navigate to full compose for advanced features
                      navigate('/compose', { 
                        state: { 
                          to: email.from.email,
                          subject: subject,
                          replyToId: email.id,
                          threadId: email.threadId,
                          originalBody: fullBody
                        } 
                      });
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Open in full editor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions footer - hidden when reply window is open */}
      {!showInlineReply && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <button 
              onClick={handleReply}
              className="btn btn-primary flex items-center text-sm px-3 py-2 flex-shrink-0"
            >
              <Reply size={14} className="mr-2" />
              Reply
            </button>
            <button 
              onClick={handleForward}
              className="btn btn-secondary flex items-center text-sm px-3 py-2 flex-shrink-0"
            >
              <Forward size={14} className="mr-2" />
              Forward
            </button>
            <button
              onClick={handleMoveToTrash}
              className="btn btn-danger flex items-center text-sm px-3 py-2 flex-shrink-0"
            >
              <Trash size={14} className="mr-2" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmbeddedViewEmail;
