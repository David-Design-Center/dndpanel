import { Email, GmailLabel } from '../types';

// Import Phase 4 modules (delegated functionality)
import {
  fetchGmailMessages as gmailFetchMessages,
  fetchGmailMessageById as gmailFetchMessageById,
  fetchLatestMessageInThread as gmailFetchLatestMessageInThread,
  fetchThreadMessages as gmailFetchThreadMessages,
} from './gmail/fetch/messages';

import {
  getAttachmentDownloadUrl as gmailGetAttachmentDownloadUrl,
} from './gmail/operations/attachments';

import {
  fetchGmailLabels as gmailFetchLabels,
  fetchGmailMessagesByLabel as gmailFetchMessagesByLabel,
  createGmailLabel as gmailCreateLabel,
  updateGmailLabel as gmailUpdateLabel,
  deleteGmailLabel as gmailDeleteLabel,
  applyGmailLabels as gmailApplyLabels,
} from './gmail/operations/labels';

// Import mutations
import {
  markGmailMessageAsTrash as gmailMarkAsTrash,
  markGmailMessageAsRead as gmailMarkAsRead,
  markGmailMessageAsUnread as gmailMarkAsUnread,
  markGmailMessageAsStarred as gmailMarkAsStarred,
  markGmailMessageAsUnstarred as gmailMarkAsUnstarred,
  markGmailMessageAsImportant as gmailMarkAsImportant,
  markGmailMessageAsUnimportant as gmailMarkAsUnimportant,
} from './gmail/operations/mutations';

// Import filters
import {
  listGmailFilters as gmailListFilters,
  getGmailFilter as gmailGetFilter,
  createGmailFilter as gmailCreateFilter,
  deleteGmailFilter as gmailDeleteFilter,
} from './gmail/operations/filters';

// Import contacts & profile
import {
  getGmailUserProfile as gmailGetUserProfile,
  testPeopleAPI as gmailTestPeopleAPI,
  fetchPeopleConnections as gmailFetchPeopleConnections,
  fetchOtherContacts as gmailFetchOtherContacts,
} from './gmail/contacts/profile';

// Import trash utilities
import {
  emptyGmailTrash as gmailEmptyTrash,
} from './gmail/misc/trash';

// Import Phase 5 modules (send/compose)
import {
  sendGmailMessage as gmailSendMessage,
  saveGmailDraft as gmailSaveDraft,
} from './gmail/send/compose';

// Type definitions for GIS (Google Identity Services)
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient: (config: any) => any;
          initTokenClient: (config: any) => any;
          revoke: (accessToken: string, callback?: () => void) => void;
        };
      };
    };
    gapi: {
      load: (libraries: string, callback: () => void) => void;
      client: {
        people: any;
        init: (config: any) => Promise<void>;
        gmail: {
          users: {
            messages: {
              attachments: any;
              list: (params: any) => Promise<any>;
              get: (params: any) => Promise<any>;
              send: (params: any) => Promise<any>;
              modify: (params: any) => Promise<any>;
            };
            drafts: {
              list: (params: any) => Promise<any>;
              get: (params: any) => Promise<any>;
              create: (params: any) => Promise<any>;
              update: (params: any) => Promise<any>;
              delete: (params: any) => Promise<any>;
              send: (params: any) => Promise<any>;
            };
            labels: {
              list: (params: any) => Promise<any>;
              get: (params: any) => Promise<any>;
              create: (params: any) => Promise<any>;
              update: (params: any) => Promise<any>;
              delete: (params: any) => Promise<any>;
            };
            settings: {
              getVacation: (params: any) => Promise<any>;
              updateVacation: (params: any) => Promise<any>;
            };
            attachments: {
              get: (params: any) => Promise<any>;
            };
            threads: {
              get: (params: any) => Promise<any>;
            };
          };
        };
        setToken: (token: { access_token?: string } | {}) => void;
        request: (params: any) => Promise<any>;
      };
    };
  }
}

// Define interface for paginated email response
export interface PaginatedEmailResponse {
  emails: Email[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

// Configuration options
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/gmail.settings.basic https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly https://www.googleapis.com/auth/user.emails.read';
const API_KEY = import.meta.env.VITE_GAPI_API_KEY || '';
const CLIENT_ID = import.meta.env.VITE_GAPI_CLIENT_ID || '';
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
  'https://www.googleapis.com/discovery/v1/apis/people/v1/rest'
];

// Global variables for GIS
let codeClient: any = null;
let tokenClient: any = null;
let currentAccessToken: string | null = null;
let tokenExpiryTime: number = 0;
let isInitialized = false;
let tokenRefreshInterval: NodeJS.Timeout | null = null;

// ============================================================================
// PHASE 5: DELEGATED WRAPPER FUNCTIONS
// These functions delegate to the modular gmail service implementations
// ============================================================================

/**
 * Send email via Gmail
 * ⚠️ DELEGATED TO: src/integrations/gmail/send/compose.ts
 */
export const sendGmailMessage = async (
  to: string,
  cc: string,
  subject: string,
  body: string,
  attachments?: Array<{ name: string; mimeType: string; data: string; cid?: string }>,
  conversationThreadId?: string
): Promise<{ success: boolean; threadId?: string }> => {
  return gmailSendMessage(to, cc, subject, body, attachments, conversationThreadId);
};

/**
 * Save email as draft in Gmail
 * ⚠️ DELEGATED TO: src/integrations/gmail/send/compose.ts
 */
export const saveGmailDraft = async (
  to: string,
  cc: string,
  subject: string,
  body: string,
  attachments?: Array<{ name: string; mimeType: string; data: string; cid?: string }>,
  draftId?: string
): Promise<{ success: boolean; draftId?: string }> => {
  return gmailSaveDraft(to, cc, subject, body, attachments, draftId);
};

// ============================================================================
// INITIALIZATION & AUTHENTICATION
// ============================================================================

/**
 * Initialize the gapi client and GIS clients
 */
export const initGapiClient = async (): Promise<void> => {
  if (isInitialized) {
    console.log('GAPI already initialized');
    return;
  }

  return new Promise((resolve, reject) => {
    if (!API_KEY || !CLIENT_ID) {
      reject(new Error('GAPI credentials not found. Please set VITE_GAPI_API_KEY and VITE_GAPI_CLIENT_ID in your .env file.'));
      return;
    }

    // Check if Google APIs are available
    if (!window.gapi || !window.google) {
      reject(new Error('Google APIs not loaded. Please ensure the Google API scripts are loaded.'));
      return;
    }

    // Load both gapi and GIS
    window.gapi.load('client', async () => {
      try {
        // Initialize gapi client for Gmail API calls
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });

        // Initialize GIS code client for authorization code flow (better for refresh tokens)
        codeClient = window.google.accounts.oauth2.initCodeClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          ux_mode: 'popup',
          redirect_uri: window.location.origin,
          access_type: 'offline',
          prompt: 'consent', // Force consent screen to ensure refresh token
          include_granted_scopes: true,
          callback: (response: any) => {
            if (response.error) {
              console.error('Code client error:', response.error);
              return;
            }
            console.log('Authorization code received:', response.code);
          },
        });

        // Initialize GIS token client for direct token access (fallback)
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error) {
              console.error('Token client error:', response.error);
              return;
            }
            
            currentAccessToken = response.access_token;
            tokenExpiryTime = Date.now() + (response.expires_in * 1000);
            
            // Set the token for gapi client
            window.gapi.client.setToken({
              access_token: response.access_token
            });
            
            console.log('Successfully received access token via GIS');
          },
        });

        isInitialized = true;
        console.log('GAPI client and GIS clients initialized successfully');
        resolve();
      } catch (error) {
        console.error('Error initializing GAPI client:', error);
        reject(error);
      }
    });
  });
};

