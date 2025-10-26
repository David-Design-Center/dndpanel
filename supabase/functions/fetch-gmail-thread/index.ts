/**
 * ⚠️ CURRENTLY DISABLED - This edge function is temporarily disabled
 * 
 * ISSUES FOUND:
 * 1. Destroys email styling - strips CSS and inline styles
 * 2. Character encoding problems - double-encoding creates artifacts
 * 3. Performance overhead - adds 200-500ms latency vs direct Gmail API
 * 4. Complexity - 693 lines of manual MIME parsing that Gmail already handles
 * 
 * KEEPING FOR REFERENCE - May be useful in future if:
 * - Need server-side caching
 * - Need to proxy images for security
 * - Need batch processing optimization
 * 
 * Current approach: Direct Gmail API calls from frontend with DOMPurify sanitization
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
// Helper function to decode base64url
function base64UrlDecode(str) {
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if necessary
  while(str.length % 4){
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
function parseHeaders(headers) {
  const parsed = {};
  headers.forEach((header)=>{
    parsed[header.name.toLowerCase()] = header.value;
  });
  return parsed;
}
// Helper function to parse email addresses
function parseEmailAddresses(addressString) {
  if (!addressString) return [];
  const addresses = addressString.split(',').map((addr)=>addr.trim());
  return addresses.map((addr)=>{
    const match = addr.match(/^(.+?)\s*<(.+)>$/) || addr.match(/^(.+)$/);
    if (match && match[2]) {
      return {
        name: match[1].replace(/"/g, '').trim(),
        email: match[2].trim()
      };
    } else if (match && match[1]) {
      const email = match[1].trim();
      return {
        name: email,
        email
      };
    }
    return {
      name: addr,
      email: addr
    };
  });
}
// Extract inline images from email parts
function extractInlineImages(payload) {
  const inlineImages = [];
  function traverse(part) {
    if (part.mimeType?.startsWith('image/') && part.body?.attachmentId) {
      const contentIdHeader = part.headers?.find((h)=>h.name.toLowerCase() === 'content-id');
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
function base64UrlToBytes(b64url) {
  const pad = '='.repeat((4 - b64url.length % 4) % 4);
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for(let i = 0; i < binary.length; i++)bytes[i] = binary.charCodeAt(i);
  return bytes;
}
// Minimal quoted-printable → bytes
function decodeQuotedPrintableToBytes(qp) {
  const cleaned = qp.replace(/=\r?\n/g, '');
  const out = [];
  for(let i = 0; i < cleaned.length; i++){
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
function decodeRfc2047(headerValue) {
  if (!headerValue) return '';
  return headerValue.replace(ENC_WORD_RE, (_, charsetRaw, encRaw, data)=>{
    const charset = String(charsetRaw).toLowerCase();
    const enc = String(encRaw).toLowerCase();
    try {
      let bytes;
      if (enc === 'b') {
        bytes = base64UrlToBytes(data.replace(/\s/g, '').replace(/\+/g, '-').replace(/\//g, '_'));
      } else {
        const qp = data.replace(/_/g, ' ');
        bytes = decodeQuotedPrintableToBytes(qp);
      }
      return new TextDecoder(normalizeCharset(charset)).decode(bytes);
    } catch  {
      return headerValue; // fallback: return original token if decode fails
    }
  });
}
function normalizeCharset(cs) {
  const m = cs.trim().toLowerCase();
  if (m === 'utf8') return 'utf-8';
  if (m.includes('1257')) return 'windows-1257';
  if (m.includes('1252')) return 'windows-1252';
  if (m.includes('iso-8859-13')) return 'iso-8859-13';
  if (m.includes('iso-8859-1')) return 'iso-8859-1';
  return m;
}
// Choose charset from headers
function charsetFromHeaders(headers) {
  const h = headers.find((h)=>h.name.toLowerCase() === 'content-type')?.value ?? '';
  const m = /charset="?([^;"\s]+)"?/i.exec(h);
  return m ? normalizeCharset(m[1]) : undefined;
}

// === ENHANCED UNIVERSAL DECODER WITH EMOJI/UNICODE SUPPORT ===
const ENCODING_CONFIDENCE_THRESHOLD = 0.6;

// Comprehensive quality scorer for any text
function scoreDecodedTextQuality(text: string): number {
  let score = 0;
  const length = text.length;
  
  if (length === 0) return -Infinity;
  
  // Count character categories
  const cyrillic = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const digits = (text.match(/[0-9]/g) || []).length;
  const emoji = (text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu) || []).length;
  const cjk = (text.match(/[\u4E00-\u9FFF\u3040-\u309F\uAC00-\uD7AF]/g) || []).length;
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const hebrew = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
  const thai = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  
  // Mojibake patterns to penalize
  const mojibakePatterns = [
    /[ÃÂÐÑ]/g,           // Common double-encoded UTF-8
    /[╔║╚╩╦╣╟╢╧]/g,      // Box drawing chars
    /[\uFFFD]/g,          // Replacement character
    /[пЃпЃ]/g,            // Garbled Cyrillic
    /â€/g,                // Broken smart quotes
    /Â /g,                // Broken spacing
    /[ð»ðµðð°]/g,         // Specific Cyrillic mojibake patterns
  ];
  
  let mojibakeCount = 0;
  mojibakePatterns.forEach(pattern => {
    mojibakeCount += (text.match(pattern) || []).length;
  });
  
  // Control characters (except common whitespace/newlines)
  const controlChars = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []).length;
  
  // Scoring logic
  score += cyrillic * 4;        // Strong signal if Cyrillic present
  score += latin * 2;           // Basic Latin is good
  score += digits * 1.5;        // Numbers help
  score += emoji * 3;           // Emoji is valid Unicode
  score += (cjk + arabic + hebrew + devanagari + thai) * 3; // Other scripts = good
  score -= mojibakeCount * 8;   // Heavy penalty for mojibake
  score -= controlChars * 10;   // Very bad
  
  // Bonus: if text contains mostly printable characters
  const printable = (text.match(/[\x20-\x7E\u0080-\uFFFF]/g) || []).length;
  const printableRatio = printable / length;
  score += printableRatio * 2;
  
  // Normalize by length
  return (score / Math.sqrt(length)) * 100;
}

// Decode with enhanced fallbacks
function decodeWithEnhancedFallbacks(bytes: Uint8Array, preferredCharset: string): { text: string; confidence: number; charset: string } {
  const tried = new Set<string>();
  
  // Prioritized charset list - best guesses first based on common Gmail scenarios
  const charsetCandidates = [
    preferredCharset,           // What headers say (if present)
    'utf-8',                    // Most common
    'windows-1251',             // Russian/Cyrillic
    'iso-8859-5',               // Cyrillic (ISO)
    'koi8-r',                   // Old Russian
    'windows-1252',             // Western European
    'iso-8859-1',               // Latin-1
    'iso-8859-2',               // Central European
    'gb2312',                   // Simplified Chinese
    'gbk',                      // Extended Chinese
    'shift_jis',                // Japanese
    'euc-kr',                   // Korean
    'iso-8859-6',               // Arabic
    'iso-8859-7',               // Greek
    'iso-8859-8',               // Hebrew
    'windows-874',              // Thai
  ].filter((cs): cs is string => Boolean(cs && !tried.has(cs) && (tried.add(cs as string), true)));
  
  let bestText = '';
  let bestScore = -Infinity;
  let bestCharset = 'utf-8';
  
  for (const charset of charsetCandidates) {
    try {
      const text = new TextDecoder(charset).decode(bytes);
      const score = scoreDecodedTextQuality(text);
      
      if (score > bestScore) {
        bestScore = score;
        bestText = text;
        bestCharset = charset;
      }
    } catch (e) {
      // Charset not supported - continue
      console.debug(`Charset ${charset} not supported: ${e}`);
    }
  }
  
  // Fallback: if all else fails, use UTF-8 with replacement characters
  if (!bestText) {
    bestText = new TextDecoder('utf-8').decode(bytes);
    bestScore = -50; // Low confidence
    bestCharset = 'utf-8';
  }
  
  // Calculate confidence (0-1)
  const confidence = Math.max(0, Math.min(1, (bestScore + 100) / 200));
  
  return {
    text: bestText,
    confidence,
    charset: bestCharset
  };
}

// HTML entity decoder (must run AFTER text decoding)
function decodeHtmlEntities(text: string): string {
  // Handle numeric entities (decimal and hex)
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    try {
      return String.fromCodePoint(parseInt(dec, 10));
    } catch {
      return match;
    }
  });
  
  text = text.replace(/&#x([A-Fa-f0-9]+);/g, (match, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return match;
    }
  });
  
  // Common named entities
  const entities: Record<string, string> = {
    '&nbsp;': '\u00A0', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&apos;': "'", '&amp;': '&', '&euro;': '€', '&pound;': '£',
    '&yen;': '¥', '&copy;': '©', '&reg;': '®', '&trade;': '™',
    '&bullet;': '•', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
    '&ldquo;': '\u201C', '&rdquo;': '\u201D', '&lsquo;': '\u2018', '&rsquo;': '\u2019',
  };
  
  Object.entries(entities).forEach(([entity, char]) => {
    text = text.replace(new RegExp(entity, 'g'), char);
  });
  
  return text;
}

// Unicode normalization
function normalizeUnicode(text: string): string {
  try {
    // Normalize to NFC (most common form)
    return text.normalize('NFC');
  } catch {
    return text; // Fallback if normalize not available
  }
}

// Strip zero-width and invisible characters
function stripInvisibleChars(text: string): string {
  return text.replace(/[\u200B\u200C\u200D\uFEFF]/g, ''); // Zero-width chars
}

// Decode a single Gmail part into a string - ENHANCED VERSION
function decodeGmailPart(part: any) {
  const mimeType = part.mimeType || 'text/plain';
  const headers = part.headers ?? [];
  const headerCharset = charsetFromHeaders(headers);
  const cte = headers.find((h) => h.name.toLowerCase() === 'content-transfer-encoding')?.value?.toLowerCase();

  if (part.body?.data) {
    const rawBytes = base64UrlToBytes(part.body.data);
    let bytes = rawBytes;
    
    if (cte === 'quoted-printable') {
      const asAscii = new TextDecoder('iso-8859-1').decode(rawBytes);
      bytes = decodeQuotedPrintableToBytes(asAscii);
    }
    
    // Use enhanced decoder with confidence tracking
    const { text, confidence, charset } = decodeWithEnhancedFallbacks(bytes, headerCharset || 'utf-8');
    
    let processedText = text;
    
    // Post-processing based on MIME type
    if (mimeType.toLowerCase() === 'text/html') {
      // Decode HTML entities for HTML content
      processedText = decodeHtmlEntities(processedText);
    }
    
    // Always apply Unicode normalization
    processedText = normalizeUnicode(processedText);
    
    // Strip invisible characters
    processedText = stripInvisibleChars(processedText);
    
    // Log low-confidence decodings for debugging
    if (confidence < ENCODING_CONFIDENCE_THRESHOLD) {
      console.warn(`Low confidence (${(confidence * 100).toFixed(1)}%) decoding for part. Charset: ${charset}, MimeType: ${mimeType}`);
    } else {
      console.debug(`Decoded with charset: ${charset}, confidence: ${(confidence * 100).toFixed(1)}%`);
    }
    
    return {
      text: processedText,
      mimeType,
      confidence,
      charset
    };
  }
  
  if (part.parts && part.parts.length) {
    const html = part.parts.find((p: any) => (p.mimeType || '').toLowerCase() === 'text/html');
    const plain = part.parts.find((p: any) => (p.mimeType || '').toLowerCase() === 'text/plain');
    return decodeGmailPart(html || plain || part.parts[0]);
  }
  
  return null;
}
// Helper to pick best body string from an entire Gmail message
function decodeGmailMessageBody(message: any) {
  const res: { html?: string; text?: string } = {};
  const walk = (p: any)=>{
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
function getHeaderValue(headers: any[], headerName: string) {
  return headers.find((h: any)=>h.name.toLowerCase() === headerName.toLowerCase())?.value || '';
}
// Helper function to clean text encoding issues (DEPRECATED - use proper decoding instead)
function cleanTextEncoding(text: string) {
  return text // Fix common UTF-8 encoding issues
  .replace(/Â/g, '') // Remove unnecessary Â characters
  .replace(/â€™/g, "'") // Right single quotation mark
  .replace(/â€œ/g, '"') // Left double quotation mark
  .replace(/â€/g, '"') // Right double quotation mark
  .replace(/â€¦/g, '...') // Horizontal ellipsis
  .replace(/â€"/g, '–') // En dash
  .replace(/â€"/g, '—') // Em dash
  .replace(/Ãª/g, 'ê') // Fix accented characters
  .replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ã /g, 'à').replace(/Ã¡/g, 'á').replace(/Ã§/g, 'ç') // Fix Estonian characters (double-encoded UTF-8)
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
  .replace(/\s+/g, ' ').trim();
}
// Extract email body from parts - UPDATED to use proper MIME decoding
function extractEmailBody(payload: any) {
  let htmlBody = '';
  let textBody = '';
  function traverse(part: any) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      // Use proper decoding instead of base64UrlDecode
      const decoded = decodeGmailPart(part);
      if (decoded && !htmlBody) {
        htmlBody = decoded.text;
      }
    } else if (part.mimeType === 'text/plain' && part.body?.data && !htmlBody) {
      // Use proper decoding instead of base64UrlDecode
      const decoded = decodeGmailPart(part);
      if (decoded && !textBody) {
        textBody = decoded.text;
      }
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
async function processInlineImages(messageId: string, htmlContent: string, inlineImages: any[], accessToken: string) {
  if (inlineImages.length === 0 || !htmlContent.includes('cid:')) {
    return htmlContent;
  }
  console.log(`Processing ${inlineImages.length} inline images for message ${messageId}`);
  // Fetch all attachments in parallel
  const imagePromises = inlineImages.map(async (img)=>{
    try {
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${img.attachmentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
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
  imageResults.forEach((result)=>{
    if (result) {
      const cidPattern = new RegExp(`cid:${result.contentId}`, 'gi');
      processedHtml = processedHtml.replace(cidPattern, result.dataUri);
    }
  });
  return processedHtml;
}
// Process a single Gmail message
async function processGmailMessage(message, accessToken) {
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
  const attachments = [];
  function extractAttachments(part) {
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
  const cleanedBody = body.replace(/<div class="gmail_quote"[\s\S]*?<\/div>/gi, '').replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '').replace(/On\s+[^<]*wrote:\s*<br[^>]*>/gi, '');
  return {
    id: message.id,
    threadId: message.threadId,
    subject: subject,
    from: fromAddresses[0] || {
      name: 'Unknown',
      email: 'unknown@example.com'
    },
    to: toAddresses,
    cc: ccAddresses.length > 0 ? ccAddresses : undefined,
    date,
    body: cleanedBody,
    snippet: decodeRfc2047(message.snippet),
    labels: message.labelIds || [],
    attachments,
    hasInlineImages
  };
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Parse request body safely
    let requestBody;
    try {
      const bodyText = await req.text();
      requestBody = bodyText ? JSON.parse(bodyText) : {};
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    const { messageId, threadId, test } = requestBody;
    const accessToken = req.headers.get('X-Gmail-Token');
    console.log(`Received request for ${threadId ? `thread ${threadId}` : `message ${messageId}`}${test ? ' (test request)' : ''}`);
    console.log(`Access token received: ${accessToken ? `${accessToken.substring(0, 20)}...` : 'null'}`);
    // Handle test requests for availability check
    if (test) {
      return new Response(JSON.stringify({
        status: 'available',
        message: 'Service is running'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    if (!accessToken) {
      console.error('No Gmail access token provided');
      return new Response(JSON.stringify({
        error: 'Missing Gmail access token'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    if (!messageId && !threadId) {
      return new Response(JSON.stringify({
        error: 'Either messageId or threadId is required'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    console.log(`Fetching Gmail data for ${threadId ? `thread ${threadId}` : `message ${messageId}`}`);
    let messages = [];
    if (threadId) {
      // Fetch the entire thread
      console.log(`Making Gmail API call for thread: ${threadId}`);
      const threadResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      console.log(`Gmail API response status: ${threadResponse.status}`);
      if (!threadResponse.ok) {
        const errorText = await threadResponse.text();
        console.error(`Gmail API error response: ${errorText}`);
        return new Response(JSON.stringify({
          error: `Failed to fetch thread: ${threadResponse.status}`,
          details: errorText
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: threadResponse.status
        });
      }
      const threadData = await threadResponse.json();
      messages = threadData.messages || [];
      console.log(`Fetched ${messages.length} messages from thread ${threadId}`);
    } else if (messageId) {
      // Fetch a single message
      const msgResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!msgResponse.ok) {
        throw new Error(`Failed to fetch message: ${msgResponse.status}`);
      }
      const messageData = await msgResponse.json();
      messages = [
        messageData
      ];
      console.log(`Fetched single message ${messageId}`);
    }
    // Process all messages in parallel (but limit concurrency to avoid rate limits)
    const BATCH_SIZE = 5; // Process 5 messages at a time
    const processedEmails = [];
    for(let i = 0; i < messages.length; i += BATCH_SIZE){
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map((message)=>processGmailMessage(message, accessToken)));
      processedEmails.push(...batchResults);
      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(messages.length / BATCH_SIZE)}`);
    }
    // Sort by date (newest first)
    processedEmails.sort((a, b)=>new Date(b.date).getTime() - new Date(a.date).getTime());
    console.log(`Successfully processed ${processedEmails.length} emails`);
    return new Response(JSON.stringify(processedEmails), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in fetch-gmail-thread function:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
