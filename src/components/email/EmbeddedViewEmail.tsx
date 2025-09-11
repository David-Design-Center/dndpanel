import { useState, useEffect } from 'react';
import { X, Reply, Trash, Forward, Users, Maximize2 } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getEmailById, markEmailAsTrash, getThreadEmails, sendReply, sendReplyAll, sendEmail, deleteDraft, saveDraft } from '../../services/emailService';
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
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardTo, setForwardTo] = useState<string>('');
  const [hydratedDraftId, setHydratedDraftId] = useState<string | null>(null);
  const [undoDraftData, setUndoDraftData] = useState<{
    emailSnapshot: Email;
    body: string;
    timeoutId: number;
  } | null>(null);
  const UNDO_MS = 8000;
  
  const { clearSelection } = useInboxLayout();
  const { currentProfile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Function to send a forward email
  const sendForward = async (originalEmail: Email, forwardContent: string, toEmail: string): Promise<{success: boolean; threadId?: string}> => {
    try {
      // Create a forward subject with "Fwd: " prefix
      const subject = originalEmail.subject.startsWith('Fwd: ') ? originalEmail.subject : `Fwd: ${originalEmail.subject}`;
      
      // Format the original email for forwarding
      const formattedDate = format(parseISO(originalEmail.date), 'PPpp');
      const forwardedBody = `
${forwardContent}

<br><br>
---------- Forwarded message ---------<br>
From: ${originalEmail.from.name} <${originalEmail.from.email}><br>
Date: ${formattedDate}<br>
Subject: ${originalEmail.subject}<br>
To: ${formatRecipientsForHeaders(originalEmail.to || [])}<br>
<br>
${originalEmail.body}
`;

      // Create the forward email object
      const forwardEmail: Omit<Email, 'id' | 'date' | 'isRead' | 'preview'> = {
        from: { 
          email: currentProfile?.userEmail || 'unknown@example.com', 
          name: currentProfile?.name || 'Current User'
        },
        to: [{ email: toEmail, name: toEmail.split('@')[0] }],
        subject: subject,
        body: forwardedBody,
        threadId: undefined, // Forwards create new threads
        isImportant: false,
        labelIds: [],
        attachments: originalEmail.attachments || [] // Include original attachments when forwarding
      };

      // Send the forward using the existing sendEmail function
      return await sendEmail(forwardEmail);
      
    } catch (error) {
      console.error('Error sending forward:', error);
      return { success: false };
    }
  };


  useEffect(() => {
    if (emailId) {
      fetchEmailAndThread();
    }
  }, [emailId]);

  // Draft hydration: listens for pending inline draft stashed on window and auto-opens editor
  useEffect(() => {
    function hydrateDraft() {
      const stash = (window as any).__pendingInlineDraft;
      if (!stash || !email) return;
      if (hydratedDraftId === stash.draftId) return; // avoid duplicate
      // Open inline reply editor pre-filled
      setShowInlineReply(true);
      setIsReplyAll(false);
      setIsForwarding(false);
      setReplyContent(stash.body || '');
      setHydratedDraftId(stash.draftId);
      delete (window as any).__pendingInlineDraft;
    }
    // Run immediately once email + thread loaded
    if (email && (email.labelIds || []).includes('DRAFT')) {
      hydrateDraft();
    }
    window.addEventListener('open-inline-draft', hydrateDraft);
    return () => window.removeEventListener('open-inline-draft', hydrateDraft);
  }, [email, hydratedDraftId]);

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

  // Unified discard logic with undo
  const handleDiscardDraft = async () => {
    if (!email || !(email.labelIds || []).includes('DRAFT')) return;
    try {
      // Store snapshot for undo
      const snapshot: Email = { ...email };
      const currentBody = replyContent || email.body || '';
      // Delete draft via API
      await deleteDraft(email.id);
      const timeoutId = window.setTimeout(() => {
        // Finalize: emit refresh event & navigate away if still on draft
        window.dispatchEvent(new CustomEvent('refresh-drafts'));
        if ((snapshot.labelIds || []).includes('DRAFT')) {
          navigate('/inbox');
        }
        setUndoDraftData(null);
      }, UNDO_MS);
      setUndoDraftData({ emailSnapshot: snapshot, body: currentBody, timeoutId });
      toast({
        title: 'Draft discarded',
        description: 'Draft removed. Undo available for a few seconds.',
        duration: UNDO_MS
      });
    } catch (e) {
      console.error('Failed to discard draft', e);
      toast({
        title: 'Failed to discard draft',
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const undoDiscard = async () => {
    if (!undoDraftData) return;
    const { emailSnapshot, body, timeoutId } = undoDraftData;
    window.clearTimeout(timeoutId);
    try {
      // Recreate draft (new draftId)
      await saveDraft({
        from: emailSnapshot.from,
        to: emailSnapshot.to || [],
        subject: emailSnapshot.subject || '(no subject)',
        body: body,
        isImportant: false,
        labelIds: [],
        attachments: emailSnapshot.attachments || [],
        threadId: emailSnapshot.threadId
      });
      toast({
        title: 'Draft restored',
        description: 'Your draft was recreated.',
        duration: 4000
      });
      window.dispatchEvent(new CustomEvent('refresh-drafts'));
    } catch (e) {
      console.error('Failed to restore draft', e);
      toast({
        title: 'Restore failed',
        description: 'Could not recreate draft.',
        variant: 'destructive'
      });
    } finally {
      setUndoDraftData(null);
    }
  };

  // Handle Reply functionality - Modified to show inline reply
  const handleReply = () => {
    if (!email) return;
    
    // Toggle inline reply instead of navigating to compose
    setShowInlineReply(!showInlineReply);
    setIsReplyAll(false); // This is a regular reply, not reply all
    setIsForwarding(false); // Not forwarding
    
    // Clear reply content when opening the reply
    if (!showInlineReply) {
      setReplyContent('');
      setForwardTo('');
    }
  };

  // Handle Forward functionality
  const handleForward = () => {
    if (!email) return;
    
    // Toggle inline reply window for forwarding
    setShowInlineReply(!showInlineReply);
    setIsReplyAll(false);
    setIsForwarding(true); // This is a forward, not a reply
    
    // Clear reply content and forward recipient when opening
    if (!showInlineReply) {
      setReplyContent('');
      setForwardTo('');
    }
  };

  // Handle Reply All functionality
  const handleReplyAll = () => {
    if (!email) return;
    
    // Toggle inline reply for reply all
    setShowInlineReply(!showInlineReply);
    setIsReplyAll(true); // This is a reply all
    setIsForwarding(false); // Not forwarding
    
    // Clear reply content when opening the reply
    if (!showInlineReply) {
      setReplyContent('');
      setForwardTo('');
    }
  };

  // Handle Reply functionality for a specific message in the thread
  const handleReplyToMessage = (messageId: string) => {
    const targetMessage = processedThreadMessages.find(msg => msg.id === messageId);
    if (!targetMessage) return;
    
    // Set the email context to the target message for the inline reply
    setEmail(targetMessage);
    
    // Toggle inline reply instead of navigating to compose
    setShowInlineReply(!showInlineReply);
    setIsReplyAll(false); // This is a regular reply, not reply all
    setIsForwarding(false); // Not forwarding
    
    // Clear reply content when opening the reply
    if (!showInlineReply) {
      setReplyContent('');
      setForwardTo('');
    }
  };

  // Handle Reply All functionality for a specific message in the thread
  const handleReplyAllToMessage = (messageId: string) => {
    const targetMessage = processedThreadMessages.find(msg => msg.id === messageId);
    if (!targetMessage) return;
    
    // Set the email context to the target message for the inline reply
    setEmail(targetMessage);
    
    // Toggle inline reply for reply all
    setShowInlineReply(!showInlineReply);
    setIsReplyAll(true); // This is a reply all
    setIsForwarding(false); // Not forwarding
    
    // Clear reply content when opening the reply
    if (!showInlineReply) {
      setReplyContent('');
      setForwardTo('');
    }
  };

  // Handle Forward functionality for a specific message in the thread
  const handleForwardMessage = (messageId: string) => {
    const targetMessage = processedThreadMessages.find(msg => msg.id === messageId);
    if (!targetMessage) return;
    
    // Set the email context to the target message for forwarding
    setEmail(targetMessage);
    
    // Toggle inline reply window for forwarding
    setShowInlineReply(!showInlineReply);
    setIsReplyAll(false);
    setIsForwarding(true); // This is a forward, not a reply
    
    // Clear reply content and forward recipient when opening
    if (!showInlineReply) {
      setReplyContent('');
      setForwardTo('');
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
          onReply={handleReplyToMessage}
          onReplyAll={handleReplyAllToMessage}
          onForward={handleForwardMessage}
        />
      </div>

      {/* Inline Reply Component - appears at the bottom of the thread */}
      {showInlineReply && email && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-2">
            <div className="bg-white rounded border border-gray-200">
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xs font-medium text-gray-700">
                  {isForwarding ? 'Forward' : (isReplyAll ? 'Reply All' : 'Reply')} 
                  {isForwarding ? ': ' : ' to: '}
                  {isForwarding ? `Fwd: ${email.subject}` : (email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`)}
                </h3>
                <button
                  onClick={() => {
                    setShowInlineReply(false);
                    setIsReplyAll(false);
                    setIsForwarding(false);
                    setForwardTo('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-2">
                <div className="mb-2">
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">{isForwarding ? 'To:' : 'To:'}</span> 
                    {isForwarding ? (
                      <input
                        type="email"
                        value={forwardTo}
                        onChange={(e) => setForwardTo(e.target.value)}
                        placeholder="Enter email address..."
                        className="ml-2 text-xs border border-gray-300 rounded px-2 py-1 flex-1 min-w-0"
                        style={{ width: 'calc(100% - 30px)' }}
                      />
                    ) : (
                      <span className="ml-1">{cleanEmailAddress(email.from.email)}</span>
                    )}
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
                      
                      // For forwarding, validate that we have a recipient
                      if (isForwarding && !forwardTo.trim()) return;
                      
                      setSendingReply(true);
                      
                      try {
                        console.log('Sending:', isForwarding ? 'forward' : 'reply', 'with content:', replyContent);
                        
                        let result;
                        if (isForwarding) {
                          // Send forward
                          result = await sendForward(email, replyContent, forwardTo.trim());
                        } else {
                          // Send reply or reply all
                          result = isReplyAll 
                            ? await sendReplyAll(email, replyContent)
                            : await sendReply(email, replyContent, false);
                        }
                        
                        if (result.success) {
                          console.log('✅ Email sent successfully');
                          
                          // Show success toast
                          toast({
                            title: isForwarding ? "Forward sent" : "Reply sent",
                            description: `Your ${isForwarding ? 'forward' : (isReplyAll ? 'reply all' : 'reply')} has been sent successfully.`,
                            duration: 3000,
                          });
                          
                          // Clear the form and close
                          setReplyContent('');
                          setForwardTo('');
                          setShowInlineReply(false);
                          setIsReplyAll(false);
                          setIsForwarding(false);
                          
                          // For replies, refresh the thread to show the new message
                          if (!isForwarding) {
                            setTimeout(() => {
                              fetchEmailAndThread();
                            }, 1000);
                          }
                          
                        } else {
                          console.error('❌ Failed to send email');
                          
                          // Show error toast
                          toast({
                            title: isForwarding ? "Failed to send forward" : "Failed to send reply",
                            description: "Please try again.",
                            variant: "destructive",
                            duration: 5000,
                          });
                        }
                      } catch (error) {
                        console.error('Error sending email:', error);
                        
                        // Show error toast
                        toast({
                          title: "Error sending email",
                          description: "An unexpected error occurred. Please try again.",
                          variant: "destructive",
                          duration: 5000,
                        });
                      } finally {
                        setSendingReply(false);
                      }
                    }}
                    className="btn btn-primary flex items-center text-xs px-3 py-1.5"
                    disabled={(!replyContent.trim() || (isForwarding && !forwardTo.trim())) || sendingReply}
                  >
                    <Reply size={14} className="mr-1" />
                    {sendingReply ? 'Sending...' : `Send ${isForwarding ? 'Forward' : (isReplyAll ? 'Reply All' : 'Reply')}`}
                  </button>
                  <div className="flex items-center ml-3 space-x-2">
                    {(email.labelIds || []).includes('DRAFT') && !sendingReply && (
                      <button
                        onClick={handleDiscardDraft}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Discard draft"
                        aria-label="Discard draft"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (isForwarding) {
                          const subject = email.subject.startsWith('Fwd: ') ? email.subject : `Fwd: ${email.subject}`;
                          const formattedDate = format(parseISO(email.date), 'PPpp');
                          const forwardedBody = `
${replyContent}

<br><br>
---------- Forwarded message ---------<br>
From: ${email.from.name} <${email.from.email}><br>
Date: ${formattedDate}<br>
Subject: ${email.subject}<br>
To: ${formatRecipientsForHeaders(email.to || [])}<br>
<br>
${email.body}
`;
                          navigate('/compose', { 
                            state: { 
                              to: forwardTo,
                              subject: subject,
                              originalBody: forwardedBody,
                              attachments: email.attachments
                            } 
                          });
                        } else {
                          const subject = email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`;
                          const formattedDate = format(parseISO(email.date), 'PPpp');
                          const quotedBody = `
<br><br>
<div style="padding-left: 1em; margin-left: 1em; border-left: 2px solid #ccc;">
  <p>On ${formattedDate}, ${email.from.name} ${cleanEmailAddress(email.from.email)} wrote:</p>
  ${email.body}
</div>
`;
                          const fullBody = replyContent + quotedBody;
                          navigate('/compose', { 
                            state: { 
                              to: email.from.email,
                              subject: subject,
                              replyToId: email.id,
                              threadId: email.threadId,
                              originalBody: fullBody
                            } 
                          });
                        }
                      }}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      title="Open in full editor"
                      aria-label="Open in full editor"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
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
            {(email.labelIds || []).includes('DRAFT') && (
              <button
                onClick={handleDiscardDraft}
                className="btn btn-secondary flex items-center text-sm px-3 py-2 flex-shrink-0"
              >
                <Trash size={14} className="mr-2" />
                Discard Draft
              </button>
            )}
          </div>
        </div>
      )}
      {undoDraftData && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2 rounded shadow flex items-center space-x-3 z-50">
          <span>Draft discarded.</span>
            <button
              onClick={undoDiscard}
              className="underline decoration-dotted hover:text-blue-300"
            >Undo</button>
            <button
              onClick={() => { if (undoDraftData) { window.clearTimeout(undoDraftData.timeoutId); setUndoDraftData(null); window.dispatchEvent(new CustomEvent('refresh-drafts')); navigate('/inbox'); } }}
              className="opacity-70 hover:opacity-100"
            >Dismiss</button>
        </div>
      )}
    </div>
  );
}

export default EmbeddedViewEmail;