/**
 * Check if user is signed into Gmail
 */
export const isGmailSignedIn = (): boolean => {
  try {
    const hasValidToken = !!(currentAccessToken && Date.now() < tokenExpiryTime - 5 * 60 * 1000); // 5-minute buffer
    
    // If token expires in 10 minutes or less, refresh it in background
    if (currentAccessToken && Date.now() > tokenExpiryTime - 10 * 60 * 1000) {
      refreshTokenInBackground();
    }
    
    return hasValidToken;
  } catch (error) {
    console.error('Error checking Gmail sign-in status:', error);
    return false;
  }
};

let refreshPromise: Promise<void> | null = null;

/**
 * Refresh the token in background without interrupting user
 */
const refreshTokenInBackground = async (): Promise<void> => {
  // Prevent multiple simultaneous refreshes
  if (refreshPromise) return refreshPromise;
  
  refreshPromise = (async () => {
    try {
      console.log('🔄 Refreshing Gmail token in background...');
      
      // Import your token refresh function
      const { fetchGmailAccessToken } = await import('../lib/gmail');
      
      // Get current user email (you'll need to adapt this based on how you store it)
      const userEmail = getCurrentUserEmail(); // You'll need to implement this helper
      
      if (!userEmail) {
        console.warn('No user email available for token refresh');
        return;
      }
      
      // Get fresh token
      const newToken = await fetchGmailAccessToken(userEmail);
      
      // Update the current token and expiry
      currentAccessToken = newToken;
      tokenExpiryTime = Date.now() + (55 * 60 * 1000); // 55 minutes from now
      
      // Update gapi with new token
      if (window.gapi?.client) {
        window.gapi.client.setToken({ access_token: newToken });
      }
      
      console.log('✅ Gmail token refreshed successfully in background for:', userEmail);
      
    } catch (error) {
      console.error('❌ Background token refresh failed:', error);
    } finally {
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
};

/**
 * Get current user email from various sources
 */
const getCurrentUserEmail = (): string | null => {
  // Method 1: Try to get from window._currentProfileEmail (set by ProfileContext)
  if ((window as any)._currentProfileEmail) {
    return (window as any)._currentProfileEmail;
  }
  
  // Method 2: Try localStorage backup
  const storedEmail = localStorage.getItem('currentProfileUserEmail');
  if (storedEmail) {
    return storedEmail;
  }
  
  // Method 3: Check if we can extract from any existing auth token context
  // This is a fallback that shouldn't normally be needed
  console.warn('No current user email found - token refresh may fail');
  return null;
};

/**
 * Start automatic token refresh scheduler
 * Refreshes token every 25 minutes to prevent expiration (tokens expire after 30-60 min)
 * Best practice: Refresh well before expiration to ensure continuous service
 */
export const startTokenRefreshScheduler = (): void => {
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }
  
  // Refresh every 25 minutes (1,500,000 ms)
  // This is 5 minutes before typical 30-minute expiration
  const REFRESH_INTERVAL = 25 * 60 * 1000;
  
  console.log('🔄 Starting automatic token refresh scheduler (every 25 minutes)');
  
  tokenRefreshInterval = setInterval(async () => {
    const userEmail = getCurrentUserEmail();
    
    if (!userEmail) {
      console.warn('⚠️ Cannot refresh token: No user email found');
      return;
    }
    
    console.log('⏰ Scheduled token refresh triggered for:', userEmail);
    await refreshTokenInBackground();
  }, REFRESH_INTERVAL);
  
  // Also do an immediate check if token is close to expiring
  const timeUntilExpiry = tokenExpiryTime - Date.now();
  if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) {
    console.log('⚠️ Token expires soon, refreshing immediately');
    refreshTokenInBackground();
  }
};

/**
 * Stop automatic token refresh scheduler
 */
export const stopTokenRefreshScheduler = (): void => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
    console.log('🛑 Token refresh scheduler stopped');
  }
};

/**
 * Sign in to Gmail using Authorization Code Flow for refresh tokens
 */
