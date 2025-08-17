import { Email, GmailLabel } from '../types';
import { format } from 'date-fns';
import { decodeRfc2047 } from '../utils/emailDecoding';

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
    return !!(currentAccessToken && Date.now() < tokenExpiryTime - 5 * 60 * 1000); // 5-minute buffer
  } catch (error) {
    console.error('Error checking Gmail sign-in status:', error);
    return false;
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
 * Decode HTML entities in a string
 */
const decodeHtmlEntities = (text: string): string => {
  if (!text) return '';
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

/**
 * Decode RFC 2047 encoded header strings (proper MIME implementation)
 */
const decodeHeader = (value: string): string => {
  return decodeRfc2047(value);
};

/**
 * Convert base64url to byte array (Uint8Array)
 */
const decodeBase64UrlToBytes = (base64Url: string): Uint8Array => {
  if (!base64Url) return new Uint8Array(0);
  
  try {
    // Clean input and convert base64url to standard base64
    let base64 = base64Url.replace(/[\s\r\n\t]+/g, ''); // Remove whitespace
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/'); // Convert to standard base64
    
    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    
    // Decode base64 to binary string
    const binaryString = atob(base64);
    
    // Convert binary string to byte array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  } catch (e) {
    console.error('Error in decodeBase64UrlToBytes:', e);
    return new Uint8Array(0);
  }
};

/**
 * Decode quoted-printable bytes to bytes
 */
const decodeQuotedPrintableToBytes = (bytes: Uint8Array): Uint8Array => {
  if (!bytes || bytes.length === 0) return bytes;
  
  const result: number[] = [];
  let i = 0;
  
  while (i < bytes.length) {
    // Handle '=' character (61 in ASCII)
    if (bytes[i] === 61) { // ASCII for '='
      // Check for soft line break (=\r\n or =\n)
      if (i + 2 < bytes.length && bytes[i + 1] === 13 && bytes[i + 2] === 10) { // \r\n
        i += 3; // Skip the soft line break
        continue;
      } else if (i + 1 < bytes.length && bytes[i + 1] === 10) { // \n
        i += 2; // Skip the soft line break
        continue;
      } else if (i + 2 < bytes.length) {
        // Try to parse as hex sequence
        const hexStr = String.fromCharCode(bytes[i + 1], bytes[i + 2]);
        if (/^[0-9A-Fa-f]{2}$/.test(hexStr)) {
          // Valid hex sequence
          result.push(parseInt(hexStr, 16));
          i += 3;
          continue;
        }
      }
    }
    
    // If not a special sequence, just add the byte
    result.push(bytes[i]);
    i++;
  }
  
  return new Uint8Array(result);
};

/**
 * Recursively find the best body part (HTML preferred, then plain text).
 */
const findBodyPart = (payload: EmailPart): EmailPart | undefined => {
  // Initialize result containers
  let htmlPart: EmailPart | undefined;
  let textPart: EmailPart | undefined;
  
  // Recursive helper function to search through the part hierarchy
  const searchPartsRecursively = (part: EmailPart, depth: number = 0): void => {
    // If we already found an HTML part, no need to continue searching
    if (htmlPart) return;
    
    // Check for direct content in this part
    if (part.mimeType === 'text/html' && part.body?.data) {
      htmlPart = part;
      return;
    } else if (part.mimeType === 'text/plain' && part.body?.data && !textPart) {
      textPart = part;
    }
    
    // Check if this is a multipart message
    if (part.parts && part.parts.length > 0) {
      // Special handling for multipart/alternative - we want to prioritize HTML over plain text
      if (part.mimeType === 'multipart/alternative') {
        // First try to find HTML parts
        for (const subPart of part.parts) {
          if (subPart.mimeType === 'text/html' && subPart.body?.data) {
            htmlPart = subPart;
            return;
          }
        }
        
        // If no HTML part found, look for plain text
        if (!htmlPart) {
          for (const subPart of part.parts) {
            if (subPart.mimeType === 'text/plain' && subPart.body?.data && !textPart) {
              textPart = subPart;
            }
          }
        }
      }
      
      // For other multipart types or if we haven't found content yet, recursively search all parts
      for (const subPart of part.parts) {
        // Skip attachments or other non-content parts if we're already at depth > 0
        if (depth > 0 && 
            (subPart.filename || 
             (subPart.mimeType !== 'text/html' && 
              subPart.mimeType !== 'text/plain' && 
              !subPart.mimeType.startsWith('multipart/')))) {
          continue;
        }
        
        searchPartsRecursively(subPart, depth + 1);
      }
    }
  };
  
  // Start the recursive search
  searchPartsRecursively(payload);
  
  // Return HTML part if found, otherwise text part
  return htmlPart || textPart;
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
 * Enhanced HTML cleaning for promotional emails
 */
const cleanPromotionalHTML = (html: string): string => {
  // Remove problematic elements that cause rendering issues
  let cleaned = html
    // Remove style blocks that contain font definitions and CSS
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove problematic font declarations
    .replace(/@font-face[^}]*}/gi, '')
    // Remove CSS media queries
    .replace(/@media[^}]*{[^}]*}/gi, '')
    // Clean up repeated characters (like fffffffff...)
    .replace(/([a-zA-Z])\1{10,}/g, '') // Remove 10+ repeated chars
    // Remove excessive CSS properties
    .replace(/style="[^"]*font-family:[^"]*"/gi, 'style=""')
    // Clean up malformed CSS
    .replace(/[{;}]\s*[{;}]/g, ';')
    // Remove empty style attributes
    .replace(/style="\s*"/gi, '')
    // Fix common encoding issues
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // Extract readable text content while preserving basic structure
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleaned;
  
  // Remove script tags, style tags, and other non-content elements
  const unwantedElements = tempDiv.querySelectorAll('script, style, meta, link');
  unwantedElements.forEach(el => el.remove());
  
  // Get clean text content with basic formatting
  let textContent = tempDiv.innerHTML;
  
  // Clean up extra whitespace and line breaks
  textContent = textContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
    
  return textContent || cleaned;
};

