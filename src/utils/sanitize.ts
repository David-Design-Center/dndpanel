import DOMPurify, { Config } from 'dompurify';

/**
 * 🔒 HTML Sanitization Utilities
 * 
 * Uses DOMPurify to prevent XSS attacks while preserving email formatting.
 * Three configs for different trust levels:
 * - sanitizeEmailHtml: External email content from Gmail API
 * - sanitizeSignature: Email signatures (slightly stricter)
 * - sanitizeInternalHtml: App-generated content (defensive)
 */

// Config for external email content (Gmail API) - most permissive
const EMAIL_SANITIZE_CONFIG: Config = {
  ADD_TAGS: ['style', 'link'],
  ADD_ATTR: [
    'target', 'style', 'class', 'id', 
    'width', 'height', 'src', 'href', 'alt', 'title',
    'align', 'valign', 'border', 'cellpadding', 'cellspacing',
    'bgcolor', 'color', 'size', 'face', 'rel'
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'form', 'input', 'object', 'embed', 'applet'],
};

// Config for signatures - slightly stricter
const SIGNATURE_SANITIZE_CONFIG: Config = {
  ADD_TAGS: ['style'],
  ADD_ATTR: [
    'target', 'style', 'class', 'href', 'src', 'alt', 
    'width', 'height', 'rel', 'align', 'valign'
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'form', 'input', 'object', 'embed', 'applet'],
};

// Config for internally-generated content (defensive)
const INTERNAL_CONTENT_CONFIG: Config = {
  ADD_ATTR: ['style', 'class', 'href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitize external email HTML content from Gmail API
 * Preserves full email formatting (tables, styles, images, links)
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, EMAIL_SANITIZE_CONFIG);
}

/**
 * Sanitize email signatures
 * Preserves images, links, and basic formatting
 */
export function sanitizeSignature(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, SIGNATURE_SANITIZE_CONFIG);
}

/**
 * Sanitize internally-generated HTML (defensive)
 * For app-generated content that might include user input
 */
export function sanitizeInternalHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, INTERNAL_CONTENT_CONFIG);
}

/**
 * Process links to open in new tabs AND sanitize
 * Replacement for the old processLinksInHtml that had no sanitization
 */
export function sanitizeAndProcessLinks(html: string): string {
  if (!html) return '';
  
  // First sanitize
  const clean = DOMPurify.sanitize(html, SIGNATURE_SANITIZE_CONFIG);
  
  // Then process links to open in new tabs
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = clean;
  
  const links = tempDiv.querySelectorAll('a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.trim() !== '' && href !== '#') {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });
  
  return tempDiv.innerHTML;
}