export const signInToGmail = async (): Promise<{ access_token: string; expires_in: number; expires_at: number; code?: string }> => {
  if (!isInitialized) {
    await initGapiClient();
  }

  return new Promise((resolve, reject) => {
    if (!codeClient && !tokenClient) {
      reject(new Error('Neither code client nor token client initialized'));
      return;
    }

    // Try Authorization Code Flow first (better for refresh tokens)
    if (codeClient) {
      // Store the original callback
      const originalCallback = codeClient.callback;
      
      // Set a new callback for this specific sign-in
      codeClient.callback = (response: any) => {
        // Restore the original callback
        codeClient.callback = originalCallback;
        
        if (response.error) {
          console.error('Gmail authorization code error:', response.error);
          // Fallback to token client
          tryTokenClient();
          return;
        }
        
        console.log('Gmail authorization code received, will exchange for tokens via backend');
        
        // Return the authorization code - it will be exchanged for tokens by the backend
        resolve({
          access_token: '', // Will be filled by backend
          expires_in: 3600, // Default
          expires_at: Date.now() + 3600000, // Default
          code: response.code
        });
      };

      // Request authorization code
      try {
        codeClient.requestCode();
        return;
      } catch (error) {
        console.error('Error requesting authorization code:', error);
        // Fallback to token client
        tryTokenClient();
      }
    } else {
      // No code client, use token client directly
      tryTokenClient();
    }

    function tryTokenClient() {
      if (!tokenClient) {
        reject(new Error('No authentication client available'));
        return;
      }

      // Store the original callback
      const originalCallback = tokenClient.callback;
      
      // Set a new callback for this specific sign-in
      tokenClient.callback = (response: any) => {
        // Restore the original callback
        tokenClient.callback = originalCallback;
        
        if (response.error) {
          console.error('Gmail token error:', response.error);
          reject(new Error(response.error));
          return;
        }
        
        // Call the original callback to set internal state
        if (originalCallback) {
          originalCallback(response);
        }
        
        console.log('Gmail sign-in successful via token client');
        
        // Start automatic token refresh scheduler
        startTokenRefreshScheduler();
        
        // Resolve with the tokens
        resolve({
          access_token: response.access_token,
          expires_in: response.expires_in,
          expires_at: Date.now() + (response.expires_in * 1000)
        });
      };

      // Request access token
      tokenClient.requestAccessToken({ 
        prompt: 'consent',
        include_granted_scopes: true,
        access_type: 'offline'
      });
    }
  });
};

/**
 * Sign in to Gmail using OAuth popup (for external users)
 * This triggers the account selection screen
 */
export const signInToGmailWithOAuth = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Token client not initialized. Call initGapiClient() first.'));
      return;
    }

    // Update token client callback for this specific request
    tokenClient.callback = (response: any) => {
      if (response.error) {
        console.error('OAuth sign-in error:', response.error);
        reject(new Error(response.error));
        return;
      }
      
      currentAccessToken = response.access_token;
      tokenExpiryTime = Date.now() + (response.expires_in * 1000);
      
      // Set the token for gapi client
      if (window.gapi?.client) {
        window.gapi.client.setToken({
          access_token: response.access_token
        });
      }
      
      // Start automatic token refresh scheduler
      startTokenRefreshScheduler();
      
      console.log('OAuth Gmail sign-in successful');
      resolve();
    };

    // Trigger the OAuth flow
    tokenClient.requestAccessToken({
      prompt: 'select_account' // Force account selection
    });
  });
};
export const signOutFromGmail = async (): Promise<void> => {
  try {
    // Stop token refresh scheduler
    stopTokenRefreshScheduler();
    
    if (currentAccessToken) {
      window.google.accounts.oauth2.revoke(currentAccessToken, () => {
        console.log('Gmail access token revoked');
      });
    }
    
    currentAccessToken = null;
    tokenExpiryTime = 0;
    
    // Clear the token from gapi client
    if (window.gapi?.client) {
      window.gapi.client.setToken({});
    }
    
    // Clear Google account session by redirecting to Google logout
    // This will force account selection on next login
    const googleLogoutUrl = 'https://accounts.google.com/logout';
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = googleLogoutUrl;
    document.body.appendChild(iframe);
    
    // Remove iframe after a short delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
    
    console.log('Gmail sign-out completed');
  } catch (error) {
    console.error('Error signing out from Gmail:', error);
    throw error;
  }
};

/**
 * Clear the current access token and force re-authentication
 */
export const clearCurrentAccessToken = (): void => {
  console.log('🔑 Clearing current access token from gapiService');
  currentAccessToken = null;
  tokenExpiryTime = 0;
  
  // Clear the token from gapi client
  if (window.gapi?.client) {
    window.gapi.client.setToken({});
  }
};

/**
 * Set access token manually (for use with refresh token from backend)
 */
export const setAccessToken = (accessToken: string, expiresIn: number): void => {
  currentAccessToken = accessToken;
  tokenExpiryTime = Date.now() + (expiresIn * 1000);
  
  if (window.gapi?.client) {
    // Clear existing token to ensure clean state before setting new one
    window.gapi.client.setToken({});
    
    // Set the new access token
    window.gapi.client.setToken({
      access_token: accessToken
    });
    console.log('Access token set manually');
  }
};

/**
 * Get the current Gmail access token
 * @returns The current access token or null if not available or expired
 */
export const getCurrentAccessToken = (): string | null => {
  // Check if token is still valid (with 5-minute buffer)
  if (currentAccessToken && Date.now() < tokenExpiryTime - 5 * 60 * 1000) {
    return currentAccessToken;
  }
  return null;
};

/**
 * Fetch messages from Gmail with pagination support
 */
export const fetchGmailMessages = async (
  query: string = 'in:inbox',
  maxResults: number = 10,
  pageToken?: string
): Promise<PaginatedEmailResponse> => {
  return gmailFetchMessages(query, maxResults, pageToken);
};

/**
 * Fetch a single message from Gmail by ID
 * ⚠️ DELEGATED TO: src/integrations/gmail/fetch/messages.ts
 */