/**
 * Detect if this is a promotional/marketing email
 */
const isPromotionalEmail = (headers: Array<{ name: string; value: string }>, body: string): boolean => {
  const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
  const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
  
  // Check for marketing indicators
  const marketingKeywords = [
    'newsletter', 'unsubscribe', 'marketing', 'promotion', 'deal', 'offer',
    'sale', 'discount', 'limited time', 'exclusive', 'special offer'
  ];
  
  const hasMarketingKeywords = marketingKeywords.some(keyword => 
    subject.toLowerCase().includes(keyword) || 
    from.toLowerCase().includes(keyword) ||
    body.toLowerCase().includes(keyword)
  );
  
  // Check for typical promotional email structures
  const hasPromotionalStructure = 
    body.includes('@font-face') ||
    body.includes('font-family:') ||
    !!body.match(/([a-zA-Z])\1{8,}/) || // Repeated characters (!! converts to boolean)
    body.includes('href=') && body.includes('utm_') || // Tracking links
    body.includes('style=') && body.length > 10000; // Heavy styling
    
  return hasMarketingKeywords || hasPromotionalStructure;
};

/**
 * Extract text from email part, handling different encodings
 */
const extractTextFromPart = (part: EmailPart): string => {
  if (!part.body || !part.body.data) {
    return '';
  }

  const charsetMap: Record<string,string> = {
    'iso-8859-1':  'iso-8859-1',
    'latin1':      'iso-8859-1',
    'cp1252':      'iso-8859-1',
    'windows-1252':'iso-8859-1',
    'iso-8859-15': 'windows-1252', 
    'iso-8859-2':  'iso-8859-2',
    'latin2':      'iso-8859-2',
    'iso-8859-3':  'iso-8859-3',
    'latin3':      'iso-8859-3',
    'iso-8859-4':  'iso-8859-4',
    'latin4':      'iso-8859-4',
    'iso-8859-13': 'iso-8859-13',
    'windows-1250': 'windows-1250',
    'windows-1251': 'windows-1251',
    'windows-1253': 'windows-1253',
    'windows-1254': 'windows-1254',
    'windows-1257': 'windows-1257',
    'koi8-r':      'koi8-r',
    'koi8-u':      'koi8-u',
    'utf8':        'utf-8',
    'utf-8':        'utf-8'
  };
  
  let charset = 'utf-8';
  const ct = part.headers?.find(h => h.name.toLowerCase()==='content-type')?.value;
  if (ct) {
    const m = ct.match(/charset=["']?([^"';\s]+)/i);
    if (m?.[1]) {
      const det = m[1].trim().toLowerCase();
      charset = charsetMap[det] || det;
      // validate
      try {
        new TextDecoder(charset);
      } catch {
        console.warn(`Unsupported charset "${charset}", falling back to iso-8859-1`);
        charset = 'iso-8859-1';
      }
    }
  }
  
  // Determine content encoding from Content-Transfer-Encoding header
  const contentTransferEncoding = part.headers?.find(
    (h) => h.name.toLowerCase() === 'content-transfer-encoding'
  )?.value?.toLowerCase();
  
  try {
    // STEP 1: base64url → bytes
    let finalBytes = decodeBase64UrlToBytes(part.body.data);

    // sniff the C-T-E header more loosely
    const cteHeader = part.headers
      ?.find(h => h.name.toLowerCase() === 'content-transfer-encoding')
      ?.value?.toLowerCase() || '';

    // always QP‐decode if it's HTML or if the header mentions "quoted-printable"
    if (part.mimeType.startsWith('text/html') || cteHeader.includes('quoted-printable')) {
      finalBytes = decodeQuotedPrintableToBytes(finalBytes);
    }

    // STEP 3: decode bytes → string
    const decoded = new TextDecoder(charset).decode(finalBytes);
    
    // STEP 4: Final cleanup - decode HTML entities if present
    let cleanedContent = decodeHtmlEntities(decoded);
    
    // STEP 5: Enhanced cleaning for promotional emails (HTML content)
    if (part.mimeType === 'text/html') {
      // Check if this looks like a promotional email with styling issues
      if (isPromotionalEmail(part.headers || [], cleanedContent)) {
        console.log('Detected promotional email, applying enhanced cleaning...');
        cleanedContent = cleanPromotionalHTML(cleanedContent);
      }
    }
    
    // STEP 6: For plain text content, convert newlines to HTML breaks for display
    if (part.mimeType === 'text/plain') {
      return cleanedContent
        .replace(/\r\n/g, '<br>')
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '<br>');
    }
    
    return cleanedContent;
  } catch (e) {
    console.error('Error decoding content:', e, { 
      encoding: contentTransferEncoding, 
      charset, 
      mimeType: part.mimeType
    });
    
    return `[Error decoding email content. Original encoding: ${contentTransferEncoding || 'unknown'}]`;
  }
};

/**
 * Fetch messages from Gmail with pagination support
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
          format: 'metadata', // Use metadata format for inbox list - much faster
          metadataHeaders: ['Subject', 'From', 'To', 'Date'] // Only get headers we need
        });

        if (!msg.result || !msg.result.payload) continue;
        const payload = msg.result.payload as EmailPart;

        const headers = payload.headers || [];
        const subject = decodeHeader(headers.find((h) => h.name.toLowerCase() === 'subject')?.value || 'No Subject');
        const fromHeader = decodeHeader(headers.find((h) => h.name.toLowerCase() === 'from')?.value || '');
        const toHeader = decodeHeader(headers.find((h) => h.name.toLowerCase() === 'to')?.value || '');
        const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date')?.value || new Date().toISOString();
        
        let fromName = fromHeader;
        let fromEmail = fromHeader;
        const fromMatch = fromHeader.match(/(.*)<(.*)>/);
        if (fromMatch && fromMatch.length === 3) {
          fromName = fromMatch[1].trim();
          fromEmail = fromMatch[2].trim();
        }

        // Parse the To header similar to From header
        let toName = toHeader;
        let toEmail = toHeader;
        const toMatch = toHeader.match(/(.*)<(.*)>/);
        if (toMatch && toMatch.length === 3) {
          toName = toMatch[1].trim();
          toEmail = toMatch[2].trim();
        }

        let preview = msg.result.snippet ? decodeHtmlEntities(msg.result.snippet) : '';
        // For inbox list view, use snippet as body to avoid expensive body processing
        let body = preview;

        // Skip attachment processing for inbox list view (metadata format doesn't include payload)
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
          date: format(new Date(dateHeader), "yyyy-MM-dd'T'HH:mm:ss"),
          labelIds: msg.result.labelIds || [],
          attachments: attachments.length > 0 ? attachments : undefined,
          threadId: msg.result.threadId
        } as Email);

        // Add shorter delay between individual message fetches for speed
        await new Promise(resolve => setTimeout(resolve, 25));
      } catch (messageError) {
        console.warn(`Failed to fetch message ${message.id}:`, messageError);
        // Continue with other messages if one fails
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

    console.log(`Fetching email with ID: ${id}`);
    
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
    const subject = decodeHeader(headers.find((h) => h.name.toLowerCase() === 'subject')?.value || 'No Subject');
    const fromHeader = decodeHeader(headers.find((h) => h.name.toLowerCase() === 'from')?.value || '');
    const toHeader = decodeHeader(headers.find((h) => h.name.toLowerCase() === 'to')?.value || '');
    const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date')?.value || new Date().toISOString();

    let fromName = fromHeader;
    let fromEmail = fromHeader;
    const fromMatch = fromHeader.match(/(.*)<(.*)>/);
    if (fromMatch && fromMatch.length === 3) {
      fromName = fromMatch[1].trim();
      fromEmail = fromMatch[2].trim();
    }

    // Parse the To header similar to From header
    let toName = toHeader;
    let toEmail = toHeader;
    const toMatch = toHeader.match(/(.*)<(.*)>/);
    if (toMatch && toMatch.length === 3) {
      toName = toMatch[1].trim();
      toEmail = toMatch[2].trim();
    }

    let preview = msg.result.snippet ? decodeHtmlEntities(msg.result.snippet) : '';
    let body = '';

    console.log('Finding body part...');
    const bodyPart = findBodyPart(payload);
    if (bodyPart) {
      console.log(`Body part found, type: ${bodyPart.mimeType}`);
      body = extractTextFromPart(bodyPart);
      
      // Check for promotional email issues specifically
      if (isPromotionalEmail(headers, body)) {
        console.log('Promotional email detected - applying special handling');
        
        // If body has repeated characters or styling issues, try alternative approach
        if (body.match(/([a-zA-Z])\1{8,}/) || body.includes('@font-face')) {
          console.log('Detected styling corruption in promotional email, trying cleanup...');
          body = cleanPromotionalHTML(body);
        }
      }
      
      if (!body || body.length < 20) {
        console.warn('Body part found but content is empty or very short, trying alternate parsing approach');
        
        const allTextParts: EmailPart[] = [];
        
        const collectTextParts = (part: EmailPart) => {
          if ((part.mimeType === 'text/html' || part.mimeType === 'text/plain') && part.body?.data) {
            allTextParts.push(part);
          }
          if (part.parts) {
            part.parts.forEach(collectTextParts);
          }
        };
        
        collectTextParts(payload);
        
        const htmlParts = allTextParts.filter(p => p.mimeType === 'text/html');
        const textParts = allTextParts.filter(p => p.mimeType === 'text/plain');
        
        if (htmlParts.length > 0) {
          console.log('Found HTML parts via alternate approach, trying to decode...');
          let alternateBody = htmlParts.map(p => extractTextFromPart(p)).join('<hr>');
          
          // Apply promotional cleaning to alternate approach as well
          if (isPromotionalEmail(headers, alternateBody)) {
            alternateBody = cleanPromotionalHTML(alternateBody);
          }
          
          body = alternateBody;
        } else if (textParts.length > 0) {
          console.log('Found text parts via alternate approach, trying to decode...');
          body = textParts.map(p => extractTextFromPart(p)).join('<hr>');
        }
      }
    } else {
      console.warn(`No suitable body part found for message ID (detail view): ${id}. Snippet: "${preview}"`);
      if (!body && preview) body = preview.replace(/\n/g, '<br>');
    }

    // Process inline images and replace CID references with data URIs
    if (body) {
      try {
        body = await processInlineImages(id, body, payload);
      } catch (error) {
        console.warn(`Failed to process inline images for message ${id}:`, error);
        // Continue with original body if inline image processing fails
      }
    }

    const attachments: NonNullable<Email['attachments']> = [];
    function findAttachmentsRecursive(currentPart: EmailPart) {
      if (currentPart.filename && currentPart.filename.length > 0 && currentPart.body?.attachmentId) {
        let mimeType = currentPart.mimeType || 'application/octet-stream';
        
        if (mimeType === 'application/octet-stream' && currentPart.filename) {
          const ext = currentPart.filename.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') mimeType = 'application/pdf';
          else if (ext === 'doc' || ext === 'docx') mimeType = 'application/msword';
          else if (ext === 'xls' || ext === 'xlsx') mimeType = 'application/vnd.ms-excel';
          else if (ext === 'ppt' || ext === 'pptx') mimeType = 'application/vnd.ms-powerpoint';
          else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'gif') mimeType = 'image/gif';
          else if (ext === 'zip') mimeType = 'application/zip';
        }
        
        attachments.push({
          name: decodeHeader(currentPart.filename),
          url: `https://mail.google.com/mail/u/0/#inbox/${id}`,
          size: currentPart.body.size || 0,
          mimeType: mimeType,
          attachmentId: currentPart.body.attachmentId,
          partId: currentPart.partId
        });
      }
      if (currentPart.parts) {
        for (const subPart of currentPart.parts) {
          findAttachmentsRecursive(subPart);
        }
      }
    }
    if (payload.parts) findAttachmentsRecursive(payload);
    else if (payload.filename && payload.body?.attachmentId) findAttachmentsRecursive(payload);

    try {
      await window.gapi.client.gmail.users.messages.modify({
        userId: 'me',
        id: id,
        resource: {
          removeLabelIds: ['UNREAD']
        }
      });
    } catch (markError) {
      console.error('Error marking message as read:', markError);
    }

    return {
      id: id,
      from: { name: fromName, email: fromEmail },
      to: [{ name: toName, email: toEmail }],
      subject: subject,
      body: body,
      preview: preview,
      isRead: !msg.result.labelIds?.includes('UNREAD'),
      isImportant: msg.result.labelIds?.includes('IMPORTANT'),
      date: format(new Date(dateHeader), "yyyy-MM-dd'T'HH:mm:ss"),
      labelIds: msg.result.labelIds || [],
      attachments: attachments.length > 0 ? attachments : undefined,
      threadId: msg.result.threadId
    } as Email;

  } catch (error) {
    console.error(`Error fetching email (ID: ${id}) from Gmail:`, error);
    throw error;
  }
};

/**
 * Fetch the latest message in a thread
 */
export const fetchLatestMessageInThread = async (threadId: string): Promise<Email | undefined> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Fetching thread with ID: ${threadId}`);
    
    const threadResponse = await window.gapi.client.gmail.users.threads.get({
      userId: 'me',
      id: threadId
    });

    if (!threadResponse.result || !threadResponse.result.messages || threadResponse.result.messages.length === 0) {
      console.error('Thread fetch returned no messages');
      return undefined;
    }
    
    // Sort messages by date (newest first) and take the first one
    const messages = threadResponse.result.messages;
    const latestMessage = messages.sort((a: { internalDate: any; }, b: { internalDate: any; }) => {
      const aInternalDate = parseInt(a.internalDate || '0');
      const bInternalDate = parseInt(b.internalDate || '0');
      return bInternalDate - aInternalDate;
    })[0];
    
    // Fetch the full message details
    return await fetchGmailMessageById(latestMessage.id);
    
  } catch (error) {
    console.error(`Error fetching thread (ID: ${threadId}) from Gmail:`, error);
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

    console.log(`Fetching all messages in thread with ID: ${threadId}`);
    
    const threadResponse = await window.gapi.client.gmail.users.threads.get({
      userId: 'me',
      id: threadId
    });

    if (!threadResponse.result || !threadResponse.result.messages || threadResponse.result.messages.length === 0) {
      console.error('Thread fetch returned no messages');
      return [];
    }
    
    const messages = threadResponse.result.messages;
    
    // Sort messages by date (oldest first for chronological thread display)
    const sortedMessages = messages.sort((a: { internalDate: any; }, b: { internalDate: any; }) => {
      const aInternalDate = parseInt(a.internalDate || '0');
      const bInternalDate = parseInt(b.internalDate || '0');
      return aInternalDate - bInternalDate; // Changed to show oldest first for thread display
    });
    
    // Fetch full message details for all messages
    const threadEmails: Email[] = [];
    for (const message of sortedMessages) {
      const email = await fetchGmailMessageById(message.id);
      if (email) {
        threadEmails.push(email);
      }
    }
    
    return threadEmails;
    
  } catch (error) {
    console.error(`Error fetching thread messages (ID: ${threadId}) from Gmail:`, error);
    return [];
  }
};

/**
 * Get attachment download URL
 */
export const getAttachmentDownloadUrl = async (
  messageId: string,
  attachmentId: string,
  _filename: string,
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

    // Convert the base64url data to a Blob
    let base64Data = response.result.data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64Data.length % 4 !== 0) {
      base64Data += '=';
    }

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create a Blob from the binary data
    const blob = new Blob([bytes], { type: mimeType });
    
    // Create an object URL
    const url = URL.createObjectURL(blob);
    
    // Set up cleanup of the URL after it's used
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
    
    return url;
  } catch (error) {
    console.error('Error fetching attachment:', error);
    throw error;
  }
};

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
export const sendGmailMessage = async (
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
export const saveGmailDraft = async (
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
export const fetchGmailLabels = async (): Promise<GmailLabel[]> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log('Fetching Gmail labels...');

    // Step 1: Get all labels (this only returns basic info, no counters)
    const response = await window.gapi.client.gmail.users.labels.list({
      userId: 'me'
    });

    if (!response.result || !response.result.labels) {
      console.warn('No labels found in Gmail account');
      return [];
    }

    console.log(' Raw Gmail API response from list:', response.result);
    console.log(`� Found ${response.result.labels.length} labels, now fetching details with counters...`);

    // Step 2: Get detailed info for ONLY key system labels to avoid rate limits
    const keySystemLabels = response.result.labels.filter((label: any) => {
      const keyLabels = ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'STARRED'];
      return keyLabels.includes(label.id);
    });

    console.log(` Fetching detailed info for ${keySystemLabels.length} key system labels only`);

    // Process system labels with delays to avoid rate limiting
    const labelDetails = [...response.result.labels]; // Start with all basic labels
    
    for (let i = 0; i < keySystemLabels.length; i++) {
      const label = keySystemLabels[i];
      try {
        // Add delay between requests to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
        
        const detailResponse = await window.gapi.client.gmail.users.labels.get({
          userId: 'me',
          id: label.id
        });
        
        // Replace the basic label with detailed info
        const labelIndex = labelDetails.findIndex(l => l.id === label.id);
        if (labelIndex !== -1) {
          labelDetails[labelIndex] = detailResponse.result;
        }
        
        console.log(` Fetched details for ${label.name}`);
      } catch (error: any) {
        if (error?.status === 429) {
          console.warn(` Rate limited for ${label.name}, using basic info`);
          // Add longer delay if rate limited
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.warn(` Failed to fetch details for ${label.name}:`, error?.message || error);
        }
      }
    }

    console.log(' Raw label details with counters:', labelDetails);

    const labels: GmailLabel[] = labelDetails.map((label: any) => ({
      id: label.id,
      name: label.name,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility,
      type: label.type,
      messagesTotal: label.messagesTotal || 0,
      messagesUnread: label.messagesUnread || 0,
      threadsTotal: label.threadsTotal || 0,
      threadsUnread: label.threadsUnread || 0
    }));

    // Log statistics
    const labelsWithCounts = labels.filter(label => 
      (label.messagesTotal || 0) > 0 || (label.messagesUnread || 0) > 0
    );

    console.log(`Found ${labelsWithCounts.length} labels with message counts`);

    // Log key system labels only
    const keyLabels = ['INBOX', 'SENT', 'DRAFT'].map(name => labels.find(l => l.name === name)).filter(Boolean);
    console.log('KEY SYSTEM LABELS:', keyLabels.map(label => ({
      name: label?.name,
      total: label?.messagesTotal,
      unread: label?.messagesUnread
    })));

    console.log(`Successfully fetched ${labels.length} Gmail labels`);
    return labels;

  } catch (error) {
    console.error('Error fetching Gmail labels:', error);
    throw error;
  }
};

/**
 * Fetch emails by label
 */
export const fetchGmailMessagesByLabel = async (
  labelId: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<PaginatedEmailResponse> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    // Construct query using label ID
    const query = `label:${labelId}`;
    
    console.log(`Fetching Gmail messages for label: ${labelId}`);
    
    return await fetchGmailMessages(query, maxResults, pageToken);

  } catch (error) {
    console.error(`Error fetching Gmail messages by label (${labelId}):`, error);
    throw error;
  }
};

/**
 * Create a new Gmail label
 */
export const createGmailLabel = async (name: string): Promise<GmailLabel> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Creating Gmail label: ${name}`);

    const response = await window.gapi.client.gmail.users.labels.create({
      userId: 'me',
      resource: {
        name: name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show'
      }
    });

    if (!response.result) {
      throw new Error('Failed to create label');
    }

    const newLabel: GmailLabel = {
      id: response.result.id,
      name: response.result.name,
      messageListVisibility: response.result.messageListVisibility,
      labelListVisibility: response.result.labelListVisibility,
      type: response.result.type,
      messagesTotal: response.result.messagesTotal,
      messagesUnread: response.result.messagesUnread,
      threadsTotal: response.result.threadsTotal,
      threadsUnread: response.result.threadsUnread
    };

    console.log(`Successfully created Gmail label: ${name}`);
    return newLabel;

  } catch (error) {
    console.error('Error creating Gmail label:', error);
    throw error;
  }
};

