/**
 * Proper email decoding utilities following MIME standards
 * Replaces the regex-based approach with proper charset and transfer encoding handling
 */

// --- Base64URL → bytes ---
export function base64UrlToBytes(b64url: string): Uint8Array {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url.replace(/-/g, '+').replace(/_/g, '/')) + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- Minimal quoted-printable → bytes ---
export function decodeQuotedPrintableToBytes(qp: string): Uint8Array {
  // Soft line breaks: "=\r?\n"
  const cleaned = qp.replace(/=\r?\n/g, '');
  const out: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '=' && i + 2 < cleaned.length && /[0-9A-Fa-f]{2}/.test(cleaned.slice(i + 1, i + 3))) {
      out.push(parseInt(cleaned.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      out.push(ch.charCodeAt(0));
    }
  }
  return new Uint8Array(out);
}

// --- RFC 2047 (encoded-word) decoder for headers like Subject/From ---
const ENC_WORD_RE = /=\?([^?]+)\?([bBqQ])\?([^?]+)\?=/g;

export function decodeRfc2047(headerValue: string): string {
  if (!headerValue) return '';
  return headerValue.replace(ENC_WORD_RE, (_, charsetRaw, encRaw, data) => {
    const charset = String(charsetRaw).toLowerCase();
    const enc = String(encRaw).toLowerCase();
    try {
      let bytes: Uint8Array;
      if (enc === 'b') {
        bytes = base64UrlToBytes(data.replace(/\s/g, '').replace(/\+/g, '-').replace(/\//g, '_')); // reuse b64url helper
      } else { // 'q' (quoted-printable variant for headers: '_' means space)
        const qp = data.replace(/_/g, ' ');
        bytes = decodeQuotedPrintableToBytes(qp);
      }
      return new TextDecoder(normalizeCharset(charset)).decode(bytes);
    } catch {
      return headerValue; // fallback: return original token if decode fails
    }
  });
}

function normalizeCharset(cs: string): string {
  // Map common aliases to TextDecoder labels
  const m = cs.trim().toLowerCase();
  if (m === 'utf8') return 'utf-8';
  if (m.includes('1257')) return 'windows-1257';
  if (m.includes('1252')) return 'windows-1252';
  if (m.includes('iso-8859-13')) return 'iso-8859-13';
  if (m.includes('iso-8859-1')) return 'iso-8859-1';
  return m; // hope the platform knows it
}

// --- Choose charset from headers like: Content-Type: text/plain; charset="windows-1257"
export function charsetFromHeaders(headers: Array<{name: string; value: string}>): string | undefined {
  const h = headers.find(h => h.name.toLowerCase() === 'content-type')?.value ?? '';
  const m = /charset="?([^;"\s]+)"?/i.exec(h);
  return m ? normalizeCharset(m[1]) : undefined;
}

// Interface for Gmail message parts (compatible with our existing types)
interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

// --- Decode a single Gmail part into a string ---
export function decodeGmailPart(
  part: GmailMessagePart
): { text: string; mimeType: string } | null {
  const mimeType = part.mimeType || 'text/plain';
  const headers = (part.headers ?? []) as Array<{name: string; value: string}>;
  const charset = charsetFromHeaders(headers) || 'utf-8';
  const cte = headers.find(h => h.name.toLowerCase() === 'content-transfer-encoding')?.value?.toLowerCase();

  // body can be directly in part.body.data or, for multipart/*, in part.parts
  if (part.body?.data) {
    const rawBytes = base64UrlToBytes(part.body.data);
    let bytes: Uint8Array = rawBytes;

    // Some servers double-encode: if CTE says quoted-printable, first turn BYTES → string (utf-8)
    // then decode QP back to BYTES. Providers differ; handle both paths robustly.
    if (cte === 'quoted-printable') {
      const asAscii = new TextDecoder('iso-8859-1').decode(rawBytes); // QP is ASCII-safe
      bytes = decodeQuotedPrintableToBytes(asAscii);
    }

    const text = new TextDecoder(charset).decode(bytes);
    return { text, mimeType };
  }

  // multipart: prefer text/html > text/plain
  if (part.parts && part.parts.length) {
    const html = part.parts.find(p => (p.mimeType || '').toLowerCase() === 'text/html');
    const plain = part.parts.find(p => (p.mimeType || '').toLowerCase() === 'text/plain');
    return decodeGmailPart(html || plain || part.parts[0]);
  }

  return null;
}

// Interface for Gmail message (compatible with our existing types)
interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: GmailMessagePart;
  internalDate: string;
  historyId: string;
  sizeEstimate: number;
}

// --- Helper to pick best body string from an entire Gmail message ---
export function decodeGmailMessageBody(message: GmailMessage): { html?: string; text?: string } {
  const res: { html?: string; text?: string } = {};
  const walk = (p?: GmailMessagePart) => {
    if (!p) return;
    const decoded = decodeGmailPart(p);
    if (decoded) {
      if (decoded.mimeType.toLowerCase() === 'text/html' && !res.html) res.html = decoded.text;
      if (decoded.mimeType.toLowerCase() === 'text/plain' && !res.text) res.text = decoded.text;
    }
    (p.parts || []).forEach(walk);
  };
  walk(message.payload);
  return res;
}

// --- Helper to get header value ---
export function getHeaderValue(headers: Array<{name: string; value: string}>, headerName: string): string {
  return headers.find(h => h.name.toLowerCase() === headerName.toLowerCase())?.value || '';
}

// --- Decode email headers (Subject, From, etc.) ---
export function decodeEmailHeaders(headers: Array<{name: string; value: string}>) {
  return {
    subject: decodeRfc2047(getHeaderValue(headers, 'Subject')),
    from: decodeRfc2047(getHeaderValue(headers, 'From')),
    to: decodeRfc2047(getHeaderValue(headers, 'To')),
    cc: decodeRfc2047(getHeaderValue(headers, 'Cc')),
    date: getHeaderValue(headers, 'Date'),
    messageId: getHeaderValue(headers, 'Message-ID')
  };
}
