# Authentication Setup Guide

## Google Cloud Console Setup

### 1. Google OAuth Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project
3. Enable the following APIs:
   - Gmail API
   - Google People API (Contacts)
   - Google Calendar API

### 2. OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Authorized JavaScript origins:
   ```
   http://localhost:5173
   https://your-domain.com
   ```
5. Authorized redirect URIs:
   ```
   http://localhost:5173
   https://your-domain.com
   http://localhost:5173/microsoft-auth-redirect.html
   https://your-domain.com/microsoft-auth-redirect.html
   ```

### 3. Important Configuration
- **Enable refresh tokens**: In your OAuth consent screen, ensure you request offline access
- **Token expiry**: Set up proper refresh token handling
- **Scopes needed**:
  ```
  https://www.googleapis.com/auth/gmail.modify
  https://www.googleapis.com/auth/gmail.send
  https://www.googleapis.com/auth/contacts.readonly
  ```

## Supabase Configuration

### 1. Environment Variables (CRITICAL!)
Set these in your Supabase Dashboard under **Settings > Edge Functions > Environment Variables**:

```bash
GAPI_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GAPI_CLIENT_SECRET=GOCSPX-your-client-secret-here
```

**How to get these values:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services > Credentials**
4. Find your OAuth 2.0 Client ID and click the edit button
5. Copy the **Client ID** and **Client secret**

**Important:** After setting these environment variables, you must redeploy the function:
```bash
npx supabase functions deploy refresh-gmail-token
```

### 2. Authentication Settings
In Supabase Dashboard under **Authentication > Settings**:

1. **Site URL**: Set to your domain (e.g., `https://your-domain.com`)
2. **Redirect URLs**: Add your redirect URLs
3. **JWT expiry**: Set to longer duration (e.g., 7 days)
4. **Refresh token rotation**: Enable
5. **Session timeout**: Set to reasonable duration (e.g., 24 hours)

### 3. Database Policies
Ensure your `profiles` table has proper RLS policies:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all profiles (for selection)
CREATE POLICY "Allow authenticated users to read profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update their own profile
CREATE POLICY "Allow users to update profiles" ON profiles
  FOR UPDATE USING (auth.role() = 'authenticated');
```

## Frontend Environment Variables

Create/update your `.env` file:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GAPI_CLIENT_ID=your-google-client-id
```

## Testing the Setup

1. **Supabase Auth**: User should stay logged in after browser refresh
2. **Gmail Integration**: Refresh tokens should work without re-authentication
3. **Profile Selection**: Only names should be visible before selection
4. **Secure Data**: Passcodes should only be fetched when selecting a profile

## Security Best Practices

1. **Profile Data**: Only fetch `id` and `name` for profile selection
2. **Full Profile**: Fetch complete profile data only after passcode validation
3. **Token Storage**: Store Gmail tokens securely in Supabase profiles table
4. **Session Persistence**: Use localStorage for Supabase session persistence
5. **Error Handling**: Gracefully handle expired tokens and authentication failures

## Troubleshooting

### Common Issues:

1. **"User not authenticated" loops**:
   - Check Supabase session persistence settings
   - Verify initializeAuth is called on app mount
   - Ensure localStorage is being used for session storage

2. **Gmail tokens not refreshing**:
   - Verify GAPI_CLIENT_SECRET is set in Supabase
   - Check that refresh tokens are being stored correctly
   - Ensure offline access is requested in Google OAuth

3. **Profile passcode exposure**:
   - Verify profiles are fetched with only `id, name` columns
   - Check that full profile data is only fetched on selection

4. **Repeated login prompts**:
   - Enable persistent sessions in Supabase client
   - Set proper JWT expiry times
   - Verify autoRefreshToken is enabled
