import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface EmailPart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: EmailPart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: EmailPart;
  internalDate: string;
  historyId: string;
  sizeEstimate: number;
}

interface ProcessedEmail {
  id: string;
  threadId: string;
  subject: string;
  from: { name: string; email: string };
  to: Array<{ name: string; email: string }>;
  cc?: Array<{ name: string; email: string }>;
  date: string;
  body: string;
  snippet: string;
  labels: string[];
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
  hasInlineImages: boolean;
}

// Helper function to decode base64url
function base64UrlDecode(str: string): string {
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

// Helper function to parse email headers
function parseHeaders(headers: Array<{ name: string; value: string }>): Record<string, string> {
  const parsed: Record<string, string> = {};
  headers.forEach(header => {
    parsed[header.name.toLowerCase()] = header.value;
  });
  return parsed;
}

// Helper function to parse email addresses
function parseEmailAddresses(addressString: string): Array<{ name: string; email: string }> {
  if (!addressString) return [];
  
  const addresses = addressString.split(',').map(addr => addr.trim());
  return addresses.map(addr => {
    const match = addr.match(/^(.+?)\s*<(.+)>$/) || addr.match(/^(.+)$/);
    if (match && match[2]) {
      return { name: match[1].replace(/"/g, '').trim(), email: match[2].trim() };
    } else if (match && match[1]) {
      const email = match[1].trim();
      return { name: email, email };
    }
    return { name: addr, email: addr };
  });
}

// Extract inline images from email parts
function extractInlineImages(payload: EmailPart): Array<{
  contentId: string;
  attachmentId: string;
  mimeType: string;
  filename: string;
}> {
  const inlineImages: Array<{
    contentId: string;
    attachmentId: string;
    mimeType: string;
    filename: string;
  }> = [];

  function traverse(part: EmailPart) {
    if (part.mimeType?.startsWith('image/') && part.body?.attachmentId) {
      const contentIdHeader = part.headers?.find(h => h.name.toLowerCase() === 'content-id');
      if (contentIdHeader) {
        const contentId = contentIdHeader.value.replace(/[<>]/g, '');
        inlineImages.push({
          contentId,
          attachmentId: part.body.attachmentId,
          mimeType: part.mimeType,
          filename: part.filename || 'image'
        });
      }
    }
    
    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }

  traverse(payload);
  return inlineImages;
}

// --- Proper email decoding utilities following MIME standards ---

// Base64URL → bytes
function base64UrlToBytes(b64url: string): Uint8Array {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url.replace(/-/g, '+').replace(/_/g, '/')) + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Minimal quoted-printable → bytes
function decodeQuotedPrintableToBytes(qp: string): Uint8Array {
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

// RFC 2047 (encoded-word) decoder for headers
const ENC_WORD_RE = /=\?([^?]+)\?([bBqQ])\?([^?]+)\?=/g;

function decodeRfc2047(headerValue: string): string {
  if (!headerValue) return '';
  return headerValue.replace(ENC_WORD_RE, (_, charsetRaw, encRaw, data) => {
    const charset = String(charsetRaw).toLowerCase();
    const enc = String(encRaw).toLowerCase();
    try {
      let bytes: Uint8Array;
      if (enc === 'b') {
        bytes = base64UrlToBytes(data.replace(/\s/g, '').replace(/\+/g, '-').replace(/\//g, '_'));
      } else { // 'q' (quoted-printable variant for headers: '_' means space)
        const qp = data.replace(/_/g, ' ');
        bytes = decodeQuotedPrintableToBytes(qp);
      }
      return decodeBytes(bytes, normalizeCharset(charset));
    } catch {
      return headerValue; // fallback: return original token if decode fails
    }
  });
}

function normalizeCharset(cs: string): string {
  const m = cs.trim().toLowerCase();
  if (!m) return 'utf-8';
  if (m === 'utf8' || m === 'utf-8') return 'utf-8';
  if (m === 'us-ascii' || m === 'ascii') return 'utf-8';
  if (m.includes('1252') || m.includes('cp1252')) return 'windows-1252';
  if (m.includes('1251')) return 'windows-1251';
  if (m.includes('1250')) return 'windows-1250';
  if (m.includes('1254')) return 'windows-1254';
  if (m.includes('1257')) return 'windows-1257';
  if (m.includes('iso-8859-13')) return 'iso-8859-13';
  if (m.includes('iso-8859-15')) return 'iso-8859-15';
  if (m.includes('iso-8859-1') || m.includes('latin1')) return 'iso-8859-1';
  return m;
}

function decodeBytes(bytes: Uint8Array, preferredCharset: string): string {
  const tried = new Set<string>();
  const candidates: Array<{ charset: string; fatal?: boolean }> = [];

  const normalized = normalizeCharset(preferredCharset);

  // Many mis-labelled messages are actually UTF-8, so try that first when not already requested
  if (normalized !== 'utf-8') {
    candidates.push({ charset: 'utf-8', fatal: true });
  }

  candidates.push({ charset: normalized, fatal: false });

  // Fallback to windows-1252 which covers most Western encodings
  if (normalized !== 'windows-1252') {
    candidates.push({ charset: 'windows-1252', fatal: false });
  }

  // Always ensure utf-8 is attempted without fatal flag before giving up
  candidates.push({ charset: 'utf-8', fatal: false });

  for (const { charset, fatal } of candidates) {
    if (tried.has(charset)) continue;
    tried.add(charset);
    try {
      return new TextDecoder(charset, fatal ? { fatal } : undefined).decode(bytes);
    } catch (_err) {
      // continue to next candidate
    }
  }

  // Manual Windows-1252 fallback (for runtimes without encoding tables)
  if (bytes.some(b => b >= 0x80 && b <= 0x9F)) {
    try {
      return decodeWindows1252(bytes);
    } catch (_err) {
      // ignore and continue
    }
  }

  // Final fallback: default decoder without explicit charset
  return new TextDecoder().decode(bytes);
}

const WINDOWS_1252_TABLE: Record<number, number> = {
  0x80: 0x20AC,
  0x82: 0x201A,
  0x83: 0x0192,
  0x84: 0x201E,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02C6,
  0x89: 0x2030,
  0x8A: 0x0160,
  0x8B: 0x2039,
  0x8C: 0x0152,
  0x8E: 0x017D,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201C,
  0x94: 0x201D,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02DC,
  0x99: 0x2122,
  0x9A: 0x0161,
  0x9B: 0x203A,
  0x9C: 0x0153,
  0x9E: 0x017E,
  0x9F: 0x0178
};

function decodeWindows1252(bytes: Uint8Array): string {
  let result = '';
  for (const byte of bytes) {
    if (byte >= 0x80 && byte <= 0x9F) {
      const mapped = WINDOWS_1252_TABLE[byte];
      result += mapped ? String.fromCharCode(mapped) : String.fromCharCode(byte);
    } else {
      result += String.fromCharCode(byte);
    }
  }
  return result;
}

// Choose charset from headers
function charsetFromHeaders(headers: Array<{name: string; value: string}>): string | undefined {
  const h = headers.find(h => h.name.toLowerCase() === 'content-type')?.value ?? '';
  const m = /charset="?([^;"\s]+)"?/i.exec(h);
  return m ? normalizeCharset(m[1]) : undefined;
}

// Decode a single Gmail part into a string
function decodeGmailPart(part: EmailPart): { text: string; mimeType: string } | null {
  const mimeType = part.mimeType || 'text/plain';
  const headers = (part.headers ?? []) as Array<{name: string; value: string}>;
  const charset = charsetFromHeaders(headers) || 'utf-8';
  const cte = headers.find(h => h.name.toLowerCase() === 'content-transfer-encoding')?.value?.toLowerCase();

  if (part.body?.data) {
    const rawBytes = base64UrlToBytes(part.body.data);
    let bytes: Uint8Array = rawBytes;

    if (cte === 'quoted-printable') {
      const asAscii = new TextDecoder('iso-8859-1').decode(rawBytes);
      bytes = decodeQuotedPrintableToBytes(asAscii);
    }

    const text = decodeBytes(bytes, charset);
    return { text, mimeType };
  }

  if (part.parts && part.parts.length) {
    const html = part.parts.find(p => (p.mimeType || '').toLowerCase() === 'text/html');
    const plain = part.parts.find(p => (p.mimeType || '').toLowerCase() === 'text/plain');
    return decodeGmailPart(html || plain || part.parts[0]);
  }

  return null;
}

// Helper to pick best body string from an entire Gmail message
function decodeGmailMessageBody(message: GmailMessage): { html?: string; text?: string } {
  const res: { html?: string; text?: string } = {};
  const walk = (p?: EmailPart) => {
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

// Get header value
function getHeaderValue(headers: Array<{name: string; value: string}>, headerName: string): string {
  return headers.find(h => h.name.toLowerCase() === headerName.toLowerCase())?.value || '';
}

// Helper function to clean text encoding issues (DEPRECATED - use proper decoding instead)
function cleanTextEncoding(text: string): string {
  return text
    // Fix common UTF-8 encoding issues
    .replace(/Â/g, '') // Remove unnecessary Â characters
    .replace(/â€™/g, "'") // Right single quotation mark
    .replace(/â€œ/g, '"') // Left double quotation mark
    .replace(/â€/g, '"') // Right double quotation mark
    .replace(/â€¦/g, '...') // Horizontal ellipsis
    .replace(/â€"/g, '–') // En dash
    .replace(/â€"/g, '—') // Em dash
    .replace(/Ãª/g, 'ê') // Fix accented characters
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ã /g, 'à')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã§/g, 'ç')
    // Fix Estonian characters (double-encoded UTF-8)
    .replace(/Ã„/g, 'Ä') // Capital A with diaeresis
    .replace(/Ã¤/g, 'ä') // Small a with diaeresis
    .replace(/Ã–/g, 'Ö') // Capital O with diaeresis
    .replace(/Ã¶/g, 'ö') // Small o with diaeresis
    .replace(/Ãœ/g, 'Ü') // Capital U with diaeresis
    .replace(/Ðƒ¼/g, 'ü') // Small u with diaeresis
    .replace(/Å /g, 'Š') // Capital S with caron
    .replace(/Å¡/g, 'š') // Small s with caron
    .replace(/Å½/g, 'Ž') // Capital Z with caron
    .replace(/Å¾/g, 'ž') // Small z with caron
    // Fix problematic Estonian character combinations
    .replace(/Ðµ/g, 'õ') // Fix specific Estonian õ encoding issue
    .replace(/ÐÐµ/g, 'Õ') // Fix capital Estonian Õ encoding issue
    .replace(/Ð¸/g, 'ä') // Fix another Estonian ä variant
    .replace(/Ð°/g, 'a') // Fix specific a encoding
    .replace(/ð/g, '😊') // Fix emoji encoding (common smiley)
    // Fix other Nordic/Baltic characters
    .replace(/Ã…/g, 'Å') // Capital A with ring above
    .replace(/Ã¥/g, 'å') // Small a with ring above
    .replace(/Ã†/g, 'Æ') // Capital AE
    .replace(/Ã¦/g, 'æ') // Small ae
    .replace(/Ã˜/g, 'Ø') // Capital O with stroke
    .replace(/Ã¸/g, 'ø') // Small o with stroke
    // Remove multiple consecutive spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract email body from parts
function extractEmailBody(payload: EmailPart): string {
  let htmlBody = '';
  let textBody = '';

  function traverse(part: EmailPart) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      htmlBody = base64UrlDecode(part.body.data);
    } else if (part.mimeType === 'text/plain' && part.body?.data && !htmlBody) {
      textBody = base64UrlDecode(part.body.data);
    }
    
    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }

  traverse(payload);
  
  // Prefer HTML, fallback to text converted to HTML
  if (htmlBody) {
    return htmlBody;
  } else if (textBody) {
    return textBody.replace(/\n/g, '<br>');
  }
  
  return '';
}

// Process inline images by fetching attachments and converting to data URIs
async function processInlineImages(
  messageId: string, 
  htmlContent: string, 
  inlineImages: Array<{
    contentId: string;
    attachmentId: string;
    mimeType: string;
    filename: string;
  }>,
  accessToken: string
): Promise<string> {
  if (inlineImages.length === 0 || !htmlContent.includes('cid:')) {
    return htmlContent;
  }

  console.log(`Processing ${inlineImages.length} inline images for message ${messageId}`);

  // Fetch all attachments in parallel
  const imagePromises = inlineImages.map(async (img) => {
    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${img.attachmentId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch attachment ${img.attachmentId}:`, response.status);
        return null;
      }

      const attachmentData = await response.json();
      const binaryData = base64UrlDecode(attachmentData.data);
      const base64Data = btoa(binaryData);
      const dataUri = `data:${img.mimeType};base64,${base64Data}`;

      return {
        contentId: img.contentId,
        dataUri: dataUri
      };
    } catch (error) {
      console.error(`Error fetching attachment ${img.attachmentId}:`, error);
      return null;
    }
  });

  const imageResults = await Promise.all(imagePromises);
  let processedHtml = htmlContent;

  // Replace CID references with data URIs
  imageResults.forEach((result) => {
    if (result) {
      const cidPattern = new RegExp(`cid:${result.contentId}`, 'gi');
      processedHtml = processedHtml.replace(cidPattern, result.dataUri);
    }
  });

  return processedHtml;
}

// Process a single Gmail message
async function processGmailMessage(message: GmailMessage, accessToken: string): Promise<ProcessedEmail> {
  const headers = parseHeaders(message.payload.headers || []);
  
  // Properly decode headers using RFC 2047
  const subject = decodeRfc2047(headers.subject || '(No Subject)');
  const fromHeaderValue = decodeRfc2047(headers.from || '');
  const toHeaderValue = decodeRfc2047(headers.to || '');
  const ccHeaderValue = decodeRfc2047(headers.cc || '');
  
  const fromAddresses = parseEmailAddresses(fromHeaderValue);
  const toAddresses = parseEmailAddresses(toHeaderValue);
  const ccAddresses = parseEmailAddresses(ccHeaderValue);
  const date = new Date(parseInt(message.internalDate)).toISOString();

  // Extract body using proper MIME decoding
  const bodyDecoded = decodeGmailMessageBody(message);
  let body = bodyDecoded.html || bodyDecoded.text || '';
  
  // If no proper decoding worked, fall back to the old method
  if (!body) {
    body = extractEmailBody(message.payload);
  }
  
  // Extract attachments (non-inline)
  const attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }> = [];

  function extractAttachments(part: EmailPart) {
    if (part.body?.attachmentId && part.filename && !part.mimeType?.startsWith('image/')) {
      // Decode filename using RFC 2047 if needed
      const decodedFilename = decodeRfc2047(part.filename);
      attachments.push({
        filename: decodedFilename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId
      });
    }
    
    if (part.parts) {
      part.parts.forEach(extractAttachments);
    }
  }

  extractAttachments(message.payload);

  // Process inline images
  const inlineImages = extractInlineImages(message.payload);
  const hasInlineImages = inlineImages.length > 0;
  
  if (hasInlineImages) {
    body = await processInlineImages(message.id, body, inlineImages, accessToken);
  }

  // Clean quoted content (basic server-side cleaning) - no more encoding fixes
  const cleanedBody = body
    .replace(/<div class="gmail_quote"[\s\S]*?<\/div>/gi, '')
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
    .replace(/On\s+[^<]*wrote:\s*<br[^>]*>/gi, '');

  const snippetFromBody = cleanedBody
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

  const finalSnippet = snippetFromBody || decodeRfc2047(message.snippet);

  return {
    id: message.id,
    threadId: message.threadId,
    subject: subject, // Already properly decoded
    from: fromAddresses[0] || { name: 'Unknown', email: 'unknown@example.com' },
    to: toAddresses,
    cc: ccAddresses.length > 0 ? ccAddresses : undefined,
    date,
    body: cleanedBody,
    snippet: finalSnippet,
    labels: message.labelIds || [],
    attachments,
    hasInlineImages
  };
}

async function fetchThreadMessages(accessToken: string, threadId: string): Promise<GmailMessage[]> {
  console.log(`Making Gmail API call for thread: ${threadId}`);
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  console.log(`Gmail API response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gmail API error response: ${errorText}`);
    throw new Response(
      JSON.stringify({
        error: `Failed to fetch thread: ${response.status}`,
        details: errorText
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  }

  const threadData = await response.json();
  const messages = threadData.messages || [];
  console.log(`Fetched ${messages.length} messages from thread ${threadId}`);
  return messages;
}

async function fetchSingleMessage(accessToken: string, messageId: string): Promise<GmailMessage | null> {
  console.log(`Making Gmail API call for message: ${messageId}`);
  const msgResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (msgResponse.status === 404) {
    console.warn(`Message ${messageId} not found (404).`);
    return null;
  }

  if (!msgResponse.ok) {
    const errorText = await msgResponse.text();
    console.error(`Failed to fetch message ${messageId}:`, errorText);
    throw new Response(
      JSON.stringify({
        error: `Failed to fetch message: ${msgResponse.status}`,
        details: errorText
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: msgResponse.status,
      }
    );
  }

  const messageData = await msgResponse.json();
  console.log(`Fetched single message ${messageId}`);
  return messageData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body safely
    let requestBody;
    try {
      const bodyText = await req.text();
      requestBody = bodyText ? JSON.parse(bodyText) : {};
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { messageId, threadId, test } = requestBody;
    const accessToken = req.headers.get('X-Gmail-Token');

    console.log(`Received request for ${threadId ? `thread ${threadId}` : `message ${messageId}`}${test ? ' (test request)' : ''}`);
    console.log(`Access token received: ${accessToken ? `${accessToken.substring(0, 20)}...` : 'null'}`);

    // Handle test requests for availability check
    if (test) {
      return new Response(
        JSON.stringify({ status: 'available', message: 'Service is running' }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (!accessToken) {
      console.error('No Gmail access token provided');
      return new Response(
        JSON.stringify({ error: 'Missing Gmail access token' }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!messageId && !threadId) {
      return new Response(
        JSON.stringify({ error: 'Either messageId or threadId is required' }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Fetching Gmail data for ${threadId ? `thread ${threadId}` : `message ${messageId}`}`);

    let messages: GmailMessage[] = [];

    const loadThread = async (id: string, reason: string) => {
      console.log(`Attempting to fetch thread ${id} (${reason})`);
      messages = await fetchThreadMessages(accessToken, id);
    };

    if (threadId) {
      await loadThread(threadId, 'direct request');
    } else if (messageId) {
      const singleMessage = await fetchSingleMessage(accessToken, messageId);
      if (singleMessage) {
        messages = [singleMessage];
      } else {
        console.warn(`Falling back to thread fetch using ID ${messageId}`);
        await loadThread(messageId, 'fallback from missing message');
      }
    }

    // Process all messages in parallel (but limit concurrency to avoid rate limits)
    const BATCH_SIZE = 5; // Process 5 messages at a time
    const processedEmails: ProcessedEmail[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(message => processGmailMessage(message, accessToken))
      );
      processedEmails.push(...batchResults);
      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(messages.length / BATCH_SIZE)}`);
    }

    // Sort by date (newest first)
    processedEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`Successfully processed ${processedEmails.length} emails`);

    return new Response(JSON.stringify(processedEmails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error in fetch-gmail-thread function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
