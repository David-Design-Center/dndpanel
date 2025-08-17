import { useEffect, useRef } from 'react';

interface EmailViewerProps {
  htmlContent: string;
  className?: string;
}

// React component with Shadow DOM (no custom elements)
function EmailViewer({ htmlContent, className = '' }: EmailViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create shadow root if it doesn't exist
    if (!shadowRootRef.current) {
      try {
        shadowRootRef.current = containerRef.current.attachShadow({ mode: 'closed' });
        
        // Add styles to shadow root
        const style = document.createElement('style');
        style.textContent = `
          :host {
            all: initial;
            display: block;
            width: 100%;
            height: auto;
            box-sizing: border-box;
            isolation: isolate;
            contain: layout style paint size;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            font-size: ${className?.includes('small') ? '13px' : '14px'};
            line-height: 1.5;
            color: #374151;
            background: white;
            outline: none !important;
            border: none !important;
          }
          
          .email-body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            font-size: ${className?.includes('small') ? '13px' : '14px'};
            line-height: 1.5;
            color: #374151;
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 100%;
            width: 100%;
            overflow: hidden;
            outline: none !important;
            border: none !important;
            box-sizing: border-box;
          }
          
          .email-body * {
            all: unset;
            box-sizing: border-box;
            display: revert;
            max-width: 100% !important;
            position: static !important;
            z-index: auto !important;
            outline: none !important;
            border: none !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          
          /* Re-enable essential display properties */
          .email-body div, .email-body p, .email-body span, .email-body a, .email-body img, 
          .email-body table, .email-body tr, .email-body td, .email-body th, .email-body thead, 
          .email-body tbody, .email-body ul, .email-body ol, .email-body li, 
          .email-body h1, .email-body h2, .email-body h3, .email-body h4, .email-body h5, .email-body h6 {
            display: revert;
            outline: none !important;
            border: none !important;
          }
          
          /* Remove focus outlines completely */
          .email-body *:focus,
          .email-body *:active,
          .email-body *:target {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          /* Typography elements */
          .email-body p {
            margin: 0.5em 0;
            padding: 0;
          }
          
          .email-body h1, .email-body h2, .email-body h3, .email-body h4, .email-body h5, .email-body h6 {
            margin: 1em 0 0.5em 0;
            font-weight: 600;
            line-height: 1.2;
          }
          
          .email-body h1 { font-size: ${className?.includes('small') ? '1.3em' : '1.5em'}; }
          .email-body h2 { font-size: ${className?.includes('small') ? '1.2em' : '1.3em'}; }
          .email-body h3 { font-size: ${className?.includes('small') ? '1.05em' : '1.1em'}; }
          .email-body h4, .email-body h5, .email-body h6 { font-size: 1em; }
          
          /* Links */
          .email-body a {
            color: #2563eb;
            text-decoration: underline;
            cursor: pointer;
            outline: none !important;
            border: none !important;
          }
          
          .email-body a:hover {
            color: #1d4ed8;
            outline: none !important;
            border: none !important;
          }
          
          .email-body a:focus {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          /* Lists */
          .email-body ul, .email-body ol {
            margin: 0.5em 0;
            padding-left: 1.5em;
          }
          
          .email-body li {
            margin: 0.25em 0;
          }
          
          /* Images */
          .email-body img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0.5em 0;
            border-radius: 4px;
            border: none !important;
            outline: none !important;
          }
          
          /* Tables */
          .email-body table {
            max-width: 100%;
            width: 100%;
            border-collapse: collapse;
            margin: 0.5em 0;
            table-layout: fixed;
            word-break: break-word;
            border: none !important;
            outline: none !important;
            overflow: hidden;
          }
          
          .email-body td, .email-body th {
            padding: 0.5em;
            vertical-align: top;
            border: none !important;
            outline: none !important;
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 0;
            overflow: hidden;
          }
          
          .email-body th {
            background-color: #f9fafb;
            font-weight: 600;
            border: none !important;
            outline: none !important;
          }
          
          /* Blockquotes */
          .email-body blockquote {
            margin: 0.5em 0;
            padding: 0.5em 1em;
            background-color: #f9fafb;
            font-style: italic;
            border: none !important;
            outline: none !important;
          }
          
          /* Code */
          .email-body code {
            background-color: #f3f4f6;
            padding: 0.125em 0.25em;
            border-radius: 2px;
            font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.875em;
          }
          
          .email-body pre {
            background-color: #f3f4f6;
            padding: 1em;
            border-radius: 4px;
            overflow-x: auto;
            margin: 0.5em 0;
            font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.875em;
          }
        `;
        
        shadowRootRef.current.appendChild(style);
      } catch (error) {
        console.warn('Shadow DOM not supported, falling back to regular DOM', error);
      }
    }

    // Set content
    if (shadowRootRef.current) {
      // Clear existing content
      const existingContent = shadowRootRef.current.querySelector('.email-body');
      if (existingContent) {
        existingContent.remove();
      }

      // Create new content container
      const contentContainer = document.createElement('div');
      contentContainer.className = 'email-body';
      
      if (!htmlContent) {
        contentContainer.innerHTML = '<p style="color: #6b7280; font-style: italic;">No content available</p>';
      } else {
        // Sanitize and set content
        const sanitizedHtml = sanitizeEmailHtml(htmlContent);
        contentContainer.innerHTML = sanitizedHtml;
        
        // Add click handler for links as additional safety
        contentContainer.addEventListener('click', (event) => {
          const target = event.target as HTMLElement;
          if (target.tagName === 'A') {
            const link = target as HTMLAnchorElement;
            const href = link.getAttribute('href');
            if (href && href.trim() !== '' && href !== '#') {
              event.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
            }
          }
        });
      }
      
      shadowRootRef.current.appendChild(contentContainer);
    } else {
      // Fallback for browsers without Shadow DOM support
      const sanitizedHtml = htmlContent ? sanitizeEmailHtml(htmlContent) : '<p style="color: #6b7280; font-style: italic;">No content available</p>';
      containerRef.current.innerHTML = sanitizedHtml;
      
      // Add click handler for links in fallback mode
      if (htmlContent) {
        containerRef.current.addEventListener('click', (event) => {
          const target = event.target as HTMLElement;
          if (target.tagName === 'A') {
            const link = target as HTMLAnchorElement;
            const href = link.getAttribute('href');
            if (href && href.trim() !== '' && href !== '#') {
              event.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
            }
          }
        });
      }
    }
  }, [htmlContent]);

  const sanitizeEmailHtml = (html: string): string => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Remove dangerous elements
      const dangerousElements = tempDiv.querySelectorAll('script, style, link, meta, title, head, html, body, iframe, object, embed, applet, form, input, button, select, textarea');
      dangerousElements.forEach(el => el.remove());
      
      // Remove all inline styles and dangerous attributes
      const allElements = tempDiv.querySelectorAll('*');
      allElements.forEach(el => {
        // Remove all event handlers
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on')) {
            el.removeAttribute(attr.name);
          }
        });
        
        // Remove style attribute to prevent CSS conflicts
        el.removeAttribute('style');
        el.removeAttribute('class');
        el.removeAttribute('id');
        
        // Remove dangerous attributes and styling attributes
        el.removeAttribute('width');
        el.removeAttribute('height');
        el.removeAttribute('bgcolor');
        el.removeAttribute('background');
        el.removeAttribute('border');
        el.removeAttribute('cellpadding');
        el.removeAttribute('cellspacing');
      });
      
      // Process all links to open in new tabs
      const links = tempDiv.querySelectorAll('a');
      links.forEach(link => {
        // Only add target="_blank" if href exists and is not empty
        const href = link.getAttribute('href');
        if (href && href.trim() !== '' && href !== '#') {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
      });
      
      // Clean up text encoding issues - comprehensive character mapping
      let cleanHtml = tempDiv.innerHTML;
      
      // Fix common UTF-8 encoding issues
      cleanHtml = cleanHtml
        // Remove standalone â characters
        .replace(/â(?![€™œ""¦""])/g, '')
        // Smart quotes
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€/g, '"')
        // Ellipsis
        .replace(/â€¦/g, '...')
        // Em and en dashes
        .replace(/â€"/g, '–')
        .replace(/â€"/g, '—')
        // Other common encoding issues
        .replace(/Â/g, '')
        .replace(/â€¢/g, '•')
        .replace(/â€ /g, '– ')
        .replace(/â/g, '')
        // Fix nbsp and other space issues
        .replace(/&nbsp;/g, ' ')
        .replace(/\u00A0/g, ' ')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        // Remove any remaining problematic characters
        .replace(/[^\x00-\x7F\u00A0-\u024F\u1E00-\u1EFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF\u2100-\u214F\u2150-\u218F]/g, '');
      
      return cleanHtml;
    } catch (error) {
      console.warn('Error sanitizing email HTML:', error);
      return '<p style="color: #ef4444;">Error displaying email content</p>';
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`email-viewer ${className}`}
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        minHeight: '50px',
        isolation: 'isolate',
        contain: 'layout style paint',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 0,
        boxSizing: 'border-box'
      }}
    />
  );
}

export default EmailViewer;
