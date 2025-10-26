/**
 * Gmail message fetching operations
 * Handles: list, fetch, threads, etc.
 */

import { Email } from '../../../types';
import { format } from 'date-fns';
import {
  decodeRfc2047 as gmailDecodeRfc2047,
  parseEmailAddresses as gmailParseEmailAddresses,
  getHeaderValue as gmailGetHeaderValue,
  findBodyPart as gmailFindBodyPart,
  extractTextFromPart as gmailExtractTextFromPart,
  decodeHtmlEntities,
} from '../index';
import type { EmailPart } from '../types';

export interface PaginatedEmailResponse {
  emails: Email[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

/**
 * Check if Gmail is signed in
 */
const isGmailSignedIn = (): boolean => {
  try {
    return window.gapi?.client?.gmail !== undefined;
  } catch {
    return false;
  }
};

/**
 * Fetch messages from Gmail with pagination
 */
export const fetchGmailMessages = async (
  query: string = 'in:inbox',
  maxResults: number = 10,
  pageToken?: string
): Promise<PaginatedEmailResponse> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const requestParams: any = {
      userId: 'me',
      maxResults: maxResults,
      q: query
    };

    // Add pageToken if provided
    if (pageToken) {
      requestParams.pageToken = pageToken;
    }

    const response = await window.gapi.client.gmail.users.messages.list(requestParams);

    if (!response.result.messages || response.result.messages.length === 0) {
      return {
        emails: [],
        nextPageToken: undefined,
        resultSizeEstimate: response.result.resultSizeEstimate || 0
      };
    }

    const emails: Email[] = [];
    
    // Fetch emails sequentially to avoid rate limits
    for (const message of response.result.messages) {
      if (!message.id) continue;

      try {
        const msg = await window.gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'To', 'Date']
        });

        if (!msg.result || !msg.result.payload) continue;
        const payload = msg.result.payload as EmailPart;

        const headers = payload.headers || [];
        const subject = gmailDecodeRfc2047(gmailGetHeaderValue(headers, 'subject') || 'No Subject');
        const fromHeader = gmailDecodeRfc2047(gmailGetHeaderValue(headers, 'from') || '');
        const toHeader = gmailDecodeRfc2047(gmailGetHeaderValue(headers, 'to') || '');
        const dateHeader = gmailGetHeaderValue(headers, 'date') || new Date().toISOString();
        
        const fromAddresses = gmailParseEmailAddresses(fromHeader);
        const fromEmail = fromAddresses[0]?.email || fromHeader;
        const fromName = fromAddresses[0]?.name || fromHeader;

        const toAddresses = gmailParseEmailAddresses(toHeader);
        const toEmail = toAddresses[0]?.email || toHeader;
        const toName = toAddresses[0]?.name || toHeader;

        let preview = msg.result.snippet ? decodeHtmlEntities(msg.result.snippet) : '';
        let body = preview;

        const attachments: NonNullable<Email['attachments']> = [];

        emails.push({
          id: message.id,
          from: { name: fromName, email: fromEmail },
          to: [{ name: toName, email: toEmail }],
          subject: subject,
          body: body,
          preview: preview,
          isRead: !msg.result.labelIds?.includes('UNREAD'),
          isImportant: msg.result.labelIds?.includes('IMPORTANT'),
          isStarred: msg.result.labelIds?.includes('STARRED'),
          date: format(new Date(dateHeader), "yyyy-MM-dd'T'HH:mm:ss"),
          labelIds: msg.result.labelIds || [],
          attachments: attachments.length > 0 ? attachments : undefined,
          threadId: msg.result.threadId
        } as Email);

        await new Promise(resolve => setTimeout(resolve, 25));
      } catch (messageError) {
        console.warn(`Failed to fetch message ${message.id}:`, messageError);
      }
    }

    return {
      emails: emails,
      nextPageToken: response.result.nextPageToken,
      resultSizeEstimate: response.result.resultSizeEstimate || 0
    };
  } catch (error) {
    console.error('Error fetching emails from Gmail:', error);
    throw error;
  }
};

