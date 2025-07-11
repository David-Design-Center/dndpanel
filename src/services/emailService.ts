import { Email } from '../types';
import { format } from 'date-fns';
import { 
  fetchGmailMessages, 
  sendGmailMessage, 
  fetchGmailMessageById,
  getAttachmentDownloadUrl as getGmailAttachmentDownloadUrl,
  fetchLatestMessageInThread,
  fetchThreadMessages,
  markGmailMessageAsTrash,
  markGmailMessageAsRead,
  markGmailMessageAsUnread,
  markGmailMessageAsStarred,
  markGmailMessageAsUnstarred,
  applyGmailLabels,
  getGmailUserProfile
} from '../integrations/gapiService';

// Cache for emails to reduce API calls
const emailCache: {
  list?: { emails: Email[], timestamp: number, query: string, profileId?: string },
  details: { [id: string]: { email: Email, timestamp: number, profileId?: string } },
  threads: { [threadId: string]: { email: Email, timestamp: number, profileId?: string } }
} = {
  details: {},
  threads: {}
};

// Cache validity duration (5 minutes)
const CACHE_VALIDITY_MS = 5 * 60 * 1000;

// Current profile ID for cache validation
let currentCacheProfileId: string | null = null;

/**
 * Clear all email caches
 */
export const clearEmailCache = (): void => {
  console.log('Clearing all email caches');
  emailCache.list = undefined;
  emailCache.details = {};
  emailCache.threads = {};
  currentCacheProfileId = null;
};

/**
 * Clear email cache for profile switch
 */
export const clearEmailCacheForProfileSwitch = (newProfileId: string): void => {
  console.log(`Clearing email cache for profile switch to: ${newProfileId}`);
  
  // If switching to a different profile, clear all caches
  if (currentCacheProfileId !== newProfileId) {
    clearEmailCache();
    currentCacheProfileId = newProfileId;
  }
};

/**
 * Check if cache is valid for current profile
 */
const isCacheValidForProfile = (timestamp: number, cachedProfileId?: string): boolean => {
  const isTimeValid = Date.now() - timestamp < CACHE_VALIDITY_MS;
  const isProfileValid = !currentCacheProfileId || cachedProfileId === currentCacheProfileId;
  return isTimeValid && isProfileValid;
};

