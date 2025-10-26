import { supabase } from '@/lib/supabase';
import { getCurrentAccessToken } from '@/integrations/gapiService';
import { fetchGmailAccessToken } from '@/lib/gmail';
import type { Email } from '@/types';

/* COMMENTED OUT - Interface for edge function
interface ProcessedEmail {
  id: string;
  threadId: string;
  subject: string;
  from: { name: string; email: string };
  to: Array<{ name: string; email: string }>;
  cc?: Array<{ name: string; email: string }>;
  date: string;
  body: string;
  snippet: string;
  labels: string[];
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
  hasInlineImages: boolean;
}
*/

/**
 * Get the current Gmail access token, or fetch a fresh one using domain-wide delegation
 */
async function getAccessToken(userEmail?: string): Promise<string | null> {
  // Try to get the current token from gapi client
  const currentToken = getCurrentAccessToken();
  
  if (currentToken) {
    console.log('✅ Using current token from gapi client');
    return currentToken;
  }
  
  // If no current token and we have user email, fetch fresh token via domain-wide delegation
  if (userEmail) {
    try {
      console.log('🔄 Fetching fresh Gmail token via domain-wide delegation...');
      const freshToken = await fetchGmailAccessToken(userEmail);
      return freshToken;
    } catch (error) {
      console.error('❌ Failed to fetch fresh Gmail token:', error);
      return null;
    }
  }
  
  return null;
}

/**
 * Optimized email fetching service that uses server-side processing
 * via Supabase Edge Functions to avoid client-side bottlenecks
 * 
 * ⚠️ CURRENTLY DISABLED - Edge function was causing styling/encoding issues
 * Keeping code for future reference if needed
 */
export class OptimizedEmailService {
  /* COMMENTED OUT - Helper method for edge function
  /**
   * Convert ProcessedEmail to Email type for compatibility
   *
  private convertToEmailType(processed: ProcessedEmail): Email {
    return {
      id: processed.id,
      from: {
        name: processed.from.name, // Server-side decoding should handle this
        email: processed.from.email
      },
      to: processed.to.map(recipient => ({
        name: recipient.name, // Server-side decoding should handle this
        email: recipient.email
      })),
      subject: processed.subject, // Server-side decoding should handle this
      body: processed.body, // Server-side decoding should handle this
      preview: processed.snippet, // Server-side decoding should handle this
      isRead: !processed.labels.includes('UNREAD'),
      isImportant: processed.labels.includes('IMPORTANT'),
      date: processed.date,
      internalDate: new Date(processed.date).getTime().toString(),
      attachments: processed.attachments.length > 0 ? processed.attachments.map(att => ({
        name: att.filename,
        url: '', // Will be populated when downloaded
        size: att.size,
        mimeType: att.mimeType,
        attachmentId: att.attachmentId,
      })) : undefined,
      threadId: processed.threadId,
    };
  }
  */

