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
    'marti@dnddesigncenter.com'      // Marti
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
