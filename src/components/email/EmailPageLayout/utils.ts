/**
 * Email Page Layout - Utility Functions
 * 
 * Helper functions for calculations, formatting, and common operations
 */

import { Email } from '../../../types';

/**
 * Get email timestamp in milliseconds
 */
export function getEmailTimestampMs(email: Email): number {
  if (!email.date) return 0;
  try {
    return new Date(email.date).getTime();
  } catch {
    return 0;
  }
}

/**
 * Get email received time in milliseconds  
 */
export function getReceivedAtMs(email: Email): number {
  if (!email.internalDate) return 0;
  try {
    return new Date(email.internalDate).getTime();
  } catch {
    return 0;
  }
}

/**
 * Sort emails by date (newest first)
 */
export function sortEmailsByDate(emails: Email[]): Email[] {
  return [...emails].sort((a, b) => {
    const timeA = getEmailTimestampMs(a);
    const timeB = getEmailTimestampMs(b);
    return timeB - timeA;
  });
}

/**
 * Calculate "focused" score for email (heuristic)
 * Higher score = more likely to be "focused/important"
 */
export function calculateFocusedScore(email: Email): number {
  let score = 0;

  const senderEmail = email.from.email.toLowerCase();
  const senderDomain = senderEmail.split('@')[1] || '';
  
  // Personal domains get higher score
  const personalDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com'];
  if (personalDomains.includes(senderDomain)) {
    score += 1;
  }

  // Emails with attachments get higher score
  if (email.attachments && email.attachments.length > 0) {
    score += 2;
  }

  // Starred emails stay at top
  if (email.isStarred) {
    score += 5;
  }

  // Important emails get higher score
  if (email.isImportant) {
    score += 3;
  }

  return score;
}

/**
 * Filter emails by search query
 */
export function filterEmailsBySearch(emails: Email[], query: string): Email[] {
  if (!query.trim()) return emails;
  
  const lowerQuery = query.toLowerCase();
  
  return emails.filter(email => {
    return (
      email.subject.toLowerCase().includes(lowerQuery) ||
      email.from.email.toLowerCase().includes(lowerQuery) ||
      email.from.name?.toLowerCase().includes(lowerQuery) ||
      email.body?.toLowerCase().includes(lowerQuery) ||
      email.preview?.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * Get email excerpt (first 100 chars of body)
 */
export function getEmailExcerpt(email: Email, length: number = 100): string {
  const text = email.preview || email.body || '';
  return text.substring(0, length).trim() + (text.length > length ? '...' : '');
}

/**
 * Format email sender name
 */
export function formatSenderName(email: Email): string {
  if (email.from.name) {
    return email.from.name;
  }
  const parts = email.from.email.split('@');
  return parts[0] || email.from.email;
}

/**
 * Format email subject (handle Re:, Fwd:, etc.)
 */
export function formatSubject(subject: string): string {
  if (!subject) return '(no subject)';
  return subject.length > 100 ? subject.substring(0, 100) + '...' : subject;
}

/**
 * Check if email is today
 */
export function isEmailToday(email: Email): boolean {
  const today = new Date().toDateString();
  const emailDate = new Date(email.date).toDateString();
  return today === emailDate;
}

/**
 * Get email display date
 */
export function getEmailDisplayDate(email: Email): string {
  const date = new Date(email.date);
  const today = new Date();
  
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