/**
 * Fetch a single message from Gmail by ID
 */
export const fetchGmailMessageById = async (id: string): Promise<Email | undefined> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const msg = await window.gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: id,
      format: 'full'
    });

    if (!msg.result || !msg.result.payload) {
      console.error('Email fetch returned no result or no payload');
      return undefined;
    }
    
    console.log('Email fetch successful, processing payload');
    const payload = msg.result.payload as EmailPart;

    const headers = payload.headers || [];
    const subject = gmailDecodeRfc2047(gmailGetHeaderValue(headers, 'subject') || 'No Subject');
    const fromHeader = gmailDecodeRfc2047(gmailGetHeaderValue(headers, 'from') || '');
    const toHeader = gmailDecodeRfc2047(gmailGetHeaderValue(headers, 'to') || '');
    const dateHeader = gmailGetHeaderValue(headers, 'date') || new Date().toISOString();

    const fromAddresses = gmailParseEmailAddresses(fromHeader);
    const fromEmail = fromAddresses[0]?.email || fromHeader;
    const fromName = fromAddresses[0]?.name || fromHeader;

    const toAddresses = gmailParseEmailAddresses(toHeader);
    const toEmail = toAddresses[0]?.email || toHeader;
    const toName = toAddresses[0]?.name || toHeader;

    let preview = msg.result.snippet ? decodeHtmlEntities(msg.result.snippet) : '';
    let body = '';

    console.log('Finding body part...');
    const bodyPart = gmailFindBodyPart(payload);
    if (bodyPart) {
      console.log(`Body part found, type: ${bodyPart.mimeType}`);
      body = gmailExtractTextFromPart(bodyPart);
    } else {
      console.warn(`No suitable body part found for message ID (detail view): ${id}. Snippet: "${preview}"`);
      if (!body && preview) body = preview.replace(/\n/g, '<br>');
    }

    const attachments: NonNullable<Email['attachments']> = [];

    return {
      id: id,
      from: { name: fromName, email: fromEmail },
      to: [{ name: toName, email: toEmail }],
      subject: subject,
      body: body,
      preview: preview,
      isRead: !msg.result.labelIds?.includes('UNREAD'),
      isImportant: msg.result.labelIds?.includes('IMPORTANT'),
      isStarred: msg.result.labelIds?.includes('STARRED'),
      date: format(new Date(dateHeader), "yyyy-MM-dd'T'HH:mm:ss"),
      labelIds: msg.result.labelIds || [],
      attachments: attachments.length > 0 ? attachments : undefined,
      threadId: msg.result.threadId
    } as Email;
  } catch (error) {
    console.error(`Error fetching email with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Fetch latest message in a thread
 */
export const fetchLatestMessageInThread = async (threadId: string): Promise<Email | undefined> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const thread = await window.gapi.client.gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'To', 'Date']
    });

    if (!thread.result.messages || thread.result.messages.length === 0) {
      return undefined;
    }

    const lastMessage = thread.result.messages[thread.result.messages.length - 1];
    if (!lastMessage.id) return undefined;

    return fetchGmailMessageById(lastMessage.id);
  } catch (error) {
    console.error(`Error fetching latest message in thread ${threadId}:`, error);
    throw error;
  }
};

/**
 * Fetch all messages in a thread
 */
export const fetchThreadMessages = async (threadId: string): Promise<Email[]> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const thread = await window.gapi.client.gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'To', 'Date']
    });

    if (!thread.result.messages || thread.result.messages.length === 0) {
      return [];
    }

    const emails: Email[] = [];
    for (const message of thread.result.messages) {
      if (!message.id) continue;
      
      try {
        const email = await fetchGmailMessageById(message.id);
        if (email) {
          emails.push(email);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.warn(`Failed to fetch message in thread ${threadId}:`, error);
      }
    }

    return emails;
  } catch (error) {
    console.error(`Error fetching thread messages for ${threadId}:`, error);
    throw error;
  }
};
