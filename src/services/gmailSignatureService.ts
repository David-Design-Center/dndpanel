// src/services/gmailSignatureService.ts

/**
 * Gmail Signature Service - Manages bidirectional sync between Supabase and Gmail sendAs API
 * Uses domain-wide delegation via refresh-gmail-token edge function
 */

import { fetchGmailAccessToken } from '@/lib/gmail';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

interface SendAsAddress {
  sendAsEmail: string;
  displayName?: string;
  replyToAddress?: string;
  signature?: string;
  isPrimary?: boolean;
  isDefault?: boolean;
  treatAsAlias?: boolean;
  verificationStatus?: string;
}

interface SendAsListResponse {
  sendAs: SendAsAddress[];
}

/**
 * Fetch all sendAs addresses for a user and return the primary one
 * @param userEmail - The user's email address for domain-wide delegation
 * @returns The primary sendAs address with its current signature, or null if not found
 */
export async function fetchGmailSendAsAddresses(userEmail: string): Promise<SendAsAddress[]> {
  console.log('📝 Fetching Gmail sendAs addresses for:', userEmail);
  
  try {
    const token = await fetchGmailAccessToken(userEmail);
    
    const response = await fetch(`${GMAIL_API_BASE}/users/me/settings/sendAs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('❌ Failed to fetch sendAs addresses:', response.status, errorText);
      throw new Error(`Failed to fetch sendAs addresses: ${response.status}`);
    }

    const data: SendAsListResponse = await response.json();
    console.log('✅ Fetched sendAs addresses:', data.sendAs?.length || 0);
    
    return data.sendAs || [];
  } catch (error) {
    console.error('❌ Error fetching Gmail sendAs addresses:', error);
    throw error;
  }
}

/**
 * Get the primary sendAs address (the one that matches the user's email or is marked primary)
 * @param userEmail - The user's email address
 * @returns The primary sendAs address or null
 */
export async function fetchPrimarySendAs(userEmail: string): Promise<SendAsAddress | null> {
  const addresses = await fetchGmailSendAsAddresses(userEmail);
  
  // First try to find one marked as primary
  let primary = addresses.find(addr => addr.isPrimary);
  
  // If no primary flag, look for the one matching the user's email
  if (!primary) {
    primary = addresses.find(addr => 
      addr.sendAsEmail.toLowerCase() === userEmail.toLowerCase()
    );
  }
  
  // Fallback to first address if available
  if (!primary && addresses.length > 0) {
    primary = addresses[0];
  }
  
  return primary || null;
}

/**
 * Fetch the current Gmail signature for the primary sendAs address
 * @param userEmail - The user's email address
 * @returns The HTML signature or empty string if none set
 */
export async function fetchGmailSignature(userEmail: string): Promise<string> {
  console.log('📝 Fetching Gmail signature for:', userEmail);
  
  try {
    const primary = await fetchPrimarySendAs(userEmail);
    
    if (!primary) {
      console.warn('⚠️ No primary sendAs address found for:', userEmail);
      return '';
    }
    
    console.log('✅ Found Gmail signature, length:', primary.signature?.length || 0);
    return primary.signature || '';
  } catch (error) {
    console.error('❌ Error fetching Gmail signature:', error);
    throw error;
  }
}

/**
 * Update the Gmail signature for the primary sendAs address
 * @param userEmail - The user's email address
 * @param signatureHtml - The HTML signature content to set
 * @returns true if successful
 */
export async function updateGmailSignature(userEmail: string, signatureHtml: string): Promise<boolean> {
  console.log('📝 Updating Gmail signature for:', userEmail);
  console.log('📝 Signature length:', signatureHtml.length);
  
  try {
    // First get the primary sendAs address
    const primary = await fetchPrimarySendAs(userEmail);
    
    if (!primary) {
      console.error('❌ No primary sendAs address found for:', userEmail);
      throw new Error('No primary email address found in Gmail settings');
    }
    
    console.log('📝 Updating signature for sendAs address:', primary.sendAsEmail);
    
    // Get fresh token
    const token = await fetchGmailAccessToken(userEmail);
    
    // PATCH the sendAs address with new signature
    const response = await fetch(
      `${GMAIL_API_BASE}/users/me/settings/sendAs/${encodeURIComponent(primary.sendAsEmail)}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signatureHtml,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('❌ Failed to update Gmail signature:', response.status, errorText);
      throw new Error(`Failed to update Gmail signature: ${response.status}`);
    }

    const updatedSendAs: SendAsAddress = await response.json();
    console.log('✅ Gmail signature updated successfully');
    console.log('📝 New signature length:', updatedSendAs.signature?.length || 0);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating Gmail signature:', error);
    throw error;
  }
}

/**
 * Compare local signature with Gmail signature to detect differences
 * @param userEmail - The user's email address
 * @param localSignature - The signature stored in Supabase
 * @returns Object with comparison results
 */
export async function compareSignatures(
  userEmail: string, 
  localSignature: string
): Promise<{
  gmailSignature: string;
  localSignature: string;
  areEqual: boolean;
  gmailHasSignature: boolean;
  localHasSignature: boolean;
}> {
  console.log('📝 Comparing signatures for:', userEmail);
  
  const gmailSignature = await fetchGmailSignature(userEmail);
  
  // Normalize for comparison (trim whitespace, normalize line endings)
  const normalizedGmail = (gmailSignature || '').trim().replace(/\r\n/g, '\n');
  const normalizedLocal = (localSignature || '').trim().replace(/\r\n/g, '\n');
  
  return {
    gmailSignature,
    localSignature,
    areEqual: normalizedGmail === normalizedLocal,
    gmailHasSignature: normalizedGmail.length > 0,
    localHasSignature: normalizedLocal.length > 0,
  };
}