  /**
   * Fetch a single email thread using the optimized server-side processing
   * 
   * @param threadId - The Gmail thread ID
   * @param userEmail - User email for token generation (optional)
   * @returns Promise<Email[]> - Array of emails in the thread
   */
  async fetchEmailThread(threadId: string, _userEmail?: string): Promise<Email[]> {
    console.log(`🚀 OptimizedEmailService: Fetching thread ${threadId}`);
    
    // ⚠️ EDGE FUNCTION TEMPORARILY DISABLED - Using direct Gmail API instead
    // The edge function was causing styling issues and character encoding problems
    // Keeping it commented for future reference
    console.log('⚠️ Edge function disabled - falling back to direct Gmail API');
    throw new Error('Edge function disabled - use fallback to getThreadEmails()');
    
    /* COMMENTED OUT - Edge function call
    try {
      const accessToken = await getAccessToken(userEmail);
      if (!accessToken) {
        throw new Error('No Gmail access token available');
      }
      console.log(`🔑 Got access token: ${accessToken.substring(0, 20)}...`);
      console.log(`🔑 Token length: ${accessToken.length}`);
      console.log(`🔑 Token starts with: ${accessToken.substring(0, 10)}`);

      // Call the optimized Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('fetch-gmail-thread', {
        body: { threadId },
        headers: {
          'X-Gmail-Token': accessToken,
        },
      });

      if (error) {
        console.error('❌ Error from fetch-gmail-thread function:', error);
        throw new Error(`Server-side processing failed: ${error.message || 'Unknown error'}`);
      }

      if (!data || !Array.isArray(data)) {
        console.error('❌ Invalid response from server-side processing:', data);
        throw new Error('Invalid response from server-side processing');
      }

      console.log(`✅ OptimizedEmailService: Successfully processed ${data.length} emails server-side`);

      // Convert ProcessedEmail[] to Email[] for compatibility
      const emails = data.map((processed: ProcessedEmail) => this.convertToEmailType(processed));

      return emails;

    } catch (error) {
      console.error('❌ Error in fetchEmailThread:', error);
      throw error;
    }
    */
  }

  /**
   * Fetch a single email using the optimized server-side processing
   * 
   * @param messageId - The Gmail message ID
   * @param userEmail - User email for token generation (optional)
   * @returns Promise<Email> - The processed email
   */
  async fetchSingleEmail(messageId: string, _userEmail?: string): Promise<Email> {
    console.log(`🚀 OptimizedEmailService: Fetching message ${messageId}`);
    
    // ⚠️ EDGE FUNCTION TEMPORARILY DISABLED - Using direct Gmail API instead
    console.log('⚠️ Edge function disabled - falling back to direct Gmail API');
    throw new Error('Edge function disabled - use fallback to getEmailById()');
    
    /* COMMENTED OUT - Edge function call
    try {
      const accessToken = await getAccessToken(userEmail);
      if (!accessToken) {
        throw new Error('No Gmail access token available');
      }

      // Call the optimized Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('fetch-gmail-thread', {
        body: { messageId },
        headers: {
          'X-Gmail-Token': accessToken,
        },
      });

      if (error) {
        console.error('Error from fetch-gmail-thread function:', error);
        throw new Error(`Server-side processing failed: ${error.message}`);
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No email data returned from server-side processing');
      }

      console.log(`✅ OptimizedEmailService: Successfully processed email server-side`);

      // Convert ProcessedEmail to Email for compatibility
      const email = this.convertToEmailType(data[0] as ProcessedEmail);

      return email;

    } catch (error) {
      console.error('Error in fetchSingleEmail:', error);
      throw error;
    }
    */
  }

  /**
   * Check if the optimized service is available
   * Falls back to traditional client-side processing if not
   */
  async isAvailable(userEmail?: string): Promise<boolean> {
    try {
      console.log('🔍 Checking if optimized email service is available...');
      
      // Check if we have a valid access token first
      const accessToken = await getAccessToken(userEmail);
      if (!accessToken) {
        console.warn('⚠️ No Gmail access token available, using traditional processing');
        return false;
      }
      
      // Simple health check - try to call the function with a dummy request
      const { data, error } = await supabase.functions.invoke('fetch-gmail-thread', {
        body: { test: true },
        headers: {
          'X-Gmail-Token': accessToken,
        },
      });

      // If test request succeeds, the function is available
      if (data && !error) {
        console.log('✅ Optimized email service is available and responding!');
        return true;
      } else {
        console.warn('⚠️ Optimized email service not available:', error);
        console.log('📋 Will fall back to traditional client-side processing');
        return false;
      }
    } catch (error) {
      console.warn('⚠️ OptimizedEmailService not available, will use fallback:', error);
      console.log('📋 Will fall back to traditional client-side processing');
      return false;
    }
  }
}

// Export singleton instance
export const optimizedEmailService = new OptimizedEmailService();
