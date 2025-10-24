/**
 * GAPI Client Wrapper with 401 Error Recovery
 * 
 * Wraps window.gapi.client.gmail calls to automatically detect 401 errors,
 * refresh the token, and retry the request.
 */

import { tokenRefreshManager } from './tokenRefreshManager';

/**
 * Wrapper for gapi.client.gmail API calls with automatic 401 recovery
 * Catches 401 Unauthorized errors, refreshes token, and retries once
 */
export async function makeGapiCall(
  apiCall: () => Promise<any>,
  callDescription: string = 'Gmail API call'
): Promise<any> {
  try {
    console.log(`📧 Making ${callDescription}...`);
    const response = await apiCall();

    // Check for 401 error in response - check all possible locations
    const is401 = 
      response.status === 401 ||
      response.result?.error?.code === 401 ||
      (response.result && response.result.error && response.result.error.code === 401) ||
      (response.body && typeof response.body === 'string' && response.body.includes('"code": 401'));

    if (is401) {
      console.warn(`⚠️ ${callDescription} returned 401 Unauthorized - attempting recovery`);
      
      // Attempt token refresh and retry
      const retryResponse = await attemptTokenRefreshAndRetry(apiCall, callDescription);
      
      if (retryResponse) {
        console.log(`✅ ${callDescription} succeeded after token refresh`);
        return retryResponse;
      } else {
        console.error(`❌ ${callDescription} failed: token refresh unsuccessful`);
        throw new Error(`${callDescription} failed (401 Unauthorized)`);
      }
    }

    return response;
  } catch (error: any) {
    console.error(`❌ ${callDescription} error:`, error);
    throw error;
  }
}

/**
 * Get current user email from ProfileContext or window context
 */
function getCurrentUserEmail(): string | null {
  // Try to get from window (set by ProfileContext)
  if ((window as any)._currentProfileEmail) {
    return (window as any)._currentProfileEmail;
  }

  // Try to get from localStorage (fallback)
  try {
    const profileStr = localStorage.getItem('_currentProfile');
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      return profile.userEmail || null;
    }
  } catch (e) {
    // Ignore parse errors
  }

  return null;
}

/**
 * Attempt to refresh token and retry the API call
 */
async function attemptTokenRefreshAndRetry(
  apiCall: () => Promise<any>,
  callDescription: string
): Promise<any | null> {
  try {
    console.log(`🔄 Attempting token refresh for: ${callDescription}`);

    // Get current user email
    const userEmail = getCurrentUserEmail();
    if (!userEmail) {
      console.error('❌ Cannot refresh token: no user email available');
      return null;
    }

    console.log(`🔄 User email found: ${userEmail}`);

    // Ensure token manager knows about current user
    tokenRefreshManager.setCurrentUser(userEmail);

    // Force refresh the token
    const newToken = await tokenRefreshManager.forceRefresh();

    if (!newToken) {
      console.error('❌ Token refresh failed: no token returned');
      return null;
    }

    console.log('🔄 Token refreshed successfully, retrying request...');

    // Update gapi client with new token
    if (window.gapi?.client) {
      window.gapi.client.setToken({ access_token: newToken });
      console.log('✅ GAPI client token updated');
    }

    // Retry the original call
    const retryResponse = await apiCall();

    if (retryResponse.status === 401 || retryResponse.result?.error?.code === 401) {
      console.error('❌ Retry failed: still getting 401 after token refresh');
      return null;
    }

    console.log(`✅ Retry successful for: ${callDescription}`);
    return retryResponse;
  } catch (error) {
    console.error('❌ Token refresh and retry failed:', error);
    return null;
  }
}

/**
 * Export a helper to wrap all gapi calls
 * Usage in components:
 * 
 * const response = await gapiCallWithRecovery(() =>
 *   window.gapi.client.gmail.users.messages.list({ userId: 'me' })
 * );
 */
export const gapiCallWithRecovery = makeGapiCall;
