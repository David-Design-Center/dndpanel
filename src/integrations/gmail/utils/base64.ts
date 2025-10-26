/**
 * Base64 encoding/decoding utilities for Gmail API
 */

/**
 * Decode base64url string to regular string
 */
export function base64UrlDecode(str: string): string {
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if necessary
  while (str.length % 4) {
    str += '=';
  }
  try {
    return atob(str);
  } catch (error) {
    console.error('Failed to decode base64url:', error);
    return '';
  }
}

/**
 * Decode base64url to Uint8Array bytes
 */
export function decodeBase64UrlToBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decode quoted-printable content to bytes
 */
export function decodeQuotedPrintableToBytes(input: Uint8Array | string): Uint8Array {
  // Convert to string if needed
  const qpString = typeof input === 'string' 
    ? input 
    : new TextDecoder('ascii').decode(input);
  
  // Remove soft line breaks (=\r\n or =\n)
  const cleaned = qpString.replace(/=\r?\n/g, '');
  
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '=' && i + 2 < cleaned.length) {
      const hex = cleaned.slice(i + 1, i + 3);
      if (/[0-9A-Fa-f]{2}/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(char.charCodeAt(0));
  }
  
  return new Uint8Array(bytes);
}

/**
 * Encode string to base64url (for sending)
 */
export function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
