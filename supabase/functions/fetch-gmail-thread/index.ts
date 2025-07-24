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

// Helper function to clean text encoding issues
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
  
  // Extract basic email info
  const subject = headers.subject || '(No Subject)';
  const fromAddresses = parseEmailAddresses(headers.from || '');
  const toAddresses = parseEmailAddresses(headers.to || '');
  const ccAddresses = parseEmailAddresses(headers.cc || '');
  const date = new Date(parseInt(message.internalDate)).toISOString();

  // Extract body
  let body = extractEmailBody(message.payload);
  
  // Extract attachments (non-inline)
  const attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }> = [];

  function extractAttachments(part: EmailPart) {
    if (part.body?.attachmentId && part.filename && !part.mimeType?.startsWith('image/')) {
      attachments.push({
        filename: part.filename,
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

  // Clean quoted content (basic server-side cleaning)
  const cleanedBody = cleanTextEncoding(body)
    .replace(/<div class="gmail_quote"[\s\S]*?<\/div>/gi, '')
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
    .replace(/On\s+[^<]*wrote:\s*<br[^>]*>/gi, '');

  return {
    id: message.id,
    threadId: message.threadId,
    subject: cleanTextEncoding(subject),
    from: fromAddresses[0] || { name: 'Unknown', email: 'unknown@example.com' },
    to: toAddresses,
    cc: ccAddresses.length > 0 ? ccAddresses : undefined,
    date,
    body: cleanedBody,
    snippet: cleanTextEncoding(message.snippet),
    labels: message.labelIds || [],
    attachments,
    hasInlineImages
  };
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

    if (threadId) {
      // Fetch the entire thread
      console.log(`Making Gmail API call for thread: ${threadId}`);
      const threadResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      console.log(`Gmail API response status: ${threadResponse.status}`);
      
      if (!threadResponse.ok) {
        const errorText = await threadResponse.text();
        console.error(`Gmail API error response: ${errorText}`);
        return new Response(
          JSON.stringify({ 
            error: `Failed to fetch thread: ${threadResponse.status}`,
            details: errorText 
          }), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: threadResponse.status,
          }
        );
      }

      const threadData = await threadResponse.json();
      messages = threadData.messages || [];
      console.log(`Fetched ${messages.length} messages from thread ${threadId}`);
    } else if (messageId) {
      // Fetch a single message
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!msgResponse.ok) {
        throw new Error(`Failed to fetch message: ${msgResponse.status}`);
      }

      const messageData = await msgResponse.json();
      messages = [messageData];
      console.log(`Fetched single message ${messageId}`);
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
