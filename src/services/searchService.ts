/**
 * Enhanced Gmail Search Service using Google Cloud Search API
 * Provides real-time search suggestions with debouncing and caching
 */

import { queueGmailRequest } from '../utils/requestQueue';

export interface SearchSuggestion {
  id: string;
  title: string;
  sender: string;
  snippet: string;
  threadId?: string;
  messageId?: string;
  timestamp: string;
}

class EmailSearchService {
  private debounceTimer: NodeJS.Timeout | null = null;
  private cache = new Map<string, { suggestions: SearchSuggestion[]; timestamp: number }>();
  private readonly DEBOUNCE_DELAY = 300; // 300ms as recommended
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RESULTS = 5;

  /**
   * Debounced search function - calls Cloud Search API after user stops typing
   */
  public async searchWithDebounce(
    query: string,
    callback: (suggestions: SearchSuggestion[]) => void
  ): Promise<void> {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // If query is empty, return empty results immediately
    if (!query.trim()) {
      callback([]);
      return;
    }

    // Check cache first
    const cachedResult = this.getCachedResult(query);
    if (cachedResult) {
      callback(cachedResult.suggestions);
      return;
    }

    // Set new debounced timer
    this.debounceTimer = setTimeout(async () => {
      try {
        const suggestions = await this.performSearch(query);
        this.setCachedResult(query, suggestions);
        callback(suggestions);
      } catch (error) {
        console.error('Search failed:', error);
        callback([]);
      }
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Perform the actual search using Google Cloud Search API
   */
  private async performSearch(query: string): Promise<SearchSuggestion[]> {
    console.log(`🔍 Performing Cloud Search for: "${query}"`);

    try {
      // Use Gmail API search as fallback if Cloud Search is not available
      // In production, you would use Cloud Search API here
      const response = await this.searchGmailAPI(query);
      return this.parseSearchResults(response);
    } catch (error) {
      console.error('Search API error:', error);
      return [];
    }
  }

  /**
   * Search using Gmail API (fallback implementation)
   * In production, replace this with Cloud Search API call
   */
  private async searchGmailAPI(query: string): Promise<any> {
    return await queueGmailRequest(
      `search-${query}`,
      async () => {
        if (!window.gapi?.client?.gmail) {
          throw new Error('Gmail API not available');
        }

        const response = await window.gapi.client.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: this.MAX_RESULTS
        });

        if (!response.result.messages) {
          return { messages: [] };
        }

        // Fetch details for each message to get sender, subject, snippet
        const messageDetails = await Promise.all(
          response.result.messages.slice(0, this.MAX_RESULTS).map(async (msg: any) => {
            const detail = await window.gapi.client.gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'metadata',
              metadataHeaders: ['Subject', 'From', 'Date']
            });
            return { ...detail.result, snippet: detail.result.snippet };
          })
        );

        return { messages: messageDetails };
      }
    );
  }

  /**
   * Parse search results into suggestion format
   */
  private parseSearchResults(response: any): SearchSuggestion[] {
    if (!response.messages || !Array.isArray(response.messages)) {
      return [];
    }

    return response.messages.map((message: any, index: number) => {
      const headers = message.payload?.headers || [];
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
      const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

      // Extract sender name and email
      const senderMatch = from.match(/^(.+?)\s*<(.+)>$/) || from.match(/^(.+)$/);
      const senderName = senderMatch ? senderMatch[1].replace(/"/g, '').trim() : from;

      return {
        id: `suggestion-${message.id || index}`,
        title: subject,
        sender: senderName,
        snippet: message.snippet || '',
        threadId: message.threadId,
        messageId: message.id,
        timestamp: date
      };
    });
  }

  /**
   * Get cached search results
   */
  private getCachedResult(query: string): { suggestions: SearchSuggestion[]; timestamp: number } | null {
    const cached = this.cache.get(query.toLowerCase());
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached;
    }
    return null;
  }

  /**
   * Cache search results
   */
  private setCachedResult(query: string, suggestions: SearchSuggestion[]): void {
    this.cache.set(query.toLowerCase(), {
      suggestions,
      timestamp: Date.now()
    });

    // Clean old cache entries
    this.cleanCache();
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached results
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cancel any pending search requests
   */
  public cancelPendingSearch(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// Global search service instance
export const emailSearchService = new EmailSearchService();

/**
 * Generate smart search suggestions based on current context
 */
export function generateContextualSuggestions(query: string, currentEmails: any[]): string[] {
  if (!query.trim()) return [];

  const suggestions: string[] = [];
  const lowerQuery = query.toLowerCase();

  // Get unique senders and subjects from current emails
  const senders = new Set<string>();
  const subjects = new Set<string>();

  currentEmails.forEach(email => {
    if (email.from?.name?.toLowerCase().includes(lowerQuery)) {
      senders.add(`from:"${email.from.name}"`);
    }
    if (email.from?.email?.toLowerCase().includes(lowerQuery)) {
      senders.add(`from:${email.from.email}`);
    }
    if (email.subject?.toLowerCase().includes(lowerQuery)) {
      const shortSubject = email.subject.length > 40 
        ? email.subject.substring(0, 40) + '...' 
        : email.subject;
      subjects.add(`subject:"${shortSubject}"`);
    }
  });

  // Add Gmail-style operator suggestions
  const operatorSuggestions = [
    `from:${query}`,
    `subject:${query}`,
    `has:attachment ${query}`,
    `is:unread ${query}`,
    `is:important ${query}`,
    `after:yesterday ${query}`,
    `before:lastweek ${query}`
  ];

  // Combine suggestions (prioritize context-aware ones)
  suggestions.push(...Array.from(senders).slice(0, 2));
  suggestions.push(...Array.from(subjects).slice(0, 2));
  suggestions.push(...operatorSuggestions.slice(0, 4));

  return suggestions.slice(0, 6);
}