export const fetchGmailMessageById = async (id: string): Promise<Email | undefined> => {
  return gmailFetchMessageById(id);
};

/**
 * Fetch the latest message in a thread
 * ⚠️ DELEGATED TO: src/integrations/gmail/fetch/messages.ts
 */
export const fetchLatestMessageInThread = async (threadId: string): Promise<Email | undefined> => {
  return gmailFetchLatestMessageInThread(threadId);
};

/**
 * Fetch all messages in a thread
 * ⚠️ DELEGATED TO: src/integrations/gmail/fetch/messages.ts
 */
export const fetchThreadMessages = async (threadId: string): Promise<Email[]> => {
  return gmailFetchThreadMessages(threadId);
};

/**
 * Get attachment download URL
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/attachments.ts
 */
export const getAttachmentDownloadUrl = async (
  messageId: string,
  attachmentId: string,
  _filename: string,
  mimeType: string
): Promise<string> => {
  return gmailGetAttachmentDownloadUrl(messageId, attachmentId, _filename, mimeType);
};

// Interface for Gmail message parts (payload and its sub-parts)
interface EmailPart {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string; // Base64url encoded
  };
  parts?: EmailPart[];
}

/**
 * Interface for inline image information
 */
interface InlineImage {
  contentId: string;
  attachmentId: string;
  mimeType: string;
  filename?: string;
}

/**
 * Detect inline images in Gmail message payload - enhanced for Gmail Compose compatibility
 */
const detectInlineImages = (payload: EmailPart): InlineImage[] => {
  const inlineImages: InlineImage[] = [];

  const searchPartsRecursively = (part: EmailPart): void => {
    // Check if this part is an inline image
    if (part.body?.attachmentId && part.mimeType && part.mimeType.startsWith('image/')) {
      // Look for Content-ID header
      const contentIdHeader = part.headers?.find(h => 
        h.name.toLowerCase() === 'content-id'
      );
      
      // Also check for X-Attachment-Id (Gmail specific)
      const attachmentIdHeader = part.headers?.find(h => 
        h.name.toLowerCase() === 'x-attachment-id'
      );
      
      let contentId = '';
      if (contentIdHeader) {
        // Extract content ID, removing angle brackets if present
        contentId = contentIdHeader.value.replace(/[<>]/g, '');
      } else if (attachmentIdHeader) {
        // Use X-Attachment-Id as fallback
        contentId = attachmentIdHeader.value.replace(/[<>]/g, '');
      }

      // Check Content-Disposition for inline images
      const dispositionHeader = part.headers?.find(h => 
        h.name.toLowerCase() === 'content-disposition'
      );
      
      const isInline = dispositionHeader?.value.toLowerCase().includes('inline') || 
                       contentId.length > 0;

      // Include image if it has a Content-ID or is marked as inline
      if (isInline && part.body.attachmentId) {
        console.log(`🖼️ detectInlineImages: Found inline image - CID: ${contentId}, filename: ${part.filename}, mimeType: ${part.mimeType}`);
        inlineImages.push({
          contentId: contentId,
          attachmentId: part.body.attachmentId,
          mimeType: part.mimeType,
          filename: part.filename
        });
      }
    }

    // Recursively search sub-parts
    if (part.parts) {
      part.parts.forEach(searchPartsRecursively);
    }
  };

  searchPartsRecursively(payload);
  console.log(`🖼️ detectInlineImages: Total inline images found: ${inlineImages.length}`);
  return inlineImages;
};

/**
 * Fetch inline image data and convert to data URI
 */
const fetchInlineImageAsDataUri = async (
  messageId: string,
  attachmentId: string,
  mimeType: string
): Promise<string> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const response = await window.gapi.client.gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });

    if (!response.result || !response.result.data) {
      throw new Error('No attachment data returned from API');
    }

    // Convert base64url to base64
    let base64Data = response.result.data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64Data.length % 4 !== 0) {
      base64Data += '=';
    }

    // Return as data URI
    return `data:${mimeType};base64,${base64Data}`;
  } catch (error) {
    console.error(`Error fetching inline image ${attachmentId}:`, error);
    // Return a placeholder or empty data URI on error
    return `data:${mimeType};base64,`;
  }
};

/**
 * Process inline images in email HTML and replace CID references with data URIs - enhanced version
 */
