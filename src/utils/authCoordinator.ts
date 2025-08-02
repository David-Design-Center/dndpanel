/**
 * Authentication coordinator to ensure proper token validation
 * and prevent API calls before authentication is complete
 */

import { isGmailSignedIn } from '../integrations/gapiService';
import { fetchGmailAccessToken } from '../lib/gmail';

interface AuthState {
  isAuthenticated: boolean;
  isValidating: boolean;
  lastValidation: number;
  currentUserEmail?: string;
}

class AuthenticationCoordinator {
  private authState: AuthState = {
    isAuthenticated: false,
    isValidating: false,
    lastValidation: 0
  };

  private readonly VALIDATION_CACHE_MS = 30000; // 30 seconds
  private authPromise: Promise<boolean> | null = null;

  /**
   * Ensure user is authenticated before making Gmail API calls
   */
  async ensureAuthenticated(userEmail?: string): Promise<boolean> {
    // If already validating, wait for the current validation
    if (this.authPromise) {
      return this.authPromise;
    }

    // Check if we have a recent successful validation
    const now = Date.now();
    if (this.authState.isAuthenticated && 
        (now - this.authState.lastValidation) < this.VALIDATION_CACHE_MS &&
        (!userEmail || this.authState.currentUserEmail === userEmail)) {
      return true;
    }

    // Start new validation
    this.authPromise = this.validateAuthentication(userEmail);
    
    try {
      const result = await this.authPromise;
      return result;
    } finally {
      this.authPromise = null;
    }
  }

  /**
   * Validate current authentication state
   */
  private async validateAuthentication(userEmail?: string): Promise<boolean> {
    console.log('🔐 Validating Gmail authentication...');
    this.authState.isValidating = true;

    try {
      // First check if we have a traditional OAuth token
      const hasTraditionalAuth = isGmailSignedIn();
      
      if (hasTraditionalAuth) {
        console.log('✅ Traditional OAuth authentication valid');
        this.updateAuthState(true, userEmail);
        return true;
      }

      // If no traditional auth and we have a user email, try domain-wide delegation
      if (userEmail) {
        console.log('🔄 Attempting domain-wide delegation...');
        try {
          const token = await fetchGmailAccessToken(userEmail);
          if (token) {
            console.log('✅ Domain-wide delegation authentication successful');
            this.updateAuthState(true, userEmail);
            return true;
          }
        } catch (error) {
          console.error('❌ Domain-wide delegation failed:', error);
        }
      }

      console.log('❌ No valid authentication found');
      this.updateAuthState(false, userEmail);
      return false;

    } catch (error) {
      console.error('❌ Authentication validation error:', error);
      this.updateAuthState(false, userEmail);
      return false;
    } finally {
      this.authState.isValidating = false;
    }
  }

  /**
   * Update authentication state
   */
  private updateAuthState(isAuthenticated: boolean, userEmail?: string) {
    this.authState = {
      isAuthenticated,
      isValidating: false,
      lastValidation: Date.now(),
      currentUserEmail: userEmail
    };
  }

  /**
   * Reset authentication state (call when user signs out or switches profiles)
   */
  resetAuthState() {
    console.log('🔄 Resetting authentication state');
    this.authState = {
      isAuthenticated: false,
      isValidating: false,
      lastValidation: 0
    };
    this.authPromise = null;
  }

  /**
   * Get current authentication state
   */
  getAuthState(): Readonly<AuthState> {
    return { ...this.authState };
  }

  /**
   * Wait for authentication to complete if currently validating
   */
  async waitForAuthValidation(): Promise<boolean> {
    if (this.authPromise) {
      return this.authPromise;
    }
    return this.authState.isAuthenticated;
  }
  /**
   * Reset authentication state (useful when switching profiles)
   */
  reset(): void {
    this.authState = {
      isAuthenticated: false,
      isValidating: false,
      lastValidation: 0
    };
    this.authPromise = null;
  }

  /**
   * Get current authentication status without validation
   */
  isCurrentlyAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }
}

// Global authentication coordinator instance
export const authCoordinator = new AuthenticationCoordinator();

/**
 * Wrapper function to ensure authentication before Gmail operations
 */
export async function withAuthentication<T>(
  operation: () => Promise<T>,
  userEmail?: string,
  operationName?: string
): Promise<T> {
  const isAuthenticated = await authCoordinator.ensureAuthenticated(userEmail);
  
  if (!isAuthenticated) {
    throw new Error(`Gmail authentication required for operation: ${operationName || 'unknown'}`);
  }

  return operation();
}
