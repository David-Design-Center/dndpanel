// src/services/domainWideGmailService.ts

/**
 * Gmail service that uses domain-wide delegation when possible, 
 * with fallback to traditional OAuth for compatibility
 */

import { makeGmailApiRequest, fetchGmailMessages as fetchMessagesDomainWide } from '@/lib/gmail';
import { 
  fetchGmailMessages as fetchMessagesTraditional,
  fetchGmailMessageById as fetchMessageByIdTraditional,
  sendGmailMessage as sendMessageTraditional,
  fetchLatestMessageInThread as fetchLatestMessageTraditional,
  fetchThreadMessages as fetchThreadMessagesTraditional,
  markGmailMessageAsRead as markAsReadTraditional,
  markGmailMessageAsUnread as markAsUnreadTraditional,
  markGmailMessageAsStarred as markAsStarredTraditional,
  markGmailMessageAsTrash as markAsTrashTraditional,
  applyGmailLabels as applyLabelsTraditional,
  isGmailSignedIn,
  PaginatedEmailResponse
} from '@/integrations/gapiService';
import type { Email } from '@/types';

// Global setting to control which method to use
let useDomainWideAuth = true;
let currentUserEmail: string | null = null;

/**
 * Configure the service to use domain-wide delegation
 */
export function configureDomainWideAuth(userEmail: string) {
  useDomainWideAuth = true;
  currentUserEmail = userEmail;
}

/**
 * Configure the service to use traditional OAuth
 */
export function configureTraditionalAuth() {
  useDomainWideAuth = false;
  currentUserEmail = null;
}

/**
 * Check if domain-wide auth is available and configured
 */
export function isDomainWideAuthConfigured(): boolean {
  return useDomainWideAuth && !!currentUserEmail;
}

/**
 * Fetch messages with automatic method selection
 */
export async function fetchGmailMessages(
  query: string = 'in:inbox',
  maxResults: number = 10,
  pageToken?: string
): Promise<PaginatedEmailResponse> {
  console.log(`📧 fetchGmailMessages: ${isDomainWideAuthConfigured() ? 'domain-wide' : 'traditional'} auth`);
  
  if (isDomainWideAuthConfigured()) {
    try {
      // Use domain-wide delegation with Gmail API directly
      const response = await fetchMessagesDomainWide(currentUserEmail!, query, maxResults, pageToken);
      
      // Convert to expected format - the fetchMessagesDomainWide returns messages list, not full emails
      // We need to process them into Email objects
      const emailPromises = response.messages?.map(async (message: any) => {
        const fullMessage = await fetchMessageById(message.id);
        return fullMessage;
      }) || [];
      
      const emails = (await Promise.all(emailPromises)).filter(Boolean) as Email[];
      
      return {
        emails,
        nextPageToken: response.nextPageToken,
        resultSizeEstimate: response.resultSizeEstimate || emails.length
      };
    } catch (error) {
      console.warn('⚠️ Domain-wide auth failed, falling back to traditional:', error);
      // Fall back to traditional method
    }
  }
  
  // Use traditional OAuth method
  return fetchMessagesTraditional(query, maxResults, pageToken);
}

/**
 * Fetch a single message by ID with automatic method selection
 */
export async function fetchMessageById(messageId: string): Promise<Email | undefined> {
  console.log(`📧 fetchMessageById: ${isDomainWideAuthConfigured() ? 'domain-wide' : 'traditional'} auth`);
  
  if (isDomainWideAuthConfigured()) {
    try {
      // Use domain-wide delegation
      const response = await makeGmailApiRequest(
        currentUserEmail!,
        `users/me/messages/${messageId}?format=full`
      );
      
      const messageData = await response.json();
      
      // Convert Gmail API response to Email format
      return convertGmailMessageToEmail(messageData);
    } catch (error) {
      console.warn('⚠️ Domain-wide auth failed, falling back to traditional:', error);
      // Fall back to traditional method
    }
  }
  
  // Use traditional OAuth method
  return fetchMessageByIdTraditional(messageId);
}

/**
 * Send a message with automatic method selection
 */
