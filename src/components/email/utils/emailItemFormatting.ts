import { format, parseISO, isThisYear } from 'date-fns';
import { Email } from '@/types';
import { cleanEncodingIssues } from '@/utils/textEncoding';
import { cleanEmailAddress } from '@/utils/emailFormatting';

/**
 * Format email date in Gmail style:
 * - Within 24 hours: time only (12-hour format)
 * - This year: date without year
 * - Older: date with year
 */
export function formatEmailDate(dateString: string): string {
  try {
    const d = parseISO(dateString);
    const now = new Date();
    const hoursDiff = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    
    // Within 24 hours: show time only (12-hour format with AM/PM)
    if (hoursDiff < 24 && hoursDiff >= 0) {
      return format(d, 'h:mm a');
    }
    
    // This year but older than 24h: show date without year
    if (isThisYear(d)) {
      return format(d, 'MMM d');
    }
    
    // Older than this year: show date with year
    return format(d, 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

/**
 * Get sender or recipient text for display
 * For sent emails, shows recipient (TO)
 * For other emails, shows sender (FROM)
 */
export function getSenderText(email: Email, isSentEmail: boolean): string {
  if (isSentEmail) {
    // For sent emails, show recipient (TO) instead of sender (FROM)
    const firstRecipient = email.to?.[0];
    if (firstRecipient?.name) {
      return cleanEncodingIssues(firstRecipient.name);
    }
    if (firstRecipient?.email) {
      return cleanEmailAddress(firstRecipient.email);
    }
    return 'Unknown Recipient';
  }
  
  // For other emails, show sender (FROM)
  if (email.from?.name) {
    return cleanEncodingIssues(email.from.name);
  }
  if (email.from?.email) {
    return cleanEmailAddress(email.from.email);
  }
  return 'Unknown Sender';
}

/**
 * Get CSS classes for email row based on state
 */
export function getEmailRowClassName(
  isActiveEmail: boolean,
  isSelected: boolean,
  isRead: boolean,
  isDragging: boolean
): string {
  const baseClasses = 'group cursor-pointer select-none transition-colors';
  
  let stateClasses = '';
  if (isActiveEmail) {
    stateClasses = 'bg-blue-200 hover:bg-blue-200'; // Active/viewing
  } else if (isSelected) {
    stateClasses = 'bg-blue-200 hover:bg-blue-200'; // Selected
  } else if (!isRead) {
    stateClasses = 'bg-blue-100 hover:bg-blue-150 font-bold'; // Unread - darker blue + bold
  } else {
    stateClasses = 'hover:bg-gray-50'; // Read
  }
  
  const draggingClass = isDragging ? 'opacity-50 z-10' : '';
  
  return `${baseClasses} ${stateClasses} ${draggingClass}`.trim();
}

/**
 * Calculate context menu position to prevent off-screen rendering
 */
export function calculateContextMenuPosition(e: React.MouseEvent): { x: number; y: number; show: boolean } {
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  
  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Estimated menu dimensions
  const menuWidth = 200;
  const menuHeight = 120;
  
  // Calculate position - start exactly where mouse clicked
  let x = mouseX;
  let y = mouseY;
  
  // Adjust if menu would go off-screen to the right
  if (x + menuWidth > viewportWidth) {
    x = mouseX - menuWidth; // Show to the left of cursor
  }
  
  // Adjust if menu would go off-screen at the bottom
  if (y + menuHeight > viewportHeight) {
    y = mouseY - menuHeight; // Show above cursor
  }
  
  // Ensure menu doesn't go off the left or top edges
  x = Math.max(4, x);
  y = Math.max(4, y);
  
  return { x, y, show: true };
}
