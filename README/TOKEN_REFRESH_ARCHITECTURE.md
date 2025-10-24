# Gmail Token Refresh Architecture

## Problem Statement
After 60 minutes of inactivity or when a token expires, Gmail API calls would fail with a **401 Unauthorized** error, breaking the email UI until the user manually refreshes.

## Solution Overview
Implement automatic, background token refresh that:
1. **Proactively refreshes** at the 50-minute mark (before 1-hour expiry)
2. **Auto-retries** failed requests on 401 errors with a fresh token
3. **Prevents** multiple simultaneous refreshes
4. **Notifies** listeners when tokens are refreshed

## Architecture

### 1. TokenRefreshManager (`src/utils/tokenRefreshManager.ts`)
Core singleton that manages the complete token lifecycle:

**Key Responsibilities:**
- Tracks token expiry time
- Schedules refresh at 50-minute mark
- Handles forced refresh on 401 errors
- Intercepts fetch calls to Gmail API
- Implements exponential backoff for retries

**Key Methods:**
```typescript
setCurrentUser(email)          // Set which user's token to refresh
initializeTokenRefresh(token)  // Start refresh cycle after token obtained
forceRefresh()                 // Immediate refresh (used on 401 errors)
isTokenExpired()               // Check token validity
getToken()                     // Get current token
onTokenRefreshed(callback)     // Listen to refresh events
```

### 2. AuthContext Integration (`src/contexts/AuthContext.tsx`)
AuthContext now:
- Instantiates token manager when refreshing token
- Sets current user email before token refresh
- Calls `tokenRefreshManager.initializeTokenRefresh()` after getting token
- Cleans up token manager on logout

**Key Code:**
```typescript
// After getting fresh token
tokenRefreshManager.setCurrentUser(userEmail);
tokenRefreshManager.initializeTokenRefresh(accessToken);
```

### 3. Automatic Token Refresh Flow

```
┌─────────────────────────────────────────┐
│ User logs in / Token initialized        │
│ Token expires in: 1 hour                │
└──────────────┬──────────────────────────┘
               │
               ├─ 50 min: Schedule refresh
               │
               ├─ [Minute 50] Refresh timer fires
               │   ↓
               │   fetchGmailAccessToken() via edge function
               │   ↓
               │   Update gapi client with new token
               │   ↓
               │   Reschedule next refresh in 50 min
               │   ↓
               │   Notify listeners
               │
               ├─ [During API call] Request fails with 401?
               │   ↓
               │   Fetch interceptor catches error
               │   ↓
               │   Force refresh token immediately
               │   ↓
               │   Retry request with new token
               │   ↓
               │   Success!
               │
               └─ [Logout] Clean up timers
```

### 4. Fetch Interceptor
The token manager patches `window.fetch` to:
1. Monitor all Gmail API requests
2. Detect 401 Unauthorized responses
3. Trigger immediate token refresh
4. Automatically retry the failed request with new token

**Benefits:**
- No changes needed to individual API callers
- Transparent recovery from token expiry
- User sees no interruption

## Token Lifecycle

### Normal (Proactive) Refresh
```
Time 0:00   → Token obtained, expires at 1:00
Time 0:50   → Refresh timer fires
            → New token fetched from edge function
            → Token resets to expire at 1:50
Time 1:40   → Refresh timer fires again
            → Process repeats...
```

### Error-Triggered (Reactive) Refresh
```
Time 1:02   → User makes API call after token expired
            → API returns 401 Unauthorized
            → Fetch interceptor detects error
            → forceRefresh() called
            → New token fetched immediately
            → Request retried with new token
            → Success!
```

## Edge Function (`refresh-gmail-token`)
Located in Supabase:
- Takes user email as input
- Uses domain-wide delegation to generate access token
- Returns fresh token valid for 1 hour
- Called by `fetchGmailAccessToken()` in lib/gmail.ts

## Benefits

✅ **Seamless Experience** - Token refreshes silently in background  
✅ **No User Interruption** - Happens before expiry or auto-recovered on error  
✅ **Domain-Wide Delegation** - No refresh tokens needed to store  
✅ **Automatic Retry** - Failed requests recover transparently  
✅ **Listener Pattern** - Components can react to token changes if needed  
✅ **Single Source of Truth** - TokenRefreshManager is singleton  

## Testing Token Refresh

To verify the system works:

1. **Test proactive refresh** (50-minute mark):
   - Set browser to fast clock
   - Watch console for "🔄 Background token refresh triggered"
   - Verify "✅ Background token refresh successful" appears

2. **Test 401 recovery** (simulate expiry):
   - Manually invalidate token in DevTools
   - Trigger API call (fetch emails)
   - Watch console for "⚠️ Gmail API returned 401"
   - Verify request is retried and succeeds

3. **Test no interruption**:
   - Let app run for 50+ minutes
   - Verify UI continues working smoothly
   - Check console for automatic refresh logs

## Future Improvements

- [ ] Implement token validity check before making requests
- [ ] Add exponential backoff for repeated refresh failures
- [ ] Implement token refresh statistics/analytics
- [ ] Add graceful degradation mode if refresh fails multiple times
- [ ] Support multiple concurrent users (MCP server scenario)
