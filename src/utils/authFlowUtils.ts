/**
 * Utility functions for managing authentication flow state
 */

/**
 * Check if the current location requires blocking data fetches
 * @param pathname Current pathname
 * @returns true if data fetches should be blocked
 */
export const shouldBlockDataFetches = (pathname: string): boolean => {
  // Block all fetches on auth page
  if (pathname === '/auth') {
    return true;
  }
  
  // Allow fetches on other pages (assuming auth flow is completed)
  return false;
};

/**
 * Check if the current user should get auto-selected profile (staff members)
 * @param userEmail User's email
 * @returns true if this is likely a staff member email
 */
export const isStaffMemberEmail = (userEmail: string): boolean => {
  const staffEmails = [
    'info@dnddesigncenter.com',      // Dimitry
    'natalia@dnddesigncenter.com',   // Natalia  
  ];
  
  return staffEmails.includes(userEmail.toLowerCase());
};

/**
 * Check if the current user is likely an admin
 * @param userEmail User's email
 * @returns true if this is likely an admin email
 */
export const isAdminEmail = (userEmail: string): boolean => {
  return userEmail.toLowerCase() === 'david@dnddesigncenter.com';
};

/**
 * Check if the current URL contains password reset tokens
 * @returns true if recovery tokens are detected in the URL hash or query params
 */
export const hasPasswordResetTokens = (): boolean => {
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);
  
  // Check hash format (standard Supabase format)
  const hasHashTokens = hash.includes('access_token') && hash.includes('type=recovery');
  
  // Check query params format (direct Supabase redirect format)
  const hasQueryTokens = searchParams.has('access_token') && searchParams.has('type') && 
                        searchParams.get('type') === 'recovery';
  
  return hasHashTokens || hasQueryTokens;
};

/**
 * Check if the current flow is a password reset flow
 * @returns true if this appears to be a password reset flow
 */
export const isPasswordResetFlow = (): boolean => {
  return hasPasswordResetTokens() || window.location.pathname === '/auth/reset';
};
