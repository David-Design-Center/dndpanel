import { Email } from '../types';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { 
  getAttachmentDownloadUrl as getGmailAttachmentDownloadUrl
} from '../lib/gmail';
import { 
  fetchGmailMessages, 
  sendGmailMessage, 
  fetchGmailMessageById,
  fetchLatestMessageInThread,
  fetchThreadMessages,
  markGmailMessageAsTrash,
  markGmailMessageAsRead,
  markGmailMessageAsUnread,
  markGmailMessageAsStarred,
  markGmailMessageAsUnstarred,
  markGmailMessageAsImportant,
  markGmailMessageAsUnimportant,
  applyGmailLabels,
  getGmailUserProfile,
  saveGmailDraft,
  deleteGmailDraft,
  emptyGmailTrash,
  isGmailSignedIn
} from '../integrations/gapiService';
import { queueGmailRequest } from '../utils/requestQueue';

// Auto-reply functionality for out-of-office
const processedSenders = new Set<string>(); // Track senders we've already replied to
const pendingSenders = new Set<string>(); // Track senders currently being processed
// Note: Rate limiting features disabled during emergency patch

// Function to get out-of-office settings from Supabase
const getOutOfOfficeSettings = async (profileName: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('out_of_office_settings')
      .eq('name', profileName)
      .single();

    if (error) {
      console.error('Error fetching out-of-office settings:', error);
    } else if (data?.out_of_office_settings && 
               typeof data.out_of_office_settings === 'object' &&
               data.out_of_office_settings.autoReplyMessage) {
      return data.out_of_office_settings;
    }
  } catch (error) {
    console.error('Error loading out-of-office settings:', error);
  }
  
  const defaults: { [key: string]: { autoReplyMessage: string } } = {
    'David': {
      autoReplyMessage: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hi,</p>
          <p>I'm out of office currently. I'll get back to you when I return.</p>
          <p>Thank you, have a blessed day.</p>
          <p>David</p>
        </div>
      `.trim()
    },
    'Marti': {
      autoReplyMessage: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hi,</p>
          <p>I'm out of office currently. I'll get back to you when I return.</p>
          <p>Thank you for your understanding.</p>
          <p>Marti</p>
        </div>
      `.trim()
    }
  };
  
  return defaults[profileName] || {
    autoReplyMessage: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hi,</p>
        <p>I'm out of office currently. I'll get back to you when I return.</p>
        <p>Thank you for your understanding.</p>
      </div>
    `.trim()
  };
};

export const checkAndSendAutoReply = async (email: Email): Promise<void> => {
  const senderEmail = email.from.email.toLowerCase();
  
  // CRITICAL FIX: Immediate atomic check and lock
  if (senderEmail === 'me@example.com' || 
      senderEmail.includes('david') || 
      senderEmail.includes('marti') ||
      senderEmail.includes('natalia') ||
      senderEmail.includes('dimitry') ||
      processedSenders.has(senderEmail) ||
      pendingSenders.has(senderEmail)) {
    return;
  }
  
  // CRITICAL FIX: Mark as pending IMMEDIATELY to prevent race conditions
  pendingSenders.add(senderEmail);
  
  try {
    // Get out-of-office statuses from Supabase profiles table
    let outOfOfficeUsers: string[] = [];
    const userStatuses: { [name: string]: boolean } = {};
    
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('name, out_of_office_settings')
        .in('name', ['David', 'Marti', 'Natalia', 'Dimitry']);

      if (error) {
        console.error('Error loading out-of-office settings from Supabase:', error);
        throw error;
      }

      // Extract statuses from Supabase data
      profiles?.forEach(profile => {
        const settings = profile.out_of_office_settings;
        if (settings && settings.isOutOfOffice) {
          outOfOfficeUsers.push(profile.name);
          userStatuses[profile.name] = true;
        } else {
          userStatuses[profile.name] = false;
        }
      });
    } catch (supabaseError) {
      console.warn('Failed to load from Supabase, falling back to localStorage:', supabaseError);
      // Fallback to localStorage
      const outOfOfficeStatuses = localStorage.getItem('outOfOfficeStatuses');
      const statuses = outOfOfficeStatuses ? JSON.parse(outOfOfficeStatuses) : {};
      
      ['David', 'Marti', 'Natalia', 'Dimitry'].forEach(name => {
        if (statuses[name]) {
          outOfOfficeUsers.push(name);
          userStatuses[name] = true;
        } else {
          userStatuses[name] = false;
        }
      });
    }
    
    if (outOfOfficeUsers.length === 0) {
      return; // No one is out of office, no auto-reply needed
    }
    
    // Don't auto-reply to automated emails, newsletters, etc.
    const automatedIndicators = [
      'noreply', 'no-reply', 'donotreply', 'notifications', 'newsletter',
      'support', 'automated', 'system', 'admin', 'info@', 'help@'
    ];
    
    if (automatedIndicators.some(indicator => senderEmail.includes(indicator))) {
      return;
    }
    
    // Determine who is out of office and get their settings
    let outOfOfficePerson = '';
    let autoReplyMessage = '';
    const userSettings: { [name: string]: any } = {};
    
    // Load settings for all out-of-office users
    for (const userName of outOfOfficeUsers) {
      userSettings[userName] = await getOutOfOfficeSettings(userName);
    }
    
    // Generate appropriate message based on who is out of office
    if (outOfOfficeUsers.length === 1) {
      // Single person out of office
      const userName = outOfOfficeUsers[0];
      outOfOfficePerson = userName;
      autoReplyMessage = userSettings[userName]?.autoReplyMessage || `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hi,</p>
          <p>I'm out of office currently. I'll get back to you when I return.</p>
          <p>Thank you for your understanding.</p>
          <p>${userName}</p>
        </div>
      `;
    } else if (outOfOfficeUsers.length === 2) {
      // Two people out of office
      outOfOfficePerson = outOfOfficeUsers.join(' and ');
      autoReplyMessage = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hi,</p>
          <p>We are both out of office currently. Your message has been received and we will respond when we return.</p>
          <p>Thank you for your understanding.</p>
          <br>
          <p>${outOfOfficeUsers.join(' & ')}</p>
        </div>
      `;
    } else if (outOfOfficeUsers.length > 2) {
      // Multiple people out of office
      outOfOfficePerson = outOfOfficeUsers.slice(0, -1).join(', ') + ' and ' + outOfOfficeUsers.slice(-1);
      autoReplyMessage = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hi,</p>
          <p>Our team is currently out of office. Your message has been received and we will respond when we return.</p>
          <p>Thank you for your understanding.</p>
          <br>
          <p>${outOfOfficeUsers.join(', ')}</p>
        </div>
      `;
    }
    
    console.log(`🏖️ ${outOfOfficePerson} is out of office, sending auto-reply to: ${senderEmail}`);
    
    // Send auto-reply
    const autoReplySubject = `Re: ${email.subject}`;
    
    // Send the auto-reply
    await sendGmailMessage(
      senderEmail,
      '', // no CC
      autoReplySubject,
      autoReplyMessage,
      [], // no attachments
      email.threadId // reply in the same thread
    );

    // CRITICAL FIX: Only mark as processed AFTER successful completion
    processedSenders.add(senderEmail);
    console.log(`✅ Auto-reply sent for ${outOfOfficePerson} to: ${senderEmail}`);
    
  } catch (error) {
    console.error('❌ Error processing auto-reply for', senderEmail, ':', error);
    // CRITICAL FIX: Do NOT mark as processed on error to allow retry later
  } finally {
    // CRITICAL FIX: Always remove from pending, regardless of success/failure
    pendingSenders.delete(senderEmail);
  }
};

// Clear processed senders when switching out-of-office status
export const clearAutoReplyCache = (): void => {
  processedSenders.clear();
  pendingSenders.clear();
  console.log('🧹 Auto-reply cache cleared (both processed and pending)');
};

// Cache for emails to reduce API calls - now with localStorage persistence
const CACHE_KEY_PREFIX = 'dnd_email_cache_';
const CACHE_VALIDITY_MS = 30 * 60 * 1000; // Increased to 30 minutes for localStorage

// Enhanced cache interface
interface EmailCacheData {
  emails: Email[];
  timestamp: number;
  query: string;
  profileId?: string;
  nextPageToken?: string;
}

interface EmailDetailCache {
  email: Email;
  timestamp: number;
  profileId?: string;
}

// In-memory cache for quick access
const emailCache: {
  list?: EmailCacheData,
  details: { [id: string]: EmailDetailCache },
  threads: { [threadId: string]: EmailDetailCache }
} = {
  details: {},
  threads: {}
};

// localStorage cache utilities
const getFromLocalStorage = (key: string): any => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn('Error reading from localStorage:', error);
    return null;
  }
};

const setToLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Error writing to localStorage:', error);
    // If storage is full, clear old email caches
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      clearOldLocalStorageCaches();
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (retryError) {
        console.warn('Still unable to save to localStorage after cleanup');
      }
    }
  }
};

const clearOldLocalStorageCaches = (): void => {
  const keys = Object.keys(localStorage);
  const emailCacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
  const now = Date.now();
  
  emailCacheKeys.forEach(key => {
    const data = getFromLocalStorage(key);
    if (data && data.timestamp && (now - data.timestamp > CACHE_VALIDITY_MS)) {
      localStorage.removeItem(key);
    }
  });
};

// Current profile ID for cache validation
let currentCacheProfileId: string | null = null;

/**
 * Clear all email caches (both memory and localStorage)
 */
export const clearEmailCache = (): void => {
  console.log('Clearing all email caches (memory + localStorage)');
  
  // Clear in-memory cache
  emailCache.list = undefined;
  emailCache.details = {};
  emailCache.threads = {};
  
  // Clear localStorage cache
  const keys = Object.keys(localStorage);
  const emailCacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
  emailCacheKeys.forEach(key => localStorage.removeItem(key));
  
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
 * Get cached email list with localStorage fallback
 */
const getCachedEmailList = (query: string): EmailCacheData | null => {
  // First check in-memory cache
  if (emailCache.list && 
      emailCache.list.query === query && 
      isCacheValidForProfile(emailCache.list.timestamp, emailCache.list.profileId)) {
    return emailCache.list;
  }
  
  // Then check localStorage
  const cacheKey = `${CACHE_KEY_PREFIX}list_${query}_${currentCacheProfileId}`;
  const cachedData = getFromLocalStorage(cacheKey);
  
  if (cachedData && isCacheValidForProfile(cachedData.timestamp, cachedData.profileId)) {
    // Restore to in-memory cache for faster access
    emailCache.list = cachedData;
    return cachedData;
  }
  
  return null;
};

/**
 * Save email list to cache (both memory and localStorage)
 */
const setCachedEmailList = (emails: Email[], query: string, nextPageToken?: string): void => {
  const cacheData: EmailCacheData = {
    emails,
    timestamp: Date.now(),
    query,
    profileId: currentCacheProfileId || undefined,
    nextPageToken
  };
  
  // Save to in-memory cache
  emailCache.list = cacheData;
  
  // Save to localStorage
  const cacheKey = `${CACHE_KEY_PREFIX}list_${query}_${currentCacheProfileId}`;
  setToLocalStorage(cacheKey, cacheData);
};

/**
 * Check if cache is valid for current profile
 */
const isCacheValidForProfile = (timestamp: number, cachedProfileId?: string): boolean => {
  const isTimeValid = Date.now() - timestamp < CACHE_VALIDITY_MS;
  const isProfileValid = !currentCacheProfileId || cachedProfileId === currentCacheProfileId;
  return isTimeValid && isProfileValid;
};

// Mock emails removed - application now relies on real Gmail data

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
  // Normal search-based fetch with caching

  // If pageToken is provided, always fetch new data (don't use cache for pagination)
  // If force refresh is requested, fetch new data
  if (pageToken || forceRefresh) {
    console.log('Fetching fresh email list' + 
      (forceRefresh ? ' (forced refresh)' : '') + 
      (pageToken ? ' (pagination)' : '') + 
      ` with query: ${query}`);
  } else {
    // Try to get from cache first (with localStorage fallback)
    const cachedData = getCachedEmailList(query);
    if (cachedData) {
      console.log(`📦 Using cached email list for query: ${query} (${cachedData.emails.length} emails)`);
      return {
        emails: cachedData.emails,
        nextPageToken: cachedData.nextPageToken,
        resultSizeEstimate: cachedData.emails.length
      };
    }
    
    console.log('No valid cache found, fetching fresh email list with query:', query);
  }
  
  try {
    // Queue the Gmail API request to prevent concurrent calls
    console.log('📧 Queueing Gmail API request for emails...');
    const gmailResponse = await queueGmailRequest(
      `fetch-emails-${query.replace(/\s+/g, '-')}`,
      () => fetchGmailMessages(query, maxResults, pageToken)
    );
    
    // If this is not a paginated request (no pageToken), update cache
    if (!pageToken) {
      setCachedEmailList(gmailResponse.emails, query, gmailResponse.nextPageToken);
      
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
      
      // ✅ OPTIMIZATION: Legacy auto-reply processing disabled
      // Auto-reply now handled by optimizedInitialLoad.processAutoReplyOptimized() 
      // using cached data from Step 1 (no duplicate API calls)
      // 
      // Check for auto-reply on new unread emails (only for primary inbox queries)
      // if (query.includes('in:inbox') && query.includes('category:primary') && !pageToken) {
      //   const unreadEmails = gmailResponse.emails.filter(email => !email.isRead);
      //   console.log(`Processing ${unreadEmails.length} unread primary emails for auto-reply`);
      //   
      //   for (const email of unreadEmails) {
      //     try {
      //       await checkAndSendAutoReply(email);
      //     } catch (error) {
      //       console.error('Auto-reply check failed for email:', email.id, error);
      //     }
      //   }
      // }
    }
    
    return {
      emails: gmailResponse.emails,
      nextPageToken: gmailResponse.nextPageToken,
      resultSizeEstimate: gmailResponse.resultSizeEstimate
    };
  } catch (error) {
    console.error('Error fetching emails from Gmail:', error);
    // Return empty results on error instead of falling back to mock data
    return {
      emails: [],
      nextPageToken: undefined,
      resultSizeEstimate: 0
    };
  }
};

// Specialized query functions
export const getUnreadEmails = async (forceRefresh = false): Promise<Email[]> => {
  const response = await getEmails(forceRefresh, 'in:inbox is:unread');
  return response.emails;
};

export const getPrimaryEmails = async (
  forceRefresh = false, 
  maxResults = 100, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  return getEmailsByLabelIds(['INBOX'], forceRefresh, maxResults, pageToken);
};

export const getSocialEmails = async (
  forceRefresh = false, 
  maxResults = 10, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  return getEmailsByLabelIds(['CATEGORY_SOCIAL'], forceRefresh, maxResults, pageToken);
};

export const getUpdatesEmails = async (
  forceRefresh = false, 
  maxResults = 10, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  return getEmailsByLabelIds(['CATEGORY_UPDATES'], forceRefresh, maxResults, pageToken);
};

export const getForumsEmails = async (
  forceRefresh = false, 
  maxResults = 10, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  return getEmails(forceRefresh, 'in:inbox category:forums', maxResults, pageToken);
};

export const getAllInboxEmails = async (
  forceRefresh = false, 
  maxResults = 100, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  // Unified inbox: include everything except Sent and Trash
  // Unified inbox: All Mail except Sent, Trash, and Spam
  return getEmails(forceRefresh, '-in:sent -in:trash -in:spam', maxResults, pageToken);
};

export const getSentEmails = async (
  forceRefresh = false, 
  maxResults = 100, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  // Use labelIds for sent emails
  return getEmailsByLabelIds(['SENT'], forceRefresh, maxResults, pageToken);
};

export const getDraftEmails = async (_forceRefresh = false): Promise<Email[]> => {
  // Use users.drafts.list for proper draft handling
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const response = await window.gapi.client.gmail.users.drafts.list({
      userId: 'me'
    });

    if (!response.result.drafts || response.result.drafts.length === 0) {
      return [];
    }

    const drafts: Email[] = [];
    
    // Fetch draft details using users.drafts.get
    for (const draft of response.result.drafts) {
      if (!draft.id) continue;

      try {
        const draftMsg = await window.gapi.client.gmail.users.drafts.get({
          userId: 'me',
          id: draft.id
        });

        if (!draftMsg.result || !draftMsg.result.message) continue;
        const message = draftMsg.result.message;
        const payload = message.payload;

        const headers = payload?.headers || [];
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

        let toName = toHeader;
        let toEmail = toHeader;
        const toMatch = toHeader.match(/(.*)<(.*)>/);
        if (toMatch && toMatch.length === 3) {
          toName = toMatch[1].trim();
          toEmail = toMatch[2].trim();
        }

        let preview = message.snippet || '';
        let body = preview;

        drafts.push({
          id: message.id || draft.id,
          from: { name: fromName, email: fromEmail },
            to: [{ name: toName, email: toEmail }],
          subject: subject,
          body: body,
          preview: preview,
          // Preserve unread status if Gmail marks draft with UNREAD label
          isRead: !(message.labelIds || []).includes('UNREAD'),
          isImportant: message.labelIds?.includes('IMPORTANT'),
          isStarred: message.labelIds?.includes('STARRED'),
          date: format(new Date(dateHeader), "yyyy-MM-dd'T'HH:mm:ss"),
          labelIds: message.labelIds || [],
          attachments: undefined,
          threadId: message.threadId
        } as Email);

        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (messageError) {
        console.warn(`Failed to fetch draft ${draft.id}:`, messageError);
      }
    }
    
    return drafts;
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return [];
  }
};

export const getTrashEmails = async (
  forceRefresh = false, 
  maxResults = 20, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  // Use labelIds for trash emails
  return getEmailsByLabelIds(['TRASH'], forceRefresh, maxResults, pageToken);
};

export const getImportantEmails = async (
  forceRefresh = false, 
  maxResults = 20, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  return getEmailsByLabelIds(['IMPORTANT'], forceRefresh, maxResults, pageToken);
};

export const getStarredEmails = async (
  forceRefresh = false, 
  maxResults = 20, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  return getEmailsByLabelIds(['STARRED'], forceRefresh, maxResults, pageToken);
};

export const getSpamEmails = async (
  forceRefresh = false, 
  maxResults = 20, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  // Use labelIds for spam emails
  return getEmailsByLabelIds(['SPAM'], forceRefresh, maxResults, pageToken);
};

export const getArchiveEmails = async (
  forceRefresh = false, 
  maxResults = 20, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  // Archive: everything that's not in Inbox, Spam, Trash
  return getEmails(forceRefresh, '-in:inbox -in:spam -in:trash', maxResults, pageToken);
};

export const getAllMailEmails = async (
  forceRefresh = false, 
  maxResults = 20, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  // All Mail: Gmail's "archive + inbox", excluding Spam/Trash
  return getEmails(forceRefresh, '-in:spam -in:trash', maxResults, pageToken);
};

// Helper function to fetch emails by labelIds (more efficient than search queries)
const getEmailsByLabelIds = async (
  labelIds: string[], 
  _forceRefresh = false, 
  maxResults = 100, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const requestParams: any = {
      userId: 'me',
      maxResults: maxResults,
      labelIds: labelIds
    };

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
        const payload = msg.result.payload;

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

        let toName = toHeader;
        let toEmail = toHeader;
        const toMatch = toHeader.match(/(.*)<(.*)>/);
        if (toMatch && toMatch.length === 3) {
          toName = toMatch[1].trim();
          toEmail = toMatch[2].trim();
        }

        let preview = msg.result.snippet || '';
        let body = preview;

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
          attachments: undefined,
          threadId: msg.result.threadId
        } as Email);

        await new Promise(resolve => setTimeout(resolve, 25));
      } catch (messageError) {
        console.warn(`Failed to fetch message ${message.id}:`, messageError);
      }
    }

    return {
      emails,
      nextPageToken: response.result.nextPageToken,
      resultSizeEstimate: response.result.resultSizeEstimate || emails.length
    };
  } catch (error) {
    console.error('Error fetching emails by labelIds:', error);
    return {
      emails: [],
      nextPageToken: undefined,
      resultSizeEstimate: 0
    };
  }
};

export const getLabelEmails = async (
  labelName: string, 
  forceRefresh = false, 
  maxResults = 10, 
  pageToken?: string
): Promise<PaginatedEmailServiceResponse> => {
  // Use the label name to construct a Gmail query
  const query = `label:"${labelName}"`;
  return await getEmails(forceRefresh, query, maxResults, pageToken);
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
    console.error('Error fetching email from Gmail:', error);
    // Return undefined when email not found
    return undefined;
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
    console.error(`Error fetching email for thread ID ${threadId}:`, error);
    // Return undefined when email not found
    return undefined;
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

/**
 * Save email as draft
 */
export const saveDraft = async (
  email: Omit<Email, 'id' | 'date' | 'isRead' | 'preview'>, 
  attachments?: Array<{ name: string; mimeType: string; data: string; cid?: string }>,
  draftId?: string, // For updating existing drafts
  ccRecipients?: string
): Promise<{success: boolean; draftId?: string}> => {
  try {
    // Try to save via Gmail
    const to = email.to.map(recipient => recipient.email).join(',');
    const cc = ccRecipients || "";
    
    const result = await saveGmailDraft(to, cc, email.subject, email.body, attachments, draftId);
    
    if (result.success) {
      // Invalidate the drafts cache to ensure the saved draft appears on next refresh
      if (emailCache.list && emailCache.list.query.includes('in:draft')) {
        emailCache.list.timestamp = 0;
      }
      return { 
        success: true,
        draftId: result.draftId 
      };
    }
    
    throw new Error('Failed to save draft via Gmail');
  } catch (error) {
    console.error('Error saving draft:', error);
    // For now, don't fall back to mock for drafts since we want real draft functionality
    throw error;
  }
};

/**
 * Delete a draft
 */
export const deleteDraft = async (draftId: string): Promise<void> => {
  try {
    await deleteGmailDraft(draftId);
    
    // Invalidate the drafts cache to ensure the deleted draft is removed immediately
    if (emailCache.list && emailCache.list.query.includes('in:draft')) {
      emailCache.list.timestamp = 0;
    }
    
    console.log(`Successfully deleted draft ${draftId}`);
  } catch (error) {
    console.error('Error deleting draft:', error);
    throw error;
  }
};

/**
 * Delete an email (move to trash)
 */
export const deleteEmail = async (emailId: string): Promise<void> => {
  try {
    await markGmailMessageAsTrash(emailId);
    
    // Clear all caches to ensure immediate removal from all views
    clearEmailCache();
    
    console.log(`Successfully moved email ${emailId} to trash and cleared caches`);
  } catch (error) {
    console.error('Error deleting email:', error);
    throw error;
  }
};

export const getAttachmentDownloadUrl = async (
  userEmail: string,
  messageId: string,
  attachmentId: string,
  filename: string,
  mimeType: string
): Promise<string> => {
  try {
    return await getGmailAttachmentDownloadUrl(userEmail, messageId, attachmentId, filename, mimeType);
  } catch (error) {
    console.error('Error getting attachment download URL:', error);
    throw error;
  }
};

export const sendReply = async (
  originalEmail: Email,
  replyContent: string,
  replyToAll: boolean = false
): Promise<{success: boolean; threadId?: string}> => {
  try {
    // Get current user's profile
    const userProfile = await getUserProfile();
    if (!userProfile) {
      console.error('Unable to get user profile for reply');
      return { success: false };
    }

    // Create reply subject with "Re: " prefix if it doesn't already have it
    const subject = originalEmail.subject.startsWith('Re: ') 
      ? originalEmail.subject 
      : `Re: ${originalEmail.subject}`;

    // Determine recipients
    const toRecipients = [originalEmail.from];
    let ccRecipients: string = '';
    
    if (replyToAll && originalEmail.to && originalEmail.to.length > 0) {
      // For reply all, add original TO recipients to CC (excluding the current user)
      const additionalCc = originalEmail.to
        .filter(recipient => recipient.email !== userProfile.email && recipient.email !== originalEmail.from.email)
        .map(recipient => recipient.email);
      
      if (additionalCc.length > 0) {
        ccRecipients = additionalCc.join(',');
      }
    }

    // Create the reply email object
    const replyEmail: Omit<Email, 'id' | 'date' | 'isRead' | 'preview'> = {
      from: {
        email: userProfile.email, // Use actual current user's email
        name: userProfile.name // Use actual current user's name
      },
      to: toRecipients,
      subject: subject,
      body: replyContent,
      threadId: originalEmail.threadId,
      isImportant: false,
      labelIds: [],
      attachments: [] // Replies typically don't include original attachments
      ,
      internalDate: undefined
    };

    // Send the reply using the existing sendEmail function
    return await sendEmail(replyEmail, undefined, originalEmail.threadId, ccRecipients);
    
  } catch (error) {
    console.error('Error sending reply:', error);
    return { success: false };
  }
};

export const sendReplyAll = async (
  originalEmail: Email,
  replyContent: string
): Promise<{success: boolean; threadId?: string}> => {
  return await sendReply(originalEmail, replyContent, true);
};

export const sendEmail = async (
  email: Omit<Email, 'id' | 'date' | 'isRead' | 'preview'>, 
  attachments?: Array<{ name: string; mimeType: string; data: string; cid?: string }>,
  conversationThreadId?: string,
  ccRecipients?: string
): Promise<{success: boolean; threadId?: string}> => {
  try {
    // Try to send via Gmail
    const to = email.to.map(recipient => recipient.email).join(',');
    // Use provided CC recipients or empty string
    const cc = ccRecipients || "";
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
    console.error('Error sending email:', error);
    return { success: false };
  }
};

export const markAsRead = async (id: string): Promise<{success: boolean}> => {
  try {
    // Capture pre-change state for optimistic adjustments
    let wasUnreadAndRecent = false;
    const cached = emailCache.details[id]?.email || emailCache.list?.emails.find(e => e.id === id);
    if (cached) {
      const dateMs = cached.date ? Date.parse(cached.date) : 0;
      const isRecent = dateMs > 0 && (Date.now() - dateMs) < 24 * 60 * 60 * 1000;
      wasUnreadAndRecent = !cached.isRead && isRecent && !!cached.labelIds?.includes('INBOX');
    }
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

    // Optimistic decrement if eligible
    if (wasUnreadAndRecent) {
      window.dispatchEvent(new CustomEvent('recent-counts-adjust', { detail: { inboxUnread24hDelta: -1 } }));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking email as read:', error);
    return { success: false };
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
    // Capture pre-change state for optimistic adjustments
    let willBeUnreadAndRecent = false;
    const cached = emailCache.details[id]?.email || emailCache.list?.emails.find(e => e.id === id);
    if (cached) {
      const dateMs = cached.date ? Date.parse(cached.date) : 0;
      const isRecent = dateMs > 0 && (Date.now() - dateMs) < 24 * 60 * 60 * 1000;
      // If currently read and will become unread
      willBeUnreadAndRecent = cached.isRead && isRecent && !!cached.labelIds?.includes('INBOX');
    }
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

    if (willBeUnreadAndRecent) {
      window.dispatchEvent(new CustomEvent('recent-counts-adjust', { detail: { inboxUnread24hDelta: 1 } }));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking email as unread:', error);
    return { success: false };
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
    // Apply Gmail IMPORTANT label
    await markGmailMessageAsImportant(id);
    
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
    console.error('Error marking email as important:', error);
    return { success: false };
  }
};

/**
 * Mark an email as unimportant (unstarred)
 */
export const markAsUnimportant = async (id: string): Promise<{success: boolean}> => {
  try {
    // Remove Gmail IMPORTANT label
    await markGmailMessageAsUnimportant(id);
    
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
    console.error('Error marking email as unimportant:', error);
    return { success: false };
  }
};

/**
 * Star / Unstar (STARRED label)
 */
export const markAsStarred = async (id: string): Promise<{success: boolean}> => {
  try {
    await markGmailMessageAsStarred(id);
    if (emailCache.details[id]) {
      emailCache.details[id].email.isStarred = true;
    }
    if (emailCache.list) {
      const email = emailCache.list.emails.find(e => e.id === id);
      if (email) email.isStarred = true;
    }
    return { success: true };
  } catch (error) {
    console.error('Error starring email:', error);
    return { success: false };
  }
};

export const markAsUnstarred = async (id: string): Promise<{success: boolean}> => {
  try {
    await markGmailMessageAsUnstarred(id);
    if (emailCache.details[id]) {
      emailCache.details[id].email.isStarred = false;
    }
    if (emailCache.list) {
      const email = emailCache.list.emails.find(e => e.id === id);
      if (email) email.isStarred = false;
    }
    return { success: true };
  } catch (error) {
    console.error('Error unstarring email:', error);
    return { success: false };
  }
};

/**
 * Empty trash - permanently delete all messages in trash
 */
export const emptyTrash = async (): Promise<void> => {
  try {
    console.log('🗑️ Emptying trash...');
    
    await emptyGmailTrash();
    
    // Clear relevant caches - specifically the inbox/all emails cache since trash affects overall counts
    emailCache.list = undefined;
    
    // Clear all local storage caches that might contain trash emails
    clearEmailCache();
    
    console.log('✅ Trash emptied successfully and caches cleared');
  } catch (error) {
    console.error('❌ Error emptying trash:', error);
    throw error;
  }
};

// Helper function to get category emails for different folder contexts
export interface CategoryFilterOptions {
  unread?: boolean;
  starred?: boolean;
  attachments?: boolean;
  from?: string;
  dateRange?: { start?: string; end?: string };
  searchText?: string;
}

export const getCategoryEmailsForFolder = async (
  category: 'primary' | 'updates' | 'promotions' | 'social',
  folderType: 'all' | 'archive' | 'spam' | 'trash' = 'all',
  forceRefresh = false,
  maxResults = 10,
  pageToken?: string,
  filters?: CategoryFilterOptions
): Promise<PaginatedEmailServiceResponse> => {
  let queryParts: string[] = [];

  // Base query for folder and category
  switch (folderType) {
    case 'all':
      queryParts.push(`in:inbox category:${category}`);
      break;
    case 'archive':
      queryParts.push(`-in:inbox -in:spam -in:trash category:${category}`);
      break;
    case 'spam':
      queryParts.push(`in:spam category:${category}`);
      break;
    case 'trash':
      queryParts.push(`in:trash category:${category}`);
      break;
  }

  // Add special chips/filters
  if (filters) {
    if (filters.unread) queryParts.push('is:unread');
    if (filters.starred) queryParts.push('is:starred');
    if (filters.attachments) queryParts.push('has:attachment');
    if (filters.from) queryParts.push(`from:${filters.from}`);
    if (filters.searchText) queryParts.push(filters.searchText);
  }

  const query = queryParts.join(' ');
  return getEmails(forceRefresh, query, maxResults, pageToken);
};