export async function sendGmailMessage(
  to: string,
  cc: string,
  subject: string,
  body: string,
  attachments?: Array<{ name: string; mimeType: string; data: string; cid?: string }>,
  conversationThreadId?: string
): Promise<{ success: boolean; threadId?: string }> {
  console.log(`📧 sendGmailMessage: ${isDomainWideAuthConfigured() ? 'domain-wide' : 'traditional'} auth`);
  
  if (isDomainWideAuthConfigured()) {
    try {
      // For sending, we still use the traditional method since it has all the email formatting logic
      // But we could enhance this to use domain-wide auth in the future
      console.log('📧 Using traditional method for sending (email formatting)');
    } catch (error) {
      console.warn('⚠️ Domain-wide auth failed, falling back to traditional:', error);
    }
  }
  
  // Use traditional OAuth method (has better email formatting support)
  return sendMessageTraditional(to, cc, subject, body, attachments, conversationThreadId);
}

/**
 * Fetch latest message in thread with automatic method selection
 */
export async function fetchLatestMessageInThread(threadId: string): Promise<Email | undefined> {
  console.log(`📧 fetchLatestMessageInThread: ${isDomainWideAuthConfigured() ? 'domain-wide' : 'traditional'} auth`);
  
  if (isDomainWideAuthConfigured()) {
    try {
      // Use domain-wide delegation
      const response = await makeGmailApiRequest(
        currentUserEmail!,
        `users/me/threads/${threadId}`
      );
      
      const threadData = await response.json();
      
      if (!threadData.messages || threadData.messages.length === 0) {
        return undefined;
      }
      
      // Sort messages by date and get the latest
      const latestMessage = threadData.messages.sort((a: any, b: any) => {
        return parseInt(b.internalDate) - parseInt(a.internalDate);
      })[0];
      
      return fetchMessageById(latestMessage.id);
    } catch (error) {
      console.warn('⚠️ Domain-wide auth failed, falling back to traditional:', error);
    }
  }
  
  // Use traditional OAuth method
  return fetchLatestMessageTraditional(threadId);
}

/**
 * Fetch all messages in a thread with automatic method selection
 */
export async function fetchThreadMessages(threadId: string): Promise<Email[]> {
  console.log(`📧 fetchThreadMessages: ${isDomainWideAuthConfigured() ? 'domain-wide' : 'traditional'} auth`);
  
  if (isDomainWideAuthConfigured()) {
    try {
      // Use domain-wide delegation
      const response = await makeGmailApiRequest(
        currentUserEmail!,
        `users/me/threads/${threadId}`
      );
      
      const threadData = await response.json();
      
      if (!threadData.messages || threadData.messages.length === 0) {
        return [];
      }
      
      // Sort messages chronologically and fetch full details
      const sortedMessages = threadData.messages.sort((a: any, b: any) => {
        return parseInt(a.internalDate) - parseInt(b.internalDate);
      });
      
      const emailPromises = sortedMessages.map((message: any) => fetchMessageById(message.id));
      const emails = await Promise.all(emailPromises);
      
      return emails.filter(Boolean) as Email[];
    } catch (error) {
      console.warn('⚠️ Domain-wide auth failed, falling back to traditional:', error);
    }
  }
  
  // Use traditional OAuth method
  return fetchThreadMessagesTraditional(threadId);
}

/**
 * Mark message as read with automatic method selection
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  console.log(`📧 markMessageAsRead: ${isDomainWideAuthConfigured() ? 'domain-wide' : 'traditional'} auth`);
  
  if (isDomainWideAuthConfigured()) {
    try {
      // Use domain-wide delegation
      await makeGmailApiRequest(
        currentUserEmail!,
        `users/me/messages/${messageId}/modify`,
        {
          method: 'POST',
          body: JSON.stringify({
            removeLabelIds: ['UNREAD']
          })
        }
      );
      console.log(`✅ Marked message ${messageId} as read via domain-wide auth`);
      return;
    } catch (error) {
      console.warn('⚠️ Domain-wide auth failed, falling back to traditional:', error);
    }
  }
  
  // Use traditional OAuth method
  return markAsReadTraditional(messageId);
}

/**
 * Mark message as unread with automatic method selection
 */
export async function markMessageAsUnread(messageId: string): Promise<void> {
  console.log(`📧 markMessageAsUnread: ${isDomainWideAuthConfigured() ? 'domain-wide' : 'traditional'} auth`);
  
  if (isDomainWideAuthConfigured()) {
    try {
      // Use domain-wide delegation
      await makeGmailApiRequest(
        currentUserEmail!,
        `users/me/messages/${messageId}/modify`,
        {
          method: 'POST',
          body: JSON.stringify({
            addLabelIds: ['UNREAD']
          })
        }
      );
      console.log(`✅ Marked message ${messageId} as unread via domain-wide auth`);
      return;
    } catch (error) {
      console.warn('⚠️ Domain-wide auth failed, falling back to traditional:', error);
    }
  }
  
  // Use traditional OAuth method
  return markAsUnreadTraditional(messageId);
}