// Mock data for emails
const mockEmails: Email[] = [
  {
    id: '1',
    from: {
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    to: [
      {
        name: 'Me',
        email: 'me@example.com'
      }
    ],
    subject: 'Meeting Tomorrow',
    body: '<p>Hi there,</p><p>Just a reminder that we have a meeting scheduled for tomorrow at 10 AM.</p><p>Best regards,<br>John</p>',
    preview: 'Just a reminder that we have a meeting scheduled for tomorrow at 10 AM.',
    isRead: false,
    isImportant: true,
    date: format(new Date(2023, 6, 15, 10, 30), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    threadId: 'thread_1'
  },
  {
    id: '2',
    from: {
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    },
    to: [
      {
        name: 'Me',
        email: 'me@example.com'
      }
    ],
    subject: 'Project Update',
    body: '<p>Hello,</p><p>I wanted to share some updates on the project we discussed last week. We\'ve made significant progress, and I believe we\'ll be able to meet the deadline.</p><p>Regards,<br>Jane</p>',
    preview: 'I wanted to share some updates on the project we discussed last week. We\'ve made significant progress...',
    isRead: true,
    isImportant: false,
    date: format(new Date(2023, 6, 14, 14, 45), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    threadId: 'thread_2'
  },
  {
    id: '3',
    from: {
      name: 'Marketing Team',
      email: 'marketing@example.com'
    },
    to: [
      {
        name: 'Me',
        email: 'me@example.com'
      }
    ],
    subject: 'New Campaign Draft',
    body: '<p>Hi team,</p><p>Attached is the draft for our new marketing campaign. Please review and provide feedback by Friday.</p><p>Thanks,<br>Marketing Team</p>',
    preview: 'Attached is the draft for our new marketing campaign. Please review and provide feedback by Friday.',
    isRead: false,
    isImportant: true,
    date: format(new Date(2023, 6, 13, 9, 15), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    attachments: [
      {
        name: 'campaign_draft.pdf',
        url: '#',
        size: 2500000,
        mimeType: 'application/pdf'
      }
    ],
    threadId: 'thread_3'
  },
  {
    id: '4',
    from: {
      name: 'Support Team',
      email: 'support@example.com'
    },
    to: [
      {
        name: 'Me',
        email: 'me@example.com'
      }
    ],
    subject: 'Your Ticket #12345',
    body: '<p>Hello,</p><p>Your support ticket #12345 has been resolved. Please let us know if you have any further questions.</p><p>Best regards,<br>Support Team</p>',
    preview: 'Your support ticket #12345 has been resolved. Please let us know if you have any further questions.',
    isRead: true,
    isImportant: false,
    date: format(new Date(2023, 6, 12, 11, 0), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    threadId: 'thread_4'
  },
  {
    id: '5',
    from: {
      name: 'Alex Johnson',
      email: 'alex.johnson@example.com'
    },
    to: [
      {
        name: 'Me',
        email: 'me@example.com'
      }
    ],
    subject: 'Weekend Plans',
    body: '<p>Hey!</p><p>Are you free this weekend? I was thinking we could grab lunch and catch up.</p><p>Let me know,<br>Alex</p>',
    preview: 'Are you free this weekend? I was thinking we could grab lunch and catch up.',
    isRead: false,
    isImportant: false,
    date: format(new Date(2023, 6, 11, 18, 20), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    threadId: 'thread_5'
  }
];

// Extended interface for paginated email service response
export interface PaginatedEmailServiceResponse {
  emails: Email[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

// Service functions
export const getEmails = async (
  forceRefresh = false, 
  query = 'in:inbox', 
  maxResults = 10, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  // If pageToken is provided, always fetch new data (don't use cache for pagination)
  // If force refresh is requested or cache is invalid, fetch new data
  if (pageToken || forceRefresh || 
      !emailCache.list || 
      !isCacheValidForProfile(emailCache.list.timestamp, emailCache.list.profileId) || 
      emailCache.list.query !== query) {
    console.log('Fetching fresh email list' + 
      (forceRefresh ? ' (forced refresh)' : '') + 
      (pageToken ? ' (pagination)' : '') + 
      ` with query: ${query}`);
    
    try {
      // Try to fetch from Gmail
      console.log('Fetching emails from Gmail API');
      const gmailResponse = await fetchGmailMessages(query, maxResults, pageToken);
      
      // If this is not a paginated request (no pageToken), update cache
      if (!pageToken) {
        emailCache.list = {
          emails: gmailResponse.emails,
          timestamp: Date.now(),
          query: query,
          profileId: currentCacheProfileId || undefined
        };
        
        // Also update the details cache for each email
        gmailResponse.emails.forEach(email => {
          emailCache.details[email.id] = {
            email,
            timestamp: Date.now(),
            profileId: currentCacheProfileId || undefined
          };
          
          // Also update thread cache if threadId is present
          if (email.threadId) {
            emailCache.threads[email.threadId] = {
              email,
              timestamp: Date.now(),
              profileId: currentCacheProfileId || undefined
            };
          }
        });
      }
      
      return {
        emails: gmailResponse.emails,
        nextPageToken: gmailResponse.nextPageToken,
        resultSizeEstimate: gmailResponse.resultSizeEstimate
      };
    } catch (error) {
      console.error('Error fetching from Gmail, falling back to mock data:', error);
      // Fall back to mock data only if not paginating
      if (!pageToken) {
        return new Promise((resolve) => {
          setTimeout(() => {
            // Still cache the mock data to prevent repeated fallbacks
            const mockEmailsCopy = [...mockEmails];
            emailCache.list = {
              emails: mockEmailsCopy,
              timestamp: Date.now(),
              query: query,
              profileId: currentCacheProfileId || undefined
            };
            resolve({
              emails: mockEmailsCopy,
              nextPageToken: undefined,
              resultSizeEstimate: mockEmailsCopy.length
            });
          }, 500);
        });
      } else {
        // For pagination, return empty results on error
        return {
          emails: [],
          nextPageToken: undefined,
          resultSizeEstimate: 0
        };
      }
    }
  } else {
    // Use cached data (only for non-paginated requests)
    console.log('Using cached email list');
    return {
      emails: emailCache.list.emails,
      nextPageToken: undefined,
      resultSizeEstimate: emailCache.list.emails.length
    };
  }
};

// Specialized query functions
export const getUnreadEmails = async (forceRefresh = false): Promise<Email[]> => {
  const response = await getEmails(forceRefresh, 'is:unread');
  return response.emails;
};

export const getSentEmails = async (forceRefresh = false): Promise<Email[]> => {
  const response = await getEmails(forceRefresh, 'in:sent');
  return response.emails;
};

export const getDraftEmails = async (forceRefresh = false): Promise<Email[]> => {
  const response = await getEmails(forceRefresh, 'in:drafts');
  return response.emails;
};

export const getTrashEmails = async (forceRefresh = false): Promise<Email[]> => {
  const response = await getEmails(forceRefresh, 'in:trash');
  return response.emails;
};

export const getEmailById = async (id: string): Promise<Email | undefined> => {
  // Check if we have a valid cached email for current profile
  if (emailCache.details[id] && 
      isCacheValidForProfile(emailCache.details[id].timestamp, emailCache.details[id].profileId)) {
    console.log(`Using cached email for ID: ${id}`);
    return emailCache.details[id].email;
  }

  try {
    // Try to fetch from Gmail
    console.log(`Fetching email with ID: ${id} from Gmail API`);
    const email = await fetchGmailMessageById(id);
    
    if (email) {
      // Update cache
      emailCache.details[id] = {
        email,
        timestamp: Date.now(),
        profileId: currentCacheProfileId || undefined
      };
      
      // Also update thread cache if threadId is present
      if (email.threadId) {
        emailCache.threads[email.threadId] = {
          email,
          timestamp: Date.now(),
          profileId: currentCacheProfileId || undefined
        };
      }
    }
    
    return email;
  } catch (error) {
    console.error('Error fetching email from Gmail, falling back to mock data:', error);
    // Fall back to mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        const email = mockEmails.find(email => email.id === id);
        if (email && !email.isRead) {
          email.isRead = true;
        }
        
        // Cache the mock email if found
        if (email) {
          emailCache.details[id] = {
            email,
            timestamp: Date.now(),
            profileId: currentCacheProfileId || undefined
          };
          
          // Also update thread cache if threadId is present
          if (email.threadId) {
            emailCache.threads[email.threadId] = {
              email,
              timestamp: Date.now(),
              profileId: currentCacheProfileId || undefined
            };
          }
        }
        
        resolve(email);
      }, 300);
    });
  }
};

/**
 * Get email by thread ID
 */
export const getEmailByThreadId = async (threadId: string): Promise<Email | undefined> => {
  // Check if we have a valid cached email for this thread and current profile
  if (emailCache.threads[threadId] && 
      isCacheValidForProfile(emailCache.threads[threadId].timestamp, emailCache.threads[threadId].profileId)) {
    console.log(`Using cached email for thread ID: ${threadId}`);
    return emailCache.threads[threadId].email;
  }

  try {
    // Try to fetch from Gmail
    console.log(`Fetching email for thread ID: ${threadId} from Gmail API`);
    const email = await fetchLatestMessageInThread(threadId);
    
    if (email) {
      // Update thread cache
      emailCache.threads[threadId] = {
        email,
        timestamp: Date.now(),
        profileId: currentCacheProfileId || undefined
      };
      
      // Also update message cache
      emailCache.details[email.id] = {
        email,
        timestamp: Date.now(),
        profileId: currentCacheProfileId || undefined
      };
    }
    
    return email;
  } catch (error) {
    console.error(`Error fetching email for thread ID ${threadId}, falling back to mock data:`, error);
    // Fall back to mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        const email = mockEmails.find(email => email.threadId === threadId);
        if (email && !email.isRead) {
          email.isRead = true;
        }
        
        // Cache the mock email if found
        if (email) {
          emailCache.threads[threadId] = {
            email,
            timestamp: Date.now(),
            profileId: currentCacheProfileId || undefined
          };
          
          emailCache.details[email.id] = {
            email,
            timestamp: Date.now(),
            profileId: currentCacheProfileId || undefined
          };
        }
        
        resolve(email);
      }, 300);
    });
  }
};

