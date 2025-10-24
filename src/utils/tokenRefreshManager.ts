/**
 * Token Refresh Manager
 * Handles automatic, proactive token refresh in the background
 * - Refreshes at 50-minute mark before 1-hour expiry
 * - Retries failed requests with fresh token on 401 errors
 * - Prevents multiple simultaneous refreshes
 */

import { fetchGmailAccessToken } from '../lib/gmail';

interface TokenState {
  token: string | null;
  expiresAt: number | null;
  lastRefreshTime: number | null;
}

class TokenRefreshManager {
  private tokenState: TokenState = {
    token: null,
    expiresAt: null,
    lastRefreshTime: null
  };

  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private currentUserEmail: string | null = null;
  private listeners: Set<(token: string) => void> = new Set();

  constructor() {
    this.setupGlobalErrorInterceptor();
  }

  /**
   * Set the current user email for token refresh
   */
  setCurrentUser(email: string) {
    this.currentUserEmail = email;
    console.log('🔑 Token manager: Set current user to', email);
  }

  /**
   * Initialize token refresh cycle
   * Called after a fresh token is obtained
   */
  initializeTokenRefresh(token: string) {
    this.tokenState.token = token;
    this.tokenState.expiresAt = Date.now() + (60 * 60 * 1000); // 60 minutes
    this.tokenState.lastRefreshTime = Date.now();

    console.log('🔑 Token initialized, will refresh at', new Date(this.tokenState.expiresAt - 10 * 60 * 1000).toLocaleTimeString());

    // Clear any existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Schedule refresh at 50-minute mark (10 minutes before expiry)
    const refreshIn = Math.max(0, 50 * 60 * 1000); // 50 minutes from now
    this.refreshTimer = setTimeout(() => {
      this.refreshTokenInBackground();
    }, refreshIn);
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(bufferMs: number = 5 * 60 * 1000): boolean {
    if (!this.tokenState.expiresAt) return true;
    return Date.now() + bufferMs >= this.tokenState.expiresAt;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.tokenState.token;
  }

  /**
   * Proactively refresh token in background without blocking user
   */
  private async refreshTokenInBackground(): Promise<void> {
    if (this.isRefreshing) {
      console.log('🔄 Token refresh already in progress, waiting...');
      await (this.refreshPromise || Promise.resolve());
      return;
    }

    if (!this.currentUserEmail) {
      console.warn('⚠️ Cannot refresh token: no user email set');
      return;
    }

    this.isRefreshing = true;

    this.refreshPromise = (async () => {
      try {
        console.log('🔄 Background token refresh triggered for:', this.currentUserEmail);

        const freshToken = await fetchGmailAccessToken(this.currentUserEmail!);
        this.initializeTokenRefresh(freshToken);
        this.notifyListeners(freshToken);

        console.log('✅ Background token refresh successful');
        return freshToken;
      } catch (error) {
        console.error('❌ Background token refresh failed:', error);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    await this.refreshPromise;
  }

  /**
   * Force immediate token refresh (e.g., after 401 error)
   */
  async forceRefresh(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      console.log('🔄 Refresh already in progress, returning existing promise');
      return this.refreshPromise;
    }

    if (!this.currentUserEmail) {
      console.error('❌ Cannot refresh: no user email available');
      return null;
    }

    this.isRefreshing = true;

    try {
      console.log('🔄 Forcing immediate token refresh for:', this.currentUserEmail);

      const freshToken = await fetchGmailAccessToken(this.currentUserEmail);
      this.initializeTokenRefresh(freshToken);
      this.notifyListeners(freshToken);

      console.log('✅ Forced token refresh successful');
      return freshToken;
    } catch (error) {
      console.error('❌ Forced token refresh failed:', error);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Add listener for token refresh events
   */
  onTokenRefreshed(callback: (token: string) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of token refresh
   */
  private notifyListeners(token: string) {
    for (const listener of this.listeners) {
      try {
        listener(token);
      } catch (error) {
        console.error('Error in token refresh listener:', error);
      }
    }
  }

  /**
   * Setup global error interceptor for Gmail API responses
   * Catches 401 errors and auto-refreshes token
   */
  private setupGlobalErrorInterceptor() {
    // Intercept fetch requests to Gmail API
    const originalFetch = window.fetch;

    (window as any).fetch = async function (resource: any, config?: any) {
      const url = typeof resource === 'string' ? resource : resource.url;

      // Only intercept Gmail API calls
      if (typeof url === 'string' && url.includes('gmail.googleapis.com')) {
        try {
          let response = await originalFetch.call(window, resource, config);

          // If we get a 401, try to refresh and retry once
          if (response.status === 401) {
            console.warn('⚠️ Gmail API returned 401 Unauthorized, attempting token refresh...');

            const freshToken = await (window as any).__tokenRefreshManager?.forceRefresh?.();

            if (freshToken) {
              console.log('🔄 Retrying request with refreshed token...');

              // Update authorization header
              const newConfig = { ...config };
              if (!newConfig.headers) newConfig.headers = {};
              newConfig.headers['Authorization'] = `Bearer ${freshToken}`;

              // Retry the request
              response = await originalFetch.call(window, resource, newConfig);

              if (response.ok) {
                console.log('✅ Request successful after token refresh');
                return response;
              }
            }
          }

          return response;
        } catch (error) {
          console.error('Error in fetch interceptor:', error);
          return originalFetch.call(window, resource, config);
        }
      }

      return originalFetch.call(window, resource, config);
    };
  }

  /**
   * Cleanup: clear timers when user logs out
   */
  destroy() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.listeners.clear();
    this.tokenState = { token: null, expiresAt: null, lastRefreshTime: null };
    this.currentUserEmail = null;
  }
}

// Export singleton instance
export const tokenRefreshManager = new TokenRefreshManager();

// Make accessible globally for fetch interceptor
(window as any).__tokenRefreshManager = tokenRefreshManager;
