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
  console.log("🔑 Getting calendar access token for:", userEmail);
  
  const keyJson = Deno.env.get("GOOGLE_SA_KEY");
  if (!keyJson) throw new Error("Missing GOOGLE_SA_KEY");
  
  const key = JSON.parse(keyJson);
  console.log("📧 Service account email:", key.client_email);
  
  const pk = await importPKCS8(key.private_key, "RS256");

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: key.client_email,
    sub: userEmail, // Impersonate this user
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: CALENDAR_SCOPES.join(" ")
  }).setProtectedHeader({
    alg: "RS256",
    typ: "JWT"
  }).sign(pk);

  console.log("🔗 Requesting token from Google...");
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
    console.error("❌ Token error:", tokenData);
    throw new Error(tokenData.error_description || tokenData.error);
  }

  console.log("✅ Got access token successfully");
  return tokenData.access_token;
}

async function makeCalendarRequest(accessToken: string, url: string, options: RequestInit = {}) {
  console.log("📅 Making Calendar API request:", url);
  
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
    console.error(`❌ Calendar API error: ${response.status} - ${error}`);
    throw new Error(`Calendar API error: ${response.status} - ${error}`);
  }

  return response.json();
}

serve(async (req) => {
  console.log("📨 Incoming request:", req.method, req.url);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log("📝 Request body:", JSON.stringify(requestBody, null, 2));
    
    const { userEmail, action, ...params } = requestBody;
    
    if (!userEmail) {
      console.error("❌ Missing userEmail");
      return new Response(JSON.stringify({ error: "userEmail is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("👤 Processing for user:", userEmail, "action:", action);
    const accessToken = await getCalendarAccessToken(userEmail);

    let result;

    switch (action) {
      case 'listEvents': {
        const { calendarId = 'primary', timeMin, timeMax } = params;
        console.log("📋 Listing events for calendar:", calendarId, "from:", timeMin, "to:", timeMax);
        
        // Build query params properly
        const queryParamsObj: Record<string, string> = {
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '250',
        };
        
        if (timeMin) queryParamsObj.timeMin = timeMin;
        if (timeMax) queryParamsObj.timeMax = timeMax;
        
        const queryParams = new URLSearchParams(queryParamsObj);
        
        const data = await makeCalendarRequest(
          accessToken, 
          `/calendars/${encodeURIComponent(calendarId)}/events?${queryParams}`
        );

        console.log("📊 Raw events from Google:", data.items?.length || 0);

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

        console.log("✨ Transformed events:", events.length);
        result = events;
        break;
      }

      case 'createEvent': {
        const { calendarId = 'primary', event } = params;
        console.log("➕ Creating event:", event.summary);
        result = await makeCalendarRequest(
          accessToken,
          `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
          {
            method: 'POST',
            body: JSON.stringify(event),
          }
        );
        console.log("✅ Event created:", result.id);
        break;
      }

      case 'updateEvent': {
        const { calendarId = 'primary', eventId, event } = params;
        console.log("✏️ Updating event:", eventId);
        result = await makeCalendarRequest(
          accessToken,
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
          {
            method: 'PATCH',
            body: JSON.stringify(event),
          }
        );
        console.log("✅ Event updated");
        break;
      }

      case 'deleteEvent': {
        const { calendarId = 'primary', eventId } = params;
        console.log("🗑️ Deleting event:", eventId);
        await makeCalendarRequest(
          accessToken,
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          { method: 'DELETE' }
        );
        result = { success: true };
        console.log("✅ Event deleted");
        break;
      }

      case 'listCalendars': {
        console.log("📋 Listing calendars");
        result = await makeCalendarRequest(accessToken, '/users/me/calendarList');
        console.log("📅 Found calendars:", result.items?.length || 0);
        break;
      }

      default:
        console.error("❌ Unknown action:", action);
        throw new Error(`Unknown action: ${action}`);
    }

    console.log("✅ Request successful");
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("💥 Calendar API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