/**
 * Update an existing Gmail label
 */
export const updateGmailLabel = async (id: string, newName: string): Promise<GmailLabel> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Updating Gmail label ${id} to: ${newName}`);

    const response = await window.gapi.client.gmail.users.labels.update({
      userId: 'me',
      id: id,
      resource: {
        id: id,
        name: newName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show'
      }
    });

    if (!response.result) {
      throw new Error('Failed to update label');
    }

    const updatedLabel: GmailLabel = {
      id: response.result.id,
      name: response.result.name,
      messageListVisibility: response.result.messageListVisibility,
      labelListVisibility: response.result.labelListVisibility,
      type: response.result.type,
      messagesTotal: response.result.messagesTotal,
      messagesUnread: response.result.messagesUnread,
      threadsTotal: response.result.threadsTotal,
      threadsUnread: response.result.threadsUnread
    };

    console.log(`Successfully updated Gmail label: ${newName}`);
    return updatedLabel;

  } catch (error) {
    console.error('Error updating Gmail label:', error);
    throw error;
  }
};

/**
 * Delete a Gmail label
 */
export const deleteGmailLabel = async (id: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    // Prevent deletion of system labels
    const systemLabels = ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'STARRED', 'IMPORTANT', 'UNREAD'];
    if (systemLabels.includes(id)) {
      throw new Error('Cannot delete system labels');
    }

    console.log(`Attempting to delete Gmail label with ID: ${id}`);

    const response = await window.gapi.client.gmail.users.labels.delete({
      userId: 'me',
      id: id
    });

    console.log(`Gmail API delete response:`, response);
    console.log(`Successfully deleted Gmail label: ${id}`);

  } catch (error) {
    console.error('Error deleting Gmail label:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
};

/**
 * Apply labels to a Gmail message
 */
export const applyGmailLabels = async (
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[] = []
): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Applying labels to message ${messageId}:`, { addLabelIds, removeLabelIds });

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds,
        removeLabelIds
      }
    });

    console.log(`Successfully applied labels to message ${messageId}`);
  } catch (error) {
    console.error('Error applying labels to Gmail message:', error);
    throw error;
  }
};

