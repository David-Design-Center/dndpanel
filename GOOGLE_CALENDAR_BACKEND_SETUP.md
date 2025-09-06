# Google Calendar Backend Integration

This document outlines how to implement the backend API endpoints to replace the mock implementation in the GoogleCalendar component using your existing Supabase service account infrastructure.

## Prerequisites

✅ **Already Complete in Your System:**
- Google Cloud project with service account
- Domain-wide delegation enabled
- `refresh-gmail-token` Supabase Edge Function with service account authentication
- Environment variable `GOOGLE_SA_KEY` configured

## Update Existing Supabase Function

Your existing `refresh-gmail-token` function already includes Google Calendar scopes! No additional setup needed.

## Create New Supabase Edge Function: `google-calendar`

Create a new Edge Function specifically for Calendar operations:

```bash
supabase functions new google-calendar
```

### Update `supabase/functions/google-calendar/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { importPKCS8, SignJWT } from "https://deno.land/x/jose@v4.15.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

async function getCalendarAccessToken(userEmail: string): Promise<string> {
  const keyJson = Deno.env.get("GOOGLE_SA_KEY");
  if (!keyJson) throw new Error("Missing GOOGLE_SA_KEY");
  
  const key = JSON.parse(keyJson);
  const pk = await importPKCS8(key.private_key, "RS256");

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: key.client_email,
    sub: userEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: CALENDAR_SCOPES.join(" ")
  }).setProtectedHeader({
    alg: "RS256",
    typ: "JWT"
  }).sign(pk);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(tokenData.error_description || tokenData.error);
  }

  return tokenData.access_token;
}

async function makeCalendarRequest(accessToken: string, url: string, options: RequestInit = {}) {
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
    throw new Error(`Calendar API error: ${response.status} - ${error}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userEmail, action, ...params } = await req.json();
    
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "userEmail is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const accessToken = await getCalendarAccessToken(userEmail);

    let result;

    switch (action) {
      case 'listEvents': {
        const { calendarId = 'primary', timeMin, timeMax } = params;
        const queryParams = new URLSearchParams({
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '250',
          ...(timeMin && { timeMin }),
          ...(timeMax && { timeMax }),
        });
        
        const data = await makeCalendarRequest(
          accessToken, 
          `/calendars/${encodeURIComponent(calendarId)}/events?${queryParams}`
        );

        // Transform events for FullCalendar
        const events = data.items?.map((event: any) => ({
          id: event.id,
          title: event.summary,
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

        result = events;
        break;
      }

      case 'createEvent': {
        const { calendarId = 'primary', event } = params;
        result = await makeCalendarRequest(
          accessToken,
          `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
          {
            method: 'POST',
            body: JSON.stringify(event),
          }
        );
        break;
      }

      case 'updateEvent': {
        const { calendarId = 'primary', eventId, event } = params;
        result = await makeCalendarRequest(
          accessToken,
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
          {
            method: 'PATCH',
            body: JSON.stringify(event),
          }
        );
        break;
      }

      case 'deleteEvent': {
        const { calendarId = 'primary', eventId } = params;
        await makeCalendarRequest(
          accessToken,
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          { method: 'DELETE' }
        );
        result = { success: true };
        break;
      }

      case 'listCalendars': {
        result = await makeCalendarRequest(accessToken, '/users/me/calendarList');
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Calendar API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

### Deploy the function:
```bash
supabase functions deploy google-calendar
```

## Create Calendar Service

Create a new service file to handle calendar operations:

### `src/services/calendarService.ts`:

```typescript
import { supabase } from '@/lib/supabase';

const CALENDAR_FUNCTION_URL = "https://jvcdxglsoholhgapfpet.supabase.co/functions/v1/google-calendar";

async function makeCalendarRequest(userEmail: string, action: string, params: any = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No valid session found. Please sign in again.');
  }

  const response = await fetch(CALENDAR_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ 
      userEmail, 
      action,
      ...params 
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed (${response.status})`);
  }

  return response.json();
}

export async function fetchCalendarEvents(userEmail: string, timeMin: string, timeMax: string, calendarId = 'primary') {
  return makeCalendarRequest(userEmail, 'listEvents', {
    calendarId,
    timeMin,
    timeMax
  });
}

export async function createCalendarEvent(userEmail: string, event: any, calendarId = 'primary') {
  return makeCalendarRequest(userEmail, 'createEvent', {
    calendarId,
    event
  });
}

export async function updateCalendarEvent(userEmail: string, eventId: string, event: any, calendarId = 'primary') {
  return makeCalendarRequest(userEmail, 'updateEvent', {
    calendarId,
    eventId,
    event
  });
}

export async function deleteCalendarEvent(userEmail: string, eventId: string, calendarId = 'primary') {
  return makeCalendarRequest(userEmail, 'deleteEvent', {
    calendarId,
    eventId
  });
}

