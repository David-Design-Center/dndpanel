// src/lib/gmail.ts

/**
 * Gmail API helper using domain-wide delegation service account
 * This replaces the traditional OAuth flow with seamless server-side authentication
 */

import { supabase } from './supabase';
import { authCoordinator } from '../utils/authCoordinator';
import { queueGmailRequest } from '../utils/requestQueue';

const SUPABASE_FUNCTION_URL = "https://jvcdxglsoholhgapfpet.supabase.co/functions/v1/refresh-gmail-token";

/**
 * Fetch a fresh Gmail access token for the specified user email
 * Uses domain-wide delegation - no user consent required
 * 
 * @param userEmail - The email address of the user to generate token for
 * @returns Promise<string> - Fresh Gmail access token
 */
export async function fetchGmailAccessToken(userEmail: string): Promise<string> {
  console.log(`🔑 Fetching fresh Gmail token for: ${userEmail}`);
  
  try {
    // Get the current Supabase session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No valid session found. Please sign in again.');
    }

    const res = await fetch(SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userEmail }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Token fetch failed:', err);
      throw new Error(err.error || `Token fetch failed (${res.status})`);
    }

    const { access_token } = await res.json();
    
    if (!access_token) {
      throw new Error('No access token received from service');
    }

    console.log('✅ Successfully fetched fresh Gmail token');
    return access_token;
    
  } catch (error) {
    console.error('❌ Error fetching Gmail access token:', error);
    throw error;
  }
}

/**
 * Make an authenticated request to Gmail API
 * Automatically handles token fetching using domain-wide delegation
 * 
 * @param userEmail - User email for token generation
 * @param endpoint - Gmail API endpoint (e.g., 'users/me/messages')
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise<Response> - Gmail API response
 */
export async function makeGmailApiRequest(
  userEmail: string, 
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  console.log(`📧 Making Gmail API request to: ${endpoint}`);
  
  // Ensure authentication before making the request
  const isAuthenticated = await authCoordinator.ensureAuthenticated(userEmail);
  if (!isAuthenticated) {
    throw new Error(`Gmail authentication failed for user: ${userEmail}`);
  }
  
  // Queue the request to prevent rate limiting
  return queueGmailRequest(`gmail-api-${endpoint}`, async () => {
    try {
      // Get fresh token using domain-wide delegation
      const token = await fetchGmailAccessToken(userEmail);
      
      // Make the API request
      const url = `https://gmail.googleapis.com/gmail/v1/${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ Gmail API error (${response.status}):`, errorText);
        throw new Error(`Gmail API error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ Gmail API request successful: ${endpoint}`);
      return response;
      
    } catch (error) {
      console.error(`❌ Error making Gmail API request to ${endpoint}:`, error);
      throw error;
    }
  });
}

/**
 * Fetch Gmail threads with automatic token handling
 * 
 * @param userEmail - User email for authentication
 * @param query - Gmail search query (optional)
 * @param maxResults - Maximum number of results (default: 50)
 * @param pageToken - Page token for pagination (optional)
 * @returns Promise<any> - Gmail threads response
 */
export async function fetchGmailThreads(
  userEmail: string,
  query: string = '',
  maxResults: number = 50,
  pageToken?: string
): Promise<any> {
  const searchParams = new URLSearchParams({
    maxResults: maxResults.toString(),
  });

  if (query) {
    searchParams.append('q', query);
  }

  if (pageToken) {
    searchParams.append('pageToken', pageToken);
  }

  const endpoint = `users/me/threads?${searchParams.toString()}`;
  const response = await makeGmailApiRequest(userEmail, endpoint);
  return response.json();
}

/**
 * Fetch Gmail messages with automatic token handling
 * 
 * @param userEmail - User email for authentication
 * @param query - Gmail search query (optional)
 * @param maxResults - Maximum number of results (default: 50)
 * @param pageToken - Page token for pagination (optional)
 * @returns Promise<any> - Gmail messages response
 */
export async function fetchGmailMessages(
  userEmail: string,
  query: string = '',
  maxResults: number = 50,
  pageToken?: string
): Promise<any> {
  const searchParams = new URLSearchParams({
    maxResults: maxResults.toString(),
  });

  if (query) {
    searchParams.append('q', query);
  }

  if (pageToken) {
    searchParams.append('pageToken', pageToken);
  }

  const endpoint = `users/me/messages?${searchParams.toString()}`;
  const response = await makeGmailApiRequest(userEmail, endpoint);
  return response.json();
}

/**
 * Get a specific Gmail thread with automatic token handling
 * 
 * @param userEmail - User email for authentication
 * @param threadId - Gmail thread ID
 * @param format - Message format (default: 'full')
 * @returns Promise<any> - Gmail thread response
 */
export async function getGmailThread(
  userEmail: string,
  threadId: string,
  format: string = 'full'
): Promise<any> {
  const endpoint = `users/me/threads/${threadId}?format=${format}`;
  const response = await makeGmailApiRequest(userEmail, endpoint);
  return response.json();
}

/**
 * Send an email using Gmail API with automatic token handling
 * 
 * @param userEmail - User email for authentication
 * @param messageData - Raw email message data
 * @returns Promise<any> - Gmail send response
 */
export async function sendGmailMessage(
  userEmail: string,
  messageData: string
): Promise<any> {
  const endpoint = 'users/me/messages/send';
  const response = await makeGmailApiRequest(userEmail, endpoint, {
    method: 'POST',
    body: JSON.stringify({
      raw: messageData
    })
  });
  return response.json();
}

/**
 * Get attachment download URL using domain-wide delegation
 */
export async function getAttachmentDownloadUrl(
  userEmail: string,
  messageId: string,
  attachmentId: string,
  filename: string,
  mimeType: string
): Promise<string> {
  try {
    console.log('📎 getAttachmentDownloadUrl called with:', {
      userEmail,
      messageId,
      attachmentId,
      filename,
      mimeType
    });

    const endpoint = `users/me/messages/${messageId}/attachments/${attachmentId}`;
    console.log('📎 Making API request to endpoint:', endpoint);
    
    const response = await makeGmailApiRequest(userEmail, endpoint, {
      method: 'GET'
    });

    console.log('📎 API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📎 API error response:', errorText);
      throw new Error(`Failed to fetch attachment: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const attachmentData = await response.json();
    console.log('📎 Attachment data received, data length:', attachmentData.data?.length || 0);
    
    if (!attachmentData.data) {
      throw new Error('No attachment data returned from API');
    }

    // Convert the base64url data to a Blob
    let base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
    
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
}
