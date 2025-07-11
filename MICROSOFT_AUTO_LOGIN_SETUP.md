# Microsoft Calendar Auto-Login Setup

This document explains how the automatic Microsoft login system works and how to set it up.

## How It Works

The system now stores Microsoft Graph tokens securely in Supabase, allowing users to automatically sign in to the calendar without needing to re-authenticate every time.

### Flow:
1. **First Login**: User clicks "Sign In" → Microsoft OAuth popup → User grants permissions → Tokens stored in Supabase
2. **Subsequent Visits**: User clicks "Calendar" → System checks for valid stored tokens → Automatically signs in if tokens are valid
3. **Token Refresh**: When tokens expire, the system automatically refreshes them using MSAL

## Database Setup

Run this SQL in your Supabase dashboard to create the required table:

```sql
-- Create table for storing Microsoft Graph tokens
CREATE TABLE microsoft_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_email text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp with time zone NOT NULL,
    scope text,
    token_type text DEFAULT 'Bearer',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure one token per user per profile
    UNIQUE(user_id, profile_email)
);

-- Enable RLS
ALTER TABLE microsoft_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tokens" 
    ON microsoft_tokens FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens" 
    ON microsoft_tokens FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" 
    ON microsoft_tokens FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" 
    ON microsoft_tokens FOR DELETE 
    USING (auth.uid() = user_id);
```

## Security Features

1. **Row Level Security (RLS)**: Users can only access their own tokens
2. **User Authorization**: Only authorized users (as defined in `security.ts`) can use the calendar
3. **Token Encryption**: Tokens are stored securely in Supabase
4. **Automatic Cleanup**: Tokens are removed when user logs out

## User Experience

### Before (Manual Login Every Time):
1. User visits Calendar page
2. Sees "Sign In" button
3. Clicks "Sign In"
4. Microsoft OAuth popup
5. Grants permissions
6. Calendar loads

### After (Automatic Login):
1. User visits Calendar page
2. System automatically checks for stored tokens
3. If valid tokens exist, calendar loads immediately
4. If no tokens or expired, shows "Sign In" button

## Files Modified

- `src/services/microsoftTokenService.ts` - New service for managing tokens
- `src/services/microsoftGraphService.ts` - Updated to use token service
- `src/pages/Calendar.tsx` - Updated to try auto-login first
- `src/lib/supabase.ts` - Shared Supabase client
- `supabase/migrations/20250707000000_add_microsoft_tokens.sql` - Database migration

## Testing

1. Go to Calendar page → Sign in manually (first time)
2. Refresh the page → Should automatically sign in
3. Wait for token to expire (or delete from database) → Should prompt for login again
4. Sign out → Should clear stored tokens

## Error Handling

The system gracefully handles:
- Expired tokens (automatically refreshes)
- Invalid tokens (prompts for re-login)
- Network errors (shows appropriate error messages)
- Unauthorized users (blocks access)
