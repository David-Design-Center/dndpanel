import { supabase } from '@/lib/supabase';

// Use your existing working Gmail token function
const GMAIL_TOKEN_FUNCTION_URL = "https://jvcdxglsoholhgapfpet.supabase.co/functions/v1/refresh-gmail-token";

// Cache for access tokens and calendar data to prevent infinite API calls
const tokenCache = new Map<string, { token: string; expiry: number }>();
const eventsCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const TOKEN_DURATION = 50 * 60 * 1000; // 50 minutes (tokens last 1 hour)

// Track ongoing requests to prevent duplicate calls
const ongoingRequests = new Map<string, Promise<any>>();

async function getCalendarAccessToken(userEmail: string): Promise<string> {
  const cached = tokenCache.get(userEmail);
  
  if (cached && Date.now() < cached.expiry) {
    console.log('🔑 Using cached token for:', userEmail);
    return cached.token;
  }

  // Check if we're already requesting a token for this user
  const requestKey = `token:${userEmail}`;
  if (ongoingRequests.has(requestKey)) {
    console.log('🔑 Waiting for ongoing token request for:', userEmail);
    return ongoingRequests.get(requestKey);
  }

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No valid session found. Please sign in again.');
  }

  console.log('🔑 Getting fresh calendar token for:', userEmail);

  const tokenPromise = fetch(GMAIL_TOKEN_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ userEmail }),
  }).then(async (response) => {
    console.log('🔑 Token response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token fetch error:', response.status, errorText);
      throw new Error(`Token fetch failed: ${errorText}`);
    }

    const { access_token } = await response.json();
    
    if (!access_token) {
      throw new Error('No access token in response');
    }
    
    // Cache the token
    tokenCache.set(userEmail, {
      token: access_token,
      expiry: Date.now() + TOKEN_DURATION
    });
    
    console.log('✅ Got and cached access token');
    return access_token;
  }).finally(() => {
    ongoingRequests.delete(requestKey);
  });

  ongoingRequests.set(requestKey, tokenPromise);
  return tokenPromise;
}

async function makeCalendarApiRequest(accessToken: string, url: string, options: RequestInit = {}) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${url}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Calendar API error:', error);
    throw new Error(`Calendar API error: ${response.status} - ${error}`);
  }

  // DELETE requests return empty response, don't try to parse JSON
  if (options.method === 'DELETE') {
    return null;
  }

  return response.json();
}

export async function fetchCalendarEvents(userEmail: string, timeMin: string, timeMax: string, calendarId = 'primary') {
  // Create a cache key for this specific request
  const cacheKey = `events:${userEmail}:${calendarId}:${timeMin}:${timeMax}`;
  const cached = eventsCache.get(cacheKey);
  
  // Check if we have cached data that's still fresh
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📅 Using cached events for:', userEmail, '(', cached.data.length, 'events)');
    return cached.data;
  }

  // Check if we're already fetching this data
  if (ongoingRequests.has(cacheKey)) {
    console.log('📅 Waiting for ongoing events request for:', userEmail);
    return ongoingRequests.get(cacheKey);
  }

  console.log('📅 Fetching fresh events for:', userEmail, 'from', timeMin, 'to', timeMax);
  
  const eventsPromise = (async () => {
    const accessToken = await getCalendarAccessToken(userEmail);
    
    const queryParamsObj: Record<string, string> = {
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    };
    
    // Ensure dates are in proper RFC3339 format for Google Calendar API
    if (timeMin) {
      // Convert to UTC if needed
      const minDate = new Date(timeMin);
      queryParamsObj.timeMin = minDate.toISOString();
    }
    if (timeMax) {
      // Convert to UTC if needed  
      const maxDate = new Date(timeMax);
      queryParamsObj.timeMax = maxDate.toISOString();
    }
    
    const queryParams = new URLSearchParams(queryParamsObj);
    console.log('🔍 Calendar API request URL:', `/calendars/${encodeURIComponent(calendarId)}/events?${queryParams}`);
    
    const data = await makeCalendarApiRequest(
      accessToken, 
      `/calendars/${encodeURIComponent(calendarId)}/events?${queryParams}`
    );

    // Transform events for FullCalendar
    const events = data.items?.map((event: any) => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      allDay: !!event.start?.date,
      backgroundColor: '#3788d8',
      extendedProps: {
        description: event.description,
        location: event.location,
        attendees: event.attendees,
        raw: event
      }
    })) || [];

    // Cache the result
    eventsCache.set(cacheKey, {
      data: events,
      timestamp: Date.now()
    });

    console.log('✨ Fetched and cached', events.length, 'events');
    return events;
  })().finally(() => {
    ongoingRequests.delete(cacheKey);
  });

  ongoingRequests.set(cacheKey, eventsPromise);
  return eventsPromise;
}

// Clear cache when events are modified
function clearEventsCache(userEmail: string, calendarId = 'primary') {
  const keysToDelete = Array.from(eventsCache.keys()).filter(key => 
    key.includes(`${userEmail}:${calendarId}:`)
  );
  keysToDelete.forEach(key => eventsCache.delete(key));
  console.log('🗑️ Cleared events cache for:', userEmail, '(', keysToDelete.length, 'entries)');
}

export async function createCalendarEvent(userEmail: string, event: any, calendarId = 'primary') {
  const accessToken = await getCalendarAccessToken(userEmail);
  
  const result = await makeCalendarApiRequest(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      body: JSON.stringify(event),
    }
  );

  // Clear cache after creating an event
  clearEventsCache(userEmail, calendarId);
  
  return result;
}

export async function updateCalendarEvent(userEmail: string, eventId: string, event: any, calendarId = 'primary') {
  const accessToken = await getCalendarAccessToken(userEmail);
  
  const result = await makeCalendarApiRequest(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
    {
      method: 'PATCH',
      body: JSON.stringify(event),
    }
  );

  // Clear cache after updating an event
  clearEventsCache(userEmail, calendarId);
  
  return result;
}

export async function deleteCalendarEvent(userEmail: string, eventId: string, calendarId = 'primary') {
  const accessToken = await getCalendarAccessToken(userEmail);
  
  await makeCalendarApiRequest(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' }
  );

  // Clear cache after deleting an event
  clearEventsCache(userEmail, calendarId);
  
  return { success: true };
}

export async function fetchUserCalendars(userEmail: string) {
  const cacheKey = `calendars:${userEmail}`;
  const cached = eventsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📋 Using cached calendars for:', userEmail);
    return cached.data;
  }

  if (ongoingRequests.has(cacheKey)) {
    console.log('📋 Waiting for ongoing calendars request for:', userEmail);
    return ongoingRequests.get(cacheKey);
  }

  const calendarsPromise = (async () => {
    const accessToken = await getCalendarAccessToken(userEmail);
    const result = await makeCalendarApiRequest(accessToken, '/users/me/calendarList');
    
    eventsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  })().finally(() => {
    ongoingRequests.delete(cacheKey);
  });

  ongoingRequests.set(cacheKey, calendarsPromise);
  return calendarsPromise;
}
