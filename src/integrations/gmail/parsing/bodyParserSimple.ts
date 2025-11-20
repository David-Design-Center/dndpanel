/**
 * Simplified Email Body Parser
 * Based on proven reference architecture for reliability
 * 
 * This replaces the complex multi-layer parsing with a simple, direct approach
 * that matches the reference system's proven patterns.
 */

/**
 * Extract email body from Gmail API message payload
 * Handles both simple and multipart messages
 * 
 * @param payload - Gmail message payload
 * @param mimeType - Preferred MIME type ('text/html' or 'text/plain')
 * @returns Decoded body content as string
 */
export function getBody(payload: any, mimeType: string): string {
  let encodedBody = '';
  
  // Check if message has parts (multipart email)
  if (typeof payload.parts === 'undefined') {
    // Simple message - body is directly in payload.body.data
    encodedBody = payload.body?.data || '';
  } else {
    // Multipart message - recursively find the right MIME type
    encodedBody = getHTMLPart(payload.parts, mimeType);
  }
  
  if (!encodedBody) return '';
  
  // Gmail uses URL-safe base64, convert back to standard base64
  encodedBody = encodedBody
    .replace(/-/g, '+')     // - → +
    .replace(/_/g, '/')     // _ → /
    .replace(/\s/g, '');    // Remove whitespace
  
  try {
    // Decode base64 → UTF-8 string
    // Using decodeURIComponent + escape for proper UTF-8 handling
    return decodeURIComponent(escape(window.atob(encodedBody)));
  } catch (error) {
    console.error('Failed to decode email body:', error);
    // Fallback: try direct atob without UTF-8 conversion
    try {
      return window.atob(encodedBody);
    } catch (fallbackError) {
      console.error('Fallback decode also failed:', fallbackError);
      return '';
    }
  }
}

/**
 * Recursively search message parts for matching MIME type
 * 
 * @param parts - Array of message parts
 * @param mimeType - Target MIME type to find
 * @returns Base64-encoded body data
 */
function getHTMLPart(parts: any[], mimeType: string): string {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (typeof part.parts === 'undefined') {
      // Leaf node - check if MIME type matches
      if (part.mimeType === mimeType && part.body?.data) {
        return part.body.data;
      }
    } else {
      // Has nested parts - recurse
      const found = getHTMLPart(part.parts, mimeType);
      if (found) return found;
    }
  }
  return '';
}

/**
 * Check if a string contains HTML
 * Uses DOMParser for reliable detection
 * 
 * @param str - String to check
 * @returns true if string contains HTML elements
 */
export function isHTML(str: string): boolean {
  if (!str) return false;
  
  try {
    // Parse the string as HTML
    const doc = new DOMParser().parseFromString(str, 'text/html');
    
    // Check if any child nodes are HTML elements (nodeType === 1)
    return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
  } catch {
    return false;
  }
}

/**
 * Parse Gmail message to extract body content
 * Tries HTML first, falls back to plain text with formatting
 * 
 * @param message - Gmail API message object
 * @returns Parsed body HTML string
 */
export function parseEmailBody(message: any): string {
  if (!message?.payload) return '';
  
  // 1. Try to get HTML body first
  let body = getBody(message.payload, 'text/html');
  
  // 2. Fallback to plain text if no HTML
  if (body === '') {
    body = getBody(message.payload, 'text/plain');
    
    if (body) {
      // Convert line breaks to <br> tags for plain text
      body = body
        .replace(/(\r\n)+/g, '<br data-break="rn">')
        .replace(/[\n\r]+/g, '<br data-break="nr">');
      
      // If plain text but not HTML, wrap in divs for spacing
      if (!isHTML(body)) {
        body = body
          .replace(/(\r\n)+/g, '<div style="margin-bottom:10px"></div>')
          .replace(/[\n\r]+/g, '<br>');
      }
    }
  }
  
  return body;
}

/**
 * Extract sender name and email from header value
 * Handles formats: "Name <email>" or "email"
 * 
 * @param value - From/Reply-To header value
 * @returns Object with name and email
 */
export function getNameEmail(value: string): { name: string; email: string } | null {
  if (!value) return null;
  
  // Regex to extract name and email from "Name <email@example.com>" or "email@example.com"
  const regex = /(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)/;
  const match = regex.exec(value);
  
  if (match) {
    const email = match[2];
    const name = match[1] || email.slice(0, email.indexOf('@')); // Use email prefix if no name
    return { name, email };
  }
  
  return null;
}
