import { useState, useEffect } from 'react';
import { X, Reply, Trash, Forward, Users } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getEmailById, markEmailAsTrash, getThreadEmails, sendReply, sendReplyAll } from '../../services/emailService';
import { optimizedEmailService } from '../../services/optimizedEmailService';
import { Email } from '../../types';
import { useInboxLayout } from '../../contexts/InboxLayoutContext';
import { useProfile } from '../../contexts/ProfileContext';
import { formatRecipientsForHeaders, cleanEmailAddress } from '../../utils/emailFormatting';
import { OutlookThreadView } from './outlook/OutlookThreadView';
import RichTextEditor from '../common/RichTextEditor';
import { useToast } from '../ui/use-toast';

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
  const [showInlineReply, setShowInlineReply] = useState(false);
  const [replyContent, setReplyContent] = useState<string>('');
  const [sendingReply, setSendingReply] = useState(false);
  const [isReplyAll, setIsReplyAll] = useState(false);
  
  const { clearSelection } = useInboxLayout();
  const { currentProfile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Function to create an optimistic reply email for immediate UI update
  const createOptimisticReply = (originalEmail: Email, replyContent: string, isReplyAllMode: boolean = false): Email => {
    const now = new Date().toISOString();
    
    // Process subject for reply
    let subject = originalEmail.subject || '';
    subject = subject.startsWith('Re: ') ? subject : `Re: ${subject}`;

    // Use current profile's email and name dynamically, with fallbacks
    const fromEmail = currentProfile?.userEmail || 'unknown@example.com';
    const fromName = currentProfile?.name || 'Current User';

    // Determine recipients based on reply type
    const toRecipients = [originalEmail.from];
    let ccRecipients: Array<{ name: string; email: string }> = [];

    if (isReplyAllMode) {
      // For reply all, collect all unique participants from the thread
      const allParticipants = new Map<string, { name: string; email: string }>();
      
      // Add recipients from all messages in the thread
      processedThreadMessages.forEach(message => {
        // Add original TO recipients
        if (message.to) {
          message.to.forEach(recipient => {
            if (recipient.email && recipient.email !== fromEmail) {
              allParticipants.set(recipient.email, recipient);
            }
          });
        }
        
        // Add CC recipients from thread messages
        if (message.cc) {
          message.cc.forEach(recipient => {
            if (recipient.email && recipient.email !== fromEmail) {
              allParticipants.set(recipient.email, recipient);
            }
          });
        }

        // Add senders (except current user)
        if (message.from && message.from.email !== fromEmail) {
          allParticipants.set(message.from.email, message.from);
        }
      });

      // Remove the original sender from CC (they're already in TO)
      allParticipants.delete(originalEmail.from.email);
      
      // Convert to array for CC
      ccRecipients = Array.from(allParticipants.values());
    }

    return {
      id: `temp-reply-${Date.now()}`, // Temporary ID
      from: {
        email: fromEmail,
        name: fromName
      },
      to: toRecipients,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined, // Include CC for reply-all
      subject: subject,
      body: replyContent, // Don't double-clean, server handles encoding
      date: now,
      isRead: true, // Our own message is read
      preview: replyContent.replace(/<[^>]*>/g, '').substring(0, 100) + '...',
      threadId: originalEmail.threadId,
      isImportant: false,
      labelIds: [],
      attachments: []
    };
  };

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
            } else {
              // Fallback: if thread fetch fails, just show the single email
              console.log('⚠️ Thread fetch returned no messages, showing single email');
              setProcessedThreadMessages([fetchedEmail]);
            }
          } catch (threadError) {
            console.error('Error processing thread, showing single email:', threadError);
            // If thread processing fails, just show the single email
            setProcessedThreadMessages([fetchedEmail]);
          } finally {
            setProcessingThread(false);
          }
        } else {
          // Single email, no thread
          console.log('📧 Email has no threadId, showing as single email');
          setProcessedThreadMessages([fetchedEmail]);
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
    setIsReplyAll(false); // This is a regular reply, not reply all
    
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
From: ${email.from.name} ${cleanEmailAddress(email.from.email)}<br>
Date: ${formattedDate}<br>
Subject: ${email.subject}<br>
To: ${formatRecipientsForHeaders(email.to || [])}<br>
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

  // Handle Reply All functionality
  const handleReplyAll = () => {
    if (!email) return;
    
    // Toggle inline reply for reply all
    setShowInlineReply(!showInlineReply);
    setIsReplyAll(true); // This is a reply all
    
    // Clear reply content when opening the reply
    if (!showInlineReply) {
      setReplyContent('');
    }
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

  console.log('EmbeddedViewEmail DEBUG:', {
    processedThreadMessages: processedThreadMessages.length,
    messagesToShow: messagesToShow.length,
    email: email?.id
  });

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] overflow-hidden max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0" style={{ padding: '0.680rem', paddingBottom: '0.680rem' }}>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {processingThread && (
            <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-primary-500"></div>
          )}
          <button
            onClick={() => {
              console.log('Close button clicked, calling clearSelection and navigating back...');
              clearSelection();
              navigate('/inbox');
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Thread conversation - restore scrolling */}
      <div className="flex-1 overflow-y-auto">
        <OutlookThreadView 
          messages={messagesToShow}
          getSenderColor={getSenderColor}
        />
      </div>

      {/* Inline Reply Component - appears at the bottom of the thread */}
      {showInlineReply && email && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-2">
            <div className="bg-white rounded border border-gray-200">
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xs font-medium text-gray-700">
                  {isReplyAll ? 'Reply All' : 'Reply'} to: {email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`}
                </h3>
                <button
                  onClick={() => {
                    setShowInlineReply(false);
                    setIsReplyAll(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-2">
                <div className="mb-2">
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">To:</span> {cleanEmailAddress(email.from.email)}
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
                    onClick={async () => {
                      if (!email || !replyContent.trim()) return;
                      
                      setSendingReply(true);
                      
                      // Create optimistic reply for immediate UI update
                      const optimisticReply = createOptimisticReply(email, replyContent, isReplyAll);
                      
                      // Immediately add the reply to the thread for instant feedback
                      setProcessedThreadMessages(prev => [...prev, optimisticReply]);
                      
                      // Clear the reply form immediately for better UX
                      const originalReplyContent = replyContent;
                      setReplyContent('');
                      setShowInlineReply(false);
                      
                      try {
                        console.log('Sending reply with content:', originalReplyContent);
                        const result = isReplyAll 
                          ? await sendReplyAll(email, originalReplyContent)
                          : await sendReply(email, originalReplyContent, false);
                        
                        if (result.success) {
                          console.log('✅ Reply sent successfully');
                          
                          // Show success toast
                          toast({
                            title: "Reply sent",
                            description: `Your ${isReplyAll ? 'reply all' : 'reply'} has been sent successfully.`,
                            duration: 3000,
                          });
                          
                          // Reset states
                          setIsReplyAll(false);
                          
                          // Optional: Refresh the thread to get the actual sent message with real ID
                          // This will replace the optimistic reply with the real one
                          setTimeout(() => {
                            fetchEmailAndThread();
                          }, 1000);
                          
                        } else {
                          console.error('❌ Failed to send reply');
                          
                          // Remove optimistic reply on failure
                          setProcessedThreadMessages(prev => prev.filter(msg => msg.id !== optimisticReply.id));
                          
                          // Restore reply content and show reply form
                          setReplyContent(originalReplyContent);
                          setShowInlineReply(true);
                          
                          // Show error toast
                          toast({
                            title: "Failed to send reply",
                            description: "Please try again.",
                            variant: "destructive",
                            duration: 5000,
                          });
                        }
                      } catch (error) {
                        console.error('Error sending reply:', error);
                        
                        // Remove optimistic reply on error
                        setProcessedThreadMessages(prev => prev.filter(msg => msg.id !== optimisticReply.id));
                        
                        // Restore reply content and show reply form
                        setReplyContent(originalReplyContent);
                        setShowInlineReply(true);
                        
                        // Show error toast
                        toast({
                          title: "Error sending reply",
                          description: "An unexpected error occurred. Please try again.",
                          variant: "destructive",
                          duration: 5000,
                        });
                      } finally {
                        setSendingReply(false);
                      }
                    }}
                    className="btn btn-primary flex items-center text-xs px-3 py-1.5"
                    disabled={!replyContent.trim() || sendingReply}
                  >
                    <Reply size={14} className="mr-1" />
                    {sendingReply ? 'Sending...' : `Send ${isReplyAll ? 'Reply All' : 'Reply'}`}
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
  <p>On ${formattedDate}, ${email.from.name} ${cleanEmailAddress(email.from.email)} wrote:</p>
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
              onClick={handleReplyAll}
              className="btn btn-secondary flex items-center text-sm px-3 py-2 flex-shrink-0"
            >
              <Users size={14} className="mr-2" />
              Reply All
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
