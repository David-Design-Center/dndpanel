import { supabase } from '../lib/supabase';
import { PublicClientApplication, AuthenticationResult } from '@azure/msal-browser';

export interface StoredToken {
  id: string;
  user_id: string;
  profile_email: string;
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  scope?: string;
  token_type: string;
  created_at: string;
  updated_at: string;
}

export class MicrosoftTokenService {
  private msalInstance: PublicClientApplication;

  constructor(msalInstance: PublicClientApplication) {
    this.msalInstance = msalInstance;
  }

  /**
   * Store Microsoft tokens in Supabase
   */
  async storeTokens(authResult: AuthenticationResult, profileEmail: string): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated with Supabase');
      }

      const expiresAt = new Date(Date.now() + (authResult.expiresOn?.getTime() || 0));

      const tokenData = {
        user_id: user.id,
        profile_email: profileEmail,
        access_token: authResult.accessToken,
        refresh_token: null, // MSAL handles refresh tokens internally
        expires_at: expiresAt.toISOString(),
        scope: authResult.scopes?.join(' ') || null,
        token_type: authResult.tokenType || 'Bearer'
      };

      const { error } = await supabase
        .from('microsoft_tokens')
        .upsert(tokenData, { 
          onConflict: 'user_id,profile_email',
          ignoreDuplicates: false 
        });

      if (error) {
        throw error;
      }

      console.log('Microsoft tokens stored successfully');
    } catch (error) {
      console.error('Error storing Microsoft tokens:', error);
      throw error;
    }
  }

  /**
   * Get stored Microsoft tokens for current user
   */
  async getStoredTokens(profileEmail?: string): Promise<StoredToken[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated with Supabase');
      }

      let query = supabase
        .from('microsoft_tokens')
        .select('*')
        .eq('user_id', user.id);

      if (profileEmail) {
        query = query.eq('profile_email', profileEmail);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching stored Microsoft tokens:', error);
      throw error;
    }
  }

  /**
   * Get a valid access token (refresh if needed)
   */
  async getValidAccessToken(profileEmail: string): Promise<string | null> {
    try {
      const tokens = await this.getStoredTokens(profileEmail);
      if (tokens.length === 0) {
        return null;
      }

      const token = tokens[0];
      const expiresAt = new Date(token.expires_at);
      const now = new Date();

      // If token is still valid (with 5 minute buffer), return it
      if (expiresAt.getTime() > now.getTime() + 5 * 60 * 1000) {
        return token.access_token;
      }

      // Try to refresh the token
      if (token.refresh_token) {
        return await this.refreshToken(token);
      }

      return null;
    } catch (error) {
      console.error('Error getting valid access token:', error);
      return null;
    }
  }

  /**
   * Refresh Microsoft access token
   */
  private async refreshToken(storedToken: StoredToken): Promise<string | null> {
    try {
      // Use MSAL to refresh the token
      const accounts = this.msalInstance.getAllAccounts();
      const account = accounts.find(acc => acc.username === storedToken.profile_email);

      if (!account) {
        console.warn('No MSAL account found for refresh');
        return null;
      }

      const refreshRequest = {
        account: account,
        scopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Calendars.ReadWrite']
      };

      const response = await this.msalInstance.acquireTokenSilent(refreshRequest);
      
      // Update stored token
      await this.storeTokens(response, storedToken.profile_email);
      
      return response.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      
      // If refresh fails, remove the stored token
      await this.removeStoredToken(storedToken.profile_email);
      return null;
    }
  }

  /**
   * Remove stored token
   */
  async removeStoredToken(profileEmail: string): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated with Supabase');
      }

      const { error } = await supabase
        .from('microsoft_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('profile_email', profileEmail);

      if (error) {
        throw error;
      }

      console.log('Microsoft token removed successfully');
    } catch (error) {
      console.error('Error removing Microsoft token:', error);
      throw error;
    }
  }

  /**
   * Check if user has valid stored tokens
   */
  async hasValidTokens(profileEmail: string): Promise<boolean> {
    const token = await this.getValidAccessToken(profileEmail);
    return token !== null;
  }

  /**
   * Silent login - try to get tokens without user interaction
   */
  async silentLogin(profileEmail: string): Promise<string | null> {
    try {
      // First check if we have valid stored tokens
      const storedToken = await this.getValidAccessToken(profileEmail);
      if (storedToken) {
        return storedToken;
      }

      // Try MSAL silent login
      const accounts = this.msalInstance.getAllAccounts();
      const account = accounts.find(acc => acc.username === profileEmail);

      if (!account) {
        return null;
      }

      const silentRequest = {
        account: account,
        scopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Calendars.ReadWrite']
      };

      const response = await this.msalInstance.acquireTokenSilent(silentRequest);
      
      // Store the new token
      await this.storeTokens(response, profileEmail);
      
      return response.accessToken;
    } catch (error) {
      console.error('Silent login failed:', error);
      return null;
    }
  }
}