export const processInlineImages = async (
  messageId: string,
  htmlContent: string,
  payload: EmailPart
): Promise<string> => {
  try {
    console.log(`🖼️ processInlineImages: Starting for message ${messageId}`);
    console.log(`📝 Original HTML length: ${htmlContent.length}`);
    console.log(` HTML contains img tags: ${htmlContent.includes('<img')}`);
    console.log(` HTML contains data: URLs: ${htmlContent.includes('data:')}`);
    console.log(` HTML contains cid: references: ${htmlContent.includes('cid:')}`);
    
    // If HTML already contains data URLs, it's likely already processed
    if (htmlContent.includes('data:image/') && !htmlContent.includes('cid:')) {
      console.log(`🖼️ processInlineImages: HTML already contains data URLs, skipping processing`);
      return htmlContent;
    }
    
    // Detect inline images in the message payload
    const inlineImages = detectInlineImages(payload);
    console.log(`🖼️ processInlineImages: Detected ${inlineImages.length} inline images`);
    
    if (inlineImages.length === 0) {
      console.log(`🖼️ processInlineImages: No inline images found, checking for data URLs already in HTML`);
      
      // If no CID images but HTML contains img tags, log for debugging
      if (htmlContent.includes('<img')) {
        console.log(`🖼️ processInlineImages: HTML already contains img tags, likely data URLs`);
        // Log first few img tags for debugging
        const imgMatches = htmlContent.match(/<img[^>]*>/gi);
        if (imgMatches) {
          imgMatches.slice(0, 3).forEach((match, index) => {
            console.log(`🖼️ processInlineImages: Image ${index + 1}:`, match.substring(0, 200));
          });
        }
      }
      
      return htmlContent;
    }
    
    console.log(`Processing ${inlineImages.length} inline images for message ${messageId}`);

    // Fetch all inline images in parallel
    const imagePromises = inlineImages.map(async (img) => {
      console.log(`🖼️ processInlineImages: Fetching image with CID: ${img.contentId}`);
      const dataUri = await fetchInlineImageAsDataUri(messageId, img.attachmentId, img.mimeType);
      console.log(`🖼️ processInlineImages: Got data URI for ${img.contentId}: ${dataUri.substring(0, 50)}...`);
      return {
        contentId: img.contentId,
        dataUri: dataUri,
        filename: img.filename
      };
    });

    const processedImages = await Promise.all(imagePromises);

    // Replace CID references in HTML with data URIs - enhanced replacement logic
    let processedHtml = htmlContent;

    for (const img of processedImages) {
      if (img.contentId && img.dataUri) {
        console.log(`🖼️ processInlineImages: Replacing CID for ${img.contentId}`);
        
        // Multiple replacement patterns to handle different CID formats
        const patterns = [
          // Standard cid: reference with quotes
          new RegExp(`src=["\']cid:${img.contentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["\']`, 'gi'),
          // CID reference without quotes
          new RegExp(`src=cid:${img.contentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
          // CID with angle brackets (sometimes present)
          new RegExp(`src=["\']cid:<${img.contentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>["\']`, 'gi'),
          // Gmail specific patterns
          new RegExp(`src=["\']cid:${img.contentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@[^"']*["\']`, 'gi'),
        ];
        
        let replacementMade = false;
        for (const pattern of patterns) {
          const beforeReplace = processedHtml.length;
          processedHtml = processedHtml.replace(pattern, `src="${img.dataUri}"`);
          const afterReplace = processedHtml.length;
          
          if (beforeReplace !== afterReplace) {
            console.log(`🖼️ processInlineImages: Pattern match! HTML length change for ${img.contentId}: ${beforeReplace} -> ${afterReplace}`);
            replacementMade = true;
            break;
          }
        }
        
        if (!replacementMade) {
          console.warn(` processInlineImages: No replacement made for CID ${img.contentId}. Checking if img tag exists...`);
          // Look for any img tag that might reference this image by filename
          if (img.filename) {
            const filenamePattern = new RegExp(`<img[^>]*alt=["\'][^"']*${img.filename}[^"']*["\'][^>]*>`, 'gi');
            const filenameMatch = htmlContent.match(filenamePattern);
            if (filenameMatch) {
              console.log(`🖼️ processInlineImages: Found img tag by filename:`, filenameMatch[0]);
            }
          }
        }
      }
    }
    
    console.log(`🖼️ processInlineImages: Final HTML length: ${processedHtml.length}`);
    console.log(`🖼️ processInlineImages: Final HTML contains data: URLs: ${processedHtml.includes('data:')}`);
    console.log(`Processed inline images for message ${messageId}: ${processedImages.length} images replaced`);
    return processedHtml;
  } catch (error) {
    console.error(` processInlineImages: Error processing inline images for message ${messageId}:`, error);
    // Return original content on error
    return htmlContent;
  }
};

/**
 * Extract inline images from HTML and convert them to CID attachments
 */
const extractInlineImages = (html: string): { 
  html: string, 
  inlineImages: Array<{ name: string; mimeType: string; data: string; cid: string }> 
} => {
  const inlineImages: Array<{ name: string; mimeType: string; data: string; cid: string }> = [];
  
  // Find all img tags with data: URLs
  const imgRegex = /<img[^>]*src="data:([^;]+);base64,([^"]+)"[^>]*>/gi;
  let match;
  let imageCounter = 1;
  let processedHtml = html;
  
  while ((match = imgRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const mimeType = match[1];
    const base64Data = match[2];
    
    // Generate unique CID
    const cid = `inline-image-${imageCounter}-${Date.now()}@gmail.com`;
    
    // Extract other attributes from the img tag
    const altMatch = fullMatch.match(/alt="([^"]*)"/i);
    const alt = altMatch ? altMatch[1] : '';
    const filename = alt || `inline-image-${imageCounter}`;
    
    // Determine file extension from MIME type
    const extension = mimeType.split('/')[1] || 'png';
    const name = `${filename}.${extension}`;
    
    // Replace data URL with CID reference
    const cidImg = fullMatch.replace(/src="data:[^"]+"/i, `src="cid:${cid}"`);
    processedHtml = processedHtml.replace(fullMatch, cidImg);
    
    // Add to inline images array
    inlineImages.push({
      name,
      mimeType,
      data: base64Data,
      cid
    });
    
    imageCounter++;
  }
  
  console.log(`🖼️ extractInlineImages: Found ${inlineImages.length} inline images`);
  inlineImages.forEach((img, index) => {
    console.log(`🖼️ Image ${index + 1}: ${img.name} (${img.mimeType}) -> CID: ${img.cid}`);
  });
  
  return { html: processedHtml, inlineImages };
};

/**
 * Send email via Gmail - with perfect inline image handling matching Gmail Compose
 */