/**
 * Mark a Gmail message as trash
 */
export const markGmailMessageAsTrash = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Moving message ${messageId} to trash`);

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds: ['TRASH'],
        removeLabelIds: ['INBOX']
      }
    });

    console.log(`Successfully moved message ${messageId} to trash`);
  } catch (error) {
    console.error('Error moving message to trash:', error);
    throw error;
  }
};

/**
 * Mark a Gmail message as read
 */
export const markGmailMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Marking message ${messageId} as read`);

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        removeLabelIds: ['UNREAD']
      }
    });

    console.log(`Successfully marked message ${messageId} as read`);
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

/**
 * Mark a Gmail message as unread
 */
export const markGmailMessageAsUnread = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Marking message ${messageId} as unread`);

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds: ['UNREAD']
      }
    });

    console.log(`Successfully marked message ${messageId} as unread`);
  } catch (error) {
    console.error('Error marking message as unread:', error);
    throw error;
  }
};

/**
 * Mark a Gmail message as starred (important)
 */
export const markGmailMessageAsStarred = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Marking message ${messageId} as starred`);

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds: ['IMPORTANT']
      }
    });

    console.log(`Successfully marked message ${messageId} as starred`);
  } catch (error) {
    console.error('Error marking message as starred:', error);
    throw error;
  }
};

