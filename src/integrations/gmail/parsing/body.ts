/**
 * Email body extraction and processing
 * FIXED: No longer strips styles or destroys formatting
 */

import type { EmailPart } from '../types';
import { decodeBase64UrlToBytes, decodeQuotedPrintableToBytes } from '../utils/base64';
import { extractCharsetFromPart, decodeHtmlEntities } from './charset';

/**
 * Extract text content from an email part
 * CRITICAL FIX: Preserves all styling, no aggressive cleaning
 */
export function extractTextFromPart(part: EmailPart): string {
  if (!part.body?.data) {
    return '';
  }

  try {
    // Get charset (forces UTF-8 for HTML to prevent mojibake)
    const charset = extractCharsetFromPart(part);

    // Decode base64url to bytes
    let bytes = decodeBase64UrlToBytes(part.body.data);

    // Check for quoted-printable encoding
    const cte = part.headers
      ?.find(h => h.name.toLowerCase() === 'content-transfer-encoding')
      ?.value?.toLowerCase() || '';

    // Decode quoted-printable if needed
    if (part.mimeType.startsWith('text/html') || cte.includes('quoted-printable')) {
      bytes = decodeQuotedPrintableToBytes(bytes);
    }

    // Decode bytes to string
    let text = new TextDecoder(charset).decode(bytes);

    // Decode HTML entities
    text = decodeHtmlEntities(text);

    // ⚠️ NO AGGRESSIVE CLEANING - Preserve styles and formatting!
    // For plain text, just convert newlines to <br>
    if (part.mimeType === 'text/plain') {
      return text
        .replace(/\r\n/g, '<br>')
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '<br>');
    }

    // For HTML, return as-is (DOMPurify in frontend will sanitize)
    return text;

  } catch (error) {
    console.error('Error extracting text from part:', error);
    return '[Error decoding email content]';
  }
}

/**
 * Find the main body part from email payload
 */
export function findBodyPart(payload: EmailPart): EmailPart | null {
  // If this part has body data and is text, return it
  if (payload.body?.data && payload.mimeType?.startsWith('text/')) {
    return payload;
  }

  // If multipart, search recursively
  if (payload.parts && payload.parts.length > 0) {
    // Prefer HTML over plain text
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart && htmlPart.body?.data) {
      return htmlPart;
    }

    const plainPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plainPart && plainPart.body?.data) {
      return plainPart;
    }

    // Recursively search nested parts
    for (const part of payload.parts) {
      const found = findBodyPart(part);
      if (found) {
        return found;
      }
    }
  }

  return null;
}