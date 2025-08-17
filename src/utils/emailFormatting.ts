// Utility functions for formatting email recipients and addresses

export interface EmailRecipient {
  name?: string;
  email: string;
}

/**
 * Clean email address by removing angle brackets and extra formatting
 */
export const cleanEmailAddress = (email: string): string => {
  if (!email) return '';
  
  // Remove angle brackets and trim
  let cleaned = email.replace(/[<>]/g, '').trim();
  
  // If the email contains both name and email like "Name email@domain.com", extract just the email
  const emailMatch = cleaned.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    return emailMatch[1];
  }
  
  return cleaned;
};

/**
 * Format recipients into a clean, comma-separated string with character limit
 * Removes technical formatting like angle brackets and shows simple names
 */
export const formatRecipients = (recipients: EmailRecipient[], maxLength: number = 35): string => {
  if (!recipients || recipients.length === 0) return 'Unknown recipient';
  
  // Extract names, falling back to email if no name
  const names = recipients.map(recipient => {
    if (recipient.name && recipient.name !== 'Me' && recipient.name.trim() !== '') {
      return recipient.name.trim();
    }
    // Extract name from email (before @) as fallback, but clean the email first
    const cleanEmail = cleanEmailAddress(recipient.email);
    return cleanEmail.split('@')[0];
  });
  
  // Join with commas
  let result = names.join(', ');
  
  // Truncate if too long, ensuring we don't cut in middle of a name
  if (result.length > maxLength) {
    const truncated = result.substring(0, maxLength - 3);
    const lastComma = truncated.lastIndexOf(', ');
    if (lastComma > 0) {
      result = truncated.substring(0, lastComma) + '...';
    } else {
      result = truncated + '...';
    }
  }
  
  return result;
};

/**
 * Format recipients for email headers (like To: or CC:) without angle brackets
 * Shows names only, comma-separated, with optional character limit
 */
export const formatRecipientsForHeaders = (recipients: EmailRecipient[], maxLength?: number): string => {
  if (!recipients || recipients.length === 0) return 'Undisclosed recipients';
  
  // Extract names, falling back to email username if no name
  const names = recipients.map(recipient => {
    if (recipient.name && recipient.name !== 'Me' && recipient.name.trim() !== '') {
      return recipient.name.trim();
    }
    // Extract name from email (before @) as fallback, but clean the email first
    const cleanEmail = cleanEmailAddress(recipient.email);
    return cleanEmail.split('@')[0];
  });
  
  let result = names.join(', ');
  
  // Apply character limit if specified
  if (maxLength && result.length > maxLength) {
    const truncated = result.substring(0, maxLength - 3);
    const lastComma = truncated.lastIndexOf(', ');
    if (lastComma > 0) {
      result = truncated.substring(0, lastComma) + '...';
    } else {
      result = truncated + '...';
    }
  }
  
  return result;
};