/**
 * Mark a Gmail message as unstarred (not important)
 */
export const markGmailMessageAsUnstarred = async (messageId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`Marking message ${messageId} as unstarred`);

    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        removeLabelIds: ['IMPORTANT']
      }
    });

    console.log(`Successfully marked message ${messageId} as unstarred`);
  } catch (error) {
    console.error('Error marking message as unstarred:', error);
    throw error;
  }
};

/**
 * Get Gmail user profile information
 */
export const getGmailUserProfile = async (): Promise<{ name: string; email: string; picture?: string } | null> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log('Fetching Gmail user profile...');
    
    // Use the Gmail API to get user's profile (which includes email address)
    const response = await window.gapi.client.request({
      path: 'https://gmail.googleapis.com/gmail/v1/users/me/profile'
    });

    if (!response.result) {
      throw new Error('No profile data returned from Gmail API');
    }

    // Get the email address from the profile
    const emailAddress = response.result.emailAddress;
    
    // For now, we'll extract name from email or use email as name
    // In a real app, you might want to use Google People API for more detailed profile info
    let name = emailAddress;
    if (emailAddress) {
      // Try to extract name from email (e.g., "john.doe@gmail.com" -> "John Doe")
      const localPart = emailAddress.split('@')[0];
      name = localPart.split(/[._]/).map((part: string) => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
    }

    console.log('Gmail user profile fetched:', { name, email: emailAddress });
    
    return {
      name: name,
      email: emailAddress || '',
      picture: undefined // Gmail API doesn't provide profile pictures directly
    };

  } catch (error) {
    console.error('Error fetching Gmail user profile:', error);
    return null;
  }
};

