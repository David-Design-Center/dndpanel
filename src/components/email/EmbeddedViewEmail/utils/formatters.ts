import { parseISO, format, formatDistanceToNow } from 'date-fns';
import type { FormattedEmailTime } from '../types';

/**
 * Format time like Gmail: "Dec 19, 2025, 7:37 AM (4 days ago)"
 */
export const formatEmailTime = (dateString: string): FormattedEmailTime => {
  try {
    const date = parseISO(dateString);
    const time = format(date, 'h:mm a');
    const relative = formatDistanceToNow(date, { addSuffix: true });
    const fullDate = format(date, 'MMM d, yyyy, h:mm a');
    return { time, relative, fullDate };
  } catch {
    return { time: '', relative: '', fullDate: '' };
  }
};

/**
 * Extract initials for avatar display
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  // Remove angle brackets if present
  const cleanName = name.replace(/[<>]/g, '').trim();
  const parts = cleanName.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return cleanName.substring(0, 2).toUpperCase();
};

/**
 * Format file size for display (B, KB, MB)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
