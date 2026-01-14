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
} from '../parsing/headers';
import {
  findBodyPart as gmailFindBodyPart,
  extractTextFromPart as gmailExtractTextFromPart,
} from '../parsing/body';
import { decodeHtmlEntities } from '../parsing/charset';
import type { EmailPart } from '../types';
import { parseEmailBody } from '../parsing/bodyParserSimple';
import { AttachmentCache } from '../../../services/attachmentCache';

/**
 * Extract real attachments (files that are NOT inline images)
 * These are files that should be shown in the attachments section
 */
const extractAttachments = (part: EmailPart, inlineCids: string[]): Array<{ name: string; mimeType: string; size: number; attachmentId: string }> => {
  const attachments: Array<{ name: string; mimeType: string; size: number; attachmentId: string }> = [];

  const processPart = (p: EmailPart) => {
    // Check if this part has a filename and attachmentId
    const filename = p.filename;
    const contentId = p.headers?.find(h => h.name.toLowerCase() === 'content-id')?.value?.replace(/^<|>$/g, '');

    // Include this as an attachment if:
    // 1. It has a filename AND
    // 2. It has an attachmentId AND
    // 3. Either:
    //    - It has NO Content-ID, OR
    //    - Its Content-ID is NOT in the inline list, OR
    //    - It's NOT an image type (PDFs and other files should always show as attachments)
    if (filename && p.body?.attachmentId) {
      const isImage = p.mimeType?.startsWith('image/');
      const isInlineImage = isImage && contentId && inlineCids.includes(contentId);

      if (!isInlineImage) {
        console.log(`📎 Found attachment: ${filename} (${p.mimeType}, ${(p.body.size || 0) / 1024}KB)`);
        attachments.push({
          name: filename,
          mimeType: p.mimeType || 'application/octet-stream',
          size: p.body.size || 0,
          attachmentId: p.body.attachmentId
        });
      } else {
        console.log(`🖼️ Skipping inline image: ${filename}`);
      }
    }

    // Recursively process child parts
    if (p.parts) {
      p.parts.forEach(processPart);
    }
  };

  processPart(part);
  console.log(`📎 Total attachments found: ${attachments.length}`);
  return attachments;
};

/**
 * Extract inline attachments (images) from email parts
 * Recursively finds all parts with Content-ID headers
 */
const extractInlineAttachments = (part: EmailPart): Array<{ cid: string; attachmentId: string; mimeType: string }> => {
  const inlineAttachments: Array<{ cid: string; attachmentId: string; mimeType: string }> = [];

  const processPart = (p: EmailPart) => {
    // Check if this part has both Content-ID header AND an attachmentId
    const contentIdHeader = p.headers?.find(h => h.name.toLowerCase() === 'content-id');
    const contentType = p.mimeType || 'image/png';

    if (contentIdHeader && p.body?.attachmentId) {
      // Clean the Content-ID (remove < > brackets)
      const cid = contentIdHeader.value.replace(/^<|>$/g, '');
      console.log(`📎 Found inline attachment: cid:${cid}, attachmentId: ${p.body.attachmentId}, type: ${contentType}`);

      inlineAttachments.push({
        cid: cid,
        attachmentId: p.body.attachmentId,
        mimeType: contentType
      });
    }

    // Recursively process child parts
    if (p.parts) {
      p.parts.forEach(processPart);
    }
  };

  processPart(part);
  console.log(`📎 Total inline attachments found: ${inlineAttachments.length}`);
  return inlineAttachments;
};

/**
 * Replace cid: references in HTML with base64 data URIs
 * Exported for lazy loading on message expand
 */
