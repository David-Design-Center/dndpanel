// Server-side configuration (not exposed to client)
// These values should be accessed via Supabase Edge Functions or backend APIs

export const SERVER_CONFIG = {
  // These are handled by Supabase Edge Functions
  GAPI_CLIENT_SECRET: null, // Removed from client-side
  GAPI_REFRESH_TOKEN: null, // Removed from client-side
  
  // Note: These sensitive values should only be used in:
  // 1. Supabase Edge Functions
  // 2. Backend APIs
  // 3. Server-side processes
};

// Client-safe configuration
export const CLIENT_CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY, // This is safe - it's public
  GAPI_CLIENT_ID: import.meta.env.VITE_GAPI_CLIENT_ID, // This is safe - it's public
  GAPI_API_KEY: import.meta.env.VITE_GAPI_API_KEY, // This is safe - it's public
  BACKEND_API_URL: import.meta.env.VITE_BACKEND_API_URL,
};

// ============================================================================
// FEATURE FLAGS (Temporary toggles for debugging / support cases)
// ============================================================================
export const FEATURE_FLAGS = {
  /**
   * 🔧 USE_DIRECT_GMAIL_LABELS
   * 
   * When TRUE: Fetches labels directly from Gmail API using users.labels.get()
   *            for EACH label (including custom labels). Bypasses Supabase sync.
   *            Logs detailed API responses to console for Google Support debugging.
   * 
   * When FALSE: Uses Supabase-based gmail-sync (production behavior).
   * 
   * Purpose: Google Support case debugging - proves counters come from Gmail API.
   * 
   * ⚠️ WARNING: Keep FALSE in production. Direct API calls are slower and
   *             may hit per-user quota limits with many labels.
   */
  USE_DIRECT_GMAIL_LABELS: true,
};