/**
 * Test function to verify People API connectivity
 * Can be called from browser console: window.testPeopleAPI()
 */
export const testPeopleAPI = async (): Promise<void> => {
  console.log('=== Testing People API ===');
  
  try {
    // Check basic authentication
    console.log('1. Checking Gmail sign-in status:', isGmailSignedIn());
    
    if (!isGmailSignedIn()) {
      console.error('Not signed in to Gmail - cannot test People API');
      return;
    }
    
    // Check if gapi is available
    console.log('2. Checking gapi availability:', !!window.gapi);
    console.log('3. Checking gapi.client availability:', !!window.gapi?.client);
    
    // List all available APIs
    console.log('4. Available APIs:', Object.keys(window.gapi?.client || {}));
    
    // Check if People API is available
    console.log('5. Checking People API availability:', !!window.gapi?.client?.people);
    
    if (window.gapi?.client?.people) {
      console.log('6. People API object:', window.gapi.client.people);
      console.log('7. People connections method available:', 
        !!window.gapi.client.people.people?.connections?.list);
    }
    
    // Test People API calls
    console.log('8. Testing fetchPeopleConnections...');
    const peopleConnections = await fetchPeopleConnections();
    console.log('9. People connections result:', peopleConnections);
    
    console.log('10. Testing fetchOtherContacts...');
    const otherContacts = await fetchOtherContacts();
    console.log('11. Other contacts result:', otherContacts);
    
    console.log('=== People API Test Complete ===');
    console.log(`Results: ${peopleConnections.length} people connections, ${otherContacts.length} other contacts`);
    
  } catch (error) {
    console.error('=== People API Test Failed ===');
    console.error('Error:', error);
  }
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testPeopleAPI = testPeopleAPI;
}

