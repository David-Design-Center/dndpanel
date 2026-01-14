/**
 * Global cache for attachment data URLs
 * Prevents re-fetching the same attachment multiple times in a session
 */

// Singleton map to store attachmentId -> dataUrl
// Memory-only cache, clears on page refresh (which is desired behavior)
const attachmentCache = new Map<string, string>();

export const AttachmentCache = {
  /**
   * Get a cached data URL for an attachment
   */
  get: (attachmentId: string): string | undefined => {
    return attachmentCache.get(attachmentId);
  },

  /**
   * Store a data URL in the cache
   */
  set: (attachmentId: string, dataUrl: string): void => {
    // Basic validation to avoid caching invalid data
    if (attachmentId && dataUrl && dataUrl.startsWith('data:')) {
      attachmentCache.set(attachmentId, dataUrl);
    }
  },

  /**
   * Check if an attachment is cached
   */
  has: (attachmentId: string): boolean => {
    return attachmentCache.has(attachmentId);
  },

  /**
   * Clear the cache
   * Useful when switching accounts or forceful memory cleanup
   */
  clear: (): void => {
    attachmentCache.clear();
  },
  
  /**
   * Get cache size for debugging
   */
  size: (): number => {
    return attachmentCache.size;
  }
};