/**
 * Get all emails in a thread
 */
export const getThreadEmails = async (threadId: string): Promise<Email[]> => {
  try {
    console.log(`Fetching all emails in thread: ${threadId}`);
    const emails = await fetchThreadMessages(threadId);
    return emails;
  } catch (error) {
    console.error(`Error fetching thread emails for thread ID ${threadId}:`, error);
    return [];
  }
};

export const getAttachmentDownloadUrl = async (
  messageId: string,
  attachmentId: string,
  filename: string,
  mimeType: string
): Promise<string> => {
  try {
    return await getGmailAttachmentDownloadUrl(messageId, attachmentId, filename, mimeType);
  } catch (error) {
    console.error('Error getting attachment download URL:', error);
    throw error;
  }
};

export const sendEmail = async (
  email: Omit<Email, 'id' | 'date' | 'isRead' | 'preview'>, 
  attachments?: Array<{ name: string; mimeType: string; data: string; cid?: string }>,
  conversationThreadId?: string
): Promise<{success: boolean; threadId?: string}> => {
  try {
    // Try to send via Gmail
    const to = email.to.map(recipient => recipient.email).join(',');
    // Add the hidden CC to all outgoing emails
    const cc = "";
    const result = await sendGmailMessage(to, cc, email.subject, email.body, attachments, conversationThreadId);
    
    if (result.success) {
      // Invalidate the list cache to ensure the sent email appears on next refresh
      if (emailCache.list) {
        emailCache.list.timestamp = 0;
      }
      return { 
        success: true,
        threadId: result.threadId 
      };
    }
    
    throw new Error('Failed to send email via Gmail');
  } catch (error) {
    console.error('Error sending email, falling back to mock:', error);
    // Fall back to mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        // Invalidate the list cache
        if (emailCache.list) {
          emailCache.list.timestamp = 0;
        }
        // Generate a fake thread ID for mocks
        const mockThreadId = `mock_thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        resolve({ success: true, threadId: mockThreadId });
      }, 800);
    });
  }
};

export const markAsRead = async (id: string): Promise<{success: boolean}> => {
  try {
    // Try to mark as read via Gmail API first
    await markGmailMessageAsRead(id);
    
    // Only update cache after successful API call
    if (emailCache.details[id]) {
      emailCache.details[id].email.isRead = true;
    }
    
    // If the email list is cached, update it too
    if (emailCache.list) {
      const email = emailCache.list.emails.find(e => e.id === id);
      if (email) {
        email.isRead = true;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking as read via Gmail, falling back to mock:', error);
    
    // Fallback to mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        const email = mockEmails.find(email => email.id === id);
        if (email) {
          email.isRead = true;
        }
        
        // Update cache for mock as well
        if (emailCache.details[id]) {
          emailCache.details[id].email.isRead = true;
        }
        
        if (emailCache.list) {
          const cachedEmail = emailCache.list.emails.find(e => e.id === id);
          if (cachedEmail) {
            cachedEmail.isRead = true;
          }
        }
        
        resolve({ success: true });
      }, 300);
    });
  }
};

/**
 * Mark an email as trash
 */
export const markEmailAsTrash = async (messageId: string): Promise<void> => {
  try {
    console.log(`Marking email ${messageId} as trash`);
    
    // Call the Gmail API to move the message to trash
    await markGmailMessageAsTrash(messageId);
    
    // Invalidate the email list cache to ensure the change is reflected immediately
    if (emailCache.list) {
      emailCache.list.timestamp = 0;
      console.log('Email list cache invalidated after trash operation');
    }
    
    // Remove from details cache if it exists
    if (emailCache.details[messageId]) {
      delete emailCache.details[messageId];
    }
    
    // Remove from threads cache if it exists
    Object.keys(emailCache.threads).forEach(threadId => {
      if (emailCache.threads[threadId].email.id === messageId) {
        delete emailCache.threads[threadId];
      }
    });
    
    console.log(`Successfully marked email ${messageId} as trash`);
  } catch (error) {
    console.error('Error marking email as trash:', error);
    throw error;
  }
};

/**
 * Mark an email as read
 */
export const markEmailAsRead = async (messageId: string): Promise<void> => {
  try {
    console.log(`Marking email ${messageId} as read via email service`);
    
    // Call the Gmail API to mark the message as read
    await markGmailMessageAsRead(messageId);
    
    // Update local cache
    if (emailCache.details[messageId]) {
      emailCache.details[messageId].email.isRead = true;
    }
    
    // If the email list is cached, update it too
    if (emailCache.list) {
      const email = emailCache.list.emails.find(e => e.id === messageId);
      if (email) {
        email.isRead = true;
      }
    }
    
    console.log(`Successfully marked email ${messageId} as read`);
  } catch (error) {
    console.error('Error marking email as read:', error);
    throw error;
  }
};

/**
 * Mark an email as unread
 */
export const markAsUnread = async (id: string): Promise<{success: boolean}> => {
  try {
    // Try to mark as unread via Gmail API first
    await markGmailMessageAsUnread(id);
    
    // Only update cache after successful API call
    if (emailCache.details[id]) {
      emailCache.details[id].email.isRead = false;
    }
    
    // If the email list is cached, update it too
    if (emailCache.list) {
      const email = emailCache.list.emails.find(e => e.id === id);
      if (email) {
        email.isRead = false;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking as unread via Gmail, falling back to mock:', error);
    
    // Fallback to mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        const email = mockEmails.find(email => email.id === id);
        if (email) {
          email.isRead = false;
        }
        
        // Update cache for mock as well
        if (emailCache.details[id]) {
          emailCache.details[id].email.isRead = false;
        }
        
        if (emailCache.list) {
          const cachedEmail = emailCache.list.emails.find(e => e.id === id);
          if (cachedEmail) {
            cachedEmail.isRead = false;
          }
        }
        
        resolve({ success: true });
      }, 300);
    });
  }
};

/**
 * Apply labels to an email
 */
export const applyLabelsToEmail = async (
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[] = []
): Promise<void> => {
  try {
    console.log(`Applying labels to email ${messageId} via email service`);
    
    // Call the Gmail API to apply labels to the message
    await applyGmailLabels(messageId, addLabelIds, removeLabelIds);
    
    // Invalidate the email list cache to ensure the change is reflected immediately
    if (emailCache.list) {
      emailCache.list.timestamp = 0;
      console.log('Email list cache invalidated after label update');
    }
    
    // Remove from details cache if it exists
    if (emailCache.details[messageId]) {
      delete emailCache.details[messageId];
    }
    
    // Remove from threads cache if it exists
    Object.keys(emailCache.threads).forEach(threadId => {
      if (emailCache.threads[threadId].email.id === messageId) {
        delete emailCache.threads[threadId];
      }
    });
    
    console.log(`Successfully applied labels to email ${messageId}`);
  } catch (error) {
    console.error('Error applying labels to email:', error);
    throw error;
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (): Promise<{ name: string; email: string; picture?: string } | null> => {
  try {
    return await getGmailUserProfile();
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Mark an email as important (starred)
 */
export const markAsImportant = async (id: string): Promise<{success: boolean}> => {
  try {
    // Try to mark as important via Gmail API first
    await markGmailMessageAsStarred(id);
    
    // Only update cache after successful API call
    if (emailCache.details[id]) {
      emailCache.details[id].email.isImportant = true;
    }
    
    // If the email list is cached, update it too
    if (emailCache.list) {
      const email = emailCache.list.emails.find(e => e.id === id);
      if (email) {
        email.isImportant = true;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking as important via Gmail, falling back to mock:', error);
    
    // Fallback to mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        const email = mockEmails.find(email => email.id === id);
        if (email) {
          email.isImportant = true;
        }
        
        // Update cache for mock as well
        if (emailCache.details[id]) {
          emailCache.details[id].email.isImportant = true;
        }
        
        if (emailCache.list) {
          const cachedEmail = emailCache.list.emails.find(e => e.id === id);
          if (cachedEmail) {
            cachedEmail.isImportant = true;
          }
        }
        
        resolve({ success: true });
      }, 300);
    });
  }
};

/**
 * Mark an email as unimportant (unstarred)
 */
export const markAsUnimportant = async (id: string): Promise<{success: boolean}> => {
  try {
    // Try to mark as unimportant via Gmail API first
    await markGmailMessageAsUnstarred(id);
    
    // Only update cache after successful API call
    if (emailCache.details[id]) {
      emailCache.details[id].email.isImportant = false;
    }
    
    // If the email list is cached, update it too
    if (emailCache.list) {
      const email = emailCache.list.emails.find(e => e.id === id);
      if (email) {
        email.isImportant = false;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking as unimportant via Gmail, falling back to mock:', error);
    
    // Fallback to mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        const email = mockEmails.find(email => email.id === id);
        if (email) {
          email.isImportant = false;
        }
        
        // Update cache for mock as well
        if (emailCache.details[id]) {
          emailCache.details[id].email.isImportant = false;
        }
        
        if (emailCache.list) {
          const cachedEmail = emailCache.list.emails.find(e => e.id === id);
          if (cachedEmail) {
            cachedEmail.isImportant = false;
          }
        }
        
        resolve({ success: true });
      }, 300);
    });
  }
};