export const _legacy_sendGmailMessage = async (
  to: string,
  cc: string,
  subject: string,
  body: string,
  attachments?: Array<{ name: string; mimeType: string; data: string; cid?: string }>,
  conversationThreadId?: string
): Promise<{ success: boolean; threadId?: string }> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`📧 sendGmailMessage: Sending email to ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 Body length: ${body.length}`);
    console.log(`📧 Attachments: ${attachments?.length || 0}`);
    console.log(`📧 Thread ID: ${conversationThreadId || 'none'}`);

    // Extract inline images from HTML (for Compose-style data: URLs)
    const { html: processedHtml, inlineImages: extractedImages } = extractInlineImages(body);
    console.log(`📧 Processed HTML length: ${processedHtml.length}`);
    console.log(`📧 Inline images found: ${extractedImages.length}`);

    // Separate inline and regular attachments from the passed attachments
    const inlineAttachments: Array<{ name: string; mimeType: string; data: string; cid: string }> = [];
    const regularAttachments: Array<{ name: string; mimeType: string; data: string }> = [];
    
    if (attachments) {
      for (const attachment of attachments) {
        if (attachment.cid) {
          // This is an inline attachment (from price requests)
          inlineAttachments.push({
            name: attachment.name,
            mimeType: attachment.mimeType,
            data: attachment.data,
            cid: attachment.cid
          });
        } else {
          // This is a regular attachment
          regularAttachments.push({
            name: attachment.name,
            mimeType: attachment.mimeType,
            data: attachment.data
          });
        }
      }
    }

    // Combine extracted inline images (from Compose) with passed inline attachments (from price requests)
    const allInlineImages = [...extractedImages, ...inlineAttachments];
    console.log(`📧 Total inline images: ${allInlineImages.length} (${extractedImages.length} extracted + ${inlineAttachments.length} passed)`);
    console.log(`📧 Regular attachments: ${regularAttachments.length}`);

    // Generate boundaries using Gmail-style format
    const mainBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const relatedBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const alternativeBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    
    let emailContent: string[];
    
    // Determine message structure based on content
    const hasRegularAttachments = regularAttachments && regularAttachments.length > 0;
    const hasInlineImages = allInlineImages.length > 0;
    
    if (hasInlineImages && hasRegularAttachments) {
      // Complex structure: multipart/mixed > multipart/related > multipart/alternative > text/html + inline images
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/mixed; boundary="${mainBoundary}"`
      ].filter(Boolean);
      
      // Start multipart/related section for HTML + inline images
      emailContent.push('');
      emailContent.push(`--${mainBoundary}`);
      emailContent.push(`Content-Type: multipart/related; boundary="${relatedBoundary}"`);
      
      // Start multipart/alternative section
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      // Plain text version (for better compatibility)
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      // HTML content
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      // End alternative boundary
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      // Add inline images to the related section
      for (const image of allInlineImages) {
        emailContent.push('');
        emailContent.push(`--${relatedBoundary}`);
        emailContent.push(`Content-Type: ${image.mimeType}; name="${image.name}"`);
        emailContent.push(`Content-Disposition: inline; filename="${image.name}"`);
        emailContent.push(`Content-ID: <${image.cid}>`);
        emailContent.push(`Content-Transfer-Encoding: base64`);
        emailContent.push(`X-Attachment-Id: ${image.cid}`);
        emailContent.push('');
        
        // Split base64 data into lines of 76 characters (RFC 2045)
        const base64Lines = image.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      // End related boundary
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}--`);
      
      // Add regular attachments to the mixed section
      for (const attachment of regularAttachments) {
        emailContent.push('');
        emailContent.push(`--${mainBoundary}`);
        emailContent.push(`Content-Type: ${attachment.mimeType}; name="${attachment.name}"`);
        emailContent.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push('');
        
        const base64Lines = attachment.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      // End main boundary
      emailContent.push('');
      emailContent.push(`--${mainBoundary}--`);
      
    } else if (hasInlineImages) {
      // Simple structure for HTML + inline images: multipart/related > multipart/alternative > text/html + inline images
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/related; boundary="${relatedBoundary}"`
      ].filter(Boolean);
      
      // Start multipart/alternative section
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      // Plain text version
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      // HTML content
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      // End alternative boundary
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      // Add inline images
      for (const image of allInlineImages) {
        emailContent.push('');
        emailContent.push(`--${relatedBoundary}`);
        emailContent.push(`Content-Type: ${image.mimeType}; name="${image.name}"`);
        emailContent.push(`Content-Disposition: inline; filename="${image.name}"`);
        emailContent.push(`Content-ID: <${image.cid}>`);
        emailContent.push(`Content-Transfer-Encoding: base64`);
        emailContent.push(`X-Attachment-Id: ${image.cid}`);
        emailContent.push('');
        
        const base64Lines = image.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      // End related boundary
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}--`);
      
    } else if (hasRegularAttachments) {
      // Multipart/mixed for regular attachments only
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/mixed; boundary="${mainBoundary}"`
      ].filter(Boolean);
      
      // Add email body part with alternative structure
      emailContent.push('');
      emailContent.push(`--${mainBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      // Plain text version
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      // HTML content
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      // End alternative boundary
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      // Add attachments
      for (const attachment of regularAttachments) {
        emailContent.push('');
        emailContent.push(`--${mainBoundary}`);
        emailContent.push(`Content-Type: ${attachment.mimeType}; name="${attachment.name}"`);
        emailContent.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push('');
        
        const base64Lines = attachment.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      // End main boundary
      emailContent.push('');
      emailContent.push(`--${mainBoundary}--`);
      
    } else {
      // Simple HTML message with alternative structure for better compatibility
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`
      ].filter(Boolean);
      
      // Plain text version
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      // HTML content
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      // End boundary
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
    }

    // Create the raw email string
    const rawEmail = emailContent.join('\r\n');
    console.log(`📧 Raw email length: ${rawEmail.length}`);
    console.log(`📧 Raw email preview:`, rawEmail.substring(0, 500));

    // Encode the email in base64url format using a more robust method
    // Convert string to Uint8Array to handle any character encoding issues
    const emailBytes = new TextEncoder().encode(rawEmail);
    
    // Convert Uint8Array to base64 using a safe method
    let binaryString = '';
    for (let i = 0; i < emailBytes.length; i++) {
      binaryString += String.fromCharCode(emailBytes[i]);
    }
    
    const encodedEmail = btoa(binaryString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Prepare the request body
    const requestBody: any = {
      raw: encodedEmail
    };

    // Add threadId if this is a reply
    if (conversationThreadId) {
      requestBody.threadId = conversationThreadId;
    }

    console.log(`📧 Sending email via Gmail API...`);

    // Send the email
    const response = await window.gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: requestBody
    });

    console.log(` Email sent successfully:`, response);

    return { 
      success: true, 
      threadId: response.result.threadId 
    };

  } catch (error) {
    console.error(' Error sending email via Gmail:', error);
    throw error;
  }
};

/**
 * Save email as draft in Gmail
 */
export const _legacy_saveGmailDraft = async (
  to: string,
  cc: string,
  subject: string,
  body: string,
  attachments?: Array<{ name: string; mimeType: string; data: string; cid?: string }>,
  draftId?: string // For updating existing drafts
): Promise<{ success: boolean; draftId?: string }> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`📧 saveGmailDraft: Saving draft to ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 Body length: ${body.length}`);
    console.log(`📧 Attachments: ${attachments?.length || 0}`);
    console.log(`📧 Existing Draft ID: ${draftId || 'none'}`);

    // Extract inline images from HTML (for Compose-style data: URLs)
    const { html: processedHtml, inlineImages: extractedImages } = extractInlineImages(body);
    
    // Categorize attachments
    const inlineAttachments = attachments?.filter(att => att.cid) || [];
    const regularAttachments = attachments?.filter(att => !att.cid) || [];
    
    // Merge inline images from both sources
    const allInlineImages = [...extractedImages, ...inlineAttachments];
    console.log(`📧 Total inline images: ${allInlineImages.length} (${extractedImages.length} extracted + ${inlineAttachments.length} passed)`);
    console.log(`📧 Regular attachments: ${regularAttachments.length}`);

    // Generate boundaries using Gmail-style format
    const mainBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const relatedBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const alternativeBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    
    let emailContent: string[];
    
    // Determine message structure based on content
    const hasRegularAttachments = regularAttachments && regularAttachments.length > 0;
    const hasInlineImages = allInlineImages.length > 0;
    
    if (hasInlineImages && hasRegularAttachments) {
      // Complex structure: multipart/mixed (main) > multipart/related (content+images) > multipart/alternative (text/html)
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/mixed; boundary="${mainBoundary}"`
      ].filter(Boolean);
      
      // Related part for content + inline images
      emailContent.push('');
      emailContent.push(`--${mainBoundary}`);
      emailContent.push(`Content-Type: multipart/related; boundary="${relatedBoundary}"`);
      
      // Alternative part for text/html
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      // Plain text version
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      // HTML content
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      // End boundary
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      // Add inline images
      for (const image of allInlineImages) {
        emailContent.push('');
        emailContent.push(`--${relatedBoundary}`);
        emailContent.push(`Content-Type: ${image.mimeType}; name="${image.name}"`);
        emailContent.push(`Content-Disposition: inline; filename="${image.name}"`);
        emailContent.push(`Content-ID: <${image.cid}>`);
        emailContent.push(`Content-Transfer-Encoding: base64`);
        emailContent.push(`X-Attachment-Id: ${image.cid}`);
        emailContent.push('');
        
        // Split base64 data into lines of 76 characters (RFC 2045)
        const base64Lines = image.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      // End related boundary
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}--`);
      
      // Add regular attachments to the mixed section
      for (const attachment of regularAttachments) {
        emailContent.push('');
        emailContent.push(`--${mainBoundary}`);
        emailContent.push(`Content-Type: ${attachment.mimeType}; name="${attachment.name}"`);
        emailContent.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push('');
        
        const base64Lines = attachment.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      // End main boundary
      emailContent.push('');
      emailContent.push(`--${mainBoundary}--`);
      
    } else if (hasInlineImages) {
      // Inline images only: multipart/related > multipart/alternative
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/related; boundary="${relatedBoundary}"`
      ].filter(Boolean);
      
      // Alternative part for text/html
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      // Plain text version
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      // HTML content
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      // End alternative boundary
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      // Add inline images
      for (const image of allInlineImages) {
        emailContent.push('');
        emailContent.push(`--${relatedBoundary}`);
        emailContent.push(`Content-Type: ${image.mimeType}; name="${image.name}"`);
        emailContent.push(`Content-Disposition: inline; filename="${image.name}"`);
        emailContent.push(`Content-ID: <${image.cid}>`);
        emailContent.push(`Content-Transfer-Encoding: base64`);
        emailContent.push(`X-Attachment-Id: ${image.cid}`);
        emailContent.push('');
        
        const base64Lines = image.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      // End related boundary
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}--`);
      
    } else if (hasRegularAttachments) {
      // Multipart/mixed for regular attachments only
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/mixed; boundary="${mainBoundary}"`
      ].filter(Boolean);
      
      // Add email body part with alternative structure
      emailContent.push('');
      emailContent.push(`--${mainBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      // Plain text version
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      // HTML content
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      // End alternative boundary
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      // Add attachments
      for (const attachment of regularAttachments) {
        emailContent.push('');
        emailContent.push(`--${mainBoundary}`);
        emailContent.push(`Content-Type: ${attachment.mimeType}; name="${attachment.name}"`);
        emailContent.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push('');
        
        const base64Lines = attachment.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      // End main boundary
      emailContent.push('');
      emailContent.push(`--${mainBoundary}--`);
      
    } else {
      // Simple HTML message with alternative structure for better compatibility
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`
      ].filter(Boolean);
      
      // Plain text version
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      // HTML content
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      // End boundary
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
    }

    // Create the raw email string
    const rawEmail = emailContent.join('\r\n');
    console.log(`📧 Raw draft email length: ${rawEmail.length}`);

    // Encode the email in base64url format
    const emailBytes = new TextEncoder().encode(rawEmail);
    let binaryString = '';
    for (let i = 0; i < emailBytes.length; i++) {
      binaryString += String.fromCharCode(emailBytes[i]);
    }
    
    const encodedEmail = btoa(binaryString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Prepare the draft request body
    const draftBody = {
      message: {
        raw: encodedEmail
      }
    };

    console.log(`📧 Saving draft via Gmail API...`);

    let response;
    if (draftId) {
      // Update existing draft
      response = await window.gapi.client.gmail.users.drafts.update({
        userId: 'me',
        id: draftId,
        resource: draftBody
      });
    } else {
      // Create new draft
      response = await window.gapi.client.gmail.users.drafts.create({
        userId: 'me',
        resource: draftBody
      });
    }

    console.log(` Draft saved successfully:`, response);

    return { 
      success: true, 
      draftId: response.result.id 
    };

  } catch (error) {
    console.error(' Error saving draft via Gmail:', error);
    throw error;
  }
};

