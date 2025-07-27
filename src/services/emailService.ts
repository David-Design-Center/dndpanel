import { Email } from '../types';
import { supabase } from '../lib/supabase';
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
  getGmailUserProfile,
  saveGmailDraft,
  deleteGmailDraft
} from '../integrations/gapiService';
import { queueGmailRequest } from '../utils/requestQueue';
import { authCoordinator } from '../utils/authCoordinator';

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
  // Ensure authentication before proceeding
  try {
    const isAuthenticated = await authCoordinator.ensureAuthenticated();
    if (!isAuthenticated) {
      console.warn('⚠️ Gmail not authenticated, returning empty results');
      return {
        emails: [],
        nextPageToken: undefined,
        resultSizeEstimate: 0
      };
    }
  } catch (authError) {
    console.error('❌ Authentication check failed:', authError);
    return {
      emails: [],
      nextPageToken: undefined,
      resultSizeEstimate: 0
    };
  }

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
      
      // Check for auto-reply on new unread emails (only for inbox queries)
      if (query.includes('in:inbox') && !pageToken) {
        const unreadEmails = gmailResponse.emails.filter(email => !email.isRead);
        
        console.log(`Processing ${unreadEmails.length} unread emails for auto-reply`);
        
        for (const email of unreadEmails) {
          try {
            await checkAndSendAutoReply(email);
          } catch (error) {
            console.error('Auto-reply check failed for email:', email.id, error);
          }
        }
      }
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
  draftId?: string // For updating existing drafts
): Promise<{success: boolean; draftId?: string}> => {
  try {
    // Try to save via Gmail
    const to = email.to.map(recipient => recipient.email).join(',');
    const cc = "";
    
    const result = await saveGmailDraft(to, cc, email.subject, email.body, attachments, draftId);
    
    if (result.success) {
      // Invalidate the drafts cache to ensure the saved draft appears on next refresh
      if (emailCache.list && emailCache.list.query.includes('in:drafts')) {
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
    if (emailCache.list && emailCache.list.query.includes('in:drafts')) {
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
    console.error('Error sending email:', error);
    return { success: false };
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
    console.error('Error marking email as important:', error);
    return { success: false };
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
    console.error('Error marking email as unimportant:', error);
    return { success: false };
  }
};