/**
 * Fetch frequently contacted people and my contacts from Google People API
 */
export const fetchPeopleConnections = async (): Promise<any[]> => {
  try {
    if (!isGmailSignedIn()) {
      console.warn('fetchPeopleConnections: Not signed in to Gmail');
      throw new Error('Not signed in to Gmail');
    }

    console.log('fetchPeopleConnections: Starting to fetch...');
    console.log('fetchPeopleConnections: gapi.client available:', !!window.gapi?.client);
    console.log('fetchPeopleConnections: people API available:', !!window.gapi?.client?.people);

    // Check if People API is available
    if (!window.gapi?.client?.people) {
      console.warn('fetchPeopleConnections: People API not available - checking what is available');
      console.log('Available APIs:', Object.keys(window.gapi?.client || {}));
      return [];
    }

    console.log('fetchPeopleConnections: Calling People API...');
    
    const response = await window.gapi.client.people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      sortOrder: 'LAST_MODIFIED_DESCENDING',
      personFields: 'names,emailAddresses,photos,metadata'
    });

    console.log('fetchPeopleConnections: API response received:', response);
    const connections = response.result?.connections || [];
    console.log(`fetchPeopleConnections: Found ${connections.length} connections`);
    
    return connections;
  } catch (error) {
    console.error('fetchPeopleConnections: Error fetching people connections:', error);
    return []; // Return empty array instead of throwing
  }
};