/**
 * Delete a Gmail draft
 */
export const deleteGmailDraft = async (draftId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`🗑️ Deleting draft: ${draftId}`);

    await window.gapi.client.gmail.users.drafts.delete({
      userId: 'me',
      id: draftId
    });

    console.log(` Draft deleted successfully: ${draftId}`);

  } catch (error) {
    console.error(' Error deleting draft:', error);
    throw error;
  }
};

/**
 * Fetch Gmail labels
 */
/**
 * Fetch all Gmail labels
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/labels.ts
 */
export const fetchGmailLabels = async (): Promise<GmailLabel[]> => {
  return gmailFetchLabels();
};

/**
 * Fetch emails by label
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/labels.ts
 */
export const fetchGmailMessagesByLabel = async (
  labelId: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<PaginatedEmailResponse> => {
  return gmailFetchMessagesByLabel(labelId, maxResults, pageToken);
};

/**
 * Create a new Gmail label
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/labels.ts
 */
export const createGmailLabel = async (name: string): Promise<GmailLabel> => {
  return gmailCreateLabel(name);
};

/**
 * Update an existing Gmail label
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/labels.ts
 */
export const updateGmailLabel = async (id: string, newName: string): Promise<GmailLabel> => {
  return gmailUpdateLabel(id, newName);
};

/**
 * Delete a Gmail label
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/labels.ts
 */
export const deleteGmailLabel = async (id: string): Promise<void> => {
  return gmailDeleteLabel(id);
};

/**
 * Apply labels to a Gmail message
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/labels.ts
 */
export const applyGmailLabels = async (
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[] = []
): Promise<void> => {
  return gmailApplyLabels(messageId, addLabelIds, removeLabelIds);
};

/**
 * Mark a Gmail message as trash
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/mutations.ts
 */
export const markGmailMessageAsTrash = async (messageId: string): Promise<void> => {
  return gmailMarkAsTrash(messageId);
};

/**
 * Mark a Gmail message as read
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/mutations.ts
 */
export const markGmailMessageAsRead = async (messageId: string): Promise<void> => {
  return gmailMarkAsRead(messageId);
};

/**
 * Mark a Gmail message as unread
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/mutations.ts
 */
export const markGmailMessageAsUnread = async (messageId: string): Promise<void> => {
  return gmailMarkAsUnread(messageId);
};

/**
 * Mark a Gmail message as starred
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/mutations.ts
 */
export const markGmailMessageAsStarred = async (messageId: string): Promise<void> => {
  return gmailMarkAsStarred(messageId);
};

/**
 * Mark a Gmail message as unstarred
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/mutations.ts
 */
export const markGmailMessageAsUnstarred = async (messageId: string): Promise<void> => {
  return gmailMarkAsUnstarred(messageId);
};

/**
 * Mark a Gmail message as IMPORTANT
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/mutations.ts
 */
export const markGmailMessageAsImportant = async (messageId: string): Promise<void> => {
  return gmailMarkAsImportant(messageId);
};

/**
 * Remove IMPORTANT label
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/mutations.ts
 */
export const markGmailMessageAsUnimportant = async (messageId: string): Promise<void> => {
  return gmailMarkAsUnimportant(messageId);
};

/**
 * Get Gmail user profile information
 */
/**
 * Get Gmail user profile information
 * ⚠️ DELEGATED TO: src/integrations/gmail/contacts/profile.ts
 */
export const getGmailUserProfile = async (): Promise<{ name: string; email: string; picture?: string } | null> => {
  return gmailGetUserProfile();
};

/**
 * Test function to verify People API connectivity
 * Can be called from browser console: window.testPeopleAPI()
 * ⚠️ DELEGATED TO: src/integrations/gmail/contacts/profile.ts
 */
export const testPeopleAPI = async (): Promise<void> => {
  return gmailTestPeopleAPI();
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testPeopleAPI = testPeopleAPI;
}

/**
 * Fetch frequently contacted people and my contacts from Google People API
 * ⚠️ DELEGATED TO: src/integrations/gmail/contacts/profile.ts
 */
export const fetchPeopleConnections = async (): Promise<any[]> => {
  return gmailFetchPeopleConnections();
};

/**
 * Fetch other contacts from Google People API
 * ⚠️ DELEGATED TO: src/integrations/gmail/contacts/profile.ts
 */
export const fetchOtherContacts = async (): Promise<any[]> => {
  return gmailFetchOtherContacts();
};

/**
 * List Gmail filters
 */
/**
 * List all Gmail filters
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/filters.ts
 */
export const listGmailFilters = async (): Promise<any[]> => {
  return gmailListFilters();
};

/**
 * Get a specific Gmail filter
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/filters.ts
 */
export const getGmailFilter = async (filterId: string): Promise<any> => {
  return gmailGetFilter(filterId);
};

/**
 * Create a new Gmail filter
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/filters.ts
 */
export const createGmailFilter = async (criteria: any, action: any): Promise<any> => {
  return gmailCreateFilter(criteria, action);
};

/**
 * Delete a Gmail filter
 * ⚠️ DELEGATED TO: src/integrations/gmail/operations/filters.ts
 */
export const deleteGmailFilter = async (filterId: string): Promise<void> => {
  return gmailDeleteFilter(filterId);
};

/**
 * Permanently delete all messages in trash (empty trash)
 * ⚠️ DELEGATED TO: src/integrations/gmail/misc/trash.ts
 */
export const emptyGmailTrash = async (): Promise<void> => {
  return gmailEmptyTrash();
};