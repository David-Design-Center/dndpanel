import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { importPKCS8, SignJWT } from "https://deno.land/x/jose@v4.15.0/index.ts";

const ALLOWED_ORIGINS = [
  "https://order.dnddesigncenter.com",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const SCOPES = [
  // Gmail - Full access (most important for email operations)
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose", 
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/gmail.insert",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/gmail.settings.sharing",
  
  // User info
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/user.emails.read",
  
  // Contacts
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/contacts.other.readonly",
  
  // Calendar
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  
  // Drive
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.meet.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  
  // Docs
  "https://www.googleapis.com/auth/docs"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: getCorsHeaders(req)
    });
  }

  try {
    const { userEmail } = await req.json();
    console.log("ℹ️ Generating Gmail token for userEmail:", userEmail);
    
    if (!userEmail) {
      return new Response(JSON.stringify({
        error: "userEmail is required"
      }), {
        status: 400,
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json"
        }
      });
    }

    const keyJson = Deno.env.get("GOOGLE_SA_KEY");
    if (!keyJson) throw new Error("Missing GOOGLE_SA_KEY");
    
    const key = JSON.parse(keyJson);
    console.log("ℹ️ Service account key fields:", Object.keys(key));

    // Import the PEM private key
    const pk = await importPKCS8(key.private_key, "RS256");

    // Build and sign the JWT for domain-wide delegation
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({
      iss: key.client_email,
      sub: userEmail, // Impersonate this user
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: SCOPES.join(" ")
    }).setProtectedHeader({
      alg: "RS256",
      typ: "JWT"
    }).sign(pk);

    // Exchange JWT for access_token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    });

    const tokenJson = await tokenRes.json();
    
    if (!tokenRes.ok) {
      console.error("❌ Token endpoint error:", tokenJson);
      throw new Error(tokenJson.error_description || tokenJson.error);
    }

    console.log("✅ Successfully generated Gmail access token via domain-wide delegation");
    
    return new Response(JSON.stringify({
      access_token: tokenJson.access_token,
      expires_in: tokenJson.expires_in || 3600,
      token_type: tokenJson.token_type || "Bearer"
    }), {
      status: 200,
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("❌ Service-account JWT flow error:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/json"
      }
    });
  }
});