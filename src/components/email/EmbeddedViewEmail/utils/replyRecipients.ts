import { Email } from '../../../../types';
import type { ReplyRecipients, ReplyMode } from '../types';

/**
 * Normalize email address for comparison (lowercase, no brackets)
 */
export const normalizeEmail = (emailStr: string): string => {
  if (!emailStr) return '';
  return emailStr.replace(/[<>]/g, '').trim().toLowerCase();
};

/**
 * Find the correct message to reply to in a thread (never reply to yourself).
 * If the latest message is from the current user, finds the most recent message from someone else.
 */
export function findReplyToMessage(
  threadMessages: Email[],
  latestMessage: Email,
  currentUserEmail: string | undefined
): Email | null {
  if (!currentUserEmail) return latestMessage;

  const normalizedCurrentUser = normalizeEmail(currentUserEmail);
  const latestFromEmail = normalizeEmail(latestMessage.from.email);

  // Check if latest message is from current user
  const isLatestFromMe = latestFromEmail === normalizedCurrentUser;

  if (isLatestFromMe && threadMessages.length > 1) {
    // Find the most recent message NOT from current user
    for (let i = threadMessages.length - 2; i >= 0; i--) {
      const msg = threadMessages[i];
      const msgFromEmail = normalizeEmail(msg.from.email);
      if (msgFromEmail !== normalizedCurrentUser) {
        console.log('📧 Latest message is from me, replying to previous sender:', msg.from.email);
        return msg;
      }
    }
    // Edge case: All messages are from current user
    console.warn('⚠️ All messages in thread are from current user');
    return null;
  }

  return latestMessage;
}

/**
 * Get reply recipients with self-exclusion and deduplication.
 * For reply: Returns sender only.
 * For replyAll: Returns sender as "to" and all other recipients (To + CC) as "cc".
 */
export function getReplyRecipients(
  message: Email | null,
  mode: ReplyMode,
  currentUserEmail: string | undefined
): ReplyRecipients {
  if (!message || !currentUserEmail) return { to: '', cc: '' };

  const normalizedCurrentUser = normalizeEmail(currentUserEmail);

  if (mode === 'reply') {
    // Reply: Only to sender
    const senderEmail = normalizeEmail(message.from.email);
    if (senderEmail === normalizedCurrentUser) {
      console.warn('⚠️ Cannot reply to yourself');
      return { to: '', cc: '' };
    }
    return { to: message.from.email, cc: '' };
  }

  if (mode === 'forward') {
    // Forward has no automatic recipients
    return { to: '', cc: '' };
  }

  // Reply All: Sender + all To + all CC, excluding current user
  const allRecipients: Array<{ email: string; name: string }> = [];

  // Add sender
  allRecipients.push(message.from);

  // Add all To recipients
  if (message.to && message.to.length > 0) {
    allRecipients.push(...message.to);
  }

  // Add all CC recipients
  if (message.cc && message.cc.length > 0) {
    allRecipients.push(...message.cc);
  }

  // Filter out current user and deduplicate
  const seen = new Set<string>();
  const filtered: Array<{ email: string; name: string }> = [];

  for (const recipient of allRecipients) {
    const normalizedEmail = normalizeEmail(recipient.email);

    // Skip current user
    if (normalizedEmail === normalizedCurrentUser) continue;

    // Skip duplicates
    if (seen.has(normalizedEmail)) continue;

    seen.add(normalizedEmail);
    filtered.push(recipient);
  }

  if (filtered.length === 0) {
    console.warn('⚠️ No recipients after filtering current user');
    return { to: '', cc: '' };
  }

  // Gmail style: Original sender is primary recipient, everyone else goes to CC
  const primaryRecipient = filtered[0].email;
  const ccRecipients = filtered.slice(1).map(r => r.email).join(',');

  console.log('📧 Reply All recipients:', { to: primaryRecipient, cc: ccRecipients });

  return { to: primaryRecipient, cc: ccRecipients };
}
