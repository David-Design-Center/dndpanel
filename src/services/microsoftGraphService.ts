import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { sanitizeForLog, secureFetch, isAuthorizedUser } from '../utils/security';
import { MicrosoftTokenService } from './microsoftTokenService';

// Microsoft Graph API endpoints
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const CALENDAR_EVENTS_ENDPOINT = `${GRAPH_BASE_URL}/me/calendar/events`;

// MSAL configuration
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '307a7d6a-197c-4f26-b0d0-b0f3f1fd86cb',
    authority: import.meta.env.VITE_MICROSOFT_AUTHORITY || 'https://login.microsoftonline.com/common', 
    redirectUri: `https://dndos.netlify.app/microsoft-auth-redirect`
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false, // Disable cookie storage to prevent hash issues
  },
};

// Microsoft Graph API scopes for calendar access
export const graphScopes = {
  calendars: ['Calendars.ReadWrite', 'User.Read'],
};

// Calendar event interface matching Microsoft Graph API
export interface GraphCalendarEvent {
  id?: string;
  subject: string;
  body: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: 'required' | 'optional';
  }>;
  isAllDay?: boolean;
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
}

// FullCalendar event format
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    description?: string;
    location?: string;
    attendees?: string[];
    showAs?: string;
  };
}

class MicrosoftGraphService {
  private msalInstance: PublicClientApplication;
  private tokenService: MicrosoftTokenService;

  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig);
    this.tokenService = new MicrosoftTokenService(this.msalInstance);
  }

  /**
   * Initialize MSAL - simplified for popup-only authentication
   */
  async initialize(): Promise<void> {
    try {
      await this.msalInstance.initialize();
      console.log('MSAL initialized successfully');
    } catch (error) {
      console.error('Error initializing MSAL:', error);
      throw error;
    }
  }

  /**
   * Get the MSAL instance
   */
  getMsalInstance(): PublicClientApplication {
    return this.msalInstance;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0;
  }

  /**
   * Get the current account
   */
  getCurrentAccount(): AccountInfo | null {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }

  /**
   * Debug helper to show user account information
   */
  getCurrentAccountInfo(): any {
    const account = this.getCurrentAccount();
    if (!account) {
      return null;
    }
    
    return {
      username: account.username,
      localAccountId: account.localAccountId,
      homeAccountId: account.homeAccountId,
      name: account.name,
      // This is the email that should be added to ALLOWED_USERS
      email: account.username || account.localAccountId
    };
  }

  /**
   * Login with popup - primary authentication method
   */
  async loginPopup(): Promise<void> {
    try {
      console.log('Opening Microsoft authentication popup...');
      
      const response = await this.msalInstance.loginPopup({
        scopes: graphScopes.calendars,
        prompt: 'select_account'
      });
      
      console.log('Login response received:', {
        account: response.account?.username,
        scopes: response.scopes,
        tokenType: response.tokenType
      });
      
      // SECURITY: Check if user is authorized after successful login
      const account = response.account;
      console.log('Checking user authorization for:', {
        username: account?.username,
        localAccountId: account?.localAccountId,
        email: account?.username || account?.localAccountId
      });
      
      if (account && !isAuthorizedUser(account.username || account.localAccountId)) {
        console.log('User not authorized, logging out...');
        console.log('User email:', account.username || account.localAccountId);
        console.log('Allowed users:', sanitizeForLog('ALLOWED_USERS_LIST'));
        await this.msalInstance.logoutPopup();
        throw new Error('Access denied. You are not authorized to use this application.');
      }
      
      console.log('User authorized successfully:', sanitizeForLog(account?.username));

      // Store tokens in Supabase for automatic login
      if (account?.username) {
        try {
          await this.tokenService.storeTokens(response, account.username);
          console.log('Tokens stored successfully for future automatic login');
        } catch (tokenError) {
          console.error('Failed to store tokens:', tokenError);
          // Don't throw - login was successful, just token storage failed
        }
      }
      
      console.log('Login successful for user:', sanitizeForLog(account?.username));
    } catch (error) {
      console.error('Login failed with detailed error:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        errorCode: (error as any)?.errorCode,
        errorMessage: (error as any)?.errorMessage,
        subError: (error as any)?.subError
      });
      throw error;
    }
  }

  /**
   * Login with redirect (for cases where popup is blocked or not preferred)
   */
  async loginWithRedirect(): Promise<void> {
    try {
      console.log('Initiating Microsoft authentication redirect...');
      
      await this.msalInstance.loginRedirect({
        scopes: graphScopes.calendars,
        prompt: 'select_account'
      });
      
      // This method will not return since it redirects the page
    } catch (error) {
      console.error('Login redirect failed:', error);
      throw error;
    }
  }

  /**
   * Legacy redirect method - now actually uses redirect instead of popup
   */
  async loginRedirect(): Promise<void> {
    return this.loginWithRedirect();
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      // Clear stored tokens
      const accounts = this.msalInstance.getAllAccounts();
      for (const account of accounts) {
        if (account.username) {
          try {
            await this.tokenService.removeStoredToken(account.username);
          } catch (error) {
            console.error('Failed to remove stored token:', error);
          }
        }
      }
      
      await this.msalInstance.logoutPopup();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Try automatic login using stored tokens or silent authentication
   */
  async tryAutoLogin(profileEmail?: string): Promise<boolean> {
    try {
      console.log('Attempting automatic login...');

      // If no profile email provided, try with any stored accounts
      if (!profileEmail) {
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          profileEmail = accounts[0].username;
        }
      }

      if (!profileEmail) {
        console.log('No profile email available for auto login');
        return false;
      }

      // SECURITY: Check if user is authorized
      if (!isAuthorizedUser(profileEmail)) {
        console.log('User not authorized for auto login');
        return false;
      }

      // Try to get valid access token (this will use stored tokens or refresh)
      const accessToken = await this.tokenService.silentLogin(profileEmail);
      
      if (accessToken) {
        console.log('Automatic login successful');
        return true;
      }

      console.log('Automatic login failed - no valid tokens available');
      return false;
    } catch (error) {
      console.error('Automatic login failed:', error);
      return false;
    }
  }

  /**
   * Check if user is currently signed in (either through MSAL or stored tokens)
   */
  async isSignedIn(): Promise<boolean> {
    try {
      // Check MSAL accounts
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const account = accounts[0];
        if (account.username && isAuthorizedUser(account.username)) {
          // Try to get a valid token
          const hasValidToken = await this.tokenService.hasValidTokens(account.username);
          return hasValidToken;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking sign-in status:', error);
      return false;
    }
  }

  /**
   * Get access token for Microsoft Graph
   */
  private async getAccessToken(): Promise<string> {
    const account = this.getCurrentAccount();
    if (!account) {
      throw new Error('No account found. Please log in first.');
    }

    try {
      const response = await this.msalInstance.acquireTokenSilent({
        scopes: graphScopes.calendars,
        account: account,
      });
      return response.accessToken;
    } catch (error) {
      console.warn('Silent token acquisition failed, trying popup:', error);
      // Fallback to popup if silent acquisition fails
      try {
        const response = await this.msalInstance.acquireTokenPopup({
          scopes: graphScopes.calendars,
          account: account,
        });
        return response.accessToken;
      } catch (popupError) {
        console.error('Token acquisition failed:', popupError);
        throw popupError;
      }
    }
  }

  /**
   * Make authenticated API call to Microsoft Graph
   */
  private async callMicrosoftGraph(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    const accessToken = await this.getAccessToken();
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body);
    }

    // Use secure fetch that sanitizes logs in production
    const response = await secureFetch(endpoint, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Graph API error (${response.status}):`, sanitizeForLog(errorText));
      throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
    }

    // Handle empty responses (e.g., DELETE operations)
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  /**
   * Get calendar events
   */
  async getCalendarEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    let endpoint = CALENDAR_EVENTS_ENDPOINT;
    
    // Add date filtering if provided
    if (startDate && endDate) {
      const startDateTime = startDate.toISOString();
      const endDateTime = endDate.toISOString();
      endpoint += `?$filter=start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'`;
    }
    
    endpoint += `${startDate && endDate ? '&' : '?'}$orderby=start/dateTime&$top=100`;

    try {
      const response = await this.callMicrosoftGraph(endpoint);
      return this.convertGraphEventsToCalendarEvents(response.value || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  /**
   * Create a new calendar event
   */
  async createCalendarEvent(event: Omit<GraphCalendarEvent, 'id'>): Promise<CalendarEvent> {
    try {
      const response = await this.callMicrosoftGraph(CALENDAR_EVENTS_ENDPOINT, 'POST', event);
      return this.convertGraphEventToCalendarEvent(response);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateCalendarEvent(eventId: string, event: Partial<GraphCalendarEvent>): Promise<CalendarEvent> {
    try {
      const response = await this.callMicrosoftGraph(
        `${CALENDAR_EVENTS_ENDPOINT}/${eventId}`,
        'PATCH',
        event
      );
      return this.convertGraphEventToCalendarEvent(response);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteCalendarEvent(eventId: string): Promise<void> {
    try {
      await this.callMicrosoftGraph(`${CALENDAR_EVENTS_ENDPOINT}/${eventId}`, 'DELETE');
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(): Promise<any> {
    try {
      return await this.callMicrosoftGraph(`${GRAPH_BASE_URL}/me`);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Convert Microsoft Graph events to FullCalendar format
   */
  private convertGraphEventsToCalendarEvents(graphEvents: GraphCalendarEvent[]): CalendarEvent[] {
    return graphEvents.map(event => this.convertGraphEventToCalendarEvent(event));
  }

  /**
   * Convert single Microsoft Graph event to FullCalendar format
   */
  private convertGraphEventToCalendarEvent(graphEvent: GraphCalendarEvent): CalendarEvent {
    const showAsColors = {
      free: { bg: '#e8f5e8', border: '#4caf50', text: '#2e7d32' },
      tentative: { bg: '#fff3e0', border: '#ff9800', text: '#f57c00' },
      busy: { bg: '#ffebee', border: '#f44336', text: '#d32f2f' },
      oof: { bg: '#f3e5f5', border: '#9c27b0', text: '#7b1fa2' },
      workingElsewhere: { bg: '#e3f2fd', border: '#2196f3', text: '#1976d2' },
      unknown: { bg: '#f5f5f5', border: '#9e9e9e', text: '#616161' },
    };

    const colors = showAsColors[graphEvent.showAs as keyof typeof showAsColors] || showAsColors.unknown;

    // Debug: Log what we receive from Microsoft Graph
    console.log('Raw Graph event data:', {
      subject: graphEvent.subject,
      start: graphEvent.start,
      end: graphEvent.end,
      timeZone: graphEvent.start.timeZone
    });

    // Microsoft Graph returns datetime in the timezone we specified when creating the event
    // Since we specified 'America/New_York', the datetime should be in NY time
    // We need to convert this to UTC for proper handling
    const convertToUTCString = (dateTime: string, timeZone: string) => {
      // If already has timezone info, use as-is
      if (dateTime.includes('T') && (dateTime.includes('+') || dateTime.includes('Z') || dateTime.includes('-') && dateTime.lastIndexOf('-') > 10)) {
        console.log('DateTime already has timezone info:', dateTime);
        return dateTime;
      }
      
      // If it's in America/New_York timezone, we need to convert to UTC
      if (timeZone === 'America/New_York') {
        // Create a date object assuming the datetime is in NY timezone
        const tempDate = new Date(dateTime + 'Z'); // Add Z temporarily to parse
        
        // Create a date representing the same moment in NY timezone
        const nyTimeStr = tempDate.toISOString().replace('Z', '');
        const nyDate = new Date(nyTimeStr);
        
        // Use Intl to figure out what this NY time should be in UTC
        const utcEquivalent = new Date(nyDate.toLocaleString('en-US', { timeZone: 'UTC' }));
        const nyEquivalent = new Date(nyDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        
        // Calculate the offset
        const offsetMs = nyEquivalent.getTime() - utcEquivalent.getTime();
        const correctedUTC = new Date(nyDate.getTime() - offsetMs);
        
        console.log('Timezone conversion:', {
          originalDateTime: dateTime,
          tempParsed: tempDate.toISOString(),
          nyDate: nyDate.toISOString(),
          correctedUTC: correctedUTC.toISOString(),
          willDisplayAs: correctedUTC.toLocaleString('en-US', { timeZone: 'America/New_York' })
        });
        
        return correctedUTC.toISOString();
      }
      
      // For other timezones, add Z (treat as UTC)
      return dateTime + 'Z';
    };

    const startISO = convertToUTCString(graphEvent.start.dateTime, graphEvent.start.timeZone);
    const endISO = convertToUTCString(graphEvent.end.dateTime, graphEvent.end.timeZone);

    console.log('Final converted times:', {
      startISO,
      endISO,
      startDisplaysAs: new Date(startISO).toLocaleString('en-US', { timeZone: 'America/New_York' }),
      endDisplaysAs: new Date(endISO).toLocaleString('en-US', { timeZone: 'America/New_York' })
    });

    return {
      id: graphEvent.id!,
      title: graphEvent.subject,
      start: startISO,
      end: endISO,
      allDay: graphEvent.isAllDay || false,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: {
        description: graphEvent.body?.content || '',
        location: graphEvent.location?.displayName || '',
        attendees: graphEvent.attendees?.map(a => a.emailAddress.address) || [],
        showAs: graphEvent.showAs || 'unknown',
      },
    };
  }

  /**
   * Convert FullCalendar event to Microsoft Graph format
   */
  convertCalendarEventToGraphEvent(calendarEvent: CalendarEvent, isUpdate = false): GraphCalendarEvent {
    const graphEvent: GraphCalendarEvent = {
      subject: calendarEvent.title,
      body: {
        contentType: 'Text' as const,
        content: calendarEvent.extendedProps?.description || '',
      },
      start: {
        dateTime: calendarEvent.start,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: calendarEvent.end || calendarEvent.start,
        timeZone: 'America/New_York',
      },
      isAllDay: calendarEvent.allDay,
      showAs: (calendarEvent.extendedProps?.showAs as any) || 'busy',
    };

    if (calendarEvent.extendedProps?.location) {
      graphEvent.location = {
        displayName: calendarEvent.extendedProps.location,
      };
    }

    if (!isUpdate && calendarEvent.id) {
      graphEvent.id = calendarEvent.id;
    }

    return graphEvent;
  }
}

// Export singleton instance
export const microsoftGraphService = new MicrosoftGraphService();
export default microsoftGraphService;
