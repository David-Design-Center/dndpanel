/**
 * Email header parsing
 */

/**
 * Parse headers array into object
 */
export function parseHeaders(
  headers: Array<{ name: string; value: string }>
): Record<string, string> {
  const parsed: Record<string, string> = {};
  headers.forEach(header => {
    parsed[header.name.toLowerCase()] = header.value;
  });
  return parsed;
}

/**
 * RFC 2047 encoded-word decoder for headers
 */
const ENC_WORD_RE = /=\?([^?]+)\?([bBqQ])\?([^?]+)\?=/g;

export function decodeRfc2047(headerValue: string): string {
  if (!headerValue) return '';

  return headerValue.replace(ENC_WORD_RE, (_, charsetRaw, encRaw, data) => {
    const charset = (charsetRaw || 'utf-8').toLowerCase();
    const encoding = (encRaw || 'B').toUpperCase();

    try {
      let bytes: Uint8Array;

      if (encoding === 'B') {
        // Base64
        const binary = atob(data);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
      } else if (encoding === 'Q') {
        // Quoted-printable
        const decoded = data
          .replace(/_/g, ' ')
          .replace(/=([0-9A-Fa-f]{2})/g, (_match: string, hex: string) => {
            return String.fromCharCode(parseInt(hex, 16));
          });
        bytes = new TextEncoder().encode(decoded);
      } else {
        return _; // Unknown encoding
      }

      return new TextDecoder(charset).decode(bytes);
    } catch (e) {
      console.warn(`Failed to decode RFC 2047 header: ${e}`);
      return _; // Return original on error
    }
  });
}

/**
 * Parse email addresses from address string (e.g., "Name <email@example.com>")
 */
export function parseEmailAddresses(
  addressString: string
): Array<{ name: string; email: string }> {
  if (!addressString) return [];

  const addresses = addressString.split(',').map(addr => addr.trim());

  return addresses.map(addr => {
    // Try to match "Name <email>" format
    const match = addr.match(/^(.+?)\s*<(.+)>$/) || addr.match(/^(.+)$/);

    if (match && match[2]) {
      return {
        name: match[1].replace(/"/g, '').trim(),
        email: match[2].trim(),
      };
    } else if (match && match[1]) {
      const email = match[1].trim();
      return {
        name: email,
        email,
      };
    }

    return {
      name: addr,
      email: addr,
    };
  });
}

/**
 * Get a header value by name (case-insensitive)
 */
export function getHeaderValue(
  headers: Array<{ name: string; value: string }>,
  headerName: string
): string {
  const header = headers.find(h => h.name.toLowerCase() === headerName.toLowerCase());
  return header ? decodeRfc2047(header.value) : '';
}

/**
 * Get all recipients from headers (to + cc + bcc)
 */
export function getRecipients(
  headers: Array<{ name: string; value: string }>
): {
  to: Array<{ name: string; email: string }>;
  cc: Array<{ name: string; email: string }>;
  bcc: Array<{ name: string; email: string }>;
} {
  const toValue = getHeaderValue(headers, 'to');
  const ccValue = getHeaderValue(headers, 'cc');
  const bccValue = getHeaderValue(headers, 'bcc');

  return {
    to: parseEmailAddresses(toValue),
    cc: parseEmailAddresses(ccValue),
    bcc: parseEmailAddresses(bccValue),
  };
}