export async function fetchUserCalendars(userEmail: string) {
  return makeCalendarRequest(userEmail, 'listCalendars');
}
```

## Update GoogleCalendar Component

Replace the mock functions in `src/components/calendar/GoogleCalendar.tsx`:

### Replace fetchEvents Function

```typescript
import { fetchCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/services/calendarService';
import { useProfile } from '@/contexts/ProfileContext';

// Inside GoogleCalendar component:
const { currentProfile } = useProfile();

const fetchEvents = async (info: any, success: any, failure: any) => {
  try {
    setIsLoading(true);
    
    if (!currentProfile?.email) {
      throw new Error('No user profile found');
    }
    
    const events = await fetchCalendarEvents(
      currentProfile.email,
      info.startStr,
      info.endStr,
      'primary'
    );
    
    success(events);
  } catch (err) {
    console.error('Failed to fetch events:', err);
    failure(err);
    toast({
      title: "Error",
      description: "Failed to fetch calendar events",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};
```

### Replace createEvent Function

```typescript
const createEvent = async (selectInfo: any) => {
  const title = prompt("Event title:");
  if (!title) {
    selectInfo.view.calendar.unselect();
    return;
  }

  if (!currentProfile?.email) {
    toast({
      title: "Error", 
      description: "No user profile found",
      variant: "destructive",
    });
    return;
  }

  const event = {
    summary: title,
    start: selectInfo.allDay 
      ? { date: selectInfo.startStr }
      : { dateTime: selectInfo.start.toISOString() },
    end: selectInfo.allDay 
      ? { date: selectInfo.endStr }
      : { dateTime: selectInfo.end.toISOString() },
  };

  try {
    await createCalendarEvent(currentProfile.email, event);
    
    // Refresh events
    selectInfo.view.calendar.refetchEvents();
    
    toast({
      title: "Success",
      description: "Event created successfully",
    });
  } catch (err) {
    console.error('Failed to create event:', err);
    toast({
      title: "Error",
      description: "Failed to create event",
      variant: "destructive",
    });
  }
  
  selectInfo.view.calendar.unselect();
};
```

### Replace updateEvent Function

```typescript
const updateEvent = async (changeInfo: any) => {
  if (!currentProfile?.email) return;

  const event = changeInfo.event;
  const updatedEvent = {
    summary: event.title,
    start: event.allDay 
      ? { date: event.startStr }
      : { dateTime: event.start.toISOString() },
    end: event.allDay 
      ? { date: event.endStr }
      : { dateTime: event.end.toISOString() },
  };

  try {
    await updateCalendarEvent(
      currentProfile.email,
      event.id,
      updatedEvent
    );

    toast({
      title: "Success",
      description: "Event updated successfully",
    });
  } catch (err) {
    console.error('Failed to update event:', err);
    changeInfo.revert();
    toast({
      title: "Error",
      description: "Failed to update event",
      variant: "destructive",
    });
  }
};
```

### Replace deleteEvent Function

```typescript
const deleteEvent = async (clickInfo: any) => {
  if (!currentProfile?.email) return;

  if (confirm(`Are you sure you want to delete the event '${clickInfo.event.title}'?`)) {
    try {
      await deleteCalendarEvent(currentProfile.email, clickInfo.event.id);

      clickInfo.event.remove();
      
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
    } catch (err) {
      console.error('Failed to delete event:', err);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  }
};
```

## Security and Testing

### Domain User Validation
Your existing system already handles domain-wide delegation perfectly for `@dnddesigncenter.com` users.

### Deployment Steps
1. Deploy the new calendar function:
   ```bash
   supabase functions deploy google-calendar
   ```

2. Create the calendar service file above

3. Update the GoogleCalendar component with the new functions

### Testing Checklist
- [ ] Events load correctly for domain users
- [ ] Create new events works
- [ ] Drag/drop to move events works  
- [ ] Click to delete events works
- [ ] Multiple calendars display properly
- [ ] Timezone handling is correct
- [ ] Error handling shows appropriate toasts

## Advantages of This Approach

✅ **Leverages Existing Infrastructure**: Uses your proven service account setup  
✅ **Consistent Authentication**: Same pattern as Gmail integration  
✅ **Domain Control**: Perfect for managing your 3 workspace accounts  
✅ **No Additional Dependencies**: Pure Supabase Edge Functions  
✅ **Secure**: Service account keys stay server-side  
✅ **Scalable**: Handles multiple users seamlessly  

Your calendar system will now have the same enterprise-grade authentication as your Gmail system!



Details
Slug
smart-responder
Endpoint URL
https://jvcdxglsoholhgapfpet.supabase.co/functions/v1/smart-responder

Copy
Region
All functions are deployed globally
Created at
Tuesday, September 2, 2025 9:50 PM
Last updated at
Tuesday, September 2, 2025 9:50 PM
Deployments
1
Import Maps
Import maps are not used for this function

Import maps allow the use of bare specifiers in functions instead of explicit import URLs

Function Configuration
smart-responder
Name
Your slug and endpoint URL will remain the same

Verify JWT with legacy secret
Requires that a JWT signed only by the legacy JWT secret is present in the Authorization header. The easy to obtain anon key can be used to satisfy this requirement. Recommendation: OFF with JWT and additional authorization logic implemented inside your function's code.

Save changes

Invoke function
cURL
JavaScript
Swift
Flutter
Python
curl -L -X POST 'https://jvcdxglsoholhgapfpet.supabase.co/functions/v1/smart-responder' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y2R4Z2xzb2hvbGhnYXBmcGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzM0MjUsImV4cCI6MjA2NDAwOTQyNX0.1NPv3ocVOrhVjD0CjfU3FolCsbVEFGOdJAkxnWEPPdY' \
  -H 'Content-Type: application/json' \
  --data '{"name":"Functions"}'

Develop locally
> 1. Download the function
$
supabase functions download smart-responder 
> Deploy a new version
$
supabase functions deploy smart-responder 
> Delete the function
$
supabase functions delete smart-responder 