/**
 * Mark message as starred with automatic method selection
 */
export async function markMessageAsStarred(messageId: string): Promise<void> {
  console.log(`📧 markMessageAsStarred: ${isDomainWideAuthConfigured() ? 'domain-wide' : 'traditional'} auth`);
  
  if (isDomainWideAuthConfigured()) {
    try {
      // Use domain-wide delegation
      await makeGmailApiRequest(
        currentUserEmail!,
        `users/me/messages/${messageId}/modify`,
        {
          method: 'POST',
          body: JSON.stringify({
            addLabelIds: ['IMPORTANT']
          })
        }
      );
      console.log(`✅ Marked message ${messageId} as starred via domain-wide auth`);
      return;
    } catch (error) {
      console.warn('⚠️ Domain-wide auth failed, falling back to traditional:', error);
    }
  }
  
  // Use traditional OAuth method
  return markAsStarredTraditional(messageId);
}

/**
 * Mark message as trash with automatic method selection
 */
export async function markMessageAsTrash(messageId: string): Promise<void> {
  console.log(`📧 markMessageAsTrash: ${isDomainWideAuthConfigured() ? 'domain-wide' : 'traditional'} auth`);
  
  if (isDomainWideAuthConfigured()) {
    try {
      // Use domain-wide delegation
      await makeGmailApiRequest(
        currentUserEmail!,
        `users/me/messages/${messageId}/modify`,
        {
          method: 'POST',
          body: JSON.stringify({
            addLabelIds: ['TRASH'],
            removeLabelIds: ['INBOX']
          })
        }
      );
      console.log(`✅ Moved message ${messageId} to trash via domain-wide auth`);
      return;
    } catch (error) {
      console.warn('⚠️ Domain-wide auth failed, falling back to traditional:', error);
    }
  }
  
  // Use traditional OAuth method
  return markAsTrashTraditional(messageId);
}

/**
 * Apply labels to a message with automatic method selection
 */
export async function applyLabelsToMessage(
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[] = []
): Promise<void> {
  console.log(`📧 applyLabelsToMessage: ${isDomainWideAuthConfigured() ? 'domain-wide' : 'traditional'} auth`);
  
  if (isDomainWideAuthConfigured()) {
    try {
      // Use domain-wide delegation
      await makeGmailApiRequest(
        currentUserEmail!,
        `users/me/messages/${messageId}/modify`,
        {
          method: 'POST',
          body: JSON.stringify({
            addLabelIds,
            removeLabelIds
          })
        }
      );
      console.log(`✅ Applied labels to message ${messageId} via domain-wide auth`);
      return;
    } catch (error) {
      console.warn('⚠️ Domain-wide auth failed, falling back to traditional:', error);
    }
  }
  
  // Use traditional OAuth method
  return applyLabelsTraditional(messageId, addLabelIds, removeLabelIds);
}

/**
 * Convert Gmail API message response to Email format
 * (Simplified version - for production you'd want the full conversion logic from gapiService)
 */
function convertGmailMessageToEmail(messageData: any): Email {
  const payload = messageData.payload;
  const headers = payload.headers || [];
  
  const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
  const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
  const toHeader = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || '';
  const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || new Date().toISOString();
  
  let fromName = fromHeader;
  let fromEmail = fromHeader;
  const fromMatch = fromHeader.match(/(.*)<(.*)>/);
  if (fromMatch && fromMatch.length === 3) {
    fromName = fromMatch[1].trim();
    fromEmail = fromMatch[2].trim();
  }

  // Simplified body extraction (for production, use the full logic from gapiService)
  let body = messageData.snippet || '';
  
  // Try to extract body from payload (simplified)
  if (payload.body?.data) {
    try {
      body = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } catch (error) {
      console.warn('Failed to decode message body, using snippet');
    }
  }

  return {
    id: messageData.id,
    from: { 
      name: fromName, // Server-side decoding should handle this
      email: fromEmail 
    },
    to: [{ name: 'Me', email: toHeader }],
    subject: subject, // Server-side decoding should handle this
    body: body, // Server-side decoding should handle this
    preview: messageData.snippet || '', // Server-side decoding should handle this
    isRead: !messageData.labelIds?.includes('UNREAD'),
    isImportant: messageData.labelIds?.includes('IMPORTANT'),
    date: new Date(dateHeader).toISOString(),
    threadId: messageData.threadId
  } as Email;
}

// Re-export traditional auth status check
export { isGmailSignedIn };