export const replaceCidReferences = async (
  html: string,
  inlineAttachments: Array<{ cid: string; attachmentId: string; mimeType: string }>,
  messageId: string
): Promise<string> => {
  if (inlineAttachments.length === 0) {
    return html;
  }

  console.log(`🔄 Replacing ${inlineAttachments.length} cid: references in HTML...`);

  let modifiedHtml = html;

  // Process each inline attachment
  for (const attachment of inlineAttachments) {
    try {
      // Check global cache first
      let dataUrl = AttachmentCache.get(attachment.attachmentId);
      let loadedFromCache = false;

      if (!dataUrl) {
        console.log(`⏳ Fetching attachment: ${attachment.attachmentId} for cid:${attachment.cid}`);

        // Fetch the attachment data from Gmail API
        const response = await window.gapi.client.gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: attachment.attachmentId
        });

        if (response.result?.data) {
          // Gmail returns base64url - convert to standard base64
          const base64Data = response.result.data
            .replace(/-/g, '+')
            .replace(/_/g, '/');

          // Pad if needed
          const padding = '='.repeat((4 - base64Data.length % 4) % 4);
          const paddedBase64 = base64Data + padding;

          // Create data URI
          dataUrl = `data:${attachment.mimeType};base64,${paddedBase64}`;

          // Cache it!
          AttachmentCache.set(attachment.attachmentId, dataUrl);
        }
      } else {
        console.log(`💾 Using cached attachment for cid:${attachment.cid}`);
        loadedFromCache = true;
      }

      if (dataUrl) {
        // Replace ALL occurrences of this cid in the HTML
        // Match both cid:xxxxx and cid:"xxxxx" formats
        const cidPatterns = [
          new RegExp(`cid:${attachment.cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
          new RegExp(`cid:"${attachment.cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'gi'),
          new RegExp(`cid:'${attachment.cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'gi')
        ];

        cidPatterns.forEach(pattern => {
          modifiedHtml = modifiedHtml.replace(pattern, dataUrl!);
        });

        if (!loadedFromCache) {
          console.log(`✅ Replaced cid:${attachment.cid} with data URI`);
        }
      } else {
        console.warn(`⚠️ No data returned for attachment ${attachment.attachmentId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to fetch attachment for cid:${attachment.cid}:`, error);
    }
  }


  return modifiedHtml;
};

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
 * Fetch threads (not individual messages) from Gmail with pagination
 * This ensures each thread appears once in the list, matching Gmail UI behavior
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

    // Use query as-is - thread-level filtering is applied client-side
    const finalQuery = query;

    const requestParams: any = {
      userId: 'me',
      maxResults: maxResults,
      q: finalQuery
    };

    // Add pageToken if provided
    if (pageToken) {
      requestParams.pageToken = pageToken;
    }

    // Use threads API instead of messages API to show one row per thread
    const threadsApi = (window.gapi.client.gmail.users as any).threads;
    const response = await threadsApi.list(requestParams);

    if (!response.result.threads || response.result.threads.length === 0) {
      return {
        emails: [],
        nextPageToken: undefined,
        resultSizeEstimate: response.result.resultSizeEstimate || 0
      };
    }

    // Import thread filtering utility
    const { threadBelongsInInbox } = await import('../../../utils/threadLabelFilter');
    const isInboxQuery = finalQuery.includes('in:inbox');
    const hasServerSideFilter = finalQuery.includes('-has:userlabels');

    const emails: Email[] = [];

    // Fetch thread details (latest message from each thread)
    for (const thread of response.result.threads) {
      if (!thread.id) continue;

      let threadData;
      let retryCount = 0;
      const MAX_RETRIES = 1;

      // Retry logic for failed thread fetches
      while (retryCount <= MAX_RETRIES) {
        try {
          // Get thread with latest message metadata
          threadData = await threadsApi.get({
            userId: 'me',
            id: thread.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'To', 'Date']
          });
          break; // Success
        } catch (error) {
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            console.error(`❌ Failed to fetch thread ${thread.id} after retries:`, error);
            break;
          }
          console.warn(`⚠️ Retry ${retryCount}/${MAX_RETRIES} for thread ${thread.id}`);
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
        }
      }

      if (!threadData) continue;

      try {
        const messages = threadData.result.messages || [];
        if (messages.length === 0) continue;

        // THREAD-LEVEL FILTERING: For inbox queries, use centralized filter
        // Skip filtering if server-side filter is already applied via -has:userlabels
        if (isInboxQuery && !hasServerSideFilter && !threadBelongsInInbox(messages)) {
          continue; // Skip this thread
        }
        if (messages.length === 0) continue;

        // Get the latest message in the thread
        const latestMessage = messages[messages.length - 1];
        if (!latestMessage.id || !latestMessage.payload) continue;

        const payload = latestMessage.payload as EmailPart;

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

        let preview = latestMessage.snippet ? decodeHtmlEntities(latestMessage.snippet) : '';
        let body = preview;

        const attachments: NonNullable<Email['attachments']> = [];

        // Check if any message in the thread is a draft
        const hasDraftInThread = messages.some((msg: any) =>
          msg.labelIds?.includes('DRAFT')
        );

        if (hasDraftInThread) {
          console.log(`📧 Thread ${thread.id} has draft - setting hasDraftInThread flag`);
        }

        emails.push({
          id: latestMessage.id,
          from: { name: fromName, email: fromEmail },
          to: [{ name: toName, email: toEmail }],
          subject: subject,
          body: body,
          preview: preview,
          isRead: !latestMessage.labelIds?.includes('UNREAD'),
          isImportant: latestMessage.labelIds?.includes('IMPORTANT'),
          isStarred: latestMessage.labelIds?.includes('STARRED'),
          date: format(new Date(dateHeader), "yyyy-MM-dd'T'HH:mm:ss"),
          labelIds: latestMessage.labelIds || [],
          attachments: attachments.length > 0 ? attachments : undefined,
          threadId: thread.id,
          hasDraftInThread: hasDraftInThread
        } as Email);

        await new Promise(resolve => setTimeout(resolve, 25));
      } catch (messageError) {
        console.warn(`Failed to fetch thread ${thread.id}:`, messageError);
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

    // Use simplified parser for reliable UTF-8 handling
    console.log('📧 Using simplified body parser...');
    body = parseEmailBody(msg.result);
    console.log(`✅ Body parsed: ${body.length} characters`);

    // Fallback to old parser if new one returns empty
    if (!body) {
      console.warn('⚠️ Simplified parser returned empty, falling back to old parser');
      const bodyPart = gmailFindBodyPart(payload);
      if (bodyPart) {
        console.log(`Body part found, type: ${bodyPart.mimeType}`);
        body = gmailExtractTextFromPart(bodyPart);
      }
    }

    if (body) {

      // Extract inline attachments metadata (DON'T fetch data yet for performance)
      console.log('🔍 Searching for inline attachments...');
      const inlineAttachments = extractInlineAttachments(payload);

      // SKIP cid: replacement for faster loading - will be done on expand
      if (inlineAttachments.length > 0) {
        console.log(`🖼️ Found ${inlineAttachments.length} inline attachments (lazy loading enabled)`);
      } else {
        console.log('ℹ️ No inline attachments found');
      }

      // Extract real attachments (exclude inline images ONLY if actually referenced in body)
      console.log('🔍 Searching for real attachments...');
      // Only filter out inline images that are actually referenced in the email body with cid:
      const referencedInlineCids = inlineAttachments
        .filter(a => body.includes(`cid:${a.cid}`))
        .map(a => a.cid);
      console.log(`🖼️ CIDs actually referenced in body: ${referencedInlineCids.length} of ${inlineAttachments.length}`);
      const extractedAttachments = extractAttachments(payload, referencedInlineCids);

      // Convert to Email attachment format
      const attachments: NonNullable<Email['attachments']> = extractedAttachments.map(att => ({
        name: att.name,
        mimeType: att.mimeType,
        size: att.size,
        attachmentId: att.attachmentId,
        url: '' // Will be populated when user downloads
      }));

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
        threadId: msg.result.threadId,
        // Store inline attachment metadata for lazy loading
        inlineAttachments: inlineAttachments.length > 0 ? inlineAttachments : undefined
      } as Email;
    }

    // Final fallback to snippet if still no body
    if (!body && preview) {
      console.warn(`No body found for message ${id}, using snippet`);
      body = preview.replace(/\n/g, '<br>');
    }

    // Fallback: no body part found
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
      attachments: undefined,
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
