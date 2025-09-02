# Server-Side Setup: Extending refresh-gmail-token for Google Drive

## 🎯 **Overview**
Update your existing `refresh-gmail-token` Supabase Edge Function to handle both Gmail and Google Drive token requests.

## 🛠️ **Edge Function Updates**

### **1. Update Function Logic**

In your `refresh-gmail-token` Edge Function, modify the handler to support different scopes:

```typescript
// In supabase/functions/refresh-gmail-token/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { user_id, scope = 'gmail' } = await req.json();
    
    console.log(`🔄 Token refresh requested for user ${user_id}, scope: ${scope}`);
    
    if (scope === 'drive') {
      // Handle Google Drive token request
      const driveToken = await getGoogleDriveToken(user_id);
      
      return new Response(
        JSON.stringify({ 
          access_token: driveToken,
          scope: 'drive',
          expires_in: 3600 
        }),
        { 
          headers: { "Content-Type": "application/json" },
          status: 200 
        }
      );
    } else {
      // Existing Gmail token logic
      const gmailToken = await getGmailToken(user_id);
      
      return new Response(
        JSON.stringify({ 
          access_token: gmailToken,
          scope: 'gmail',
          expires_in: 3600 
        }),
        { 
          headers: { "Content-Type": "application/json" },
          status: 200 
        }
      );
    }
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

// Add this new function for Drive tokens
async function getGoogleDriveToken(userId: string): Promise<string> {
  // Use your existing service account setup but with Drive scope
  const serviceAccount = {
    // Your existing service account credentials
    type: "service_account",
    project_id: "your-project-id",
    private_key_id: "your-key-id",
    private_key: Deno.env.get("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, '\n'),
    client_email: "your-service-account@your-project.iam.gserviceaccount.com",
    client_id: "your-client-id",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
  };

  // Generate JWT for Drive scope
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: userId, // Impersonate the user
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  // Create and sign JWT (use your existing JWT signing logic)
  const jwt = await createJWT(payload, serviceAccount.private_key);

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenResponse.ok) {
    throw new Error(`Drive token exchange failed: ${tokenData.error}`);
  }

  return tokenData.access_token;
}

// Your existing getGmailToken function remains the same
async function getGmailToken(userId: string): Promise<string> {
  // Your existing Gmail token logic here
  // (keep this unchanged)
}

// Your existing JWT creation function
async function createJWT(payload: any, privateKey: string): Promise<string> {
  // Your existing JWT signing logic
  // (keep this unchanged)
}
```

### **2. Update Environment Variables**

Make sure your Edge Function has access to:
- `GOOGLE_PRIVATE_KEY` (your existing service account key)
- Any other Google Cloud credentials you're already using

### **3. Enable Google Drive API**

In your Google Cloud Console:

1. **Navigate to APIs & Services > Enabled APIs**
2. **Click "+ ENABLE APIS AND SERVICES"**
3. **Search for "Google Drive API"**
4. **Click "ENABLE"**

### **4. Update Service Account Permissions**

Ensure your service account has domain-wide delegation for Drive:

1. **Go to Google Cloud Console > IAM & Admin > Service Accounts**
2. **Click on your service account**
3. **Go to "Domain-wide delegation" section**
4. **Make sure these scopes are authorized**:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/drive.file
   ```

## 🧪 **Testing the Updated Function**

### **Test Gmail Token (existing functionality)**
```bash
curl -X POST https://jvcdxglsoholhgapfpet.supabase.co/functions/v1/refresh-gmail-token \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-id"}'
```

### **Test Drive Token (new functionality)**
```bash
curl -X POST https://jvcdxglsoholhgapfpet.supabase.co/functions/v1/refresh-gmail-token \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-id", "scope": "drive"}'
```

## 🔍 **Minimal Changes Required**

If you want to make minimal changes to your existing function:

```typescript
// Just add this at the beginning of your existing handler
const { user_id, scope = 'gmail' } = await req.json(); // Add scope parameter

// Add this condition before your existing logic
if (scope === 'drive') {
  // New Drive token logic here
  const driveToken = await getGoogleDriveToken(user_id);
  return new Response(JSON.stringify({ access_token: driveToken }));
}

// Your existing Gmail logic continues unchanged below...
```

## 🚨 **Important Notes**

1. **Backwards Compatibility**: The function still works for Gmail tokens (default behavior)
2. **Security**: Use the same authentication and authorization you have for Gmail
3. **Error Handling**: Include proper error handling for Drive API failures
4. **Logging**: Add logging to help debug token issues

## ✅ **Verification Steps**

1. **Deploy the updated function**
2. **Test Drive token request from your app**
3. **Verify token works with Drive API**
4. **Check logs for any errors**

Once you've updated your Edge Function with Drive scope support, the client-side code will work seamlessly! 🚀