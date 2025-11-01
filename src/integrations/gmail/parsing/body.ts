/**
 * Email body extraction and processing
 * FIXED: No longer strips styles or destroys formatting
 */

import type { EmailPart } from '../types';
import { decodeBase64UrlToBytes, decodeQuotedPrintableToBytes } from '../utils/base64';
import { extractCharsetFromPart, decodeHtmlEntities } from './charset';

/**
 * Extract text content from an email part
 * Returns raw HTML/text - sanitization happens in the frontend
 */
export function extractTextFromPart(part: EmailPart): string {
  if (!part.body?.data) {
    return '';
  }

  try {
    // Get charset from Content-Type header
    const charset = extractCharsetFromPart(part);
    console.log(`📧 Decoding email part: mimeType=${part.mimeType}, charset=${charset}`);

    // Step 1: Decode base64url to bytes (Gmail always base64url-encodes the body)
    let bytes = decodeBase64UrlToBytes(part.body.data);
    console.log(`📦 Decoded ${bytes.length} bytes from base64url`);

    // Step 2: Check Content-Transfer-Encoding header
    const cte = part.headers
      ?.find(h => h.name.toLowerCase() === 'content-transfer-encoding')
      ?.value?.toLowerCase() || '';
    console.log(`🔐 Content-Transfer-Encoding: ${cte || '(none)'}`);

    // Step 3: ONLY decode quoted-printable if explicitly set in CTE header
    if (cte.includes('quoted-printable')) {
      console.log(`🔄 Decoding quoted-printable...`);
      bytes = decodeQuotedPrintableToBytes(bytes);
      console.log(`📦 After QP decode: ${bytes.length} bytes`);
    }

    // Step 4: Decode bytes to string using detected charset
    let text = new TextDecoder(charset).decode(bytes);
    console.log(`📝 Decoded to ${text.length} characters`);
    
    // Log first 200 chars to see what we got
    console.log(`📄 First 200 chars: ${text.substring(0, 200)}`);

    // Step 5: Decode HTML entities (e.g., &amp; → &)
    text = decodeHtmlEntities(text);

    // Step 6: For plain text, convert newlines to <br>
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