/**
 * Fetch other contacts from Google People API
 */
export const fetchOtherContacts = async (): Promise<any[]> => {
  try {
    if (!isGmailSignedIn()) {
      console.warn('fetchOtherContacts: Not signed in to Gmail');
      throw new Error('Not signed in to Gmail');
    }

    console.log('fetchOtherContacts: Starting to fetch...');
    
    const response = await window.gapi.client.request({
      path: 'https://people.googleapis.com/v1/otherContacts',
      params: {
        readMask: 'names,emailAddresses,photos',
        pageSize: 1000
      }
    });

    console.log('fetchOtherContacts: API response received:', response);
    const otherContacts = response.result.otherContacts || [];
    console.log(`fetchOtherContacts: Found ${otherContacts.length} other contacts`);

    return otherContacts;
  } catch (error) {
    console.error('fetchOtherContacts: Error fetching other contacts:', error);
    if (error instanceof Error) {
      console.error('fetchOtherContacts: Error details:', {
        message: error.message,
        status: (error as any).status,
        details: (error as any).result
      });
    }
    return []; // Return empty array instead of throwing for this function too
  }
};

/**
 * List Gmail filters
 */
export const listGmailFilters = async (): Promise<any[]> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const response = await window.gapi.client.request({
      path: 'https://gmail.googleapis.com/gmail/v1/users/me/settings/filters'
    });

    return response.result.filter || [];
  } catch (error) {
    console.error('Error listing Gmail filters:', error);
    throw error;
  }
};

/**
 * Get a specific Gmail filter
 */
export const getGmailFilter = async (filterId: string): Promise<any> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const response = await window.gapi.client.request({
      path: `https://gmail.googleapis.com/gmail/v1/users/me/settings/filters/${filterId}`
    });

    return response.result;
  } catch (error) {
    console.error('Error getting Gmail filter:', error);
    throw error;
  }
};

/**
 * Create a new Gmail filter
 */
export const createGmailFilter = async (criteria: any, action: any): Promise<any> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const response = await window.gapi.client.request({
      path: 'https://gmail.googleapis.com/gmail/v1/users/me/settings/filters',
      method: 'POST',
      body: {
        criteria,
        action
      }
    });

    return response.result;
  } catch (error) {
    console.error('Error creating Gmail filter:', error);
    throw error;
  }
};

/**
 * Delete a Gmail filter
 */
export const deleteGmailFilter = async (filterId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    await window.gapi.client.request({
      path: `https://gmail.googleapis.com/gmail/v1/users/me/settings/filters/${filterId}`,
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting Gmail filter:', error);
    throw error;
  }
};

/**
 * Permanently delete all messages in trash (empty trash)
 */
export const emptyGmailTrash = async (): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log('Emptying Gmail trash...');

    // First, get all messages in trash
    const trashResponse = await window.gapi.client.gmail.users.messages.list({
      userId: 'me',
      q: 'in:trash',
      maxResults: 500 // Process in batches
    });

    const messages = trashResponse.result.messages || [];
    
    if (messages.length === 0) {
      console.log('Trash is already empty');
      return;
    }

    console.log(`Found ${messages.length} messages in trash. Permanently deleting...`);

    // Delete messages in batches to avoid API limits
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      // Use Promise.allSettled to handle partial failures gracefully
      const deletePromises = batch.map(async (message: any) => {
        try {
          await window.gapi.client.request({
            path: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            method: 'DELETE'
          });
          return { success: true, messageId: message.id };
        } catch (error: any) {
          console.warn(`Failed to delete message ${message.id}:`, error);
          return { success: false, messageId: message.id, error };
        }
      });

      await Promise.allSettled(deletePromises);
      
      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(` Successfully emptied trash - deleted ${messages.length} messages`);
  } catch (error) {
    console.error('Error emptying Gmail trash:', error);
    throw error;
  }
};