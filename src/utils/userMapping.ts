/**
 * Username to email mapping for authentication
 */

interface UserMapping {
  [username: string]: string;
}

export const USERNAME_TO_EMAIL_MAP: UserMapping = {
  'david': 'david.v@dnddesigncenter.com',
  'natalia': 'natalia@dnddesigncenter.com',
  'info': 'info@dnddesigncenter.com',
  'marti': 'info@effidigi.com',
};

/**
 * Maps a username to an email address
 * @param username - The username to map
 * @returns The corresponding email address or null if not found
 */
export function getUserEmailFromUsername(username: string): string | null {
  const normalizedUsername = username.toLowerCase().trim();
  return USERNAME_TO_EMAIL_MAP[normalizedUsername] || null;
}

/**
 * Checks if a username is valid (has a corresponding email mapping)
 * @param username - The username to check
 * @returns True if the username is valid, false otherwise
 */
export function isValidUsername(username: string): boolean {
  return getUserEmailFromUsername(username) !== null;
}
